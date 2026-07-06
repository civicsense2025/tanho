import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ROUTE_TYPE } from "@/modules/entries/router";
import { resolveCodePage } from "@/app/(public)/code-pages/registry";
import { getPublishedPage } from "@/modules/pages/queries";
import { customTypes } from "@/modules/custom-types/schema";

/**
 * Whether a content type's public base path would shadow an existing route.
 * A SUPERSET of pages/actions.ts's `collidesWithReservedRoute` — that one only
 * checks code-pages + entity prefixes; a content type owns a whole top-level
 * segment, so it must also not collide with /shop, /search, a published CMS
 * page, or another content type's base.
 *
 * `base` is the normalized route base (leading slash, single segment, e.g.
 * "/products"). `exceptId` skips the type being edited so re-saving isn't a
 * self-collision.
 */
const HARD_RESERVED = new Set(["shop", "search", "admin", "api"]);

export async function baseCollision(
  base: string,
  exceptId?: string,
): Promise<string | null> {
  const segment = base.split("/").filter(Boolean)[0];
  if (!segment) return "A base path is required";

  if (resolveCodePage(base)) return `${base} is a built-in code page`;
  if (segment in ROUTE_TYPE) return `${base} is reserved by a built-in section (/${segment})`;
  if (HARD_RESERVED.has(segment)) return `/${segment} is reserved`;

  // A published CMS page at exactly this route.
  const page = await getPublishedPage(base);
  if (page) return `${base} is already a published page`;

  // Another content type already owns this base.
  const clash = await db.query.customTypes.findFirst({
    where: exceptId
      ? and(eq(customTypes.basePath, base), ne(customTypes.id, exceptId))
      : eq(customTypes.basePath, base),
  });
  if (clash) return `${base} is already used by the "${clash.name}" content type`;

  return null;
}
