"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea, Select, Button } from "@/components/ui";
import { SeoFields, type SeoFieldsValue } from "@/components/SeoFields";

interface PostData {
  title: string;
  subtitle: string;
  excerpt: string;
  slug: string;
  status: "draft" | "published";
  visibility: "public" | "paid";
  publishedAt: string;
  coverImage: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
}

interface Props {
  postId?: string;
  initial?: Partial<PostData>;
  initialBody?: string;
}

const DEFAULT: PostData = {
  title: "", subtitle: "", excerpt: "", slug: "", status: "draft", visibility: "public",
  publishedAt: "", coverImage: "", sortOrder: 0,
  seoTitle: "", seoDescription: "", ogImage: "", canonicalUrl: "", noIndex: false,
};

/** Post editor. Metadata (this form) and the markdown body save independently — mirroring the
 * project editor's decoupling of fast DB field saves from the slower file/GitHub content write. */
export function PostForm({ postId, initial, initialBody }: Props) {
  const router = useRouter();
  const [data, setData] = useState<PostData>({ ...DEFAULT, ...initial });
  const [body, setBody] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const [savingBody, setSavingBody] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof PostData, value: unknown) => setData((d) => ({ ...d, [key]: value }));
  const setSeo = (v: SeoFieldsValue) => setData((d) => ({ ...d, ...v }));

  async function saveMeta() {
    setSaving(true);
    const res = postId
      ? await fetch(`/api/posts/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSaving(false);
    if (res.ok) {
      const saved = await res.json();
      router.push(postId ? "/admin" : `/admin/posts/${saved.id}`);
      router.refresh();
    } else {
      alert("Save failed");
    }
  }

  async function saveBody() {
    if (!postId) return;
    setSavingBody(true);
    const res = await fetch(`/api/posts/${postId}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSavingBody(false);
    if (!res.ok) alert("Body save failed");
  }

  async function remove() {
    if (!postId || !confirm("Delete this post?")) return;
    setDeleting(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setDeleting(false);
      alert("Delete failed");
    }
  }

  const seo: SeoFieldsValue = {
    seoTitle: data.seoTitle, seoDescription: data.seoDescription, ogImage: data.ogImage,
    canonicalUrl: data.canonicalUrl, noIndex: data.noIndex,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Field label="Title">
        <Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Why I left Substack" />
      </Field>
      <Field label="Subtitle">
        <Input value={data.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
      </Field>
      <Field label="Slug" hint="URL-safe; auto-generated from the title when blank.">
        <Input value={data.slug} onChange={(e) => set("slug", e.target.value)} placeholder="why-i-left-substack" />
      </Field>
      <Field label="Excerpt" hint="Shown in the archive, RSS, and as the paid-post preview.">
        <Textarea value={data.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)" }}>
        <Field label="Status">
          <Select value={data.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
        <Field label="Visibility">
          <Select value={data.visibility} onChange={(e) => set("visibility", e.target.value)}>
            <option value="public">Public</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
        <Field label="Published at" hint="ISO date; drives RSS + ordering.">
          <Input value={data.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} placeholder="2026-06-30" />
        </Field>
      </div>

      <Field label="Cover image URL">
        <Input value={data.coverImage} onChange={(e) => set("coverImage", e.target.value)} />
      </Field>

      <SeoFields
        entityType="post"
        value={seo}
        onChange={setSeo}
        vars={{ title: data.title, excerpt: data.excerpt }}
        previewUrl={`/posts/${data.slug || "post-slug"}`}
      />

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Button onClick={saveMeta} variant="accent" disabled={saving}>
          {saving ? "Saving…" : postId ? "Save post" : "Create post"}
        </Button>
        {postId && (
          <Button onClick={remove} variant="outline" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>

      {postId && (
        <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-6)" }}>
          <Field label="Body (Markdown)" hint="Rendered with Markdown; saved separately from the fields above.">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }} />
          </Field>
          <Button onClick={saveBody} variant="accent" size="sm" disabled={savingBody}>
            {savingBody ? "Saving…" : "Save body"}
          </Button>
        </div>
      )}
    </div>
  );
}
