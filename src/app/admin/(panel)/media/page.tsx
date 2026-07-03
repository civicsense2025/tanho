import { requireUser } from "@/modules/auth/guards";
import { listMedia } from "@/modules/media/queries";
import { UPLOAD_ACCEPT } from "@/modules/media/validation";
import { MediaLibrary } from "@/modules/media/admin/MediaLibrary";
import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import { aiConfigured } from "@/adapters/ai";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Media library" };

export default async function AdminMediaPage() {
  await requireUser();
  const [items, ai, configured] = await Promise.all([
    listMedia(),
    getAiCrawlersSettings(),
    aiConfigured(),
  ]);
  const aiAltEnabled = ai.aiEnabled && ai.authoring.alt && configured;
  return (
    <AdminPage width="wide">
      <MediaLibrary initial={items} accept={UPLOAD_ACCEPT} aiAltEnabled={aiAltEnabled} />
    </AdminPage>
  );
}
