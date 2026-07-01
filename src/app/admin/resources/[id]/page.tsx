import { getAdminSession } from "@/lib/auth";
import { getResourceById, getPlatformsForResource, listPlatforms } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ResourceForm } from "@/components/ResourceForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditResourcePage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const resource = await getResourceById(id);
  if (!resource) notFound();
  const [platforms, resourcePlatforms] = await Promise.all([listPlatforms(), getPlatformsForResource(resource.id)]);

  return (
    <AdminPageShell title={resource.title}>
      <ResourceForm
        resourceId={resource.id}
        initial={{
          title: resource.title, url: resource.url, sourceName: resource.sourceName || "",
          summary: resource.summary || "", resourceType: resource.resourceType,
          internalNotes: resource.internalNotes || "", isPublic: !!resource.isPublic,
          status: resource.status,
          seoTitle: resource.seoTitle || "", seoDescription: resource.seoDescription || "",
          ogImage: resource.ogImage || "", canonicalUrl: resource.canonicalUrl || "", noIndex: !!resource.noIndex,
          platformIds: resourcePlatforms.map((p) => p.id),
        }}
        platforms={platforms}
      />
    </AdminPageShell>
  );
}
