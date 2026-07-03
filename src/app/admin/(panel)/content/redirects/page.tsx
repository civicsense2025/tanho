import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listRedirects } from "@/modules/redirects/queries";
import { RedirectsManager } from "@/modules/redirects/admin/RedirectsManager";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Redirects" };

export default function RedirectsPage() {
  return (
    <Suspense fallback={null}>
      <RedirectsPageInner />
    </Suspense>
  );
}

async function RedirectsPageInner() {
  await requireUser("owner");
  const redirects = await listRedirects();
  return (
    <AdminPage>
      <h1
        style={{
          margin: "0 0 var(--space-6)",
          fontSize: "var(--text-h2)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        Redirects
      </h1>
      <RedirectsManager redirects={redirects} />
    </AdminPage>
  );
}
