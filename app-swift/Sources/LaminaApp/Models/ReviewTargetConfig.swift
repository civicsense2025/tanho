import Foundation

/// Per-target-type review config, mirroring `ReviewTargetConfig`
/// (`src/modules/reviews/queries.ts`) and `reviewTargetConfigSchema`. A row
/// absent on the server means the documented defaults apply (post-moderation,
/// optional verified badge, login required, ratings on, 1–5). `id` is the
/// `targetType` so configs work in SwiftUI `List`/`ForEach` diffing.
public struct ReviewTargetConfig: Codable, Identifiable, Hashable {
    public let targetType: String
    public let enabled: Bool
    public let moderation: Moderation
    public let verifiedGate: VerifiedGate
    public let requireLogin: Bool
    /// `false` = comment-only target (Patreon-style, no stars; rating 0).
    public let allowRating: Bool
    public let minRating: Int
    public let maxRating: Int

    public var id: String { targetType }

    public enum Moderation: String, Codable, CaseIterable {
        case pre, post
    }

    public enum VerifiedGate: String, Codable, CaseIterable {
        case required, optional
    }
}
