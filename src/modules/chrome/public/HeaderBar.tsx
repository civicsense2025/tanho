import type { MenuItem } from "@/modules/menus/validation";
import type { HeaderConfig } from "../validation";
import { headerRecipe } from "../header-recipes";
import { LogoMark } from "./LogoMark";
import { NavInline, type NavVariant } from "./NavInline";
import { CTAButton } from "./CTAButton";
import { Avatar, IconRow, SearchStub } from "./HeaderExtras";
import { MobileNav } from "./MobileNav";
import styles from "./header.module.css";

export type HeaderBarProps = {
  config: HeaderConfig;
  items: MenuItem[];
  siteName: string;
  tagline?: string;
};

/**
 * The one header composer — a grouped flexbox (left / true-centered /
 * right tracks) driven by the layout recipe. Only the vertical sidebar and
 * the stacked-centered presets take structural early returns.
 */
export function HeaderBar({ config, items, siteName, tagline }: HeaderBarProps) {
  const recipe = headerRecipe(config.layout);
  const name = config.logo.text || siteName;
  const overlay = recipe.overlay || config.transparentOnHero;
  const barClass = [
    styles.bar,
    config.sticky && !overlay ? styles.sticky : "",
    overlay ? styles.overlay : "",
  ]
    .filter(Boolean)
    .join(" ");

  const logo = (
    <LogoMark
      name={name}
      logoStyle={config.logo.style}
      icon={config.logo.icon}
      big={recipe.logoPos === "centerBig"}
    />
  );
  const cta =
    config.cta.enabled && config.cta.label && config.cta.href ? (
      <CTAButton label={config.cta.label} href={config.cta.href} variant={config.cta.variant} />
    ) : null;
  const navVariant: NavVariant = recipe.underline
    ? "underline"
    : recipe.navPos === "tabs"
      ? "tabs"
      : recipe.navPos === "pill"
        ? "pill"
        : "plain";
  const nav = (list: MenuItem[]) => <NavInline items={list} variant={navVariant} />;
  const extras = (
    <span className={styles.extras}>
      {recipe.search ? <SearchStub /> : null}
      <IconRow count={recipe.icons - (recipe.search ? 1 : 0)} />
      {recipe.avatar ? <Avatar name={name} /> : null}
      {cta}
    </span>
  );
  const burger = <MobileNav items={items} menuStyle={config.mobile.style} name={name} />;

  // Structural branch 1: vertical sidebar.
  if (recipe.navPos === "vertical") {
    return (
      <header className={`${barClass} ${styles.vertical}`}>
        <div className={styles.verticalHead}>
          {logo}
          {burger}
        </div>
        <NavInline items={items} variant="vertical" />
        <div className={styles.verticalFoot}>{cta}</div>
      </header>
    );
  }

  // Structural branch 2: stacked, everything centered.
  if (recipe.navPos === "centerBelow") {
    return (
      <header className={barClass}>
        <div className={styles.stackedTop}>
          {logo}
          <span className={styles.stackedBurger}>{burger}</span>
        </div>
        <div className={styles.stackedNav}>{nav(items)}</div>
      </header>
    );
  }

  // Generic three-track row. Left/right flex 1 keeps the center track
  // truly centered whenever nav (center/pill/tabs) or logo sit there.
  const split = recipe.navPos === "split";
  const half = Math.ceil(items.length / 2);
  const centerNav = ["center", "pill", "tabs"].includes(recipe.navPos);
  const centerLogo = recipe.logoPos !== "left";

  return (
    <header className={barClass}>
      {recipe.tiers === 2 ? (
        <div className={styles.tier}>
          <span>{tagline || name}</span>
        </div>
      ) : null}
      <div className={styles.main}>
        <div className={`${styles.track} ${styles.trackLeft}`}>
          {split ? nav(items.slice(0, half)) : null}
          {!split && !centerLogo ? logo : null}
          {!split && recipe.navPos === "left" ? nav(items) : null}
        </div>
        <div className={`${styles.track} ${styles.trackCenter}`}>
          {split || centerLogo ? logo : centerNav ? nav(items) : null}
        </div>
        <div className={`${styles.track} ${styles.trackRight}`}>
          {split ? nav(items.slice(half)) : null}
          {recipe.navPos === "right" ? nav(items) : null}
          {extras}
          {burger}
        </div>
      </div>
    </header>
  );
}
