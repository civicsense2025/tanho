"use client";

import { useState, useCallback, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { PageBuilder } from "@/components/PageBuilder";
import { SeoFields } from "@/components/SeoFields";
import type { Block } from "@/lib/blocks/types";
import type { ProjectDraftMessage } from "@/components/PreviewFrame";

interface ProjectData {
  title: string; slug: string; tagline: string;
  coverImage: string; logoUrl: string; tags: string[]; githubUrl: string; liveUrl: string;
  year: number; status: "draft" | "published"; sortOrder: number; blocks: Block[];
  seoTitle: string; seoDescription: string; ogImage: string; canonicalUrl: string; noIndex: boolean;
}

interface Props {
  projectId?: string;
  initial?: Partial<ProjectData>;
  initialBlocks?: Array<{ type: string; content: string; sortOrder: number }>;
  /** Loaded separately from /api/projects/[id]/content -- this is file-backed
   * (MDX), not a field on the structured-fields save payload. See ProjectForm's
   * saveBody(), which PATCHes it independently of the main form save. */
  initialBody?: string;
  /** Called on every body/blocks change so a hosting page can forward draft
   * state into a live-preview iframe via postMessage. Optional -- pages
   * without a preview pane (e.g. "new project") just omit it. */
  onDraftChange?: (draft: Omit<ProjectDraftMessage, "type">) => void;
}

const DEFAULT: ProjectData = {
  title: "", slug: "", tagline: "", coverImage: "", logoUrl: "",
  tags: [], githubUrl: "", liveUrl: "", year: new Date().getFullYear(),
  status: "draft", sortOrder: 0, blocks: [],
  seoTitle: "", seoDescription: "", ogImage: "", canonicalUrl: "", noIndex: false,
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

export function ProjectForm({ projectId, initial, initialBlocks = [], initialBody = "", onDraftChange }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ProjectData>({
    ...DEFAULT, ...initial,
    blocks: initialBlocks.map((b) => ({ type: b.type as Block["type"], content: JSON.parse(b.content), sortOrder: b.sortOrder })),
  });
  const [body, setBody] = useState(initialBody);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingBody, setSavingBody] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    onDraftChange?.({
      body,
      blocks: data.blocks.map((b, i) => ({ id: `draft-${i}`, type: b.type, content: b.content })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, data.blocks]);

  const set = (key: keyof ProjectData, value: unknown) => setData((d) => ({ ...d, [key]: value }));
  const addTag = () => { const t = tagInput.trim(); if (t && !data.tags.includes(t)) set("tags", [...data.tags, t]); setTagInput(""); };
  const removeTag = (t: string) => set("tags", data.tags.filter((x) => x !== t));

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
    const payload = {
      ...data,
      blocks: data.blocks.map((b, i) => ({ type: b.type, content: JSON.stringify(b.content), sortOrder: i })),
      noIndex: data.noIndex ? 1 : 0,
    };
    const res = projectId
      ? await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { router.push("/admin"); router.refresh(); }
    else { alert("Save failed"); setSaving(false); }
  }

  async function saveBody() {
    if (!projectId) return;
    setSavingBody(true);
    const res = await fetch(`/api/projects/${projectId}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) alert("Description save failed");
    setSavingBody(false);
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
      </section>

      {/* description -- file-backed (MDX), saved independently of the fields above */}
      <section>
        <h2 style={sectionLabel}>Description</h2>
        {projectId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Textarea mono rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="<p>Project overview…</p> (HTML allowed)" />
            <div>
              <Button type="button" variant="outline" size="sm" onClick={saveBody} disabled={savingBody}>
                {savingBody ? "Saving…" : "Save description"}
              </Button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Save the project first to add a description.</p>
        )}
      </section>

      {/* case study blocks */}
      <section>
        <h2 style={sectionLabel}>Case Study Blocks</h2>
        <PageBuilder blocks={data.blocks} onChange={(blocks) => set("blocks", blocks)} onUpload={uploadFile} />
      </section>

      {/* SEO -- raw overrides + live SERP preview, template-resolved fallbacks */}
      <SeoFields
        entityType="project"
        vars={{ title: data.title, tagline: data.tagline }}
        previewUrl={data.slug ? `tan.ho › projects › ${data.slug}` : "tan.ho › projects"}
        value={{ seoTitle: data.seoTitle, seoDescription: data.seoDescription, ogImage: data.ogImage, canonicalUrl: data.canonicalUrl, noIndex: data.noIndex }}
        onChange={(v) => setData((d) => ({ ...d, ...v }))}
      />

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
