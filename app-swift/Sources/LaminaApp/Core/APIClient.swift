import Foundation

/// Thin bearer-token HTTP client for the platform's `/api/v1` REST surface.
///
/// All endpoints speak the `Envelope<T>` protocol (`{ ok, data } | { ok: false,
/// error }`). The generic helpers below decode that envelope once, surface
/// known HTTP statuses as typed `APIError`s, and unwrap `data` for the
/// data-bearing calls while letting void endpoints (`{ ok: true }`) pass
/// through. Feature code never touches `URLSession` or JSON directly.
public final class APIClient {
    public enum APIError: LocalizedError {
        case invalidURL
        case unauthorized
        case notFound
        case http(Int)
        case message(String)
        case decode(String)

        public var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid request URL."
            case .unauthorized: return "Authentication required or token expired."
            case .notFound: return "Resource not found."
            case .http(let s): return "Request failed (HTTP \(s))."
            case .message(let m): return m
            case .decode(let m): return "Failed to decode response: \(m)"
            }
        }
    }

    private(set) var baseURL: URL
    private(set) var token: String?
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(baseURL: URL, token: String? = nil, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.token = token
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
        // The platform speaks snake_case on the wire (`target_type`,
        // `verified_method`, `helpful_votes` …). Decode into our camelCase
        // Swift properties, and encode our camelCase bodies back to snake_case.
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    /// Swap the bearer token at runtime (e.g. after KeychainStore refresh).
    public func setToken(_ token: String?) { self.token = token }

    /// Swap the API origin (e.g. when the user changes their site in Settings).
    public func setBaseURL(_ url: URL) { self.baseURL = url }

    // MARK: - Generic helpers

    /// `GET` an endpoint whose `data` payload is required (e.g. a single
    /// resource or a list). Unwraps `data` and throws if it is missing.
    public func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        let value: T? = try await perform(T.self, method: "GET", path: path, query: query, body: nil)
        guard let value else { throw APIError.message("Response missing data") }
        return value
    }

    /// `GET` an endpoint that returns `{ ok: true }` with no `data`.
    public func getVoid(_ path: String, query: [URLQueryItem] = []) async throws {
        _ = try await perform(EmptyResponse.self, method: "GET", path: path, query: query, body: nil)
    }

    /// `POST` a body and decode the required `data` payload (e.g. `{ id }`).
    public func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let value: T? = try await perform(T.self, method: "POST", path: path, query: [], body: try encode(body))
        guard let value else { throw APIError.message("Response missing data") }
        return value
    }

    /// `POST` a body to an endpoint that returns `{ ok: true }` with no `data`.
    public func postVoid<B: Encodable>(_ path: String, body: B) async throws {
        _ = try await perform(EmptyResponse.self, method: "POST", path: path, query: [], body: try encode(body))
    }

    /// `POST` with no body to a void endpoint (e.g. `POST /{id}/approve`).
    public func postVoid(_ path: String) async throws {
        _ = try await perform(EmptyResponse.self, method: "POST", path: path, query: [], body: nil)
    }

    /// `PATCH` a body to a void endpoint (e.g. `PATCH /{id}`).
    public func patch<B: Encodable>(_ path: String, body: B) async throws {
        _ = try await perform(EmptyResponse.self, method: "PATCH", path: path, query: [], body: try encode(body))
    }

    /// `PUT` a body to a void endpoint (e.g. `PUT /api/v1/reviews/targets`).
    public func putVoid<B: Encodable>(_ path: String, body: B) async throws {
        _ = try await perform(EmptyResponse.self, method: "PUT", path: path, query: [], body: try encode(body))
    }

    /// `DELETE` a void endpoint (e.g. `DELETE /{id}`).
    public func delete(_ path: String) async throws {
        _ = try await perform(EmptyResponse.self, method: "DELETE", path: path, query: [], body: nil)
    }

    // MARK: - Internals

    private func encode<B: Encodable>(_ body: B) throws -> Data {
        do { return try encoder.encode(body) }
        catch { throw APIError.decode("\(error)") }
    }

    private func url(path: String, query: [URLQueryItem]) throws -> URL {
        let base = baseURL.absoluteString.hasSuffix("/")
            ? String(baseURL.absoluteString.dropLast())
            : baseURL.absoluteString
        let resolved = path.hasPrefix("/") ? base + path : base + "/" + path
        guard var comps = URLComponents(string: resolved) else { throw APIError.invalidURL }
        if !query.isEmpty { comps.queryItems = query }
        guard let url = comps.url else { throw APIError.invalidURL }
        return url
    }

    private func perform<T: Decodable>(
        _ type: T.Type,
        method: String,
        path: String,
        query: [URLQueryItem],
        body: Data?
    ) async throws -> T? {
        let url = try self.url(path: path, query: query)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { req.httpBody = body }

        let (data, response) = try await session.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        let env: Envelope<T>
        do {
            env = try decoder.decode(Envelope<T>.self, from: data)
        } catch {
            // The body wasn't a recognizable envelope — map by status first.
            if status == 401 { throw APIError.unauthorized }
            if status == 404 { throw APIError.notFound }
            if status >= 400 { throw APIError.http(status) }
            throw APIError.decode("\(error)")
        }

        if !env.ok {
            if status == 401 { throw APIError.unauthorized }
            if status == 404 { throw APIError.notFound }
            throw APIError.message(env.error ?? "Request failed (HTTP \(status))")
        }
        return env.data
    }
}
