import type { RenderCtx } from "../types";
import type { PollContent } from "./fields";

/**
 * A lightweight opinion poll. Server-renders the question + option buttons with
 * a complete no-JS fallback; the shared block-enhancement island (see
 * blocks/client/enhancements.tsx) wires click-to-vote + result bars, persisting
 * a one-time vote per poll in localStorage. No backend, no PII — a low-stakes
 * engagement widget (feedback, "which should I build next", etc.).
 *
 * The poll is keyed by a stable id derived from the block's own DOM id
 * (`_anchorId`) so two polls on a page keep independent votes; options carry
 * their seed count in `data-seed` for the enhancement to total.
 */
export function RenderPoll({ content }: { content: PollContent & { _anchorId?: string }; ctx: RenderCtx }) {
  if (content.options.length < 2) return null;
  const pollId = content._anchorId || "poll";

  return (
    <div data-poll={pollId} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {content.question ? (
        <p style={{ margin: 0, fontWeight: "var(--weight-medium)" as never, fontSize: "var(--text-lg)" }}>{content.question}</p>
      ) : null}
      <div role="group" aria-label={content.question || "Poll"} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {content.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            data-poll-option={i}
            data-seed={opt.seed}
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              textAlign: "left",
              cursor: "pointer",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              color: "var(--text)",
              overflow: "hidden",
            }}
          >
            {/* Result bar — width driven by the enhancement via --poll-pct; 0 until voted. */}
            <span aria-hidden data-poll-bar style={{ position: "absolute", inset: 0, width: "var(--poll-pct, 0%)", background: "var(--accent-tint)", transition: "width var(--dur) var(--ease)", pointerEvents: "none" }} />
            <span style={{ position: "relative", zIndex: 1 }}>{opt.label}</span>
            <span aria-hidden data-poll-pct-label style={{ position: "relative", zIndex: 1, fontSize: "var(--text-xs)", color: "var(--text-muted)", opacity: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
