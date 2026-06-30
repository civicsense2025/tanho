import { getAdminSession } from "@/lib/auth";
import { listPlatforms, listTags, listResources } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GuideForm } from "@/components/GuideForm";

export const dynamic = "force-dynamic";

export default async function NewGuidePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const [platforms, tags, resources] = await Promise.all([listPlatforms(), listTags(), listResources(false)]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin/guides" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>← Guides</Link>
        <h1 className="text-lg font-medium mt-4" style={{ color: "var(--foreground)" }}>New Guide</h1>
      </div>
      <GuideForm platforms={platforms} tags={tags} resources={resources} />
    </div>
  );
}
