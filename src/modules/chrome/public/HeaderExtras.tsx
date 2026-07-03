import styles from "./header.module.css";

/**
 * Right-side header furniture. Search and the icon slots are visual
 * affordances for the presets — they wire up to real search/commerce when
 * those modules land (glyph vocabulary keeps them emoji-free until then).
 */

export function SearchStub() {
  return (
    <span className={styles.searchStub} aria-hidden="true">
      Search
      <span className={styles.searchKey}>/</span>
    </span>
  );
}

const ICON_SLOTS = ["Account", "Cart"] as const;

export function IconRow({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className={styles.iconRow}>
      {ICON_SLOTS.slice(0, count).map((label) => (
        <span key={label} className={styles.iconStub}>
          {label}
        </span>
      ))}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "·";
  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials}
    </span>
  );
}
