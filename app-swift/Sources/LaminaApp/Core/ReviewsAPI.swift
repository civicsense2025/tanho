import Foundation

/// Reviews API v1 surface, layered on the generic `APIClient` helpers.
///
/// One method per platform endpoint in `src/modules/reviews`:
///   list / get / create / update / delete
///   approve / reject / hide / reply / deleteReply
///   aggregate
///   target config: list / set / get
///
/// Void endpoints (moderation actions, update, delete, setTargetConfig) mirror
/// the platform's `{ ok: true }` responses; data-bearing endpoints unwrap the
/// `Envelope.data` payload. The create endpoint returns `{ id }`, surfaced as
/// the created id `String`.
extension APIClient {

    // MARK: - List / get

    /// `GET /api/v1/reviews?targetType=&targetId=&status=&sort=&limit=&offset=`
    /// `targetType`/`targetId` are optional so admin callers can list across all
    /// targets (the moderation queue). Public callers pass both.
    public func listReviews(
        targetType: String? = nil,
        targetId: String? = nil,
        status: Review.ReviewStatus? = nil,
        sort: ReviewSort = .recent,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> [Review] {
        var query: [URLQueryItem] = []
        if let targetType { query.append(URLQueryItem(name: "targetType", value: targetType)) }
        if let targetId { query.append(URLQueryItem(name: "targetId", value: targetId)) }
        if let status { query.append(URLQueryItem(name: "status", value: status.rawValue)) }
        query.append(URLQueryItem(name: "sort", value: sort.rawValue))
        query.append(URLQueryItem(name: "limit", value: String(limit)))
        query.append(URLQueryItem(name: "offset", value: String(offset)))
        return try await get("api/v1/reviews", query: query)
    }

    /// `GET /api/v1/reviews/{id}`
    public func getReview(id: String) async throws -> Review {
        try await get("api/v1/reviews/\(id)")
    }

    // MARK: - Write

    /// `POST /api/v1/reviews` → `{ ok: true, data: { id } }`. Returns the new id.
    public func createReview(
        targetType: String,
        targetId: String,
        personId: String,
        rating: Int,
        title: String,
        body: String,
        photos: [String] = [],
        meta: [String: JSONValue] = [:]
    ) async throws -> String {
        let payload = CreateReviewBody(
            targetType: targetType,
            targetId: targetId,
            personId: personId,
            rating: rating,
            title: title,
            body: body,
            photos: photos,
            meta: meta
        )
        let created: CreatedId = try await post("api/v1/reviews", body: payload)
        return created.id
    }

    /// `PATCH /api/v1/reviews/{id}` (owner edit). Returns void (`{ ok: true }`).
    public func updateReview(
        id: String,
        rating: Int,
        title: String,
        body: String,
        photos: [String] = [],
        meta: [String: JSONValue] = [:]
    ) async throws {
        let payload = UpdateReviewBody(
            rating: rating,
            title: title,
            body: body,
            photos: photos,
            meta: meta
        )
        try await patch("api/v1/reviews/\(id)", body: payload)
    }

    /// `DELETE /api/v1/reviews/{id}`. Returns void.
    public func deleteReview(id: String) async throws {
        try await delete("api/v1/reviews/\(id)")
    }

    // MARK: - Moderation (admin)

    /// `POST /api/v1/reviews/{id}/approve`. Returns void.
    public func approveReview(id: String) async throws {
        try await postVoid("api/v1/reviews/\(id)/approve")
    }

    /// `POST /api/v1/reviews/{id}/reject` (body: `{ note }`). Returns void.
    public func rejectReview(id: String, note: String = "") async throws {
        try await postVoid("api/v1/reviews/\(id)/reject", body: ModerateBody(note: note))
    }

    /// `POST /api/v1/reviews/{id}/hide` (body: `{ note }`). Returns void.
    public func hideReview(id: String, note: String = "") async throws {
        try await postVoid("api/v1/reviews/\(id)/hide", body: ModerateBody(note: note))
    }

    /// `POST /api/v1/reviews/{id}/reply` (body: `{ body }`). Returns void.
    public func replyReview(id: String, body: String) async throws {
        try await postVoid("api/v1/reviews/\(id)/reply", body: ReplyBody(body: body))
    }

    /// `DELETE /api/v1/reviews/{id}/reply`. Returns void.
    public func deleteReply(id: String) async throws {
        try await delete("api/v1/reviews/\(id)/reply")
    }

    // MARK: - Aggregate

    /// `GET /api/v1/reviews/aggregate?targetType=&targetId=` →
    /// `{ average, count, distribution }`.
    public func getAggregate(targetType: String, targetId: String) async throws -> ReviewAggregate {
        let query = [
            URLQueryItem(name: "targetType", value: targetType),
            URLQueryItem(name: "targetId", value: targetId),
        ]
        return try await get("api/v1/reviews/aggregate", query: query)
    }

    // MARK: - Target config

    /// `GET /api/v1/reviews/targets` → `[ReviewTargetConfig]`.
    public func listTargetConfigs() async throws -> [ReviewTargetConfig] {
        try await get("api/v1/reviews/targets")
    }

    /// `PUT /api/v1/reviews/targets` (body: `ReviewTargetConfig`). Returns void.
    /// Uses the shared snake_case encoder so `verifiedGate`→`verified_gate` etc.
    public func setTargetConfig(_ config: ReviewTargetConfig) async throws {
        try await putVoid("api/v1/reviews/targets", body: config)
    }

    /// `GET /api/v1/reviews/targets/{targetType}` → `ReviewTargetConfig`.
    public func getTargetConfig(targetType: String) async throws -> ReviewTargetConfig {
        try await get("api/v1/reviews/targets/\(targetType)")
    }
}

// MARK: - Private request bodies

private struct CreateReviewBody: Encodable {
    let targetType: String
    let targetId: String
    let personId: String
    let rating: Int
    let title: String
    let body: String
    let photos: [String]
    let meta: [String: JSONValue]
}

private struct UpdateReviewBody: Encodable {
    let rating: Int
    let title: String
    let body: String
    let photos: [String]
    let meta: [String: JSONValue]
}

private struct ModerateBody: Encodable {
    let note: String
}

private struct ReplyBody: Encodable {
    let body: String
}

/// `{ ok: true, data: { id } }` payload from `POST /api/v1/reviews`.
public struct CreatedId: Codable {
    public let id: String
}
