import { requireUser } from "@/modules/auth/guards";
import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import { getAiConnectionSummary } from "@/modules/ai-crawlers/provider-actions";
import { AiForm } from "@/modules/ai-crawlers/admin/AiForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "AI & crawlers" };

export default async function AiSettingsPage() {
  await requireUser("owner");
  const [ai, aiConnection] = await Promise.all([
    getAiCrawlersSettings(),
    getAiConnectionSummary(),
  ]);
  return (
    <SettingsShell title="AI & crawlers" subtitle="Bot access, RSL, llms.txt, and protection.">
      <AiForm initial={ai} aiConnection={aiConnection} />
    </SettingsShell>
  );
}
