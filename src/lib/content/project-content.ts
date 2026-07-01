import { readProjectMdx, writeProjectMdx, renameProjectMdx } from "./store";
import type { Project } from "@/lib/db";

/** Prefers the MDX file; falls back to the legacy DB `description` column for
 * projects saved before content moved to files. New saves always go to MDX. */
export async function getProjectBody(project: Pick<Project, "slug" | "description">): Promise<string> {
  const mdx = await readProjectMdx(project.slug);
  if (mdx !== undefined) return mdx;
  return project.description ?? "";
}

export async function saveProjectBody(slug: string, body: string): Promise<void> {
  await writeProjectMdx(slug, body);
}

export async function handleSlugRename(oldSlug: string, newSlug: string): Promise<void> {
  if (oldSlug === newSlug) return;
  await renameProjectMdx(oldSlug, newSlug);
}
