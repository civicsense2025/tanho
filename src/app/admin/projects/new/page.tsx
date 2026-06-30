import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProjectForm } from "@/components/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/admin" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>← Projects</Link>
        <h1 className="text-lg font-medium mt-4" style={{ color: "var(--foreground)" }}>New Project</h1>
      </div>
      <ProjectForm />
    </div>
  );
}
