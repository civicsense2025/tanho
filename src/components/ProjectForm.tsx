"use client";

import { useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";

interface Block {
  type: "text" | "image" | "video" | "metric" | "gallery";
  content: Record<string, unknown>;
  sortOrder: number;
}

interface ProjectData {
  title: string; slug: string; tagline: string; description: string;
  coverImage: string; logoUrl: string; tags: string[]; githubUrl: string; liveUrl: string;
  year: number; status: "draft" | "published"; sortOrder: number; blocks: Block[];
}

interface Props {
  projectId?: string;
  initial?: Partial<ProjectData>;
  initialBlocks?: Array<{ type: string; content: string; sortOrder: number }>;
}

const DEFAULT: ProjectData = {
  title: "", slug: "", tagline: "", description: "", coverImage: "", logoUrl: "",
  tags: [], githubUrl: "", liveUrl: "", year: new Date().getFullYear(),
  status: "draft", sortOrder: 0, blocks: [],
};

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-muted)",
  marginBottom: "var(--space-2)",
};

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

export function ProjectForm({ projectId, initial, initialBlocks = [] }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ProjectData>({
    ...DEFAULT, ...initial,
    blocks: initialBlocks.map((b) => ({ type: b.type as Block["type"], content: JSON.parse(b.content), sortOrder: b.sortOrder })),
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const set = (key: keyof ProjectData, value: unknown) => setData((d) => ({ ...d, [key]: value }));
  const addTag = () => { const t = tagInput.trim(); if (t && !data.tags.includes(t)) set("tags", [...data.tags, t]); setTagInput(""); };
  const removeTag = (t: string) => set("tags", data.tags.filter((x) => x !== t));
  const addBlock = (type: Block["type"]) => {
    const defaultContent: Record<string, unknown> =
      type === "metric" ? { metrics: [{ label: "", value: "" }] } : type === "gallery" ? { images: [] } : {};
    set("blocks", [...data.blocks, { type, content: defaultContent, sortOrder: data.blocks.length }]);
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
    set("coverImage", await uploadFile(file));
    setUploadingCover(false);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    set("logoUrl", await uploadFile(file));
    setUploadingLogo(false);
  };

  async function save() {
    setSaving(true);
    const payload = { ...data, blocks: data.blocks.map((b, i) => ({ type: b.type, content: JSON.stringify(b.content), sortOrder: i })) };
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

  const fileInputStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-muted)" };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {/* core fields */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Field label="Title"><Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Project title" /></Field>
        <Field label="Slug" hint="Auto-generated if blank"><Input value={data.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" /></Field>
        <Field label="Tagline"><Input value={data.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One-line summary" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Year"><Input type="number" value={data.year} onChange={(e) => set("year", Number(e.target.value))} /></Field>
          <Field label="Status" hint="Drafts stay hidden">
            <Select value={data.status} onChange={(e) => set("status", e.target.value as "draft" | "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Live URL"><Input value={data.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://" /></Field>
          <Field label="GitHub URL"><Input value={data.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/…" /></Field>
        </div>

        {/* tag chip editor */}
        <div>
          <span style={labelStyle}>Tags</span>
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Add tag and press Enter" style={{ flex: 1 }} />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {data.tags.map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "4px 9px" }}>
                {t}
                <button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* cover + logo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <div>
            <span style={labelStyle}>Cover image</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {data.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.coverImage} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
              )}
              <input type="file" accept="image/*" onChange={uploadCover} style={fileInputStyle} />
              {uploadingCover && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
              <Input value={data.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="Or paste URL" />
            </div>
          </div>
          <div>
            <span style={labelStyle}>Logo</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {data.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt="" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: "var(--radius-sm)", background: "var(--surface)", border: "1px solid var(--border)" }} />
              )}
              <input type="file" accept="image/*" onChange={uploadLogo} style={fileInputStyle} />
              {uploadingLogo && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
              <Input value={data.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="Or paste URL" />
            </div>
          </div>
        </div>

        <Field label="Description" hint="HTML allowed">
          <Textarea mono rows={4} value={data.description} onChange={(e) => set("description", e.target.value)} placeholder="<p>Project overview…</p>" />
        </Field>
      </section>

      {/* case study blocks */}
      <section>
        <h2 style={sectionLabel}>Case Study Blocks</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {data.blocks.map((block, i) => (
            <BlockEditor key={i} block={block} onChange={(c) => updateBlock(i, c)} onRemove={() => removeBlock(i)} onUpload={uploadFile} />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
          {(["text", "image", "video", "metric", "gallery"] as const).map((t) => (
            <Button key={t} type="button" variant="outline" size="sm" onClick={() => addBlock(t)}>+ {t}</Button>
          ))}
        </div>
      </section>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        {projectId && (
          <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}

function BlockEditor({ block, onChange, onRemove, onUpload }: {
  block: Block;
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

  const metrics = (block.content.metrics as { label: string; value: string }[]) || [];
  const images = (block.content.images as { url: string }[]) || [];

  return (
    <div style={{ padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{block.type}</span>
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>Remove</button>
      </div>

      {block.type === "text" && (
        <Textarea mono rows={6} value={(block.content.html as string) || ""} onChange={(e) => onChange({ html: e.target.value })} placeholder="<p>Content HTML…</p>" />
      )}

      {(block.type === "image" || block.type === "video") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {!!block.content.url && block.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.content.url as string} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
          )}
          {!!block.content.url && block.type === "video" && (
            <video src={block.content.url as string} controls style={{ width: "100%", borderRadius: "var(--radius-sm)" }} />
          )}
          <input type="file" accept={block.type === "image" ? "image/*" : "video/*"} onChange={handleFileUpload} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }} />
          {uploading && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
          <Input value={(block.content.url as string) || ""} onChange={(e) => onChange({ ...block.content, url: e.target.value })} placeholder="Or paste URL" />
          <Input value={(block.content.caption as string) || ""} onChange={(e) => onChange({ ...block.content, caption: e.target.value })} placeholder="Caption (optional)" />
          {block.type === "video" && (
            <Input value={(block.content.poster as string) || ""} onChange={(e) => onChange({ ...block.content, poster: e.target.value })} placeholder="Poster image URL (optional)" />
          )}
        </div>
      )}

      {block.type === "metric" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
              <Input value={m.value} onChange={(e) => { const next = [...metrics]; next[i] = { ...m, value: e.target.value }; onChange({ metrics: next }); }} placeholder="Value (e.g. 15M+)" style={{ flex: 1 }} />
              <Input value={m.label} onChange={(e) => { const next = [...metrics]; next[i] = { ...m, label: e.target.value }; onChange({ metrics: next }); }} placeholder="Label" style={{ flex: 1 }} />
              <button type="button" onClick={() => onChange({ metrics: metrics.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: "var(--text-body)", padding: "0 var(--space-2)" }}>×</button>
            </div>
          ))}
          <div>
            <Button type="button" size="sm" variant="ghost" uppercase onClick={() => onChange({ metrics: [...metrics, { label: "", value: "" }] })}>+ Add metric</Button>
          </div>
        </div>
      )}

      {block.type === "gallery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
                <button type="button" onClick={() => onChange({ images: images.filter((_, j) => j !== i) })} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "var(--text-xs)", border: "none", borderRadius: "var(--radius-xs)", padding: "0 5px", cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            setUploading(true);
            const urls = await Promise.all(files.map(onUpload));
            onChange({ images: [...images, ...urls.map((url) => ({ url }))] });
            setUploading(false);
          }} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }} />
          {uploading && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
        </div>
      )}
    </div>
  );
}
