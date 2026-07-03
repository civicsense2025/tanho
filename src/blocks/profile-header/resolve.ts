import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { media } from "@/modules/media/schema";
import { getProfile } from "@/modules/profile/queries";
import { storage } from "@/adapters/storage";
export type ProfileHeaderResolved = {
  name: string;
  bio: string;
  avatarUrl: string | null;
  avatarAlt: string;
};

/** Server-only: profile hero data + resolved avatar URL. */
export async function resolveProfileHeader(): Promise<ProfileHeaderResolved> {
  const p = await getProfile();
  let avatarUrl: string | null = null;
  let avatarAlt = p.name;
  if (p.avatarMediaId) {
    const row = await db.query.media.findFirst({ where: eq(media.id, p.avatarMediaId) });
    if (row) {
      avatarUrl = storage.publicUrl(row.storageKey);
      avatarAlt = row.alt || p.name;
    }
  }
  return { name: p.name, bio: p.bio, avatarUrl, avatarAlt };
}
