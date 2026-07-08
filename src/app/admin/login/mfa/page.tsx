import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/modules/auth/session";
import { MfaChallengeForm } from "./MfaChallengeForm";

export const metadata = { title: "MFA · Admin" };

/**
 * Public MFA challenge page — shown after password OK but the account requires
 * a second factor. The pending MFA session is tracked via a signed cookie set
 * by the login flow (no token in the URL). If the user is already fully
 * authenticated, redirect to the panel.
 */
export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengePageInner />
    </Suspense>
  );
}

async function MfaChallengePageInner() {
  if (await getAdminUser()) redirect("/admin");
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MfaChallengeForm />
    </div>
  );
}
