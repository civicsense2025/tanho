import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { NewPageForm } from "@/modules/pages/admin/NewPageForm";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "New page" };

export default function NewPagePage() {
  return (
    <Suspense fallback={null}>
      <NewPagePageInner />
    </Suspense>
  );
}

async function NewPagePageInner() {
  await requireUser();
  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        New page
      </h1>
      <NewPageForm />
    </AdminPage>
  );
}
