import { getAdminSession } from "@/lib/auth";
import { listGuides } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const guides = await listGuides({ publishedOnly: false });

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>Admin</h1>
          <p className="text-xs mt-1"><Link href="/admin" className="transition-colors" style={{ color: "var(--muted)" }}>← Admin home</Link></p>
        </div>
        <LogoutButton />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-medium" style={{ color: "var(--foreground)" }}>Guides</h2>
        <Link href="/admin/guides/new" className="text-xs uppercase tracking-wider px-3 py-1.5 transition-colors" style={{ color: "var(--background)", background: "var(--foreground)" }}>+ New</Link>
      </div>
      {guides.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No guides yet.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {guides.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-4">
              <div>
                <span className="text-sm" style={{ color: "var(--foreground)" }}>{g.title}</span>
                <span className={`ml-3 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${g.status === "published" ? "text-green-500 border border-green-900" : ""}`}
                  style={g.status !== "published" ? { color: "var(--muted)", border: "1px solid var(--border)" } : undefined}>{g.status}</span>
              </div>
              <Link href={`/admin/guides/${g.id}`} className="text-xs transition-colors" style={{ color: "var(--muted)" }}>Edit →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
