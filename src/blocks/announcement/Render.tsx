import type { RenderCtx } from "../types";
import { ChromeLink } from "../ChromeLink";
import type { AnnouncementContent } from "./fields";
import styles from "./announcement.module.css";

const TONE_CLASS: Record<AnnouncementContent["tone"], string> = {
  ink: styles.ink,
  accent: styles.accent,
  accent2: styles.accent2,
  paper: styles.paper,
};

/** Which surface class applies: the style wins over tone for gradient/outline. */
function surfaceClass(content: AnnouncementContent): string {
  if (content.style === "gradient") return styles.gradient;
  if (content.style === "outline") return styles.outline;
  return TONE_CLASS[content.tone];
}

/**
 * Announcement strip. Pure & no-JS: the first message renders as static HTML
 * (crawlable); the `marquee` style scrolls all messages via CSS. Renders
 * nothing when there are no messages with text.
 */
export function RenderAnnouncement({ content }: { content: AnnouncementContent; ctx: RenderCtx }) {
  const messages = content.messages.filter((m) => m.text);
  if (messages.length === 0) return null;
  const surface = surfaceClass(content);

  if (content.style === "marquee") {
    const run = messages.map((m) => m.text).join("  ·  ");
    return (
      <div className={`${styles.bar} ${surface}`} role="region" aria-label="Announcement">
        <div className={styles.marqueeWrap} aria-label={run}>
          <div className={styles.marqueeTrack} aria-hidden>
            <span className={styles.marqueeItem}>{run}</span>
            <span className={styles.marqueeItem}>{run}</span>
          </div>
        </div>
      </div>
    );
  }

  const msg = messages[0]!;
  return (
    <div className={`${styles.bar} ${surface}`} role="region" aria-label="Announcement">
      <div className={styles.inner}>
        <span>{msg.text}</span>
        {msg.ctaLabel && msg.ctaHref ? (
          <ChromeLink href={msg.ctaHref} className={styles.cta}>
            {msg.ctaLabel} <span aria-hidden>→</span>
          </ChromeLink>
        ) : null}
      </div>
    </div>
  );
}
