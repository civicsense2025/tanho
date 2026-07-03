"use client";

import type { ReactNode } from "react";
import type { Device } from "@/blocks/types";
import { DEVICES } from "./DeviceToggle";
import styles from "./preview-chrome.module.css";

/**
 * Browser-chrome frame around the canvas — the design's PreviewChrome. A fake
 * address bar (site + route), a draft ribbon when the page is a draft, and a
 * device-width content column. Keeps the WYSIWYG canvas reading as "this is
 * your live page" without leaving the editor.
 */
export function PreviewChrome({
  route,
  status,
  device,
  draftRibbon = true,
  children,
}: {
  route: string;
  status: "draft" | "published";
  device: Device;
  draftRibbon?: boolean;
  children: ReactNode;
}) {
  const w = DEVICES[device].w;
  return (
    <div className={styles.frame}>
      <div className={styles.bar}>
        <div className={styles.dots}>
          <span style={{ background: "var(--maroon-soft, var(--border-strong))" }} />
          <span style={{ background: "var(--olive-soft, var(--border-strong))" }} />
          <span style={{ background: "var(--border-strong)" }} />
        </div>
        <div className={styles.urlWrap}>
          <span className={styles.url}>
            {status === "published" ? "🌐" : "📄"} yoursite<span className={styles.urlRoute}>{route}</span>
          </span>
        </div>
        <span className={styles.deviceLabel}>{DEVICES[device].label}</span>
      </div>

      {draftRibbon && status === "draft" ? (
        <div className={styles.ribbon}>
          <span className={styles.ribbonDot} />
          Draft preview — not visible to the public
        </div>
      ) : null}

      <div className={styles.body}>
        <div
          className={styles.column}
          style={{ maxWidth: w ? `${w}px` : "100%" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
