"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { slugify } from "@/lib/utils";
import { GuideDifficulty, CostPeriod, GuideStatus, Platform, Tag, Resource, GuideStep } from "@/lib/db";

type StepDraft = {
  title: string;
  type: GuideStep["type"];
  content: Record<string, unknown>;
};

interface GuideData {
  title: string; slug: string; tagline: string; summary: string;
  sourcePlatform: string; targetPlatform: string; difficulty: GuideDifficulty;
  effortHoursMin: number | ""; effortHoursMax: number | "";
  costMinUsd: number | ""; costMaxUsd: number | ""; costPeriod: CostPeriod;
  skillsRequired: string[]; requirements: string[];
  coverImage: string; status: GuideStatus; sortOrder: number;
  seoTitle: string; seoDescription: string; ogImage: string; canonicalUrl: string; noIndex: boolean;
  tagIds: string[]; resourceIds: string[];
}

interface Props {
  guideId?: string;
  initial?: Partial<GuideData>;
  initialSteps?: GuideStep[];
  platforms: Platform[];
  tags: Tag[];
  resources: Resource[];
}

const DEFAULT: GuideData = {
  title: "", slug: "", tagline: "", summary: "",
  sourcePlatform: "", targetPlatform: "", difficulty: "intermediate",
  effortHoursMin: "", effortHoursMax: "",
  costMinUsd: "", costMaxUsd: "", costPeriod: "monthly",
  skillsRequired: [], requirements: [],
  coverImage: "", status: "draft", sortOrder: 0,
  seoTitle: "", seoDescription: "", ogImage: "", canonicalUrl: "", noIndex: false,
  tagIds: [], resourceIds: [],
};

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

const pillStyle = (active: boolean): CSSProperties => ({
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  padding: "4px 9px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--border)",
  cursor: "pointer",
  color: active ? "var(--text-on-accent)" : "var(--text-muted)",
  background: active ? "var(--solid)" : "transparent",
});

function stepToDraft(step: GuideStep): StepDraft {
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(step.content);
  } catch {
    content = {};
  }
  return { title: step.title || "", type: step.type, content };
}

function defaultContentFor(type: GuideStep["type"]): Record<string, unknown> {
  switch (type) {
    case "text":
    case "callout":
      return { html: "" };
    case "image":
      return { url: "", caption: "" };
    case "video":
      return { url: "", caption: "", poster: "" };
    case "code":
      return { filename: "", code: "" };
    case "checklist":
      return { items: [] };
    default:
      return {};
  }
}

function StepEditor({ step, onChange, onRemove }: { step: StepDraft; onChange: (s: StepDraft) => void; onRemove: () => void }) {
  const setContent = (key: string, value: unknown) => onChange({ ...step, content: { ...step.content, [key]: value } });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: "var(--space-3)" }}>
        <Input value={step.title} onChange={(e) => onChange({ ...step, title: e.target.value })} placeholder="Step title (optional)" />
        <Select
          value={step.type}
          onChange={(e) => {
            const type = e.target.value as GuideStep["type"];
            onChange({ ...step, type, content: defaultContentFor(type) });
          }}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="code">Code</option>
          <option value="callout">Callout</option>
          <option value="checklist">Checklist</option>
        </Select>
      </div>

      {(step.type === "text" || step.type === "callout") && (
        <Textarea rows={4} value={(step.content.html as string) || ""} onChange={(e) => setContent("html", e.target.value)} placeholder="HTML content" />
      )}
      {step.type === "image" && (
        <>
          <Input value={(step.content.url as string) || ""} onChange={(e) => setContent("url", e.target.value)} placeholder="Image URL" />
          <Input value={(step.content.caption as string) || ""} onChange={(e) => setContent("caption", e.target.value)} placeholder="Caption (optional)" />
        </>
      )}
      {step.type === "video" && (
        <>
          <Input value={(step.content.url as string) || ""} onChange={(e) => setContent("url", e.target.value)} placeholder="Video URL" />
          <Input value={(step.content.poster as string) || ""} onChange={(e) => setContent("poster", e.target.value)} placeholder="Poster image URL (optional)" />
          <Input value={(step.content.caption as string) || ""} onChange={(e) => setContent("caption", e.target.value)} placeholder="Caption (optional)" />
        </>
      )}
      {step.type === "code" && (
        <>
          <Input value={(step.content.filename as string) || ""} onChange={(e) => setContent("filename", e.target.value)} placeholder="Filename (optional)" />
          <Textarea rows={5} value={(step.content.code as string) || ""} onChange={(e) => setContent("code", e.target.value)} placeholder="Code" style={{ fontFamily: "var(--font-mono)" }} />
        </>
      )}
      {step.type === "checklist" && (
        <Textarea
          rows={4}
          value={((step.content.items as string[]) || []).join("\n")}
          onChange={(e) => setContent("items", e.target.value.split("\n").filter(Boolean))}
          placeholder={"One checklist item per line"}
        />
      )}

      <button type="button" onClick={onRemove} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
        Remove step
      </button>
    </div>
  );
}

export function GuideForm({ guideId, initial, initialSteps, platforms, tags, resources }: Props) {
  const router = useRouter();
  const [data, setData] = useState<GuideData>({ ...DEFAULT, ...initial });
  const [steps, setSteps] = useState<StepDraft[]>((initialSteps || []).map(stepToDraft));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof GuideData>(key: K, value: GuideData[K]) => setData((d) => ({ ...d, [key]: value }));
  const toggleTag = (id: string) => set("tagIds", data.tagIds.includes(id) ? data.tagIds.filter((t) => t !== id) : [...data.tagIds, id]);
  const toggleResource = (id: string) => set("resourceIds", data.resourceIds.includes(id) ? data.resourceIds.filter((r) => r !== id) : [...data.resourceIds, id]);

  function addStep() {
    setSteps((s) => [...s, { title: "", type: "text", content: defaultContentFor("text") }]);
  }
  function updateStep(i: number, next: StepDraft) {
    setSteps((s) => s.map((step, idx) => (idx === i ? next : step)));
  }
  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...data,
      slug: data.slug || slugify(data.title),
      effortHoursMin: data.effortHoursMin === "" ? null : data.effortHoursMin,
      effortHoursMax: data.effortHoursMax === "" ? null : data.effortHoursMax,
      costMinUsd: data.costMinUsd === "" ? null : data.costMinUsd,
      costMaxUsd: data.costMaxUsd === "" ? null : data.costMaxUsd,
      noIndex: data.noIndex ? 1 : 0,
      steps: steps.map((s, i) => ({ title: s.title || null, type: s.type, content: JSON.stringify(s.content), sortOrder: i })),
    };
    const res = guideId
      ? await fetch(`/api/guides/${guideId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Save failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!guideId || !confirm("Delete this guide?")) return;
    setDeleting(true);
    await fetch(`/api/guides/${guideId}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <Field label="Title"><Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Guide title" /></Field>
        <Field label="Slug" hint="Falls back to a slugified title when blank">
          <Input value={data.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(data.title) || "guide-slug"} />
        </Field>
        <Field label="Tagline"><Input value={data.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One-line summary" /></Field>
        <Field label="Summary" hint="Rendered as HTML"><Textarea rows={4} value={data.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Intro summary" /></Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Source platform"><Input value={data.sourcePlatform} onChange={(e) => set("sourcePlatform", e.target.value)} placeholder="e.g. squarespace" /></Field>
          <Field label="Target platform"><Input value={data.targetPlatform} onChange={(e) => set("targetPlatform", e.target.value)} placeholder="e.g. ghost" /></Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Difficulty">
            <Select value={data.difficulty} onChange={(e) => set("difficulty", e.target.value as GuideDifficulty)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={data.status} onChange={(e) => set("status", e.target.value as GuideStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Effort hours min"><Input type="number" value={data.effortHoursMin} onChange={(e) => set("effortHoursMin", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
          <Field label="Effort hours max"><Input type="number" value={data.effortHoursMax} onChange={(e) => set("effortHoursMax", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-5)" }}>
          <Field label="Cost min ($)"><Input type="number" value={data.costMinUsd} onChange={(e) => set("costMinUsd", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
          <Field label="Cost max ($)"><Input type="number" value={data.costMaxUsd} onChange={(e) => set("costMaxUsd", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
          <Field label="Cost period">
            <Select value={data.costPeriod} onChange={(e) => set("costPeriod", e.target.value as CostPeriod)}>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </Select>
          </Field>
        </div>

        <Field label="Skills required" hint="One per line">
          <Textarea rows={3} value={data.skillsRequired.join("\n")} onChange={(e) => set("skillsRequired", e.target.value.split("\n").filter(Boolean))} />
        </Field>
        <Field label="Requirements" hint="One per line">
          <Textarea rows={3} value={data.requirements.join("\n")} onChange={(e) => set("requirements", e.target.value.split("\n").filter(Boolean))} />
        </Field>
        <Field label="Cover image"><Input value={data.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://…" /></Field>
        <Field label="Sort order"><Input type="number" value={data.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></Field>

        {tags.length > 0 && (
          <div>
            <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              Tags
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tags.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)} style={pillStyle(data.tagIds.includes(t.id))}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {resources.length > 0 && (
          <div>
            <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              Related resources
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {resources.map((r) => (
                <button key={r.id} type="button" onClick={() => toggleResource(r.id)} style={pillStyle(data.resourceIds.includes(r.id))}>
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {platforms.length === 0 && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>No platforms seeded yet — source/target platform are freeform text for now.</p>
        )}
      </section>

      <section>
        <h2 style={sectionLabel}>Steps</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {steps.map((step, i) => (
            <StepEditor key={i} step={step} onChange={(s) => updateStep(i, s)} onRemove={() => removeStep(i)} />
          ))}
          <Button type="button" variant="outline" onClick={addStep} style={{ alignSelf: "flex-start" }}>
            + Add step
          </Button>
        </div>
      </section>

      <section>
        <details>
          <summary style={{ ...sectionLabel, cursor: "pointer", display: "list-item" }}>SEO</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", marginTop: "var(--space-5)" }}>
            <Field label="SEO title" hint="Falls back to Title when blank">
              <Input value={data.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={data.title || "Guide title"} />
            </Field>
            <Field label="SEO description" hint="Falls back to Tagline when blank">
              <Textarea rows={2} value={data.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder={data.tagline || "Short description"} />
            </Field>
            <Field label="OG image">
              <Input value={data.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Canonical URL">
              <Input value={data.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <input type="checkbox" checked={data.noIndex} onChange={(e) => set("noIndex", e.target.checked)} />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Hide from search engines (noindex)</span>
            </label>
          </div>
        </details>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        {guideId && (
          <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
