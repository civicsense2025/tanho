import type { SqlMigration } from "../../migrate-runner";

const BUILTIN_TYPES: { slug: string; name: string; icon: string; fields: string; sortOrder: number }[] = [
  {
    slug: "project",
    name: "Project",
    icon: "📦",
    sortOrder: 0,
    fields: JSON.stringify([
      { key: "tagline", label: "Tagline", kind: "text" },
      { key: "coverImage", label: "Cover Image", kind: "image" },
      { key: "logoUrl", label: "Logo URL", kind: "image" },
      { key: "tags", label: "Tags", kind: "tags" },
      { key: "githubUrl", label: "GitHub URL", kind: "url" },
      { key: "liveUrl", label: "Live URL", kind: "url" },
      { key: "year", label: "Year", kind: "number" },
      { key: "blocks", label: "Content Blocks", kind: "block-list" },
    ]),
  },
  {
    slug: "guide",
    name: "Guide",
    icon: "📖",
    sortOrder: 1,
    fields: JSON.stringify([
      { key: "tagline", label: "Tagline", kind: "text" },
      { key: "summary", label: "Summary", kind: "textarea" },
      { key: "sourcePlatform", label: "Source Platform", kind: "select" },
      { key: "targetPlatform", label: "Target Platform", kind: "select" },
      { key: "difficulty", label: "Difficulty", kind: "select", options: ["beginner", "intermediate", "advanced"] },
      { key: "effortHoursMin", label: "Effort (min hours)", kind: "number" },
      { key: "effortHoursMax", label: "Effort (max hours)", kind: "number" },
      { key: "costMinUsd", label: "Cost (min USD)", kind: "number" },
      { key: "costMaxUsd", label: "Cost (max USD)", kind: "number" },
      { key: "costPeriod", label: "Cost Period", kind: "select", options: ["one_time", "monthly", "annual"] },
      { key: "skillsRequired", label: "Skills Required", kind: "tags" },
      { key: "requirements", label: "Requirements", kind: "tags" },
      { key: "coverImage", label: "Cover Image", kind: "image" },
    ]),
  },
  {
    slug: "post",
    name: "Post",
    icon: "✉️",
    sortOrder: 2,
    fields: JSON.stringify([
      { key: "subtitle", label: "Subtitle", kind: "text" },
      { key: "excerpt", label: "Excerpt", kind: "textarea" },
      { key: "coverImage", label: "Cover Image", kind: "image" },
      { key: "visibility", label: "Visibility", kind: "select", options: ["public", "paid"] },
      { key: "body", label: "Body", kind: "richtext" },
    ]),
  },
  {
    slug: "page",
    name: "Page",
    icon: "📄",
    sortOrder: 3,
    fields: JSON.stringify([
      { key: "blocks", label: "Content Blocks", kind: "block-list" },
    ]),
  },
  {
    slug: "resource",
    name: "Resource",
    icon: "🔗",
    sortOrder: 4,
    fields: JSON.stringify([
      { key: "url", label: "URL", kind: "url", required: true },
      { key: "sourceName", label: "Source Name", kind: "text" },
      { key: "summary", label: "Summary", kind: "textarea" },
      { key: "resourceType", label: "Resource Type", kind: "select", options: ["article", "video", "tool", "course", "book", "community"] },
      { key: "internalNotes", label: "Internal Notes", kind: "textarea" },
      { key: "isPublic", label: "Public", kind: "boolean" },
    ]),
  },
];

export const seedBuiltinTypes: SqlMigration = {
  name: "0011_seed_builtin_types",
  sql: BUILTIN_TYPES.map(
    (t) =>
      `INSERT OR IGNORE INTO content_types (id, slug, name, icon, fields, is_built_in, sort_order, seo_title_template, seo_description_template, created_at, updated_at) VALUES (lower(hex(randomblob(16))), '${t.slug}', '${t.name}', '${t.icon}', '${t.fields.replace(/'/g, "''")}', 1, ${t.sortOrder}, NULL, NULL, datetime('now'), datetime('now'))`
  ).join(";\n"),
};
