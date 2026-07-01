import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { listContentEntries, getContentTypeBySlug, listExperience, listSkills, listAwards, listEducation } from "@/lib/db";

/**
 * Static-mode export step. Materializes the DB-owned lists that data-bound blocks read into
 * plain JSON snapshots under content/data/, so a `mode: 'static'` build can render with NO
 * runtime database. Run this as a `prebuild` step (or from the wizard) before `next build` when
 * building a static instance.
 */

const DATA_ROOT = path.join(process.cwd(), "content", "data");

async function writeJson(name: string, data: unknown): Promise<void> {
  await mkdir(DATA_ROOT, { recursive: true });
  await writeFile(path.join(DATA_ROOT, `${name}.json`), JSON.stringify(data, null, 2), "utf-8");
}

export async function exportSnapshot(opts: { newsletter?: boolean; guides?: boolean } = {}): Promise<string[]> {
  const written: string[] = [];

  const [projectType, guideType, postType] = await Promise.all([
    getContentTypeBySlug("project"),
    getContentTypeBySlug("guide"),
    getContentTypeBySlug("post"),
  ]);

  const tasks: [string, Promise<unknown>][] = [
    ["experience", listExperience()],
    ["skills", listSkills()],
    ["awards", listAwards()],
    ["education", listEducation()],
  ];

  if (projectType) tasks.push(["project", listContentEntries({ contentTypeId: projectType.id, publishedOnly: true })]);
  if (guideType && opts.guides !== false) tasks.push(["guide", listContentEntries({ contentTypeId: guideType.id, publishedOnly: true })]);
  if (postType && opts.newsletter) tasks.push(["post", listContentEntries({ contentTypeId: postType.id, publishedOnly: true })]);

  for (const [name, promise] of tasks) {
    await writeJson(name, await promise);
    written.push(`content/data/${name}.json`);
  }
  return written;
}
