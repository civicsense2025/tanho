import { randomUUID } from "crypto";
import type { MongoMigration } from "../../migrate-runner-mongodb";

const BUILTIN_TYPES: { slug: string; name: string; icon: string; fields: object; sortOrder: number }[] = [
  {
    slug: "project",
    name: "Project",
    icon: "📦",
    sortOrder: 0,
    fields: [
      { key: "tagline", label: "Tagline", kind: "text" },
      { key: "coverImage", label: "Cover Image", kind: "image" },
      { key: "logoUrl", label: "Logo URL", kind: "image" },
      { key: "tags", label: "Tags", kind: "tags" },
      { key: "githubUrl", label: "GitHub URL", kind: "url" },
      { key: "liveUrl", label: "Live URL", kind: "url" },
      { key: "year", label: "Year", kind: "number" },
      { key: "blocks", label: "Content Blocks", kind: "block-list" },
    ],
  },
  {
    slug: "guide",
    name: "Guide",
    icon: "📖",
    sortOrder: 1,
    fields: [
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
    ],
  },
  {
    slug: "post",
    name: "Post",
    icon: "✉️",
    sortOrder: 2,
    fields: [
      { key: "subtitle", label: "Subtitle", kind: "text" },
      { key: "excerpt", label: "Excerpt", kind: "textarea" },
      { key: "coverImage", label: "Cover Image", kind: "image" },
      { key: "visibility", label: "Visibility", kind: "select", options: ["public", "paid"] },
      { key: "body", label: "Body", kind: "richtext" },
    ],
  },
  {
    slug: "page",
    name: "Page",
    icon: "📄",
    sortOrder: 3,
    fields: [{ key: "blocks", label: "Content Blocks", kind: "block-list" }],
  },
  {
    slug: "resource",
    name: "Resource",
    icon: "🔗",
    sortOrder: 4,
    fields: [
      { key: "url", label: "URL", kind: "url", required: true },
      { key: "sourceName", label: "Source Name", kind: "text" },
      { key: "summary", label: "Summary", kind: "textarea" },
      { key: "resourceType", label: "Resource Type", kind: "select", options: ["article", "video", "tool", "course", "book", "community"] },
      { key: "internalNotes", label: "Internal Notes", kind: "textarea" },
      { key: "isPublic", label: "Public", kind: "boolean" },
    ],
  },
];

export const seedBuiltinTypes: MongoMigration = {
  name: "0009_seed_builtin_types",
  async run(db) {
    for (const t of BUILTIN_TYPES) {
      await db.collection("content_types").updateOne(
        { slug: t.slug },
        {
          $setOnInsert: {
            id: randomUUID(),
            name: t.name,
            icon: t.icon,
            fields: JSON.stringify(t.fields),
            isBuiltIn: 1,
            sortOrder: t.sortOrder,
            seoTitleTemplate: null,
            seoDescriptionTemplate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }
  },
};
