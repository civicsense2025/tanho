import type { FieldDef } from "@/modules/custom-types/validation";

/**
 * Field definitions for the three built-in content types that ship as
 * data-backed `ct_*` tables (projects, guides, resources). These are created
 * at seed time via `createTableBackedType` — they're indistinguishable from
 * owner-created custom types once provisioned.
 *
 * Converting these from the legacy JSON `entries` table to real typed-column
 * tables means every content type on the platform is data-backed: one table,
 * one typed column per field, indexable, filterable, no opaque JSON blob.
 */

export const PROJECT_FIELDS: FieldDef[] = [
  { key: "tagline", label: "Tagline", kind: "text", help: "One-line summary shown under the title" },
  { key: "year", label: "Year", kind: "text" },
  { key: "live_url", label: "Live URL", kind: "url", help: "https:// or blank" },
  { key: "github_url", label: "GitHub URL", kind: "url", help: "https:// or blank" },
  { key: "tags", label: "Tags", kind: "tags", help: "Comma-separated" },
];

export const GUIDE_FIELDS: FieldDef[] = [
  { key: "tagline", label: "Tagline", kind: "text" },
  { key: "summary", label: "Summary", kind: "richtext" },
  { key: "category", label: "Category", kind: "select", help: "Hub slug this guide belongs to" },
  { key: "source_platform", label: "Source platform", kind: "text" },
  { key: "target_platform", label: "Target platform", kind: "text" },
  {
    key: "difficulty",
    label: "Difficulty",
    kind: "select",
    options: ["beginner", "intermediate", "advanced"],
  },
  { key: "effort_hours_min", label: "Min effort (hours)", kind: "number" },
  { key: "effort_hours_max", label: "Max effort (hours)", kind: "number" },
  { key: "cost_min_usd", label: "Min cost (USD)", kind: "currency" },
  { key: "cost_max_usd", label: "Max cost (USD)", kind: "currency" },
  {
    key: "cost_period",
    label: "Cost period",
    kind: "select",
    options: ["mo", "yr", "one-time"],
  },
  { key: "tags", label: "Tags", kind: "tags" },
  { key: "resource_slugs", label: "Related resources", kind: "tags", help: "Resource slugs" },
  { key: "skills_required", label: "Skills required", kind: "tags" },
  { key: "requirements", label: "Requirements", kind: "tags" },
];

export const RESOURCE_FIELDS: FieldDef[] = [
  { key: "url", label: "URL", kind: "url" },
  {
    key: "resource_type",
    label: "Resource type",
    kind: "select",
    options: ["docs", "article", "video", "forum_thread", "tool", "interactive"],
  },
  { key: "source_name", label: "Source name", kind: "text" },
  { key: "summary", label: "Summary", kind: "richtext" },
  { key: "platforms", label: "Platforms", kind: "tags" },
  { key: "is_public", label: "Public", kind: "boolean", help: "Show on the public resources page" },
  { key: "internal_notes", label: "Internal notes", kind: "richtext", hidden: true },
  { key: "internal_route", label: "Internal route", kind: "text", help: "e.g. /quiz", hidden: true },
  { key: "category", label: "Category", kind: "select" },
];

/**
 * The built-in data-backed content types created at seed time. Projects and
 * Resources have simple routing (/work/:slug, /resources) that the ct_* router
 * handles directly. Guides are deferred — their /guides/:hub/:slug hierarchy
 * uses a category-field-based path segment that the ct_* path system (which
 * uses parent_id adjacency, not field interpolation) doesn't yet support.
 */
export const BUILTIN_CT_TYPES = [
  {
    slug: "projects",
    name: "Projects",
    pluralName: "Projects",
    basePath: "/work",
    titleField: "title",
    slugField: "slug",
    fields: PROJECT_FIELDS,
  },
  {
    slug: "resources",
    name: "Resources",
    pluralName: "Resources",
    basePath: "/resources",
    titleField: "title",
    slugField: "slug",
    fields: RESOURCE_FIELDS,
  },
] as const;
