import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getTheme } from "@/modules/theme/queries";
import { themeInputSchema } from "@/modules/theme/validation";
import { theme } from "@/modules/theme/schema";
import { db } from "@/lib/db/client";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/theme — the active theme scalars (the singleton `theme` row).
 * Editor-or-owner; the Swift app uses this to map its design-system tokens.
 *
 * PATCH /api/v1/theme — replace the active theme. Owner-only; body must parse
 * against themeInputSchema. Mirrors the admin `saveTheme` action's DB op
 * (validate → upsert → updateTag → audit) but authenticates via bearer token
 * instead of the cookie-based `requireUser`.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await getTheme());
  });
}

export async function PATCH(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = themeInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid theme", 400);
    }
    await db
      .insert(theme)
      .values({ id: "theme", ...parsed.data, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: theme.id,
        set: { ...parsed.data, updatedAt: Date.now() },
      });
    updateTag("theme");
    await writeAudit({ userId: user.id, action: "theme.save", ownerType: "theme", ownerId: "theme" });
    return ok();
  });
}
