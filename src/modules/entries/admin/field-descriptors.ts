/** The control kinds a data field can render as. */
export type FieldKind = "text" | "textarea" | "select" | "tags" | "number" | "boolean";

/** One data-field descriptor: which control + label (+ options for selects). */
export type FieldDescriptor = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Value/label pairs for `select` controls. */
  options?: [value: string, label: string][];
  hint?: string;
  /**
   * Overrides seedData's kind-based default (below) for a NEW entry.
   * Needed when a field's real Zod schema wouldn't accept the generic
   * kind-based guess — e.g. custom-types/admin/descriptors.ts maps several
   * unsupported FieldKinds (date, url, email, color, json, repeater) onto
   * this module's plain "text" kind for display, but their real schema
   * rejects an empty string even when the field is optional.
   */
  seedValue?: unknown;
};

/**
 * Per-entity data-field descriptors. Introspecting arbitrary zod is fiddly, so
 * each content type lists its `data` fields explicitly here — this stays in
 * sync with the zod schemas in src/entities/schemas/{project,guide,resource}.ts.
 */
export const FIELD_DESCRIPTORS: Record<string, FieldDescriptor[]> = {
  project: [
    { key: "tagline", label: "Tagline", kind: "text" },
    { key: "year", label: "Year", kind: "text" },
    { key: "live_url", label: "Live URL", kind: "text", hint: "https:// or blank" },
    { key: "github_url", label: "GitHub URL", kind: "text", hint: "https:// or blank" },
    { key: "tags", label: "Tags", kind: "tags", hint: "Comma-separated" },
  ],
  guide: [
    { key: "tagline", label: "Tagline", kind: "text" },
    { key: "summary", label: "Summary", kind: "textarea" },
    { key: "category", label: "Category", kind: "text", hint: "Hub slug" },
    { key: "source_platform", label: "Source platform", kind: "text", hint: "Slug" },
    { key: "target_platform", label: "Target platform", kind: "text", hint: "Slug" },
    {
      key: "difficulty",
      label: "Difficulty",
      kind: "select",
      options: [
        ["beginner", "Beginner"],
        ["intermediate", "Intermediate"],
        ["advanced", "Advanced"],
      ],
    },
    { key: "effort_hours_min", label: "Effort hours (min)", kind: "number" },
    { key: "effort_hours_max", label: "Effort hours (max)", kind: "number" },
    { key: "cost_min_usd", label: "Cost min (USD)", kind: "number" },
    { key: "cost_max_usd", label: "Cost max (USD)", kind: "number" },
    {
      key: "cost_period",
      label: "Cost period",
      kind: "select",
      options: [
        ["mo", "Monthly"],
        ["yr", "Yearly"],
        ["one-time", "One-time"],
      ],
    },
    { key: "tags", label: "Tags", kind: "tags", hint: "Comma-separated" },
    { key: "resource_slugs", label: "Resource slugs", kind: "tags", hint: "Comma-separated" },
    { key: "skills_required", label: "Skills required", kind: "tags", hint: "Comma-separated" },
    { key: "requirements", label: "Requirements", kind: "tags", hint: "Comma-separated" },
  ],
  resource: [
    { key: "url", label: "URL", kind: "text", hint: "https:// or blank" },
    {
      key: "resource_type",
      label: "Type",
      kind: "select",
      options: [
        ["docs", "Docs"],
        ["article", "Article"],
        ["video", "Video"],
        ["forum_thread", "Forum thread"],
        ["tool", "Tool"],
        ["interactive", "Interactive"],
      ],
    },
    { key: "source_name", label: "Source name", kind: "text" },
    { key: "summary", label: "Summary", kind: "textarea" },
    { key: "platforms", label: "Platforms", kind: "tags", hint: "Comma-separated" },
    { key: "is_public", label: "Visibility", kind: "boolean" },
    { key: "internal_notes", label: "Internal notes", kind: "textarea", hint: "Never shown publicly" },
    { key: "internal_route", label: "Internal route", kind: "text", hint: "e.g. /quiz" },
    { key: "category", label: "Category", kind: "text", hint: "Hub slug" },
  ],
};

/** Lowercase, spaces→dashes, strip anything outside [a-z0-9-]. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Split a comma-separated string into a trimmed, empties-dropped list. */
export function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Join a tag list back into the comma-separated editing string. */
export function joinTags(value: unknown): string {
  return Array.isArray(value) ? value.map((v) => String(v)).join(", ") : "";
}

/**
 * Seed a data record from descriptors, overlaying any existing entry data.
 */
export function seedData(
  descriptors: FieldDescriptor[],
  existing: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of descriptors) {
    const cur = existing?.[d.key];
    if (cur !== undefined) {
      out[d.key] = cur;
    } else if ("seedValue" in d) {
      if (d.seedValue !== undefined) out[d.key] = d.seedValue;
    } else if (d.kind === "tags") {
      out[d.key] = [];
    } else if (d.kind === "number") {
      out[d.key] = 0;
    } else if (d.kind === "boolean") {
      out[d.key] = d.key === "is_public";
    } else if (d.kind === "select") {
      out[d.key] = d.options?.[0]?.[0] ?? "";
    } else {
      out[d.key] = "";
    }
  }
  return out;
}
