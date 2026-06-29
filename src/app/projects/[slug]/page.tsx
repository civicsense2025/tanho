import { getProject, getBlocks } from "@/lib/db";
import { parseTags } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project || project.status !== "published") notFound();

  const blocks = await getBlocks(project.id);
  const tags = parseTags(project.tags);

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <Link href="/" className="text-xs text-[#444] hover:text-[#666] transition-colors mb-12 inline-block">← Back</Link>

      <header className="mb-16">
        <div className="flex items-baseline gap-4 mb-3">
          <h1 className="text-3xl font-medium tracking-tight">{project.title}</h1>
          {project.year && <span className="text-[#444] text-sm">{project.year}</span>}
        </div>
        {project.tagline && <p className="text-[#666] text-lg leading-relaxed mb-6">{project.tagline}</p>}
        <div className="flex gap-4">
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer"
              className="text-xs uppercase tracking-wider text-[#ededed] border border-[#2a2a2a] px-3 py-1.5 hover:border-[#444] transition-colors">Live ↗</a>
          )}
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer"
              className="text-xs uppercase tracking-wider text-[#666] border border-[#1f1f1f] px-3 py-1.5 hover:border-[#333] transition-colors">GitHub ↗</a>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-6">
            {tags.map((t) => <span key={t} className="text-[10px] uppercase tracking-wider text-[#444] border border-[#1f1f1f] px-2 py-0.5 rounded-full">{t}</span>)}
          </div>
        )}
      </header>

      {project.cover_image && (
        <div className="relative aspect-video overflow-hidden rounded-sm bg-[#111] mb-16">
          <Image src={project.cover_image} alt={project.title} fill className="object-cover" />
        </div>
      )}

      {project.description && (
        <div className="prose mb-16" dangerouslySetInnerHTML={{ __html: project.description }} />
      )}

      {blocks.length > 0 && (
        <div className="space-y-16">
          {blocks.map((block) => {
            const content = JSON.parse(block.content);
            if (block.type === "text") return <div key={block.id} className="prose" dangerouslySetInnerHTML={{ __html: content.html || "" }} />;
            if (block.type === "image") return (
              <figure key={block.id}>
                <div className="relative overflow-hidden rounded-sm bg-[#111]">
                  <Image src={content.url} alt={content.caption || ""} width={900} height={600} className="w-full h-auto" />
                </div>
                {content.caption && <figcaption className="text-xs text-[#444] mt-2 text-center">{content.caption}</figcaption>}
              </figure>
            );
            if (block.type === "video") return (
              <figure key={block.id}>
                <video src={content.url} controls className="w-full rounded-sm bg-[#111]" poster={content.poster} />
                {content.caption && <figcaption className="text-xs text-[#444] mt-2 text-center">{content.caption}</figcaption>}
              </figure>
            );
            if (block.type === "metric") return (
              <div key={block.id} className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[#1a1a1a]">
                {(content.metrics as { label: string; value: string }[]).map((m, i) => (
                  <div key={i} className="bg-[#0a0a0a] p-6">
                    <div className="text-2xl font-medium text-[#ededed] mb-1">{m.value}</div>
                    <div className="text-xs text-[#444] uppercase tracking-wider">{m.label}</div>
                  </div>
                ))}
              </div>
            );
            if (block.type === "gallery") return (
              <div key={block.id} className="grid grid-cols-2 gap-2">
                {(content.images as { url: string; caption?: string }[]).map((img, i) => (
                  <figure key={i}>
                    <div className="relative aspect-square overflow-hidden rounded-sm bg-[#111]">
                      <Image src={img.url} alt={img.caption || ""} fill className="object-cover" />
                    </div>
                    {img.caption && <figcaption className="text-xs text-[#444] mt-1">{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            );
            return null;
          })}
        </div>
      )}
    </main>
  );
}
