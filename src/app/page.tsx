import { listProjects } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects(true);

  return (
    <main className="max-w-5xl mx-auto px-6 py-20">
      <section className="mb-24">
        <h1 className="text-4xl font-medium tracking-tight mb-4">Tan Ho</h1>
        <p className="text-[#666] text-lg max-w-xl leading-relaxed">
          Designer &amp; engineer. I build products at the intersection of clarity and craft.
        </p>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-[#444] mb-10">Selected Work</h2>
        {projects.length === 0 ? (
          <p className="text-[#444] text-sm">No projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1a1a1a]">
            {projects.map((p) => {
              const tags = parseTags(p.tags);
              return (
                <Link key={p.id} href={`/projects/${p.slug}`}
                  className="group bg-[#0a0a0a] p-8 flex flex-col gap-4 hover:bg-[#111] transition-colors">
                  {p.cover_image && (
                    <div className="relative aspect-video overflow-hidden rounded-sm bg-[#111]">
                      <Image src={p.cover_image} alt={p.title} fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h3 className="font-medium text-[#ededed]">{p.title}</h3>
                      {p.year && <span className="text-xs text-[#444]">{p.year}</span>}
                    </div>
                    {p.tagline && <p className="text-sm text-[#666] leading-relaxed">{p.tagline}</p>}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider text-[#444] border border-[#1f1f1f] px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
