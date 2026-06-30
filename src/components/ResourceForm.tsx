"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Platform, ResourceType, GuideStatus } from "@/lib/db";

interface ResourceData {
  title: string; url: string; source_name: string; summary: string;
  resource_type: ResourceType; internal_notes: string; is_public: boolean;
  status: GuideStatus; platformIds: number[];
}

interface Props {
  resourceId?: number;
  initial?: Partial<ResourceData>;
  platforms: Platform[];
}

const DEFAULT: ResourceData = {
  title: "", url: "", source_name: "", summary: "",
  resource_type: "article", internal_notes: "", is_public: true,
  status: "draft", platformIds: [],
};

export function ResourceForm({ resourceId, initial, platforms }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ResourceData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof ResourceData>(key: K, value: ResourceData[K]) => setData((d) => ({ ...d, [key]: value }));
  const togglePlatform = (id: number) => set("platformIds", data.platformIds.includes(id) ? data.platformIds.filter((p) => p !== id) : [...data.platformIds, id]);

  async function save() {
    setSaving(true);
    const res = resourceId
      ? await fetch(`/api/resources/${resourceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { router.push("/admin/resources"); router.refresh(); }
    else { alert("Save failed"); setSaving(false); }
  }

  async function handleDelete() {
    if (!resourceId || !confirm("Delete this resource?")) return;
    setDeleting(true);
    await fetch(`/api/resources/${resourceId}`, { method: "DELETE" });
    router.push("/admin/resources"); router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Field label="Title"><input value={data.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Resource title" /></Field>
        <Field label="URL"><input value={data.url} onChange={(e) => set("url", e.target.value)} className={input} placeholder="https://" /></Field>
        <Field label="Source name"><input value={data.source_name} onChange={(e) => set("source_name", e.target.value)} className={input} placeholder="e.g. Ghost Docs" /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select value={data.resource_type} onChange={(e) => set("resource_type", e.target.value as ResourceType)} className={input}>
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="forum_thread">Forum thread</option>
              <option value="docs">Docs</option>
              <option value="tool">Tool</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={data.status} onChange={(e) => set("status", e.target.value as GuideStatus)} className={input}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>

        <Field label="Summary"><textarea value={data.summary} onChange={(e) => set("summary", e.target.value)} className={`${input} h-24 resize-y`} placeholder="Short annotation/summary" /></Field>
        <Field label="Internal notes (never shown publicly)"><textarea value={data.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} className={`${input} h-24 resize-y`} placeholder="Author-only notes" /></Field>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <input type="checkbox" checked={data.is_public} onChange={(e) => set("is_public", e.target.checked)} />
          Public (uncheck for internal-research-only)
        </label>

        {platforms.length > 0 && (
          <Field label="Platforms">
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => (
                <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                  className="text-xs px-2 py-0.5 rounded-full transition-colors"
                  style={{ border: "1px solid var(--border)", color: data.platformIds.includes(p.id) ? "var(--background)" : "var(--muted)", background: data.platformIds.includes(p.id) ? "var(--foreground)" : "transparent" }}>
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
        )}
      </section>

      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={save} disabled={saving} className="text-sm font-medium px-6 py-2.5 transition-colors disabled:opacity-50" style={{ background: "var(--foreground)", color: "var(--background)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        {resourceId && (
          <button onClick={handleDelete} disabled={deleting} className="text-sm text-red-600 hover:text-red-400 transition-colors">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

const input = "w-full text-sm px-3 py-2 outline-none transition-colors";
