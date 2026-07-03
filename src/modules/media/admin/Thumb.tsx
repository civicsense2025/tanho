import styles from "./media.module.css";
import { mediaUrl } from "./format";

type ThumbProps = {
  item: { storageKey: string; kind: string; alt: string; name: string };
  badges?: string[];
};

/**
 * Card thumbnail: a real lazy-loaded <img> for images; the design's
 * striped placeholder with a kind glyph for video ("▸") and docs (the
 * file extension). Overlay badges render top-left.
 */
export function Thumb({ item, badges = [] }: ThumbProps) {
  const ext = item.storageKey.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <span className={styles.thumb}>
      {item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- author media has unknown dimensions; next/image needs sizing + loader config
        <img
          src={mediaUrl(item.storageKey)}
          alt={item.alt || item.name}
          loading="lazy"
          className={styles.thumbImg}
        />
      ) : (
        <span className={styles.thumbStripes} aria-hidden>
          <span className={styles.kindGlyph}>{item.kind === "video" ? "▸ Video" : ext}</span>
        </span>
      )}
      {badges.length > 0 && (
        <span className={styles.badges}>
          {badges.map((b) => (
            <span
              key={b}
              className={`${styles.badge} ${b === "Unused" ? "" : styles.badgeWarn}`}
            >
              {b}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
