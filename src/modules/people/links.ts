/** Absolute base URL for links in outbound email (console adapter today). */
export function baseUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** Builds an absolute URL from an app-relative path + query params. */
export function linkTo(path: string, params?: Record<string, string>): string {
  const url = new URL(path, baseUrl());
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}
