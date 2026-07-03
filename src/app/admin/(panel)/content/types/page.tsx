import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { listCustomTypes } from "@/modules/custom-types/queries";
import { readContentTypesSettings } from "@/modules/custom-types/content-types-settings";
import { TypesScreen, type TypeCount } from "@/modules/custom-types/admin/TypesScreen";
import { listPages } from "@/modules/pages/queries";
import { listEntries } from "@/modules/entries/queries";
import { listProducts, listCollectionsWithCounts } from "@/modules/commerce/queries";

export const metadata = { title: "Content types" };

export default async function AdminTypesPage() {
  await requireUser("owner");

  const [allPages, projects, guides, resources, products, collections, custom, settings] =
    await Promise.all([
      listPages(),
      listEntries("project"),
      listEntries("guide"),
      listEntries("resource"),
      listProducts(),
      listCollectionsWithCounts(),
      listCustomTypes(),
      readContentTypesSettings(),
    ]);

  const pubCount = (rows: { status: string }[]) => rows.filter((r) => r.status === "published").length;
  const pages = allPages.filter((p) => p.kind !== "post");
  const posts = allPages.filter((p) => p.kind === "post");

  const counts: Record<string, TypeCount> = {
    page: { total: pages.length, live: pages.filter((p) => p.status === "published").length },
    post: { total: posts.length, live: posts.filter((p) => p.status === "published").length },
    product: { total: products.length, live: products.filter((p) => p.status === "active").length },
    collection: { total: collections.length, live: collections.filter((c) => c.visible).length },
    project: { total: projects.length, live: pubCount(projects) },
    guide: { total: guides.length, live: pubCount(guides) },
    resource: { total: resources.length, live: pubCount(resources) },
  };

  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Content types
      </h1>
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Every entity your site can hold. Turn a type off to hide it from your
        site and search engines.
      </p>
      <TypesScreen custom={custom} counts={counts} disabled={settings.disabled} />
    </AdminPage>
  );
}
