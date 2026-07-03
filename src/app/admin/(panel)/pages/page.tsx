import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listPages } from "@/modules/pages/queries";
import { PagesList } from "@/modules/pages/admin/PagesList";
import { Button } from "@/components/core/Button";
import { codePageSummaries } from "@/app/(public)/code-pages/registry";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Pages" };

export default function AdminPagesPage() {
  return (
    <Suspense fallback={null}>
      <AdminPagesPageInner />
    </Suspense>
  );
}

async function AdminPagesPageInner() {
  await requireUser();
  const pages = await listPages();
  return (
    <AdminPage>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
          Pages
        </h1>
        <span style={{ flex: 1 }} />
        <Link href="/admin/pages/new">
          <Button variant="accent" size="sm">+ New page</Button>
        </Link>
      </div>
      <PagesList pages={pages} codePages={codePageSummaries()} />
    </AdminPage>
  );
}
