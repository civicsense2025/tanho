/**
 * Slugs are used to build filesystem and GitHub Contents API paths. They can
 * be hand-edited via the admin UI (ProjectForm's slug field), so they are not
 * a trusted-internal-only value -- reject anything that isn't the exact shape
 * slugify() produces before it ever reaches a path.
 */
const SAFE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function assertSafeSlug(slug: string): void {
  if (!SAFE_SLUG.test(slug)) {
    throw new Error(`Unsafe slug: "${slug}" — slugs must match ${SAFE_SLUG} (no path separators, no traversal sequences)`);
  }
}
