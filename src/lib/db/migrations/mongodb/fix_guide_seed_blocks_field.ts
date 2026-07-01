import type { MongoMigration } from "../../migrate-runner-mongodb";

const CORRECTED_GUIDE_FIELDS = [
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
  { key: "blocks", label: "Content Blocks", kind: "block-list" },
];

/**
 * See migrations/libsql/fix_guide_seed_blocks_field.ts for the full rationale -- the original
 * "guide" seed omitted the `blocks` (block-list) field that "project" and "page" both got.
 */
export const fixGuideSeedBlocksField: MongoMigration = {
  name: "fix_guide_seed_blocks_field",
  async run(db) {
    await db.collection("content_types").updateOne(
      { slug: "guide", isBuiltIn: 1, fields: { $not: /"blocks"/ } },
      { $set: { fields: JSON.stringify(CORRECTED_GUIDE_FIELDS), updatedAt: new Date().toISOString() } }
    );
  },
};
