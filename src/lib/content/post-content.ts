import { marked } from "marked";
import { readPostMdx, writePostMdx, renamePostMdx } from "./store";
import { sanitizeHtml } from "@/lib/sanitize";

/** Reads a post's markdown body from content/posts/<slug>.mdx. Empty string if none yet. */
export async function getPostBody(slug: string): Promise<string> {
  return (await readPostMdx(slug)) ?? "";
}

/** Renders a post's markdown to sanitized HTML. Posts are authored as markdown (unlike the
 * raw-HTML project bodies), so we run marked → sanitizeHtml; the DOMPurify allowlist is the
 * same trust boundary used everywhere else content becomes HTML. */
export async function renderPostBody(slug: string): Promise<string> {
  const md = await getPostBody(slug);
  if (!md) return "";
  const html = await marked.parse(md);
  return sanitizeHtml(html);
}

export async function savePostBody(slug: string, body: string): Promise<void> {
  await writePostMdx(slug, body);
}

export async function handlePostSlugRename(oldSlug: string, newSlug: string): Promise<void> {
  if (oldSlug === newSlug) return;
  await renamePostMdx(oldSlug, newSlug);
}
