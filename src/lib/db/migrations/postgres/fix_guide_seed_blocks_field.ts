import type { PostgresMigration } from "../../migrate-runner-postgres";

/**
 * See libsql/fix_guide_seed_blocks_field.ts for the full rationale -- the original "guide" seed
 * omitted the `blocks` (block-list) field that "project" and "page" both got.
 */
export const fixGuideSeedBlocksField: PostgresMigration = {
  name: "fix_guide_seed_blocks_field",
  sql: `
UPDATE content_types
SET fields = '[{"key":"tagline","label":"Tagline","kind":"text"},{"key":"summary","label":"Summary","kind":"textarea"},{"key":"sourcePlatform","label":"Source Platform","kind":"select"},{"key":"targetPlatform","label":"Target Platform","kind":"select"},{"key":"difficulty","label":"Difficulty","kind":"select","options":["beginner","intermediate","advanced"]},{"key":"effortHoursMin","label":"Effort (min hours)","kind":"number"},{"key":"effortHoursMax","label":"Effort (max hours)","kind":"number"},{"key":"costMinUsd","label":"Cost (min USD)","kind":"number"},{"key":"costMaxUsd","label":"Cost (max USD)","kind":"number"},{"key":"costPeriod","label":"Cost Period","kind":"select","options":["one_time","monthly","annual"]},{"key":"skillsRequired","label":"Skills Required","kind":"tags"},{"key":"requirements","label":"Requirements","kind":"tags"},{"key":"coverImage","label":"Cover Image","kind":"image"},{"key":"blocks","label":"Content Blocks","kind":"block-list"}]',
    updated_at = NOW()
WHERE slug = 'guide' AND is_built_in = 1 AND fields NOT LIKE '%"blocks"%';
`,
};
