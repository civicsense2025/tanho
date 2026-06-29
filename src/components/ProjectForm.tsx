"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Block {
  type: "text" | "image" | "video" | "metric" | "gallery";
  content: Record<string, unknown>;
  sort_order: number;
}

interface ProjectData {
  title: string; slug: string; tagline: string; description: string;
  cover_image: string; tags: string[]; github_url: string; live_url: string;
  year: number; status: "draft" | "published"; sort_order: number; blocks: Block[];
}

interface Props {
  projectId?: number;
  initial?: Partial<ProjectData>;
  initialBlocks?: Array<{ type: string; content: string; sort_order: number }>;
}

const DEFAULT: ProjectData = {
  title: "", slug: "", tagline: "", description: "", cover_image: "",
  tags: [], github_url: "", live_url: "", year: new Date().getFullYear(),
  status: "draft", sort_order: 0, blocks: [],
};

export function ProjectForm({ projectId, initial, initialBlocks = [] }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ProjectData>({
    ...DEFAULT, ...initial,
    blocks: initialBlocks.map((b) => ({ type: b.type as Block["type"], content: JSON.parse(b.content), sort_order: b.sort_order })),
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const set = (key: keyof ProjectData, value: unknown) => setData((d) => ({ ...d, [key]: value }));
  const addTag = () => { const t = tagInput.trim(); if (t && !data.tags.includes(t)) set("tags", [...data.tags, t]); setTagInput(""); };
  const removeTag = (t: string) => set("tags", data.tags.filter((x) => x !== t));
  const addBlock = (type: Block["type"]) => {
    const defaultContent: Record<string, unknown> =
      type === "metric" ? { metrics: [{ label: "", value: "" }] } : type === "gallery" ? { images: [] } : {};
    set("blocks", [...data.blocks, { type, content: defaultContent, sort_order: data.blocks.length }]);
  };
  const updateBlock = (i: number, content: Record<string, unknown>) =>
    set("blocks", data.blocks.map((b, idx) => (idx === i ? { ...b, content } : b)));
  const removeBlock = (i: number) => set("blocks", data.blocks.filter((_, idx) => idx !== i));

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    return (await res.json()).url as string;
  }, []);

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingCover(true);
    set("cover_image", await uploadFile(file));
    setUploadingCover(false);
  };

  async function save() {
    setSaving(true);
    const payload = { ...data, blocks: data.blocks.map((b, i) => ({ type: b.type, content: JSON.stringify(b.content), sort_order: i })) };
    const res = projectId
      ? await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { router.push("/admin"); router.refresh(); }
    else { alert("Save failed"); setSaving(false); }
  }

  async function handleDelete() {
    if (!projectId || !confirm("Delete this project?")) return;
    setDeleting(true);
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    router.push("/admin"); router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Field label="Title"><input value={data.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Project title" /></Field>
        <Field label="Slug"><input value={data.slug} onChange={(e) => set("slug", e.target.value)} className={input} placeholder="auto-generated if blank" /></Field>
        <Field label="Tagline"><input value={data.tagline} onChange={(e) => set("tagline", e.target.value)} className={input} placeholder="One-line summary" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Year"><input type="number" value={data.year} onChange={(e) => set("year", Number(e.target.value))} className={input} /></Field>
          <Field label="Status">
            <select value={data.status} onChange={(e) => set("status", e.target.value as "draft" | "published")} className={input}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Live URL"><input value={data.live_url} onChange={(e) => set("live_url", e.target.value)} className={input} placeholder="https://" /></Field>
          <Field label="GitHub URL"><input value={data.github_url} onChange={(e) => set("github_url", e.target.value)} className={input} placeholder="https://github.com/..." /></Field>
        </div>
        <Field label="Tags">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className={`${input} flex-1`} placeholder="Add tag and press Enter" />
              <button type="button" onClick={addTag} className={btn}>Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs text-[#666] border border-[#1f1f1f] px-2 py-0.5">
                  {t}<button onClick={() => removeTag(t)} className="text-[#333] hover:text-[#666]">×</button>
                </span>
              ))}
            </div>
          </div>
        </Field>
        <Field label="Cover Image">
          <div className="space-y-2">
            {data.cover_image && <img src={data.cover_image} alt="" className="w-full aspect-video object-cover rounded-sm" />}
            <input type="file" accept="image/*" onChange={uploadCover} className="text-xs text-[#666]" />
            {uploadingCover && <p className="text-xs text-[#444]">Uploading…</p>}
            <input value={data.cover_image} onChange={(e) => set("cover_image", e.target.value)} className={input} placeholder="Or paste URL" />
          </div>
        </Field>
        <Field label="Description (HTML)">
          <textarea value={data.description} onChange={(e) => set("description", e.target.value)}
            className={`${input} h-32 resize-y font-mono text-xs`} placeholder="<p>Project overview…</p>" />
        </Field>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-[#444] mb-4">Case Study Blocks</h2>
        <div className="space-y-4">
          {data.blocks.map((block, i) => (
            <BlockEditor key={i} index={i} block={block} onChange={(c) => updateBlock(i, c)} onRemove={() => removeBlock(i)} onUpload={uploadFile} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {(["text", "image", "video", "metric", "gallery"] as const).map((t) => (
            <button key={t} type="button" onClick={() => addBlock(t)} className={`${btn} text-[10px]`}>+ {t}</button>
          ))}
        </div>
      </section>

      <div className="flex gap-3 pt-4 border-t border-[#1a1a1a]">
        <button onClick={save} disabled={saving} className="bg-[#ededed] text-[#0a0a0a] text-sm font-medium px-6 py-2.5 hover:bg-white transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        {projectId && (
          <button onClick={handleDelete} disabled={deleting} className="text-sm text-red-600 hover:text-red-400 transition-colors">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove, onUpload }: {
  index: number; block: Block;
  onChange: (c: Record<string, unknown>) => void;
  onRemove: () => void;
  onUpload: (f: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    onChange({ ...block.content, url: await onUpload(file) });
    setUploading(false);
  }

  return (
    <div className="border border-[#1a1a1a] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[#444]">{block.type}</span>
        <button onClick={onRemove} className="text-xs text-[#333] hover:text-red-500 transition-colors">Remove</button>
      </div>

      {block.type === "text" && (
        <textarea value={(block.content.html as string) || ""} onChange={(e) => onChange({ html: e.target.value })}
          className={`${input} h-40 resize-y font-mono text-xs`} placeholder="<p>Content HTML…</p>" />
      )}

      {(block.type === "image" || block.type === "video") && (
        <div className="space-y-2">
          {!!(block.content.url) && block.type === "image" && <img src={block.content.url as string} alt="" className="w-full aspect-video object-cover rounded-sm" />}
          {!!(block.content.url) && block.type === "video" && <video src={block.content.url as string} controls className="w-full rounded-sm" />}
          <input type="file" accept={block.type === "image" ? "image/*" : "video/*"} onChange={handleFileUpload} className="text-xs text-[#666]" />
          {uploading && <p className="text-xs text-[#444]">Uploading…</p>}
          <input value={(block.content.url as string) || ""} onChange={(e) => onChange({ ...block.content, url: e.target.value })} className={input} placeholder="Or paste URL" />
          <input value={(block.content.caption as string) || ""} onChange={(e) => onChange({ ...block.content, caption: e.target.value })} className={input} placeholder="Caption (optional)" />
          {block.type === "video" && <input value={(block.content.poster as string) || ""} onChange={(e) => onChange({ ...block.content, poster: e.target.value })} className={input} placeholder="Poster image URL (optional)" />}
        </div>
      )}

      {block.type === "metric" && (
        <div className="space-y-2">
          {((block.content.metrics as { label: string; value: string }[]) || []).map((m, i) => (
            <div key={i} className="flex gap-2">
              <input value={m.value} onChange={(e) => { const metrics = [...(block.content.metrics as { label: string; value: string }[])]; metrics[i] = { ...m, value: e.target.value }; onChange({ metrics }); }} className={`${input} flex-1`} placeholder="Value (e.g. 2.4M)" />
              <input value={m.label} onChange={(e) => { const metrics = [...(block.content.metrics as { label: string; value: string }[])]; metrics[i] = { ...m, label: e.target.value }; onChange({ metrics }); }} className={`${input} flex-1`} placeholder="Label" />
              <button onClick={() => { const metrics = (block.content.metrics as { label: string; value: string }[]).filter((_, j) => j !== i); onChange({ metrics }); }} className="text-[#333] hover:text-red-500 px-2">×</button>
            </div>
          ))}
          <button type="button" onClick={() => { const metrics = [...((block.content.metrics as { label: string; value: string }[]) || []), { label: "", value: "" }]; onChange({ metrics }); }} className={`${btn} text-[10px]`}>+ Add metric</button>
        </div>
      )}

      {block.type === "gallery" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {((block.content.images as { url: string }[]) || []).map((img, i) => (
              <div key={i} className="relative">
                <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-sm" />
                <button onClick={() => { const images = (block.content.images as { url: string }[]).filter((_, j) => j !== i); onChange({ images }); }} className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">×</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            setUploading(true);
            const urls = await Promise.all(files.map(onUpload));
            onChange({ images: [...((block.content.images as { url: string }[]) || []), ...urls.map((url) => ({ url }))] });
            setUploading(false);
          }} className="text-xs text-[#666]" />
          {uploading && <p className="text-xs text-[#444]">Uploading…</p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-[#444]">{label}</label>
      {children}
    </div>
  );
}

const input = "w-full bg-[#111] border border-[#1f1f1f] text-[#ededed] text-sm px-3 py-2 outline-none focus:border-[#333] transition-colors";
const btn = "text-xs text-[#666] border border-[#1f1f1f] px-3 py-1.5 hover:border-[#333] hover:text-[#999] transition-colors";
