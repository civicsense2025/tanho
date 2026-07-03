"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { profile } from "./schema";
import { profileSchema } from "./validation";

export type SaveProfileState = { ok?: boolean; error?: string };

/**
 * Save the singleton profile. Content = editor-allowed (owner OR editor), so
 * no role argument to requireUser(). Upserts the single "profile" row.
 */
export async function saveProfile(input: unknown): Promise<SaveProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }
  const data = parsed.data;
  await db
    .insert(profile)
    .values({ id: "profile", ...data, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: profile.id,
      set: { ...data, updatedAt: Date.now() },
    });
  updateTag("profile");
  await writeAudit({
    userId: user.id,
    action: "profile.save",
    ownerType: "profile",
    ownerId: "profile",
  });
  return { ok: true };
}
