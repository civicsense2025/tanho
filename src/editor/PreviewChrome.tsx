"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { BlockNode, Device } from "@/blocks/types";
import { PreviewBlocks } from "./PreviewBlocks";
import { headerHeightVar } from "@/blocks/chrome-constants";
import { DEVICES } from "./DeviceToggle";
import styles from "./preview-chrome.module.css";

/**
 * Real-display frame around the canvas: the REAL published site header above
 * the page canvas and footer below it, rendered read-only via PreviewBlocks so
 * the author always sees their true chrome while editing (not a mock). A slim
 * draft ribbon is the only overlay. `--header-height` is published on the frame
 * (via headerHeightVar) so in-canvas anchor offsets match production.
 */
export function PreviewChrome({
  status,
  device,
  draftRibbon = true,
  headerBlocks = [],
  footerBlocks = [],
  children,
}: {
  status: "draft" | "published";
  device: Device;
  draftRibbon?: boolean;
  headerBlocks?: BlockNode[];
  footerBlocks?: BlockNode[];
  children: ReactNode;
}) {
  const w = DEVICES[device].w;
  const frameVars = { ["--header-height" as never]: headerHeightVar(headerBlocks) } as CSSProperties;
  return (
    <div className={styles.frame} style={frameVars}>
      {draftRibbon && status === "draft" ? (
        <div className={styles.ribbon}>
          <span className={styles.ribbonDot} />
          Draft preview — not visible to the public
        </div>
      ) : null}

      <div className={styles.body}>
        {/* Real published header — read-only; deep-link to its editor. */}
        {headerBlocks.length > 0 ? (
          <ChromeBand blocks={headerBlocks} label="header" device={device} />
        ) : null}

        <div className={styles.column} style={{ maxWidth: w ? `${w}px` : "100%" }}>
          {children}
        </div>

        {footerBlocks.length > 0 ? (
          <ChromeBand blocks={footerBlocks} label="footer" device={device} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A read-only band of chrome (header or footer) inside the builder preview.
 * Renders the real blocks via PreviewBlocks and overlays a small "Edit"
 * deep-link to the chrome editor; pointer events on the chrome itself are
 * disabled so clicks don't fight the page canvas.
 */
function ChromeBand({
  blocks,
  label,
  device,
}: {
  blocks: BlockNode[];
  label: "header" | "footer";
  device: Device;
}) {
  return (
    <div className={styles.chromeBand} data-chrome-band={label}>
      <Link
        href={`/admin/nav/${label}`}
        className={styles.chromeEdit}
        onClick={(e) => e.stopPropagation()}
      >
        Edit {label}
      </Link>
      <div className={styles.chromeInert} aria-hidden="true">
        <PreviewBlocks blocks={blocks} device={device} />
      </div>
    </div>
  );
}
