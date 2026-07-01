import { renderRichText } from "@/lib/richtext/renderRichText";
import { readPostMdx, writePostMdx, renamePostMdx } from "./store";

/** Reads a post's body from content/posts/<slug>.mdx. Empty string if none yet. Returns the raw
 * stored source, which the admin editor needs unmodified. */
export async function getPostBody(slug: string): Promise<string> {
  return (await readPostMdx(slug)) ?? "";
}

/** Renders a post's body to sanitized HTML via the shared renderRichText trust boundary. Post
 * bodies are stored sanitized-HTML-shaped (the same treatment as TipTap output and the HTML-mode
 * textarea's freeform input), so rendering is just re-sanitizing at the trust boundary -- the
 * DOMPurify allowlist is the same one used everywhere else content becomes HTML. */
export async function renderPostBody(slug: string): Promise<string> {
  const body = await getPostBody(slug);
  if (!body) return "";
  return renderRichText(body);
}

export async function savePostBody(slug: string, body: string): Promise<void> {
  await writePostMdx(slug, body);
}

export async function handlePostSlugRename(oldSlug: string, newSlug: string): Promise<void> {
  if (oldSlug === newSlug) return;
  await renamePostMdx(oldSlug, newSlug);
}
