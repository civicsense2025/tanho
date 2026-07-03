import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { media } from "@/modules/media/schema";
import { storage } from "@/adapters/storage";
import { requireUser } from "@/modules/auth/guards";
import { getProfile } from "@/modules/profile/queries";
import { ProfileScreen } from "@/modules/profile/admin/ProfileScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireUser();
  const p = await getProfile();

  let avatarUrl = "";
  if (p.avatarMediaId) {
    const row = await db.query.media.findFirst({ where: eq(media.id, p.avatarMediaId) });
    if (row) avatarUrl = storage.publicUrl(row.storageKey);
  }

  return (
    <AdminPage>
      <ProfileScreen
        initial={{
          name: p.name,
          bio: p.bio,
          avatarMediaId: p.avatarMediaId,
          experience: p.experience,
          skills: p.skills,
          awards: p.awards,
          education: p.education,
        }}
        initialAvatarUrl={avatarUrl}
      />
    </AdminPage>
  );
}
