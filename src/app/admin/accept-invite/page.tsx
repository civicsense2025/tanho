import { Suspense } from "react";
import { AcceptInviteForm } from "./AcceptInviteForm";

export const metadata = { title: "Accept invite · Admin" };

/**
 * Public accept-invite page — no requireUser. The token arrives via
 * `searchParams.token`; the form posts to the `acceptInvite` server action.
 */
export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <AcceptInvitePageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function AcceptInvitePageInner({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {token ? (
        <AcceptInviteForm token={token} />
      ) : (
        <div style={{ width: "var(--width-form)", textAlign: "center" }}>
          <h1
            style={{
              margin: "0 0 var(--space-4)",
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-sm)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-widest)",
              color: "var(--text-muted)",
            }}
          >
            Invalid invite
          </h1>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            This invite link is missing a token. Check your email for the correct link.
          </p>
        </div>
      )}
    </div>
  );
}
