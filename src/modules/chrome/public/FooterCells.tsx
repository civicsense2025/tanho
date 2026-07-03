import type { MenuItem } from "@/modules/menus/validation";
import type { FooterConfig } from "../validation";
import { LogoMark } from "./LogoMark";
import { SmartLink } from "./SmartLink";
import { NewsletterMini, SocialRow } from "./FooterParts";
import styles from "./footer.module.css";

/** Brand blurb: logo + tagline (+ social when the recipe shows it here). */
export function BrandCell({
  name,
  logo,
  tagline,
  social,
  invert,
}: {
  name: string;
  logo: FooterConfig["logo"];
  tagline?: string;
  social: MenuItem[] | null;
  invert: boolean;
}) {
  return (
    <div className={styles.brand}>
      <LogoMark name={name} logoStyle={logo.style} icon={logo.icon} invert={invert} />
      {tagline ? <p className={`${styles.tagline} ${styles.muted}`}>{tagline}</p> : null}
      {social ? <SocialRow items={social} /> : null}
    </div>
  );
}

/** Top banner band — newsletter content when enabled, else a statement. */
export function BannerBand({
  name,
  newsletter,
}: {
  name: string;
  newsletter: FooterConfig["newsletter"];
}) {
  return (
    <div className={styles.banner}>
      <div>
        <div className={styles.bannerTitle}>{newsletter.enabled ? newsletter.title || name : name}</div>
        {newsletter.enabled && newsletter.body ? (
          <p className={`${styles.newsBody} ${styles.muted}`}>{newsletter.body}</p>
        ) : null}
      </div>
      {newsletter.enabled ? (
        <NewsletterMini config={{ ...newsletter, title: "", body: "" }} />
      ) : (
        <SmartLink href="/" className={styles.bannerArrow} aria-label={name}>
          ↗
        </SmartLink>
      )}
    </div>
  );
}

/** Contact card — lists the social/contact menu (mailto:, tel-style links). */
export function ContactCard({ social, tagline }: { social: MenuItem[]; tagline?: string }) {
  return (
    <div className={styles.contact}>
      <span className={`${styles.colTitle} ${styles.muted}`}>Contact</span>
      {social.length ? (
        <div className={styles.contactList}>
          {social.map((item) => (
            <SmartLink key={item.id} href={item.href} className={styles.colLink}>
              {item.label}
            </SmartLink>
          ))}
        </div>
      ) : tagline ? (
        <p className={`${styles.tagline} ${styles.muted}`}>{tagline}</p>
      ) : null}
    </div>
  );
}

/** Decorative map placeholder (a real map embed is an integration). */
export function MapStub() {
  return (
    <div className={styles.mapBox} aria-hidden="true">
      <span className={styles.mapPin} />
      <span className={`${styles.mapLabel} ${styles.muted}`}>Map</span>
    </div>
  );
}

/** Quiet legal line: optional menu links + generic boilerplate. */
export function LegalRow({ links }: { links: MenuItem[] }) {
  return (
    <div className={`${styles.legal} ${styles.muted}`}>
      {links.map((item) => (
        <SmartLink key={item.id} href={item.href} className={styles.legalLink}>
          {item.label}
        </SmartLink>
      ))}
      <span>All rights reserved.</span>
    </div>
  );
}
