// ALTER TABLE ADD COLUMN is safe on SQLite/libSQL for nullable columns --
// unlike 0002_string_ids, this doesn't need the rebuild-and-copy pattern.
export const sql = `
ALTER TABLE projects ADD COLUMN seo_title TEXT;
ALTER TABLE projects ADD COLUMN seo_description TEXT;
ALTER TABLE projects ADD COLUMN og_image TEXT;
ALTER TABLE projects ADD COLUMN canonical_url TEXT;
ALTER TABLE projects ADD COLUMN no_index INTEGER NOT NULL DEFAULT 0;

ALTER TABLE pages ADD COLUMN seo_title TEXT;
ALTER TABLE pages ADD COLUMN seo_description TEXT;
ALTER TABLE pages ADD COLUMN og_image TEXT;
ALTER TABLE pages ADD COLUMN canonical_url TEXT;
ALTER TABLE pages ADD COLUMN no_index INTEGER NOT NULL DEFAULT 0;
`;
