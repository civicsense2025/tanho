import Foundation

/// Cached aggregate for a target, mirroring `ReviewAggregateSummary`
/// (`src/modules/reviews/queries.ts`). `distribution` is the per-star count
/// array `[count1★, count2★, count3★, count4★, count5★]`. Rating-0
/// (comment-only) reviews are excluded from `average` but counted in `count`.
public struct ReviewAggregate: Codable, Hashable {
    public let average: Double
    public let count: Int
    public let distribution: [Int]
}
