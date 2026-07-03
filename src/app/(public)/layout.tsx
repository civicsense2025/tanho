import type { ReactNode } from "react";
import { AnnouncementBar } from "@/modules/chrome/public/AnnouncementBar";
import { ChromeHeader } from "@/modules/chrome/public/ChromeHeader";
import { ChromeFooter } from "@/modules/chrome/public/ChromeFooter";
import { getHeaderConfig } from "@/modules/chrome/queries";
import { headerRecipe } from "@/modules/chrome/header-recipes";
import { PageviewBeacon } from "@/components/analytics/PageviewBeacon";
import styles from "@/modules/chrome/public/shell.module.css";

/**
 * Public chrome: announcement bar + header above every page, footer below.
 * All content comes from cached config getters (settings:header/footer/
 * announcement + menus tags) with code defaults when rows are missing.
 * The vertical-sidebar header recipe swaps to a side-by-side shell.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const header = await getHeaderConfig();
  const sidebar = headerRecipe(header.layout).navPos === "vertical";

  if (sidebar) {
    return (
      <div className={styles.shell}>
        <PageviewBeacon />
        <AnnouncementBar />
        <div className={styles.withSidebar}>
          <ChromeHeader />
          <div className={styles.sidebarContent}>
            <div className={styles.grow}>{children}</div>
            <ChromeFooter />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <PageviewBeacon />
      <AnnouncementBar />
      <ChromeHeader />
      <div className={styles.grow}>{children}</div>
      <ChromeFooter />
    </div>
  );
}
