-- Rounded rectangles become the platform default. THEME_DEFAULTS, the theme.radius
-- column default (schema.ts), the static CSS fallback (spacing.css), and every seed
-- all moved to "round" in code. This migration flips any existing site's stored
-- theme row so live sites render rounded without an owner action.
--
-- The column DEFAULT itself is left as-is in existing databases: it is never
-- exercised (saveTheme and every seed insert specify `radius` explicitly), so a
-- table rebuild to change a cosmetic default isn't worth the risk. New rows still
-- get "round" because every insert path sets it explicitly.
UPDATE "theme" SET "radius" = 'round';
