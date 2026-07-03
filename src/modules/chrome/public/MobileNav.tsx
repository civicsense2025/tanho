"use client";

import { useEffect, useState } from "react";
import type { MenuItem } from "@/modules/menus/validation";
import { MobileItems } from "./MobileItems";
import styles from "./mobile.module.css";

const STYLE_CLASS = {
  "drawer-right": styles.right,
  "drawer-left": styles.left,
  fullscreen: styles.fullscreen,
  dropdown: "",
} as const;

export type MobileStyle = keyof typeof STYLE_CLASS;

/** Hamburger + mobile menu (drawer left/right, fullscreen, dropdown). */
export function MobileNav({
  items,
  menuStyle,
  name,
}: {
  items: MenuItem[];
  menuStyle: MobileStyle;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (menuStyle === "dropdown") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, menuStyle]);

  const panel = (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.name}>{name}</span>
        <button type="button" className={styles.close} aria-label="Close menu" onClick={close}>
          ✕
        </button>
      </div>
      <MobileItems items={items} onNavigate={close} />
    </div>
  );

  return (
    <span className={styles.root}>
      <button
        type="button"
        className={styles.burger}
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        menuStyle === "dropdown" ? (
          <div className={styles.dropdownPanel}>
            <MobileItems items={items} onNavigate={close} />
          </div>
        ) : (
          <div className={`${styles.overlay} ${STYLE_CLASS[menuStyle]}`}>
            <button type="button" className={styles.scrim} aria-label="Close menu" onClick={close} />
            {panel}
          </div>
        )
      ) : null}
    </span>
  );
}
