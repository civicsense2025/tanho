import SwiftUI

/// Public reviews list for one reviewable target (`targetType`/`targetId`).
///
/// Shows the cached aggregate summary (average, count, per-star distribution),
/// a sort picker (`recent` / `helpful` / `highest` / `lowest`), and a list of
/// review cards. Each card pushes `ReviewDetailScreen` via a `NavigationLink`.
/// Data is fetched through `APIClient.listReviews` + `getAggregate`.
public struct ReviewsScreen: View {
    let api: APIClient
    let targetType: String
    let targetId: String
    @StateObject private var vm: ReviewsViewModel

    public init(api: APIClient, targetType: String, targetId: String) {
        self.api = api
        self.targetType = targetType
        self.targetId = targetId
        _vm = StateObject(wrappedValue: ReviewsViewModel(
            api: api, targetType: targetType, targetId: targetId))
    }

    public var body: some View {
        List {
            if let agg = vm.aggregate {
                Section {
                    SummaryHeader(aggregate: agg)
                }
            }

            if vm.reviews.isEmpty && !vm.isLoading {
                Section {
                    Text("No reviews yet")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            } else {
                Section {
                    ForEach(vm.reviews) { review in
                        NavigationLink(
                            destination: ReviewDetailScreen(
                                api: api, reviewId: review.id, isAdmin: false)
                        ) {
                            ReviewRow(review: review)
                        }
                    }
                } header: {
                    Picker("Sort", selection: $vm.sort) {
                        ForEach(ReviewSort.allCases) { sort in
                            Text(sort.label).tag(sort)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
        }
        .navigationTitle("Reviews")
        .refreshable { await vm.load() }
        .task { if vm.reviews.isEmpty { await vm.load() } }
        .onChange(of: vm.sort) { _ in
            Task { await vm.load() }
        }
        .overlay {
            if vm.isLoading && vm.reviews.isEmpty {
                ProgressView("Loading reviews…")
            } else if let error = vm.error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title)
                        .foregroundColor(.orange)
                    Text(error).font(.callout).multilineTextAlignment(.center)
                    Button("Retry") { Task { await vm.load() } }
                }
                .padding()
            }
        }
    }
}

@MainActor
final class ReviewsViewModel: ObservableObject {
    @Published var aggregate: ReviewAggregate?
    @Published var reviews: [Review] = []
    @Published var sort: ReviewSort = .recent
    @Published var isLoading = false
    @Published var error: String?

    let api: APIClient
    let targetType: String
    let targetId: String

    init(api: APIClient, targetType: String, targetId: String) {
        self.api = api
        self.targetType = targetType
        self.targetId = targetId
    }

    func load() async {
        isLoading = true
        error = nil
        async let agg = api.getAggregate(targetType: targetType, targetId: targetId)
        async let list = api.listReviews(
            targetType: targetType, targetId: targetId,
            status: .approved, sort: sort, limit: 50, offset: 0)
        do {
            let (a, r) = try await (agg, list)
            aggregate = a
            reviews = r
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

/// Big average + count + per-star distribution bars.
private struct SummaryHeader: View {
    let aggregate: ReviewAggregate

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(String(format: "%.1f", aggregate.average))
                    .font(.system(size: 34, weight: .bold))
                StarRatingView(rating: aggregate.average)
                Spacer()
                Text("\(aggregate.count) review\(aggregate.count == 1 ? "" : "s")")
                    .foregroundColor(.secondary)
            }
            distributionBars
        }
        .padding(.vertical, 4)
    }

    /// Vertical bar list: 5★ at top → 1★ at bottom, with filled bar widths
    /// proportional to that star's share of the total.
    private var distributionBars: some View {
        let total = max(aggregate.count, 1)
        // distribution = [count1★, count2★, count3★, count4★, count5★]
        return VStack(spacing: 4) {
            ForEach((1...5).reversed(), id: \.self) { star in
                let count = aggregate.distribution[safe: star - 1] ?? 0
                HStack(spacing: 8) {
                    Text("\(star)★").font(.caption).frame(width: 28, alignment: .leading)
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.secondary.opacity(0.15))
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.orange)
                                .frame(width: geo.size.width * CGFloat(count) / CGFloat(total))
                        }
                    }
                    .frame(height: 8)
                    Text("\(count)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(width: 36, alignment: .trailing)
                }
            }
        }
    }
}

/// One review in the list — stars, verified badge, title, body snippet,
/// reviewer + date, helpful count.
private struct ReviewRow: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                StarRatingView(rating: Double(review.rating))
                if review.rating == 0 { Text("Comment").font(.caption).foregroundColor(.secondary) }
                Spacer()
                if !review.title.isEmpty {
                    Text(review.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                }
            }
            if !review.body.isEmpty {
                Text(review.body).font(.callout).lineLimit(3).foregroundColor(.primary)
            }
            HStack(spacing: 8) {
                VerifiedBadge(verified: review.verified, method: review.verifiedMethod)
                Spacer()
                Text("\(review.reviewerName) · \(reviewDateString(review.at))")
                    .font(.caption).foregroundColor(.secondary)
                if review.helpfulVotes > 0 {
                    Label("\(review.helpfulVotes)", systemImage: "hand.thumbsup")
                        .font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// Safe subscript for the distribution array (defensive against short arrays).
private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
