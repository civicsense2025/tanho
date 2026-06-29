import { getAdminSession } from "@/lib/auth";
import { listProjects } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const projects = await listProjects(false);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-sm uppercase tracking-widest text-[#444]">Admin</h1>
          <p className="text-xs text-[#333] mt-1"><Link href="/" className="hover:text-[#666] transition-colors">← View site</Link></p>
        </div>
        <LogoutButton />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[#ededed] font-medium">Projects</h2>
        <Link href="/admin/projects/new" className="text-xs uppercase tracking-wider text-[#0a0a0a] bg-[#ededed] px-3 py-1.5 hover:bg-white transition-colors">+ New</Link>
      </div>
      {projects.length === 0 ? (
        <p className="text-[#444] text-sm">No projects yet.</p>
      ) : (
        <div className="divide-y divide-[#1a1a1a]">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-4">
              <div>
                <span className="text-sm text-[#ededed]">{p.title}</span>
                <span className={`ml-3 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  p.status === "published" ? "text-green-500 border border-green-900" : "text-[#444] border border-[#1f1f1f]"
                }`}>{p.status}</span>
              </div>
              <Link href={`/admin/projects/${p.id}`} className="text-xs text-[#444] hover:text-[#666] transition-colors">Edit →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
