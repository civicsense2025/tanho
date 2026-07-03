import type { MenuItem } from "@/modules/menus/validation";
import type { FooterConfig } from "../validation";
import { footerRecipe } from "../footer-recipes";
import { LogoMark } from "./LogoMark";
import {
  BadgeRow,
  GiantWordmark,
  MenuColumn,
  NewsletterMini,
  SocialRow,
  type FooterColumnData,
} from "./FooterParts";
import { BannerBand, BrandCell, ContactCard, LegalRow, MapStub } from "./FooterCells";
import styles from "./footer.module.css";

export type FooterBarProps = {
  config: FooterConfig;
  columns: FooterColumnData[];
  social: MenuItem[];
  siteName: string;
  tagline?: string;
  year: number;
};

/**
 * The one footer composer — stacked optional rows (banner → main row →
 * giant wordmark → legal row → bottom bar) driven by the layout recipe.
 * Dark/contrast recipes use the fixed dark-palette hexes (footer.module.css).
 */
export function FooterBar({ config, columns, social, siteName, tagline, year }: FooterBarProps) {
  const recipe = footerRecipe(config.layout);
  const name = config.logo.text || siteName;
  const copyright = config.copyright || `© ${year} ${name}`;
  const dark = Boolean(recipe.dark || recipe.contrast);
  const cls = [styles.footer, dark ? styles.dark : ""].filter(Boolean).join(" ");
  // Column budget: 0 = none (columns feed the legal row instead), 1 = one,
  // 2 = up to the configured four.
  const shown = recipe.cols === 0 ? [] : columns.slice(0, recipe.cols === 1 ? 1 : 4);
  const legalLinks =
    recipe.cols === 0 ? columns.flatMap((c) => c.items.slice(0, 3)).slice(0, 6) : [];

  if (recipe.splitBar) {
    return (
      <footer className={cls}>
        <div className={styles.splitBar}>
          <span className={`${styles.copy} ${styles.muted}`}>{copyright}</span>
          {recipe.social ? <SocialRow items={social} /> : null}
        </div>
      </footer>
    );
  }

  if (recipe.centered) {
    return (
      <footer className={cls}>
        <div className={styles.centered}>
          <LogoMark name={name} logoStyle={config.logo.style} icon={config.logo.icon} invert={dark} />
          {recipe.social ? <SocialRow items={social} /> : null}
          <span className={`${styles.copy} ${styles.muted}`}>{copyright}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cls}>
      {recipe.banner ? <BannerBand name={name} newsletter={config.newsletter} /> : null}
      <div className={styles.main}>
        <BrandCell
          name={name}
          logo={config.logo}
          tagline={tagline}
          social={recipe.social ? social : null}
          invert={dark}
        />
        {recipe.map ? <MapStub /> : null}
        {recipe.contact ? <ContactCard social={social} tagline={tagline} /> : null}
        {shown.map((col, i) => (
          <MenuColumn key={i} col={col} />
        ))}
        {recipe.newsletter && config.newsletter.enabled && !recipe.banner ? (
          <NewsletterMini config={config.newsletter} />
        ) : null}
      </div>
      {recipe.big ? <GiantWordmark name={name} /> : null}
      {recipe.legalRow ? <LegalRow links={legalLinks} /> : null}
      {recipe.bottomBar ? (
        <div className={styles.bottom}>
          <span className={`${styles.copy} ${styles.muted}`}>{copyright}</span>
          {recipe.badges ? <BadgeRow /> : null}
        </div>
      ) : null}
    </footer>
  );
}
