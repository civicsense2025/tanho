import type { MetadataRoute } from "next";
import { listContentEntries, getContentTypeBySlug } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const [projectType, guideType, postType] = await Promise.all([
    getContentTypeBySlug("project"),
    getContentTypeBySlug("guide"),
    getContentTypeBySlug("post"),
  ]);

  const [projects, guides, posts] = await Promise.all([
    projectType ? listContentEntries({ contentTypeId: projectType.id, publishedOnly: true }) : Promise.resolve([]),
    guideType ? listContentEntries({ contentTypeId: guideType.id, publishedOnly: true }) : Promise.resolve([]),
    postType && settings.features.newsletter ? listContentEntries({ contentTypeId: postType.id, publishedOnly: true }) : Promise.resolve([]),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: undefined,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}/projects/${project.slug}`,
      lastModified: new Date(project.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...guides.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/posts/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return entries;
}
