import Foundation

/// The platform's universal API v1 response envelope.
///
/// Every `/api/v1/*` endpoint returns one of two shapes, distinguished by `ok`:
///   `{ "ok": true,  "data": T }`
///   `{ "ok": false, "error": String }`
/// `data` is modeled as optional so the same `Envelope<T>` decodes both success
/// and failure responses (a failure carries `data: null` / no `data` key), and
/// so void endpoints (`{ "ok": true }` with no `data`) decode cleanly when `T`
/// is `EmptyResponse`.
public struct Envelope<T: Decodable>: Decodable {
    public let ok: Bool
    public let data: T?
    public let error: String?

    public init(ok: Bool, data: T? = nil, error: String? = nil) {
        self.ok = ok
        self.data = data
        self.error = error
    }
}

/// A type with no fields, used as the `data` payload for endpoints that return
/// `{ "ok": true }` with no `data` (delete / approve / reject / hide / reply /
/// deleteReply / updateReview / setTargetConfig). `Codable` synthesis ignores
/// unknown keys, so decoding a real object into `EmptyResponse` succeeds and
/// decoding `null`/absent into `EmptyResponse?` yields `nil`.
public struct EmptyResponse: Codable {}
