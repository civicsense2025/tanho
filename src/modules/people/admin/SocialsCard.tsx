import styles from "./profile.module.css";

type Social = { icon: string; label: string; href: string };

/** Read-only list of a person's social links (from person.socials). */
export function SocialsCard({ socials }: { socials: Social[] }) {
  if (!socials || socials.length === 0) return null;
  return (
    <section className={styles.card}>
      <h3 className={styles.cardHead}>Social</h3>
      {socials.map((s, i) => (
        <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className={styles.socialRow}>
          {s.label || s.href}
        </a>
      ))}
    </section>
  );
}
