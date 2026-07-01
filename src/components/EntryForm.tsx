"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { SeoFields, type SeoFieldsValue } from "@/components/SeoFields";
import { PageBuilder } from "@/components/PageBuilder";
import { RichTextEditor } from "@/lib/richtext/RichTextEditor";
import { slugify } from "@/lib/utils";
import type { FieldDef, ContentEntry, ContentType, Platform, Collection } from "@/lib/db";

interface Props {
  contentType: ContentType;
  entryId?: string;
  initial?: Partial<ContentEntry>;
  onUpload: (file: File) => Promise<string>;
  /** Passed down from the server-rendered parent page (listPlatforms()) for any 'select' field
   * declaring dynamicOptions: "platforms" -- e.g. the built-in guide type's sourcePlatform/
   * targetPlatform fields. Omitted/empty is fine for content types with no such field. */
  platforms?: Platform[];
  /** All collections (for the assignment checklist) and this entry's current assignments
   * (content_entry_id -> collection_id, sortOrder), both fetched server-side by the parent page. */
  allCollections?: Collection[];
  entryCollectionIds?: string[];
}

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

function parseFields(fieldsJson: string): FieldDef[] {
  try {
    return JSON.parse(fieldsJson) as FieldDef[];
  } catch {
    return [];
  }
}

function parseEntryData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function EntryForm({ contentType, entryId, initial, onUpload, platforms, allCollections, entryCollectionIds }: Props) {
  const router = useRouter();
  const fields = parseFields(contentType.fields);
  const initialData = initial?.data ? parseEntryData(initial.data) : {};

  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [status, setStatus] = useState<ContentEntry["status"]>(initial?.status || "draft");
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduledAt || "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder || 0);
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [collectionIds, setCollectionIds] = useState<string[]>(entryCollectionIds || []);
  const [seo, setSeo] = useState<SeoFieldsValue>({
    seoTitle: initial?.seoTitle || "",
    seoDescription: initial?.seoDescription || "",
    ogImage: initial?.ogImage || "",
    canonicalUrl: initial?.canonicalUrl || "",
    noIndex: !!initial?.noIndex,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: string, value: unknown) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        typeSlug: contentType.slug,
        title,
        slug: slug || slugify(title),
        status,
        scheduledAt: scheduledAt || null,
        sortOrder,
        seoTitle: seo.seoTitle || null,
        seoDescription: seo.seoDescription || null,
        ogImage: seo.ogImage || null,
        canonicalUrl: seo.canonicalUrl || null,
        noIndex: seo.noIndex,
        data,
        collectionIds,
      };
      const url = entryId ? `/api/content-entries/${entryId}` : "/api/content-entries";
      const method = entryId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Save failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!entryId) return;
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    const res = await fetch(`/api/content-entries/${entryId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div>
        <h2 style={sectionLabel}>Title &amp; Status</h2>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title" />
        </Field>
        <Field label="Slug">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(title) || "auto-from-title"} />
        </Field>
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end" }}>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ContentEntry["status"])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </Select>
          </Field>
          {status === "scheduled" && (
            <Field label="Scheduled at">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
          )}
          <Field label="Sort order">
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div>
        <h2 style={sectionLabel}>Content</h2>
        {fields.length === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            This content type has no fields defined. Add fields in the content type editor.
          </p>
        )}
        {fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={data[field.key]}
            onChange={(v) => updateField(field.key, v)}
            onUpload={onUpload}
            platforms={platforms}
          />
        ))}
      </div>

      {allCollections && allCollections.length > 0 && (
        <div>
          <h2 style={sectionLabel}>Collections</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {allCollections.map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text)" }}>
                <input
                  type="checkbox"
                  checked={collectionIds.includes(c.id)}
                  onChange={(e) =>
                    setCollectionIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 style={sectionLabel}>SEO</h2>
        <SeoFields
          entityType="page"
          vars={{ title }}
          value={seo}
          onChange={setSeo}
        />
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>}

      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : entryId ? "Save changes" : "Create entry"}</Button>
        {entryId && <Button onClick={remove} variant="outline">Delete</Button>}
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  onUpload,
  platforms,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  onUpload: (file: File) => Promise<string>;
  platforms?: Platform[];
}) {
  const label = field.label + (field.required ? " *" : "");
  switch (field.kind) {
    case "textarea":
      return (
        <Field label={label}>
          <Textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "richtext":
      return (
        <Field label={label}>
          <RichTextEditor value={(value as string) || ""} onChange={onChange} />
        </Field>
      );
    case "number":
      return (
        <Field label={label}>
          <Input type="number" value={value as number} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      );
    case "boolean":
      return (
        <Field label={label}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />
        </Field>
      );
    case "select": {
      const dynamicOpts = field.dynamicOptions === "platforms" ? (platforms || []) : null;
      return (
        <Field label={label}>
          <Select value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {dynamicOpts
              ? dynamicOpts.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)
              : (field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
          {dynamicOpts && dynamicOpts.length === 0 && (
            <p style={{ margin: "var(--space-1) 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              No platforms defined yet.
            </p>
          )}
        </Field>
      );
    }
    case "date":
      return (
        <Field label={label}>
          <Input type="date" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "datetime":
      return (
        <Field label={label}>
          <Input type="datetime-local" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "image":
      return (
        <Field label={label}>
          <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" />
          <input type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onChange(await onUpload(file));
          }} />
        </Field>
      );
    case "url":
      return (
        <Field label={label}>
          <Input type="url" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
        </Field>
      );
    case "tags": {
      const tags = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Field label={label}>
          <Input
            value={tags.join(", ")}
            onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="comma, separated, tags"
          />
        </Field>
      );
    }
    case "block-list": {
      const blocks = Array.isArray(value) ? (value as Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>) : [];
      return (
        <Field label={label}>
          <PageBuilder blocks={blocks as never} onChange={onChange} onUpload={onUpload} />
        </Field>
      );
    }
    case "reference":
      return (
        <Field label={label}>
          <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="Reference ID" />
        </Field>
      );
    default:
      return (
        <Field label={label}>
          <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
  }
}
