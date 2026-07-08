import Foundation

/// A single review, mirroring the platform's `ReviewWithMeta` serialized shape
/// (`src/modules/reviews/queries.ts`). The list and detail endpoints return
/// this object — a `reviews` row joined with its owner reply, the reviewer's
/// display name, and the current viewer's helpful-vote flag.
///
/// Wire format is snake_case (`target_type`, `verified_method`, `helpful_votes`
/// …); the `APIClient` decoder converts to these camelCase properties.
public struct Review: Codable, Identifiable, Hashable {
    public let id: String
    public let targetType: String
    public let targetId: String
    public let personId: String
    /// 1–5, or 0 for comment-only targets (`allowRating: false`).
    public let rating: Int
    public let title: String
    public let body: String
    /// `mediaId`s of uploaded photos (resolved via the media module).
    public let photos: [String]
    public let status: ReviewStatus
    public let verified: Bool
    public let verifiedMethod: VerifiedMethod
    /// Order/entitlement/membership ref for audit display; null when unverified.
    public let verifiedRef: String?
    public let helpfulVotes: Int
    /// Type-specific extras (completion %, dimension ratings, reaction type).
    public let meta: [String: JSONValue]
    /// `web` | `email` | `api` | `import` — kept as a string for forward-compat.
    public let source: String
    /// Epoch milliseconds.
    public let at: Int
    public let updatedAt: Int
    /// Reviewer display name (joined from `people`; "Anonymous" if missing).
    public let reviewerName: String
    /// Owner reply if any (one per review, Udemy-style single threading).
    public let reply: ReviewReply?
    /// Whether the current viewer has voted this review helpful.
    public let viewerVoted: Bool

    public enum ReviewStatus: String, Codable, CaseIterable {
        case pending, approved, rejected, hidden
    }

    public enum VerifiedMethod: String, Codable, CaseIterable {
        case order, enrollment, membership, none
    }
}

/// Owner reply to a review — `{ body, at }`.
public struct ReviewReply: Codable, Hashable {
    public let body: String
    /// Epoch milliseconds.
    public let at: Int
}

/// Block-level + API sort options, mirroring `reviewSortSchema` (`recent`,
/// `helpful`, `highest`, `lowest`).
public enum ReviewSort: String, Codable, CaseIterable, Identifiable {
    case recent, helpful, highest, lowest
    public var id: String { rawValue }
    public var label: String {
        switch self {
        case .recent: return "Most recent"
        case .helpful: return "Most helpful"
        case .highest: return "Highest rating"
        case .lowest: return "Lowest rating"
        }
    }
}
