import { getAdminSession } from "@/lib/auth";
import { getGuideById, getSteps, getGuideTags, getResourcesForGuide, listPlatforms, listTags, listResources } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GuideForm } from "@/components/GuideForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditGuidePage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const guide = await getGuideById(Number(id));
  if (!guide) notFound();

  const [steps, guideTags, guideResources, platforms, tags, resources] = await Promise.all([
    getSteps(guide.id),
    getGuideTags(guide.id),
    getResourcesForGuide(guide.id, false),
    listPlatforms(),
    listTags(),
    listResources(false),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin/guides" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>← Guides</Link>
        <h1 className="text-lg font-medium mt-4" style={{ color: "var(--foreground)" }}>{guide.title}</h1>
      </div>
      <GuideForm
        guideId={guide.id}
        initial={{
          title: guide.title, slug: guide.slug, tagline: guide.tagline || "", summary: guide.summary || "",
          source_platform: guide.source_platform, target_platform: guide.target_platform, difficulty: guide.difficulty,
          effort_hours_min: guide.effort_hours_min ?? "", effort_hours_max: guide.effort_hours_max ?? "",
          cost_min_usd: guide.cost_min_usd ?? "", cost_max_usd: guide.cost_max_usd ?? "", cost_period: guide.cost_period,
          skills_required: parseTags(guide.skills_required), requirements: parseTags(guide.requirements),
          cover_image: guide.cover_image || "", status: guide.status, sort_order: guide.sort_order,
          tagIds: guideTags.map((t) => t.id), resourceIds: guideResources.map((r) => r.id),
        }}
        initialSteps={steps}
        platforms={platforms}
        tags={tags}
        resources={resources}
      />
    </div>
  );
}
