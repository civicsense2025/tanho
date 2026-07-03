import { payments } from "@/adapters/payments";
import { getViewer } from "@/modules/people/viewer";
import { getMembershipTiers } from "@/modules/memberships/tiers";
import { MembershipPricing } from "@/modules/memberships/public/MembershipPricing";
import type { CtaMode } from "@/modules/memberships/public/JoinButton";

export const metadata = { title: "Membership" };

/**
 * Public membership page. The CTA MODE is decided here, on the server, from
 * the session viewer — the client never gets to choose. Active members see
 * "Manage membership"; signed-in non-members see "Join"; anonymous readers are
 * pointed at sign-in.
 */
export default async function MembershipPage() {
  const [tiers, viewer] = await Promise.all([getMembershipTiers(), getViewer()]);
  const configured = payments.isConfigured();

  const mode: CtaMode = !viewer
    ? "signin"
    : viewer.memberActive
      ? "manage"
      : "join";

  return (
    <main
      style={{
        maxWidth: "60rem",
        margin: "0 auto",
        padding: "var(--space-10) var(--gutter) var(--space-12)",
      }}
    >
      <header style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-h1)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Membership
        </h1>
        <p
          style={{
            margin: "var(--space-2) 0 0",
            color: "var(--text-muted)",
            fontSize: "var(--text-md)",
          }}
        >
          Pick a plan that fits. Billing is handled securely — card details
          never touch this site.
        </p>
      </header>

      {tiers.length === 0 ? (
        <p style={{ color: "var(--text-faint)" }}>
          No membership tiers yet. Add them under Settings &rsaquo; Membership.
        </p>
      ) : (
        <MembershipPricing tiers={tiers} mode={mode} configured={configured} />
      )}
    </main>
  );
}
