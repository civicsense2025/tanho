import { Suspense } from "react";
import { redirect } from "next/navigation";
import { hasAnyUser } from "@/modules/onboarding/install-state";
import { InstallForm } from "./InstallForm";

export const metadata = { title: "Set up your site" };

/**
 * First-run install. Reachable ONLY before any admin exists — the moment an
 * owner has been created this route redirects to /admin/login, so it can never
 * be used to mint a second admin. `hasAnyUser()` reads the DB, which Cache
 * Components requires inside a Suspense boundary (same shape as the login page).
 */
export default function AdminInstallPage() {
  return (
    <Suspense fallback={null}>
      <AdminInstallPageInner />
    </Suspense>
  );
}

async function AdminInstallPageInner() {
  if (await hasAnyUser()) redirect("/admin/login");
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <InstallForm />
    </div>
  );
}
