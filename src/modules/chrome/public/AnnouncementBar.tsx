import { getAnnouncementConfig } from "../queries";
import { AnnouncementView } from "./AnnouncementView";

/** Server wrapper — renders nothing unless enabled with real messages. */
export async function AnnouncementBar() {
  const config = await getAnnouncementConfig();
  if (!config.enabled || !config.messages.some((m) => m.text)) return null;
  return <AnnouncementView config={config} />;
}
