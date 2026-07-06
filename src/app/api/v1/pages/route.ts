import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listPages } from "@/modules/pages/queries";
import { pages } from "@/modules/pages/schema";
import { pageDetailsSchema, secureCustomCode } from "@/modules/pages/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

// Route handlers must use revalidateTag, NOT updateTag (which is Server-Action-only
// and throws here). See the /api/v1 cache-invalidation cleanup task.
const invalidatePage = (id: string) => {
  revalidateTag("pages", "max");
  revalidateTag(`page:${id}`, "max");
};

/**
 * GET /api/v1/pages — list all pages (admin list, uncached).
 * POST /api/v1/pages — create a page. Body: pageDetailsSchema.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listPages());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = pageDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid page", 400);
    }
    const d = parsed.data;
    secureCustomCode(d as Record<string, unknown>, user.role === "owner");
    const dupe = await db.query.pages.findFirst({ where: eq(pages.route, d.route) });
    if (dupe) return fail(`Route ${d.route} is already in use`, 409);
    const [row] = await db
      .insert(pages)
      .values({ ...d, updatedAt: Date.now() })
      .returning({ id: pages.id });
    await writeAudit({ userId: user.id, action: "page.create", ownerType: "page", ownerId: row.id });
    invalidatePage(row.id);
    return ok({ id: row.id }, 201);
  });
}
