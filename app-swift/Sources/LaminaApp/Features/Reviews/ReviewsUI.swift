import SwiftUI

// Shared, review-specific SwiftUI helpers used by the three reviews screens.
// Kept here (rather than in a global Core/UI folder) so the reviews feature is
// self-contained and matches the prior session's per-feature helper pattern.

/// Read-only star row. Renders `rating` (e.g. 4.2) as filled / half / empty
/// stars up to `max`. Uses SF Symbols so it works on both macOS and iOS.
struct StarRatingView: View {
    let rating: Double
    var max: Int = 5

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<max, id: \.self) { i in
                let d = rating - Double(i)
                let name = symbol(for: d)
                Image(systemName: name)
                    .foregroundColor(d > 0 ? .orange : .secondary)
                    .accessibilityHidden(true)
            }
        }
        .accessibilityLabel("Rating \(String(format: "%.1f", rating)) out of \(max)")
    }

    private func symbol(for delta: Double) -> String {
        if delta >= 1 { return "star.fill" }
        if delta >= 0.5 { return "star.leadinghalf.filled" }
        return "star"
    }
}

/// Small verified-purchase badge. Mirrors the platform's `verified` flag +
/// `verifiedMethod` ("order", "enrollment", "membership", "none").
struct VerifiedBadge: View {
    let verified: Bool
    let method: Review.VerifiedMethod

    var body: some View {
        if verified {
            Label(label, systemImage: "checkmark.seal.fill")
                .font(.caption)
                .foregroundColor(.green)
        }
    }

    private var label: String {
        switch method {
        case .order: return "Verified buyer"
        case .enrollment: return "Verified student"
        case .membership: return "Verified member"
        case .none: return "Verified"
        }
    }
}

/// Status pill for the moderation queue / admin detail view.
struct StatusBadge: View {
    let status: Review.ReviewStatus

    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .clipShape(Capsule())
    }

    private var color: Color {
        switch status {
        case .approved: return .green
        case .pending: return .orange
        case .rejected: return .red
        case .hidden: return .gray
        }
    }
}

/// Epoch-milliseconds (the platform's `at`/`updatedAt` ints) → "Jul 6, 2026".
func reviewDateString(_ ms: Int) -> String {
    let date = Date(timeIntervalSince1970: TimeInterval(ms) / 1000.0)
    return date.formatted(date: .abbreviated, time: .omitted)
}
