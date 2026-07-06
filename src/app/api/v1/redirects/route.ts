import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listRedirects } from "@/modules/redirects/queries";
import { redirects } from "@/modules/redirects/schema";
import { redirectInputSchema } from "@/modules/redirects/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/redirects — list all redirects. Editor+.
 * POST /api/v1/redirects — create. Body: redirectInputSchema. Editor+.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listRedirects());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = redirectInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid redirect", 400);
    }
    const clash = await db.query.redirects.findFirst({ where: eq(redirects.fromPath, parsed.data.fromPath) });
    if (clash) return fail(`A redirect from "${parsed.data.fromPath}" already exists`, 409);
    const [row] = await db
      .insert(redirects)
      .values(parsed.data)
      .returning({ id: redirects.id });
    revalidateTag("redirects", "max");
    await writeAudit({ userId: user.id, action: "redirect.create", ownerType: "redirect", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}
