import SwiftUI

/// Admin moderation queue — pending reviews across all targets.
///
/// Lists `status: .pending` with no target filter (admin sees everything),
/// newest first. Tap a row to open `ReviewDetailScreen` with `isAdmin: true`,
/// which exposes the approve / reject / hide / reply actions. A target-type
/// filter narrows the queue (the platform's `listPendingReviews` accepts an
/// optional `targetType`).
public struct ReviewModerationScreen: View {
    let api: APIClient
    @StateObject private var vm: ModerationViewModel

    public init(api: APIClient) {
        self.api = api
        _vm = StateObject(wrappedValue: ModerationViewModel(api: api))
    }

    public var body: some View {
        List {
            Section {
                Picker("Target", selection: $vm.targetFilter) {
                    Text("All targets").tag(String?.none)
                    ForEach(vm.knownTargets, id: \.self) { target in
                        Text(target).tag(Optional(target))
                    }
                }
            }
            if vm.pending.isEmpty && !vm.isLoading {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.seal")
                                .font(.title2).foregroundColor(.green)
                            Text("No pending reviews").foregroundColor(.secondary)
                        }
                        Spacer()
                    }.padding(.vertical, 8)
                }
            } else {
                Section {
                    ForEach(vm.pending) { review in
                        NavigationLink(
                            destination: ReviewDetailScreen(
                                api: api, reviewId: review.id, isAdmin: true)
                        ) {
                            ModerationRow(review: review)
                        }
                    }
                } header: {
                    Text("\(vm.pending.count) pending")
                }
            }
        }
        .navigationTitle("Moderation")
        .refreshable { await vm.load() }
        .task { if vm.pending.isEmpty { await vm.load() } }
        .onChange(of: vm.targetFilter) { _ in Task { await vm.load() } }
        .overlay {
            if vm.isLoading && vm.pending.isEmpty {
                ProgressView("Loading queue…")
            } else if let error = vm.error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title).foregroundColor(.orange)
                    Text(error).multilineTextAlignment(.center)
                    Button("Retry") { Task { await vm.load() } }
                }.padding()
            }
        }
    }
}

@MainActor
final class ModerationViewModel: ObservableObject {
    @Published var pending: [Review] = []
    @Published var targetFilter: String?
    @Published var isLoading = false
    @Published var error: String?

    /// Distinct target types seen in the current batch, for the filter picker.
    @Published var knownTargets: [String] = []

    let api: APIClient

    init(api: APIClient) { self.api = api }

    func load() async {
        isLoading = true
        error = nil
        do {
            // No target filter = admin sees all pending across targets.
            let rows = try await api.listReviews(
                targetType: targetFilter,
                targetId: nil,
                status: .pending,
                sort: .recent,
                limit: 100,
                offset: 0)
            pending = rows
            knownTargets = Array(Set(rows.map(\.targetType))).sorted()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

/// One pending review in the queue — status pill, target, reviewer, snippet,
/// rating, date. Compact so the queue scans quickly.
private struct ModerationRow: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                StatusBadge(status: review.status)
                Text(review.targetType).font(.caption.weight(.semibold)).foregroundColor(.secondary)
                Spacer()
                StarRatingView(rating: Double(review.rating))
            }
            if !review.title.isEmpty {
                Text(review.title).font(.subheadline.weight(.semibold)).lineLimit(1)
            }
            if !review.body.isEmpty {
                Text(review.body).font(.callout).lineLimit(2).foregroundColor(.secondary)
            }
            HStack(spacing: 6) {
                Text(review.reviewerName).font(.caption.weight(.semibold))
                Text("·").font(.caption).foregroundColor(.secondary)
                Text(reviewDateString(review.at)).font(.caption).foregroundColor(.secondary)
                Spacer()
                VerifiedBadge(verified: review.verified, method: review.verifiedMethod)
            }
        }
        .padding(.vertical, 4)
    }
}
