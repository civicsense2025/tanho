import { cache } from "react";
import { getAdapter } from "./adapter-context";
import type {
  Award,
  Education,
  Experience,
  Guide,
  GuideFilter,
  GuideStep,
  Order,
  Page,
  Platform,
  Post,
  PostDelivery,
  Project,
  ProjectBlock,
  Resource,
  SeoEntityType,
  SeoTemplate,
  SiteSetting,
  Skill,
  Subscriber,
  Subscription,
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

// Wrapped in React's cache() for request-level memoization -- generateMetadata() and the page
// body both call getPage("home") with the same argument for the same request, so without this
// every homepage view issued two identical SELECTs.
export const getPage = cache(async (slug: string): Promise<Page | undefined> => {
  const adapter = await getAdapter();
  const [page] = await adapter.pages.list({ where: { slug } });
  return page;
});

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

// ---------- Newsletter: posts ----------

export async function listPosts(publishedOnly = true): Promise<Post[]> {
  const adapter = await getAdapter();
  return adapter.posts.list({
    where: publishedOnly ? { status: "published" } : undefined,
    orderBy: [
      { field: "publishedAt", direction: "desc" },
      { field: "sortOrder", direction: "asc" },
    ],
  });
}

// Request-level memoized like getProject/getGuide: generateMetadata() and the post body both
// resolve the same slug once per request.
export const getPost = cache(async (slug: string): Promise<Post | undefined> => {
  const adapter = await getAdapter();
  const [post] = await adapter.posts.list({ where: { slug } });
  return post;
});

export async function getPostById(id: string): Promise<Post | undefined> {
  const adapter = await getAdapter();
  return adapter.posts.get(id);
}

export async function createPost(data: Omit<Post, "id" | "createdAt" | "updatedAt">): Promise<Post> {
  const adapter = await getAdapter();
  return adapter.posts.create(data);
}

export async function updatePost(id: string, data: Partial<Omit<Post, "id" | "createdAt" | "updatedAt">>): Promise<Post> {
  const adapter = await getAdapter();
  return adapter.posts.update(id, data);
}

export async function deletePost(id: string): Promise<void> {
  const adapter = await getAdapter();
  await adapter.posts.delete(id);
}

// ---------- Newsletter: subscribers ----------

export async function listSubscribers(): Promise<Subscriber[]> {
  const adapter = await getAdapter();
  return adapter.subscribers.list({ orderBy: [{ field: "createdAt", direction: "desc" }] });
}

export async function createSubscriber(data: Omit<Subscriber, "id" | "createdAt" | "updatedAt">): Promise<Subscriber> {
  const adapter = await getAdapter();
  return adapter.subscribers.create(data);
}

export async function updateSubscriber(
  id: string,
  data: Partial<Omit<Subscriber, "id" | "createdAt" | "updatedAt">>
): Promise<Subscriber> {
  const adapter = await getAdapter();
  return adapter.subscribers.update(id, data);
}

export async function getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
  const adapter = await getAdapter();
  return adapter.getSubscriberByEmail(email);
}

export async function getSubscriberByToken(token: string): Promise<Subscriber | undefined> {
  const adapter = await getAdapter();
  return adapter.getSubscriberByToken(token);
}

export async function listActiveSubscribers(): Promise<Subscriber[]> {
  const adapter = await getAdapter();
  return adapter.listActiveSubscribers();
}

export async function getDeliveriesForPost(postId: string): Promise<PostDelivery[]> {
  const adapter = await getAdapter();
  return adapter.getDeliveriesForPost(postId);
}

export async function recordDelivery(
  postId: string,
  subscriberId: string,
  patch: Partial<Omit<PostDelivery, "id" | "postId" | "subscriberId">>
): Promise<void> {
  const adapter = await getAdapter();
  await adapter.recordDelivery(postId, subscriberId, patch);
}

// ---------- Payments: orders + subscriptions ----------

export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
  const adapter = await getAdapter();
  return adapter.orders.create(data);
}

export async function updateOrder(id: string, data: Partial<Omit<Order, "id" | "createdAt" | "updatedAt">>): Promise<Order> {
  const adapter = await getAdapter();
  return adapter.orders.update(id, data);
}

export async function getOrderByCheckoutSession(sessionId: string): Promise<Order | undefined> {
  const adapter = await getAdapter();
  return adapter.getOrderByCheckoutSession(sessionId);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const adapter = await getAdapter();
  return adapter.getOrdersByEmail(email);
}

export async function listOrders(): Promise<Order[]> {
  const adapter = await getAdapter();
  return adapter.orders.list({ orderBy: [{ field: "createdAt", direction: "desc" }] });
}

export async function createSubscription(data: Omit<Subscription, "id" | "createdAt" | "updatedAt">): Promise<Subscription> {
  const adapter = await getAdapter();
  return adapter.subscriptions.create(data);
}

export async function updateSubscription(id: string, data: Partial<Omit<Subscription, "id" | "createdAt" | "updatedAt">>): Promise<Subscription> {
  const adapter = await getAdapter();
  return adapter.subscriptions.update(id, data);
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
  const adapter = await getAdapter();
  return adapter.getSubscriptionByStripeId(stripeSubscriptionId);
}

export async function getActiveSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
  const adapter = await getAdapter();
  return adapter.getActiveSubscriptionByEmail(email);
}

export async function logQuizResponse(answers: unknown, recommendation: unknown, sourcePlatform: string | null): Promise<void> {
  const adapter = await getAdapter();
  await adapter.logQuizResponse(answers, recommendation, sourcePlatform);
}

export async function listSeoTemplates(): Promise<SeoTemplate[]> {
  const adapter = await getAdapter();
  return adapter.listSeoTemplates();
}

// Wrapped in React's cache() for request-level memoization -- generateMetadata() and the page
// body both call getSeoTemplate(entityType) with the same argument for the same request, so
// without this every project/guide/home page view issued two identical SELECTs.
export const getSeoTemplate = cache(async (entityType: SeoEntityType): Promise<SeoTemplate | undefined> => {
  const adapter = await getAdapter();
  return adapter.getSeoTemplate(entityType);
});

export async function upsertSeoTemplate(
  entityType: SeoEntityType,
  data: { titleTemplate: string; descriptionTemplate: string }
): Promise<SeoTemplate> {
  const adapter = await getAdapter();
  return adapter.upsertSeoTemplate(entityType, data);
}

// Wrapped in React's cache() -- getSettings() (src/lib/settings.ts) reads every key on nearly
// every request (layout.tsx, sitemap.ts, feed.xml, etc.), so without this each of those would
// issue its own full site_settings scan per request instead of sharing one.
export const listSiteSettings = cache(async (): Promise<SiteSetting[]> => {
  const adapter = await getAdapter();
  return adapter.listSiteSettings();
});

export async function getSiteSetting(key: string): Promise<SiteSetting | undefined> {
  const adapter = await getAdapter();
  return adapter.getSiteSetting(key);
}

export async function upsertSiteSetting(key: string, data: { value: string | null; isSecret: number }): Promise<SiteSetting> {
  const adapter = await getAdapter();
  return adapter.upsertSiteSetting(key, data);
}
