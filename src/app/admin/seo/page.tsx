import { getAdminSession } from "@/lib/auth";
import { listSeoTemplates } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { SeoTemplatesForm } from "@/components/SeoTemplatesForm";
import type { SeoEntityType } from "@/lib/db";

export const dynamic = "force-dynamic";

const ENTITY_TYPES: SeoEntityType[] = ["project", "guide", "resource", "page"];

export default async function SeoTemplatesPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  const templates = await listSeoTemplates();
  const byType = new Map(templates.map((t) => [t.entityType, t]));

  return (
    <AdminPageShell title="SEO templates">
      <p style={{ margin: "0 0 var(--space-8)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Default title/description templates used when a Project, Guide, Resource, or Page doesn&apos;t set its own SEO
        override. Per-item overrides always win — see the SEO section on each item&apos;s edit page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        {ENTITY_TYPES.map((entityType) => {
          const template = byType.get(entityType);
          return (
            <SeoTemplatesForm
              key={entityType}
              entityType={entityType}
              initial={{
                titleTemplate: template?.titleTemplate || "",
                descriptionTemplate: template?.descriptionTemplate || "",
              }}
            />
          );
        })}
      </div>
    </AdminPageShell>
  );
}
