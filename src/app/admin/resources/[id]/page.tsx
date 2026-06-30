import { getAdminSession } from "@/lib/auth";
import { getResourceById, getPlatformsForResource, listPlatforms } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ResourceForm } from "@/components/ResourceForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditResourcePage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const resource = await getResourceById(Number(id));
  if (!resource) notFound();
  const [platforms, resourcePlatforms] = await Promise.all([listPlatforms(), getPlatformsForResource(resource.id)]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin/resources" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>← Resources</Link>
        <h1 className="text-lg font-medium mt-4" style={{ color: "var(--foreground)" }}>{resource.title}</h1>
      </div>
      <ResourceForm
        resourceId={resource.id}
        initial={{
          title: resource.title, url: resource.url, source_name: resource.source_name || "",
          summary: resource.summary || "", resource_type: resource.resource_type,
          internal_notes: resource.internal_notes || "", is_public: !!resource.is_public,
          status: resource.status, platformIds: resourcePlatforms.map((p) => p.id),
        }}
        platforms={platforms}
      />
    </div>
  );
}
