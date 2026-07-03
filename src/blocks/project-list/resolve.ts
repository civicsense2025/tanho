import { listPublishedEntries } from "@/modules/entries/queries";
import { get as getEntitySchema } from "@/entities/registry";
import type { ProjectData } from "@/entities/schemas/project";
import type { ProjectListContent } from "./fields";

export type ProjectListItem = {
  title: string;
  tagline: string;
  year: string;
  href: string;
};

/** Server-only: published projects (capped by limit) with detail hrefs. */
export async function resolveProjectList(
  content: ProjectListContent,
): Promise<ProjectListItem[]> {
  const base = getEntitySchema("project")?.basePath ?? "/work";
  const rows = await listPublishedEntries("project");
  return rows.slice(0, content.limit).map((r) => {
    const data = r.data as ProjectData;
    return {
      title: r.title,
      tagline: data.tagline ?? "",
      year: data.year ?? "",
      href: `${base}/${r.slug}`,
    };
  });
}
