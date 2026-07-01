import type { SqlMigration } from "../../migrate-runner";

/**
 * The original "guide" seed (0011_seed_builtin_types) omitted the `blocks` (block-list) field
 * that "project" and "page" both got -- guide bodies (formerly GuideStep rows) have had nowhere
 * to live since the Phase C cutover, so every guide's body section silently renders empty.
 * Corrects the built-in "guide" content type's stored field composition in place; a no-op if
 * an admin has already customized it to include a same-keyed field.
 */
export const fixGuideSeedBlocksField: SqlMigration = {
  name: "fix_guide_seed_blocks_field",
  sql: `
UPDATE content_types
SET fields = '[{"key":"tagline","label":"Tagline","kind":"text"},{"key":"summary","label":"Summary","kind":"textarea"},{"key":"sourcePlatform","label":"Source Platform","kind":"select"},{"key":"targetPlatform","label":"Target Platform","kind":"select"},{"key":"difficulty","label":"Difficulty","kind":"select","options":["beginner","intermediate","advanced"]},{"key":"effortHoursMin","label":"Effort (min hours)","kind":"number"},{"key":"effortHoursMax","label":"Effort (max hours)","kind":"number"},{"key":"costMinUsd","label":"Cost (min USD)","kind":"number"},{"key":"costMaxUsd","label":"Cost (max USD)","kind":"number"},{"key":"costPeriod","label":"Cost Period","kind":"select","options":["one_time","monthly","annual"]},{"key":"skillsRequired","label":"Skills Required","kind":"tags"},{"key":"requirements","label":"Requirements","kind":"tags"},{"key":"coverImage","label":"Cover Image","kind":"image"},{"key":"blocks","label":"Content Blocks","kind":"block-list"}]',
    updated_at = datetime('now')
WHERE slug = 'guide' AND is_built_in = 1 AND fields NOT LIKE '%"blocks"%';
`,
};
