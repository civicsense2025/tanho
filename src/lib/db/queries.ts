import { cache } from "react";
import { getAdapter } from "./adapter-context";
import type {
  Award,
  Education,
  Experience,
  Guide,
  GuideFilter,
  GuideStep,
  Page,
  Platform,
  Project,
  ProjectBlock,
  Resource,
  SeoEntityType,
  SeoTemplate,
  Skill,
  Tag,
} from "./types";

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

// Wrapped in React's cache() for request-level memoization -- generateMetadata() and the page
// body both call getProject(slug)/getGuide(slug) with the same argument for the same request,
// so without this every page view issued two identical SELECTs.
export const getProject = cache(async (slug: string): Promise<Project | undefined> => {
  const adapter = await getAdapter();
  const [project] = await adapter.projects.list({ where: { slug } });
  return project;
});

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

export async function listGuides(filter?: GuideFilter): Promise<Guide[]> {
  const adapter = await getAdapter();
  return adapter.listGuides(filter);
}

// See getProject() above -- same request-level memoization rationale (generateMetadata() + page
// body both call getGuide(slug) once per request).
export const getGuide = cache(async (slug: string): Promise<Guide | undefined> => {
  const adapter = await getAdapter();
  return adapter.getGuideBySlug(slug);
});

export async function getGuideById(id: string): Promise<Guide | undefined> {
  const adapter = await getAdapter();
  return adapter.guides.get(id);
}

export async function createGuide(data: Omit<Guide, "id" | "createdAt" | "updatedAt">): Promise<Guide> {
  const adapter = await getAdapter();
  return adapter.guides.create(data);
}

export async function updateGuide(id: string, data: Partial<Omit<Guide, "id" | "createdAt" | "updatedAt">>): Promise<Guide> {
  const adapter = await getAdapter();
  return adapter.guides.update(id, data);
}

export async function deleteGuide(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.guides.delete(id);
}

export async function getGuideSteps(guideId: string): Promise<GuideStep[]> {
  const adapter = await getAdapter();
  return adapter.getGuideSteps(guideId);
}

export async function replaceGuideSteps(guideId: string, steps: Omit<GuideStep, "id" | "guideId">[]): Promise<void> {
  const adapter = await getAdapter();
  await adapter.replaceGuideSteps(guideId, steps);
}

export async function getGuideTags(guideId: string): Promise<Tag[]> {
  const adapter = await getAdapter();
  return adapter.getGuideTags(guideId);
}

export async function setGuideTags(guideId: string, tagIds: string[]): Promise<void> {
  const adapter = await getAdapter();
  await adapter.setGuideTags(guideId, tagIds);
}

export async function getResourcesForGuide(guideId: string, publicOnly?: boolean): Promise<Resource[]> {
  const adapter = await getAdapter();
  return adapter.getResourcesForGuide(guideId, publicOnly);
}

export async function setGuideResources(guideId: string, resourceIds: string[]): Promise<void> {
  const adapter = await getAdapter();
  await adapter.setGuideResources(guideId, resourceIds);
}

export async function listPlatforms(): Promise<Platform[]> {
  const adapter = await getAdapter();
  return adapter.platforms.list({ orderBy: [{ field: "sortOrder", direction: "asc" }, { field: "name" as keyof Platform, direction: "asc" }] });
}

export async function getPlatformById(id: string): Promise<Platform | undefined> {
  const adapter = await getAdapter();
  return adapter.platforms.get(id);
}

export async function getPlatform(slug: string): Promise<Platform | undefined> {
  const adapter = await getAdapter();
  return adapter.getPlatformBySlug(slug);
}

export async function upsertPlatform(data: Omit<Platform, "id">): Promise<Platform> {
  const adapter = await getAdapter();
  return adapter.upsertPlatform(data);
}

export async function getPlatformsForResource(resourceId: string): Promise<Platform[]> {
  const adapter = await getAdapter();
  return adapter.getPlatformsForResource(resourceId);
}

export async function setResourcePlatforms(resourceId: string, platformIds: string[]): Promise<void> {
  const adapter = await getAdapter();
  await adapter.setResourcePlatforms(resourceId, platformIds);
}

export async function getResourcesForPlatform(platformSlug: string, publicOnly?: boolean): Promise<Resource[]> {
  const adapter = await getAdapter();
  return adapter.getResourcesForPlatform(platformSlug, publicOnly);
}

export async function listTags(): Promise<Tag[]> {
  const adapter = await getAdapter();
  return adapter.tags.list({ orderBy: [{ field: "name" as keyof Tag, direction: "asc" }] });
}

export async function upsertTag(data: Omit<Tag, "id">): Promise<Tag> {
  const adapter = await getAdapter();
  return adapter.upsertTag(data);
}

export async function listResources(publicOnly?: boolean): Promise<Resource[]> {
  const adapter = await getAdapter();
  return adapter.listResources(publicOnly);
}

export async function getResourceById(id: string): Promise<Resource | undefined> {
  const adapter = await getAdapter();
  return adapter.resources.get(id);
}

export async function createResource(data: Omit<Resource, "id" | "createdAt" | "updatedAt">): Promise<Resource> {
  const adapter = await getAdapter();
  return adapter.resources.create(data);
}

export async function updateResource(id: string, data: Partial<Omit<Resource, "id" | "createdAt" | "updatedAt">>): Promise<Resource> {
  const adapter = await getAdapter();
  return adapter.resources.update(id, data);
}

export async function deleteResource(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.resources.delete(id);
}

export async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
  const adapter = await getAdapter();
  await adapter.logQuizResponse(answers, recommendation, sourcePlatform);
}

export async function listSeoTemplates(): Promise<SeoTemplate[]> {
  const adapter = await getAdapter();
  return adapter.listSeoTemplates();
}

export async function getSeoTemplate(entityType: SeoEntityType): Promise<SeoTemplate | undefined> {
  const adapter = await getAdapter();
  return adapter.getSeoTemplate(entityType);
}

export async function upsertSeoTemplate(
  entityType: SeoEntityType,
  data: { titleTemplate: string; descriptionTemplate: string }
): Promise<SeoTemplate> {
  const adapter = await getAdapter();
  return adapter.upsertSeoTemplate(entityType, data);
}
