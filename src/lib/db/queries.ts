import { getAdapter } from "./adapter-context";
import type { Award, Education, Experience, Page, Project, ProjectBlock, Skill } from "./types";

export async function listProjects(publishedOnly = true): Promise<Project[]> {
  const adapter = await getAdapter();
  return adapter.projects.list({
    where: publishedOnly ? { status: "published" } : undefined,
    orderBy: [
      { field: "sortOrder", direction: "asc" },
      { field: "id", direction: "desc" },
    ],
  });
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const adapter = await getAdapter();
  const [project] = await adapter.projects.list({ where: { slug } });
  return project;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const adapter = await getAdapter();
  return adapter.projects.get(id);
}

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
  const adapter = await getAdapter();
  return adapter.projects.create(data);
}

export async function updateProject(id: string, data: Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>): Promise<Project> {
  const adapter = await getAdapter();
  return adapter.projects.update(id, data);
}

export async function deleteProject(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.projects.delete(id);
}

export async function getBlocks(projectId: string): Promise<ProjectBlock[]> {
  const adapter = await getAdapter();
  return adapter.getProjectBlocks(projectId);
}

export async function upsertBlocks(projectId: string, blocks: Omit<ProjectBlock, "id" | "projectId">[]): Promise<void> {
  const adapter = await getAdapter();
  await adapter.replaceProjectBlocks(projectId, blocks);
}

export async function listExperience(): Promise<Experience[]> {
  const adapter = await getAdapter();
  return adapter.experience.list({
    orderBy: [
      { field: "sortOrder", direction: "asc" },
      { field: "id", direction: "desc" },
    ],
  });
}

export async function getExperienceById(id: string): Promise<Experience | undefined> {
  const adapter = await getAdapter();
  return adapter.experience.get(id);
}

export async function createExperience(data: Omit<Experience, "id" | "createdAt" | "updatedAt">): Promise<Experience> {
  const adapter = await getAdapter();
  return adapter.experience.create(data);
}

export async function updateExperience(id: string, data: Partial<Omit<Experience, "id" | "createdAt" | "updatedAt">>): Promise<Experience> {
  const adapter = await getAdapter();
  return adapter.experience.update(id, data);
}

export async function deleteExperience(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.experience.delete(id);
}

export async function listSkills(): Promise<Skill[]> {
  const adapter = await getAdapter();
  return adapter.skills.list({
    orderBy: [
      { field: "sortOrder", direction: "asc" },
      { field: "id", direction: "asc" },
    ],
  });
}

export async function getSkillById(id: string): Promise<Skill | undefined> {
  const adapter = await getAdapter();
  return adapter.skills.get(id);
}

export async function createSkill(data: Omit<Skill, "id" | "createdAt" | "updatedAt">): Promise<Skill> {
  const adapter = await getAdapter();
  return adapter.skills.create(data);
}

export async function updateSkill(id: string, data: Partial<Omit<Skill, "id" | "createdAt" | "updatedAt">>): Promise<Skill> {
  const adapter = await getAdapter();
  return adapter.skills.update(id, data);
}

export async function deleteSkill(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.skills.delete(id);
}

export async function listAwards(): Promise<Award[]> {
  const adapter = await getAdapter();
  return adapter.awards.list({
    orderBy: [
      { field: "sortOrder", direction: "asc" },
      { field: "id", direction: "desc" },
    ],
  });
}

export async function getAwardById(id: string): Promise<Award | undefined> {
  const adapter = await getAdapter();
  return adapter.awards.get(id);
}

export async function createAward(data: Omit<Award, "id" | "createdAt" | "updatedAt">): Promise<Award> {
  const adapter = await getAdapter();
  return adapter.awards.create(data);
}

export async function updateAward(id: string, data: Partial<Omit<Award, "id" | "createdAt" | "updatedAt">>): Promise<Award> {
  const adapter = await getAdapter();
  return adapter.awards.update(id, data);
}

export async function deleteAward(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.awards.delete(id);
}

export async function listEducation(): Promise<Education[]> {
  const adapter = await getAdapter();
  return adapter.education.list({
    orderBy: [
      { field: "sortOrder", direction: "asc" },
      { field: "id", direction: "desc" },
    ],
  });
}

export async function getEducationById(id: string): Promise<Education | undefined> {
  const adapter = await getAdapter();
  return adapter.education.get(id);
}

export async function createEducation(data: Omit<Education, "id" | "createdAt" | "updatedAt">): Promise<Education> {
  const adapter = await getAdapter();
  return adapter.education.create(data);
}

export async function updateEducation(id: string, data: Partial<Omit<Education, "id" | "createdAt" | "updatedAt">>): Promise<Education> {
  const adapter = await getAdapter();
  return adapter.education.update(id, data);
}

export async function deleteEducation(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.education.delete(id);
}

export async function getPage(slug: string): Promise<Page | undefined> {
  const adapter = await getAdapter();
  const [page] = await adapter.pages.list({ where: { slug } });
  return page;
}

export async function getPageById(id: string): Promise<Page | undefined> {
  const adapter = await getAdapter();
  return adapter.pages.get(id);
}

export async function listPages(): Promise<Page[]> {
  const adapter = await getAdapter();
  return adapter.pages.list({ orderBy: [{ field: "sortOrder", direction: "asc" }] });
}

export async function createPage(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page> {
  const adapter = await getAdapter();
  return adapter.pages.create(data);
}

export async function updatePage(id: string, data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">>): Promise<Page> {
  const adapter = await getAdapter();
  return adapter.pages.update(id, data);
}
