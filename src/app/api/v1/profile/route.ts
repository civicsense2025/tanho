import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getProfile } from "@/modules/profile/queries";
import { profile } from "@/modules/profile/schema";
import { profileSchema } from "@/modules/profile/validation";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/profile — the singleton owner profile (name/bio/avatar +
 * experience/skills/awards/education). Editor+. Returns the same shape as the
 * web `getProfile()`, including the site-name fallback for an empty profile.
 * PATCH /api/v1/profile — upsert the profile. Body: profileSchema. Editor+
 * (content-level, not owner-only — matches `saveProfile` in
 * modules/profile/actions.ts).
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await getProfile());
  });
}

export async function PATCH(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid profile", 400);
    }
    const data = parsed.data;
    await db
      .insert(profile)
      .values({ id: "profile", ...data, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: profile.id,
        set: { ...data, updatedAt: Date.now() },
      });
    revalidateTag("profile", "max");
    await writeAudit({ userId: user.id, action: "profile.save", ownerType: "profile", ownerId: "profile" });
    return ok();
  });
}
