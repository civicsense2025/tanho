import { getAdminSession } from "@/lib/auth";
import { getGuideById, getGuideSteps, getGuideTags, getResourcesForGuide, listPlatforms, listTags, listResources } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { GuideForm } from "@/components/GuideForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditGuidePage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const guide = await getGuideById(id);
  if (!guide) notFound();

  const [steps, guideTags, guideResources, platforms, tags, resources] = await Promise.all([
    getGuideSteps(guide.id),
    getGuideTags(guide.id),
    getResourcesForGuide(guide.id, false),
    listPlatforms(),
    listTags(),
    listResources(false),
  ]);

  return (
    <AdminPageShell title={guide.title}>
      <GuideForm
        guideId={guide.id}
        initial={{
          title: guide.title, slug: guide.slug, tagline: guide.tagline || "", summary: guide.summary || "",
          sourcePlatform: guide.sourcePlatform, targetPlatform: guide.targetPlatform, difficulty: guide.difficulty,
          effortHoursMin: guide.effortHoursMin ?? "", effortHoursMax: guide.effortHoursMax ?? "",
          costMinUsd: guide.costMinUsd ?? "", costMaxUsd: guide.costMaxUsd ?? "", costPeriod: guide.costPeriod,
          skillsRequired: parseTags(guide.skillsRequired), requirements: parseTags(guide.requirements),
          coverImage: guide.coverImage || "", status: guide.status, sortOrder: guide.sortOrder,
          seoTitle: guide.seoTitle || "", seoDescription: guide.seoDescription || "",
          ogImage: guide.ogImage || "", canonicalUrl: guide.canonicalUrl || "", noIndex: !!guide.noIndex,
          tagIds: guideTags.map((t) => t.id), resourceIds: guideResources.map((r) => r.id),
        }}
        initialSteps={steps}
        platforms={platforms}
        tags={tags}
        resources={resources}
      />
    </AdminPageShell>
  );
}
