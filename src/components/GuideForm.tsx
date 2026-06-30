"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Platform, Tag, Resource, GuideDifficulty, CostPeriod } from "@/lib/db";

interface Step {
  title: string;
  type: "text" | "image" | "video" | "code" | "callout" | "checklist";
  content: Record<string, unknown>;
  sort_order: number;
}

interface GuideData {
  title: string; slug: string; tagline: string; summary: string;
  source_platform: string; target_platform: string; difficulty: GuideDifficulty;
  effort_hours_min: number | ""; effort_hours_max: number | "";
  cost_min_usd: number | ""; cost_max_usd: number | ""; cost_period: CostPeriod;
  skills_required: string[]; requirements: string[]; cover_image: string;
  status: "draft" | "published"; sort_order: number;
  steps: Step[]; tagIds: number[]; resourceIds: number[];
}

interface Props {
  guideId?: number;
  initial?: Partial<GuideData>;
  initialSteps?: Array<{ title: string | null; type: string; content: string; sort_order: number }>;
  platforms: Platform[];
  tags: Tag[];
  resources: Resource[];
}

const DEFAULT: GuideData = {
  title: "", slug: "", tagline: "", summary: "",
  source_platform: "", target_platform: "", difficulty: "intermediate",
  effort_hours_min: "", effort_hours_max: "", cost_min_usd: "", cost_max_usd: "", cost_period: "monthly",
  skills_required: [], requirements: [], cover_image: "",
  status: "draft", sort_order: 0, steps: [], tagIds: [], resourceIds: [],
};

export function GuideForm({ guideId, initial, initialSteps = [], platforms, tags, resources }: Props) {
  const router = useRouter();
  const [data, setData] = useState<GuideData>({
    ...DEFAULT, ...initial,
    steps: initialSteps.map((s) => ({ title: s.title || "", type: s.type as Step["type"], content: JSON.parse(s.content), sort_order: s.sort_order })),
  });
  const [skillInput, setSkillInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const set = <K extends keyof GuideData>(key: K, value: GuideData[K]) => setData((d) => ({ ...d, [key]: value }));

  const addSkill = () => { const s = skillInput.trim(); if (s && !data.skills_required.includes(s)) set("skills_required", [...data.skills_required, s]); setSkillInput(""); };
  const removeSkill = (s: string) => set("skills_required", data.skills_required.filter((x) => x !== s));
  const addRequirement = () => { const r = requirementInput.trim(); if (r && !data.requirements.includes(r)) set("requirements", [...data.requirements, r]); setRequirementInput(""); };
  const removeRequirement = (r: string) => set("requirements", data.requirements.filter((x) => x !== r));

  const addStep = (type: Step["type"]) => {
    const defaultContent: Record<string, unknown> = type === "checklist" ? { items: [] } : type === "callout" ? { variant: "tip", html: "" } : {};
    set("steps", [...data.steps, { title: "", type, content: defaultContent, sort_order: data.steps.length }]);
  };
  const updateStep = (i: number, patch: Partial<Step>) => set("steps", data.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStep = (i: number) => set("steps", data.steps.filter((_, idx) => idx !== i));

  const toggleTag = (id: number) => set("tagIds", data.tagIds.includes(id) ? data.tagIds.filter((t) => t !== id) : [...data.tagIds, id]);
  const toggleResource = (id: number) => set("resourceIds", data.resourceIds.includes(id) ? data.resourceIds.filter((r) => r !== id) : [...data.resourceIds, id]);

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
    const payload = {
      ...data,
      effort_hours_min: data.effort_hours_min === "" ? null : Number(data.effort_hours_min),
      effort_hours_max: data.effort_hours_max === "" ? null : Number(data.effort_hours_max),
      cost_min_usd: data.cost_min_usd === "" ? null : Number(data.cost_min_usd),
      cost_max_usd: data.cost_max_usd === "" ? null : Number(data.cost_max_usd),
      steps: data.steps.map((s, i) => ({ title: s.title || null, type: s.type, content: JSON.stringify(s.content), sort_order: i })),
    };
    const res = guideId
      ? await fetch(`/api/guides/${guideId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { router.push("/admin/guides"); router.refresh(); }
    else { alert("Save failed"); setSaving(false); }
  }

  async function handleDelete() {
    if (!guideId || !confirm("Delete this guide?")) return;
    setDeleting(true);
    await fetch(`/api/guides/${guideId}`, { method: "DELETE" });
    router.push("/admin/guides"); router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Field label="Title"><input value={data.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Guide title" /></Field>
        <Field label="Slug"><input value={data.slug} onChange={(e) => set("slug", e.target.value)} className={input} placeholder="auto-generated if blank" /></Field>
        <Field label="Tagline"><input value={data.tagline} onChange={(e) => set("tagline", e.target.value)} className={input} placeholder="One-line summary" /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Source platform">
            <select value={data.source_platform} onChange={(e) => set("source_platform", e.target.value)} className={input}>
              <option value="">Select…</option>
              {platforms.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Target platform">
            <select value={data.target_platform} onChange={(e) => set("target_platform", e.target.value)} className={input}>
              <option value="">Select…</option>
              {platforms.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Difficulty">
            <select value={data.difficulty} onChange={(e) => set("difficulty", e.target.value as GuideDifficulty)} className={input}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={data.status} onChange={(e) => set("status", e.target.value as "draft" | "published")} className={input}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Effort hours (min)"><input type="number" value={data.effort_hours_min} onChange={(e) => set("effort_hours_min", e.target.value === "" ? "" : Number(e.target.value))} className={input} /></Field>
          <Field label="Effort hours (max)"><input type="number" value={data.effort_hours_max} onChange={(e) => set("effort_hours_max", e.target.value === "" ? "" : Number(e.target.value))} className={input} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Cost min ($)"><input type="number" value={data.cost_min_usd} onChange={(e) => set("cost_min_usd", e.target.value === "" ? "" : Number(e.target.value))} className={input} /></Field>
          <Field label="Cost max ($)"><input type="number" value={data.cost_max_usd} onChange={(e) => set("cost_max_usd", e.target.value === "" ? "" : Number(e.target.value))} className={input} /></Field>
          <Field label="Cost period">
            <select value={data.cost_period} onChange={(e) => set("cost_period", e.target.value as CostPeriod)} className={input}>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
          </Field>
        </div>

        <Field label="Skills required">
          <TagInput value={skillInput} onChange={setSkillInput} onAdd={addSkill} items={data.skills_required} onRemove={removeSkill} />
        </Field>
        <Field label="Requirements">
          <TagInput value={requirementInput} onChange={setRequirementInput} onAdd={addRequirement} items={data.requirements} onRemove={removeRequirement} />
        </Field>

        <Field label="Cover Image">
          <div className="space-y-2">
            {data.cover_image && <img src={data.cover_image} alt="" className="w-full aspect-video object-cover rounded-sm" />}
            <input type="file" accept="image/*" onChange={uploadCover} className="text-xs" style={{ color: "var(--muted)" }} />
            {uploadingCover && <p className="text-xs" style={{ color: "var(--muted)" }}>Uploading…</p>}
            <input value={data.cover_image} onChange={(e) => set("cover_image", e.target.value)} className={input} placeholder="Or paste URL" />
          </div>
        </Field>

        <Field label="Summary (HTML)">
          <textarea value={data.summary} onChange={(e) => set("summary", e.target.value)} className={`${input} h-32 resize-y font-mono text-xs`} placeholder="<p>Guide overview…</p>" />
        </Field>

        {tags.length > 0 && (
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className="text-xs px-2 py-0.5 rounded-full transition-colors"
                  style={{ border: "1px solid var(--border)", color: data.tagIds.includes(t.id) ? "var(--background)" : "var(--muted)", background: data.tagIds.includes(t.id) ? "var(--foreground)" : "transparent" }}>
                  {t.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {resources.length > 0 && (
          <Field label="Further reading resources">
            <div className="flex flex-wrap gap-1.5">
              {resources.map((r) => (
                <button key={r.id} type="button" onClick={() => toggleResource(r.id)}
                  className="text-xs px-2 py-0.5 rounded-full transition-colors"
                  style={{ border: "1px solid var(--border)", color: data.resourceIds.includes(r.id) ? "var(--background)" : "var(--muted)", background: data.resourceIds.includes(r.id) ? "var(--foreground)" : "transparent" }}>
                  {r.title}
                </button>
              ))}
            </div>
          </Field>
        )}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Walkthrough Steps</h2>
        <div className="space-y-4">
          {data.steps.map((step, i) => (
            <StepEditor key={i} step={step} onChange={(patch) => updateStep(i, patch)} onRemove={() => removeStep(i)} onUpload={uploadFile} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {(["text", "image", "video", "code", "callout", "checklist"] as const).map((t) => (
            <button key={t} type="button" onClick={() => addStep(t)} className={`${btn} text-[10px]`}>+ {t}</button>
          ))}
        </div>
      </section>

      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button onClick={save} disabled={saving} className="text-sm font-medium px-6 py-2.5 transition-colors disabled:opacity-50" style={{ background: "var(--foreground)", color: "var(--background)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        {guideId && (
          <button onClick={handleDelete} disabled={deleting} className="text-sm text-red-600 hover:text-red-400 transition-colors">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}

function TagInput({ value, onChange, onAdd, items, onRemove }: {
  value: string; onChange: (v: string) => void; onAdd: () => void; items: string[]; onRemove: (s: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          className={`${input} flex-1`} placeholder="Add and press Enter" />
        <button type="button" onClick={onAdd} className={btn}>Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className="flex items-center gap-1 text-xs px-2 py-0.5" style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
            {s}<button onClick={() => onRemove(s)} className="transition-colors" style={{ color: "var(--muted)" }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function StepEditor({ step, onChange, onRemove, onUpload }: {
  step: Step;
  onChange: (patch: Partial<Step>) => void;
  onRemove: () => void;
  onUpload: (f: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const content = step.content;
  const setContent = (patch: Record<string, unknown>) => onChange({ content: { ...content, ...patch } });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    setContent({ url: await onUpload(file) });
    setUploading(false);
  }

  return (
    <div className="p-4 space-y-3" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>{step.type}</span>
        <input value={step.title} onChange={(e) => onChange({ title: e.target.value })} className={`${input} flex-1`} placeholder="Step title (optional)" />
        <button onClick={onRemove} className="text-xs hover:text-red-500 transition-colors flex-shrink-0" style={{ color: "var(--muted)" }}>Remove</button>
      </div>

      {step.type === "text" && (
        <textarea value={(content.html as string) || ""} onChange={(e) => setContent({ html: e.target.value })}
          className={`${input} h-40 resize-y font-mono text-xs`} placeholder="<p>Content HTML…</p>" />
      )}

      {(step.type === "image" || step.type === "video") && (
        <div className="space-y-2">
          {!!(content.url) && step.type === "image" && <img src={content.url as string} alt="" className="w-full aspect-video object-cover rounded-sm" />}
          {!!(content.url) && step.type === "video" && <video src={content.url as string} controls className="w-full rounded-sm" />}
          <input type="file" accept={step.type === "image" ? "image/*" : "video/*"} onChange={handleFileUpload} className="text-xs" style={{ color: "var(--muted)" }} />
          {uploading && <p className="text-xs" style={{ color: "var(--muted)" }}>Uploading…</p>}
          <input value={(content.url as string) || ""} onChange={(e) => setContent({ url: e.target.value })} className={input} placeholder="Or paste URL" />
          <input value={(content.caption as string) || ""} onChange={(e) => setContent({ caption: e.target.value })} className={input} placeholder="Caption (optional)" />
          {step.type === "video" && <input value={(content.poster as string) || ""} onChange={(e) => setContent({ poster: e.target.value })} className={input} placeholder="Poster image URL (optional)" />}
        </div>
      )}

      {step.type === "code" && (
        <div className="space-y-2">
          <input value={(content.filename as string) || ""} onChange={(e) => setContent({ filename: e.target.value })} className={input} placeholder="Filename (optional)" />
          <input value={(content.language as string) || ""} onChange={(e) => setContent({ language: e.target.value })} className={input} placeholder="Language (e.g. bash)" />
          <textarea value={(content.code as string) || ""} onChange={(e) => setContent({ code: e.target.value })}
            className={`${input} h-32 resize-y font-mono text-xs`} placeholder="$ ssh user@your-server" />
        </div>
      )}

      {step.type === "callout" && (
        <div className="space-y-2">
          <select value={(content.variant as string) || "tip"} onChange={(e) => setContent({ variant: e.target.value })} className={input}>
            <option value="tip">Tip</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
          <textarea value={(content.html as string) || ""} onChange={(e) => setContent({ html: e.target.value })}
            className={`${input} h-24 resize-y font-mono text-xs`} placeholder="<p>Don't forget to back up your database first.</p>" />
        </div>
      )}

      {step.type === "checklist" && (
        <div className="space-y-2">
          {((content.items as string[]) || []).map((item, i) => (
            <div key={i} className="flex gap-2">
              <input value={item} onChange={(e) => { const items = [...((content.items as string[]) || [])]; items[i] = e.target.value; setContent({ items }); }} className={`${input} flex-1`} />
              <button onClick={() => { const items = ((content.items as string[]) || []).filter((_, j) => j !== i); setContent({ items }); }} className="hover:text-red-500 px-2 transition-colors" style={{ color: "var(--muted)" }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setContent({ items: [...((content.items as string[]) || []), ""] })} className={`${btn} text-[10px]`}>+ Add item</button>
        </div>
      )}
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
const btn = "text-xs px-3 py-1.5 transition-colors";
