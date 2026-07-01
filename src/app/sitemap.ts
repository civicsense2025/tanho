import type { MetadataRoute } from "next";
import { getPage, listGuides, listPosts, listProjects } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

// Resources have no standalone detail route -- they only ever appear inline via
// /guides/resources and a guide's "further reading" list -- so they're intentionally
// excluded here, matching the task's directive to skip entities with no own page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const [homepage, projects, guides, posts] = await Promise.all([
    getPage("home"),
    listProjects(true),
    listGuides({ publishedOnly: true }),
    settings.features.newsletter ? listPosts(true) : Promise.resolve([]),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: homepage ? new Date(homepage.updatedAt) : undefined,
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
