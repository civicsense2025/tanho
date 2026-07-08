import SwiftUI

/// Full detail for a single review. Public viewers see stars, verified badge,
/// title, body, photos, owner reply, and helpful votes. When `isAdmin` is true
/// (the moderation queue opens this with `isAdmin: true`), approve / reject /
/// hide / reply / delete-reply actions are exposed and call the admin endpoints.
public struct ReviewDetailScreen: View {
    let api: APIClient
    let reviewId: String
    let isAdmin: Bool
    @StateObject private var vm: ReviewDetailViewModel

    public init(api: APIClient, reviewId: String, isAdmin: Bool) {
        self.api = api
        self.reviewId = reviewId
        self.isAdmin = isAdmin
        _vm = StateObject(wrappedValue: ReviewDetailViewModel(api: api, reviewId: reviewId))
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let review = vm.review {
                    content(for: review)
                } else if vm.isLoading {
                    ProgressView("Loading review…").frame(maxWidth: .infinity).padding(.top, 40)
                } else if let error = vm.error {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.title).foregroundColor(.orange)
                        Text(error).multilineTextAlignment(.center)
                        Button("Retry") { Task { await vm.load() } }
                    }.padding(.top, 40)
                }
            }
            .padding()
        }
        .navigationTitle("Review")
        .task { if vm.review == nil { await vm.load() } }
        .alert("Reply to review", isPresented: $vm.showReplyEditor) {
            TextField("Your reply", text: $vm.replyDraft, axis: .vertical)
                .lineLimit(3...6)
            Button("Send", action: { Task { await vm.submitReply() } })
            Button("Cancel", role: .cancel) {}
        }
        .alert("Reject review", isPresented: $vm.showRejectEditor) {
            TextField("Moderation note (optional)", text: $vm.noteDraft)
            Button("Reject", role: .destructive, action: { Task { await vm.reject() } })
            Button("Cancel", role: .cancel) {}
        }
        .alert("Hide review", isPresented: $vm.showHideEditor) {
            TextField("Moderation note (optional)", text: $vm.noteDraft)
            Button("Hide", role: .destructive, action: { Task { await vm.hide() } })
            Button("Cancel", role: .cancel) {}
        }
        .alert(vm.actionError == nil ? "" : "Action failed", isPresented: showActionError) {
            Button("OK", role: .cancel) { vm.actionError = nil }
        } message: {
            Text(vm.actionError ?? "")
        }
    }

    @ViewBuilder
    private func content(for review: Review) -> some View {
        header(for: review)
        if !review.title.isEmpty { Text(review.title).font(.title2.weight(.semibold)) }
        if !review.body.isEmpty { Text(review.body).font(.body) }
        if !review.photos.isEmpty { photoStrip(review.photos) }
        if let reply = review.reply { replyCard(reply) }
        if isAdmin { adminActions(for: review) }
    }

    private func header(for review: Review) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                StarRatingView(rating: Double(review.rating))
                if review.rating == 0 { Text("Comment only").font(.caption).foregroundColor(.secondary) }
                Spacer()
                if isAdmin { StatusBadge(status: review.status) }
            }
            HStack(spacing: 8) {
                Text(review.reviewerName).font(.subheadline.weight(.semibold))
                Text("·").foregroundColor(.secondary)
                Text(reviewDateString(review.at)).font(.subheadline).foregroundColor(.secondary)
                VerifiedBadge(verified: review.verified, method: review.verifiedMethod)
            }
            if review.helpfulVotes > 0 {
                Label("\(review.helpfulVotes) found this helpful", systemImage: "hand.thumbsup")
                    .font(.caption).foregroundColor(.secondary)
            }
        }
    }

    /// `photos` are mediaIds (resolved via the media module on the server). The
    /// client doesn't have a media-URL resolver yet, so show count + id chips as
    /// placeholders rather than broken images.
    private func photoStrip(_ photos: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Photos").font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(photos, id: \.self) { id in
                        VStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.secondary.opacity(0.15))
                                .frame(width: 88, height: 88)
                                .overlay(Image(systemName: "photo").foregroundColor(.secondary))
                            Text(id).font(.caption2).foregroundColor(.secondary).lineLimit(1)
                        }
                    }
                }
            }
        }
    }

    private func replyCard(_ reply: ReviewReply) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Owner reply", systemImage: "arrowshape.turn.up.left.fill")
                .font(.headline)
            Text(reply.body).font(.callout)
            Text(reviewDateString(reply.at)).font(.caption).foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color.secondary.opacity(0.08))
        .cornerRadius(10)
    }

    @ViewBuilder
    private func adminActions(for review: Review) -> some View {
        Divider()
        VStack(alignment: .leading, spacing: 10) {
            Text("Moderation").font(.headline)
            HStack {
                if review.status != .approved {
                    Button("Approve") { Task { await vm.approve() } }
                        .buttonStyle(.borderedProminent).tint(.green)
                }
                if review.status != .rejected {
                    Button("Reject") { vm.showRejectEditor = true }
                        .buttonStyle(.bordered).tint(.red)
                }
                if review.status != .hidden {
                    Button("Hide") { vm.showHideEditor = true }
                        .buttonStyle(.bordered)
                }
            }
            if review.reply == nil {
                Button("Reply") { vm.showReplyEditor = true }
                    .buttonStyle(.bordered)
            } else {
                Button("Delete reply", role: .destructive) { Task { await vm.deleteReply() } }
            }
            if vm.isWorking { ProgressView().padding(.top, 4) }
        }
    }

    /// Only present the error alert when there's actually a message to show.
    private var showActionError: Binding<Bool> {
        Binding(get: { vm.actionError != nil }, set: { if !$0 { vm.actionError = nil } })
    }
}

@MainActor
final class ReviewDetailViewModel: ObservableObject {
    @Published var review: Review?
    @Published var isLoading = false
    @Published var error: String?
    @Published var isWorking = false
    @Published var actionError: String?

    // Alert/sheet bindings.
    @Published var showReplyEditor = false
    @Published var showRejectEditor = false
    @Published var showHideEditor = false
    @Published var replyDraft = ""
    @Published var noteDraft = ""

    let api: APIClient
    let reviewId: String

    init(api: APIClient, reviewId: String) {
        self.api = api
        self.reviewId = reviewId
    }

    func load() async {
        isLoading = true
        error = nil
        do { review = try await api.getReview(id: reviewId) }
        catch { self.error = error.localizedDescription }
        isLoading = false
    }

    private func runModeration(_ action: () async throws -> Void) async {
        isWorking = true
        actionError = nil
        do {
            try await action()
            await load() // refresh after status change
        } catch {
            actionError = error.localizedDescription
        }
        isWorking = false
    }

    func approve() async { await runModeration { try await api.approveReview(id: reviewId) } }
    func reject() async { await runModeration { try await api.rejectReview(id: reviewId, note: noteDraft) }; noteDraft = "" }
    func hide() async { await runModeration { try await api.hideReview(id: reviewId, note: noteDraft) }; noteDraft = "" }
    func deleteReply() async { await runModeration { try await api.deleteReply(id: reviewId) } }

    func submitReply() async {
        let draft = replyDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !draft.isEmpty else { return }
        await runModeration { try await api.replyReview(id: reviewId, body: draft) }
        replyDraft = ""
    }
}
