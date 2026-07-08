import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { listCustomTypes } from "@/modules/custom-types/queries";
import { readContentTypesSettings } from "@/modules/custom-types/content-types-settings";
import { TypesScreen, type TypeCount } from "@/modules/custom-types/admin/TypesScreen";
import { listPages } from "@/modules/pages/queries";
import { listProducts, listCollectionsWithCounts } from "@/modules/commerce/queries";

export const metadata = { title: "Content types" };

export default function AdminTypesPage() {
  return (
    <Suspense fallback={null}>
      <AdminTypesPageInner />
    </Suspense>
  );
}

async function AdminTypesPageInner() {
  await requireUser("owner");

  const [allPages, products, collections, custom, settings] = await Promise.all([
    listPages(),
    listProducts(),
    listCollectionsWithCounts(),
    listCustomTypes(),
    readContentTypesSettings(),
  ]);

  const pages = allPages.filter((p) => p.kind !== "post");
  const posts = allPages.filter((p) => p.kind === "post");

  const counts: Record<string, TypeCount> = {
    page: { total: pages.length, live: pages.filter((p) => p.status === "published").length },
    post: { total: posts.length, live: posts.filter((p) => p.status === "published").length },
    product: { total: products.length, live: products.filter((p) => p.status === "active").length },
    collection: { total: collections.length, live: collections.filter((c) => c.visible).length },
  };

  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Content types
      </h1>
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Every entity your site can hold. Built-in types live on dedicated
        tables; data-backed types each get their own table with one typed column
        per field. Turn a type off to hide it from your site and search engines.
      </p>
      <TypesScreen custom={custom} counts={counts} disabled={settings.disabled} />
    </AdminPage>
  );
}
