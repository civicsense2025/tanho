import type { SqlMigration } from "../../migrate-runner";

/**
 * sourcePlatform/targetPlatform were seeded as bare 'select' fields with no options, per the
 * plan's resolved design ("populate options dynamically from listPlatforms() at form-render
 * time" -- a true relational reference kind wasn't worth it just for these two fields). The
 * dynamicOptions marker that makes EntryForm actually do that was added after the original seed
 * shipped; this corrects the already-seeded guide type in place. A separate, independently-
 * tracked migration from fix_guide_seed_blocks_field (not a further edit to it), since that
 * migration may have already applied to a real database with different content.
 */
export const addPlatformDynamicOptions: SqlMigration = {
  name: "add_platform_dynamic_options",
  sql: `
UPDATE content_types
SET fields = '[{"key":"tagline","label":"Tagline","kind":"text"},{"key":"summary","label":"Summary","kind":"textarea"},{"key":"sourcePlatform","label":"Source Platform","kind":"select","dynamicOptions":"platforms"},{"key":"targetPlatform","label":"Target Platform","kind":"select","dynamicOptions":"platforms"},{"key":"difficulty","label":"Difficulty","kind":"select","options":["beginner","intermediate","advanced"]},{"key":"effortHoursMin","label":"Effort (min hours)","kind":"number"},{"key":"effortHoursMax","label":"Effort (max hours)","kind":"number"},{"key":"costMinUsd","label":"Cost (min USD)","kind":"number"},{"key":"costMaxUsd","label":"Cost (max USD)","kind":"number"},{"key":"costPeriod","label":"Cost Period","kind":"select","options":["one_time","monthly","annual"]},{"key":"skillsRequired","label":"Skills Required","kind":"tags"},{"key":"requirements","label":"Requirements","kind":"tags"},{"key":"coverImage","label":"Cover Image","kind":"image"},{"key":"blocks","label":"Content Blocks","kind":"block-list"}]',
    updated_at = datetime('now')
WHERE slug = 'guide' AND is_built_in = 1 AND fields NOT LIKE '%dynamicOptions%';
`,
};
