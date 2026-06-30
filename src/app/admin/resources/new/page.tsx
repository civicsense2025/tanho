import { getAdminSession } from "@/lib/auth";
import { listPlatforms } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ResourceForm } from "@/components/ResourceForm";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const platforms = await listPlatforms();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin/resources" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>← Resources</Link>
        <h1 className="text-lg font-medium mt-4" style={{ color: "var(--foreground)" }}>New Resource</h1>
      </div>
      <ResourceForm platforms={platforms} />
    </div>
  );
}
