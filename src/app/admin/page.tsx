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
          <h1 className="text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>Admin</h1>
          <p className="text-xs mt-1"><Link href="/" className="transition-colors" style={{ color: "var(--muted)" }}>← View site</Link></p>
        </div>
        <LogoutButton />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-medium" style={{ color: "var(--foreground)" }}>Projects</h2>
        <Link href="/admin/projects/new" className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--background)", background: "var(--foreground)" }}>+ New</Link>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No projects yet.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-4">
              <div>
                <span className="text-sm" style={{ color: "var(--foreground)" }}>{p.title}</span>
                <span className={`ml-3 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${p.status === "published" ? "text-green-500 border border-green-900" : ""
                  }`} style={p.status !== "published" ? { color: "var(--muted)", border: "1px solid var(--border)" } : undefined}>{p.status}</span>
              </div>
              <Link href={`/admin/projects/${p.id}`} className="text-xs transition-colors" style={{ color: "var(--muted)" }}>Edit →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
