// No-op stub for the `server-only` guard package under Vitest.
// The real package exists only to throw if a server module is imported into a
// client bundle; in the node test environment there is no such boundary, so an
// empty module lets server-only-guarded modules (e.g. @/modules/seo) load.
export {};
