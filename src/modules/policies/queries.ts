import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { policies } from "./schema";

export type PolicyRow = typeof policies.$inferSelect;

/** Published policy by slug, for the public /policies/:slug page. Cached. */
export async function getPublishedPolicy(slug: string): Promise<PolicyRow | null> {
  "use cache";
  cacheLife("max");
  cacheTag("policies", `policy:${slug}`);
  const row = await db.query.policies.findFirst({
    where: and(eq(policies.slug, slug), eq(policies.status, "published")),
  });
  return row ?? null;
}

/**
 * Footer legal-row policies: published AND footer-linked. Cached on the
 * `policies` tag so a save/publish refreshes the footer.
 */
export async function getFooterPolicies(): Promise<
  Array<{ slug: string; title: string }>
> {
  "use cache";
  cacheLife("max");
  cacheTag("policies");
  const rows = await db
    .select({ slug: policies.slug, title: policies.title })
    .from(policies)
    .where(and(eq(policies.status, "published"), eq(policies.footerLinked, true)))
    .orderBy(asc(policies.title));
  return rows;
}

/** Admin list — uncached (admin is dynamic). Ordered by group then title. */
export async function listPolicies(): Promise<PolicyRow[]> {
  return db.query.policies.findMany({
    orderBy: [asc(policies.group), asc(policies.title)],
  });
}

/** Admin editor load by id. */
export async function getPolicy(id: string): Promise<PolicyRow | null> {
  const row = await db.query.policies.findFirst({ where: eq(policies.id, id) });
  return row ?? null;
}
