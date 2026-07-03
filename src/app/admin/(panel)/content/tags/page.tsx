import { requireUser } from "@/modules/auth/guards";
import { listTagsWithCounts } from "@/modules/tags/queries";
import { TagsScreen } from "@/modules/tags/admin/TagsScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Tags" };

export default async function AdminTagsPage() {
  await requireUser("owner");
  const tags = await listTagsWithCounts();
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
        Tags
      </h1>
      <TagsScreen initial={tags} />
    </AdminPage>
  );
}
