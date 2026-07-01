"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { SeoFields } from "@/components/SeoFields";
import { Platform, ResourceType, GuideStatus } from "@/lib/db";

interface ResourceData {
  title: string; url: string; sourceName: string; summary: string;
  resourceType: ResourceType; internalNotes: string; isPublic: boolean;
  status: GuideStatus; platformIds: string[];
  seoTitle: string; seoDescription: string; ogImage: string; canonicalUrl: string; noIndex: boolean;
}

interface Props {
  resourceId?: string;
  initial?: Partial<ResourceData>;
  platforms: Platform[];
}

const DEFAULT: ResourceData = {
  title: "", url: "", sourceName: "", summary: "",
  resourceType: "article", internalNotes: "", isPublic: true,
  status: "draft", platformIds: [],
  seoTitle: "", seoDescription: "", ogImage: "", canonicalUrl: "", noIndex: false,
};

export function ResourceForm({ resourceId, initial, platforms }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ResourceData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof ResourceData>(key: K, value: ResourceData[K]) => setData((d) => ({ ...d, [key]: value }));
  const togglePlatform = (id: string) => set("platformIds", data.platformIds.includes(id) ? data.platformIds.filter((p) => p !== id) : [...data.platformIds, id]);

  async function save() {
    setSaving(true);
    const payload = { ...data, noIndex: data.noIndex ? 1 : 0 };
    const res = resourceId
      ? await fetch(`/api/resources/${resourceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { router.push("/admin"); router.refresh(); }
    else { alert("Save failed"); setSaving(false); }
  }

  async function handleDelete() {
    if (!resourceId || !confirm("Delete this resource?")) return;
    setDeleting(true);
    await fetch(`/api/resources/${resourceId}`, { method: "DELETE" });
    router.push("/admin"); router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Field label="Title"><Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Resource title" /></Field>
        <Field label="URL"><Input value={data.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" /></Field>
        <Field label="Source name"><Input value={data.sourceName} onChange={(e) => set("sourceName", e.target.value)} placeholder="e.g. Ghost Docs" /></Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Type">
            <Select value={data.resourceType} onChange={(e) => set("resourceType", e.target.value as ResourceType)}>
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="forum_thread">Forum thread</option>
              <option value="docs">Docs</option>
              <option value="tool">Tool</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={data.status} onChange={(e) => set("status", e.target.value as GuideStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </div>

        <Field label="Summary"><Textarea rows={3} value={data.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Short annotation/summary" /></Field>
        <Field label="Internal notes" hint="Never shown publicly">
          <Textarea rows={3} value={data.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} placeholder="Author-only notes" />
        </Field>

        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <input type="checkbox" checked={data.isPublic} onChange={(e) => set("isPublic", e.target.checked)} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Public (uncheck for internal-research-only)</span>
        </label>

        {platforms.length > 0 && (
          <div>
            <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              Platforms
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "var(--text-2xs)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    padding: "4px 9px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    color: data.platformIds.includes(p.id) ? "var(--text-on-accent)" : "var(--text-muted)",
                    background: data.platformIds.includes(p.id) ? "var(--solid)" : "transparent",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <SeoFields
        entityType="resource"
        vars={{ title: data.title, summary: data.summary }}
        previewUrl="tan.ho › resources"
        value={{ seoTitle: data.seoTitle, seoDescription: data.seoDescription, ogImage: data.ogImage, canonicalUrl: data.canonicalUrl, noIndex: data.noIndex }}
        onChange={(v) => setData((d) => ({ ...d, ...v }))}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        {resourceId && (
          <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
