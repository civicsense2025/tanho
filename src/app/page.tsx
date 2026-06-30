import { listProjects } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects(true);

  return (
    <main className="max-w-5xl mx-auto px-6 py-20">
      <section className="mb-24 flex items-start gap-6">
        <Image src="/uploads/tan-ho-profile.jpg" alt="Tan Ho" width={96} height={96}
          className="rounded-full flex-shrink-0 object-cover" />
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-4" style={{ color: "var(--foreground)" }}>Tan Ho</h1>
          <p className="text-lg max-w-xl leading-relaxed" style={{ color: "var(--muted)" }}>
            I'm a Forbes 30 Under 30 product designer and front-end developer. I co-founded Fiveable and scaled it from 2K to 15M+ students, securing $15M in funding along the way. I build products at the intersection of design, growth, and engineering.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest mb-10" style={{ color: "var(--muted)" }}>Selected Work</h2>
        {projects.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No projects yet.</p>
        ) : (
          <div className="flex flex-col">
            {projects.map((p) => {
              const tags = parseTags(p.tags);
              return (
                <Link key={p.id} href={`/projects/${p.slug}`}
                  className="group flex items-center gap-6 py-6 border-b transition-colors"
                  style={{ borderColor: "var(--border)" }}>
                  {p.logo_url && (
                    <div className="flex-shrink-0">
                      <Image src={p.logo_url} alt={`${p.title} logo`} width={48} height={48}
                        className="rounded object-contain" style={{ background: "var(--subtle)" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h3 className="font-medium" style={{ color: "var(--foreground)" }}>{p.title}</h3>
                      {p.year && <span className="text-xs" style={{ color: "var(--muted)" }}>{p.year}</span>}
                    </div>
                    {p.tagline && <p className="text-sm leading-relaxed truncate" style={{ color: "var(--muted)" }}>{p.tagline}</p>}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((t) => (
                          <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--muted)" }}>→</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
