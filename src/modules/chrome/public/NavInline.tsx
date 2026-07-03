"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { MenuItem } from "@/modules/menus/validation";
import { SmartLink } from "./SmartLink";
import { DropdownPanel } from "./DropdownPanel";
import styles from "./header.module.css";

export type NavVariant = "plain" | "underline" | "tabs" | "pill" | "vertical";

const VARIANT_CLASS: Record<NavVariant, string> = {
  plain: "",
  underline: styles.underline,
  tabs: styles.tabs,
  pill: styles.pill,
  vertical: "",
};

/** Desktop nav — inline links with hover/click dropdown panels. */
export function NavInline({
  items,
  variant = "plain",
}: {
  items: MenuItem[];
  variant?: NavVariant;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pathname = usePathname();

  if (variant === "vertical") {
    // Sidebar recipe: children render inline, always expanded.
    const walk = (list: MenuItem[], depth: number): React.ReactNode =>
      list.map((item) => (
        <span key={item.id} style={{ display: "contents" }}>
          <SmartLink
            href={item.href}
            className={styles.vLink}
            style={{ paddingLeft: 10 + depth * 16 }}
            data-active={pathname === item.href || undefined}
          >
            {item.label}
          </SmartLink>
          {item.children?.length ? walk(item.children, depth + 1) : null}
        </span>
      ));
    return <nav className={styles.navVertical}>{walk(items, 0)}</nav>;
  }

  return (
    <nav className={`${styles.nav} ${VARIANT_CLASS[variant]}`}>
      <ul className={styles.navList}>
        {items.map((item) =>
          item.children?.length ? (
            <li
              key={item.id}
              className={styles.navItem}
              onMouseEnter={() => setOpenId(item.id)}
              onMouseLeave={() => setOpenId((cur) => (cur === item.id ? null : cur))}
            >
              <button
                type="button"
                className={styles.navLink}
                aria-expanded={openId === item.id}
                aria-haspopup="true"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
              >
                {item.label}
                <span aria-hidden className={styles.chev}>
                  ▾
                </span>
              </button>
              {openId === item.id ? <DropdownPanel item={item} /> : null}
            </li>
          ) : (
            <li key={item.id} className={styles.navItem}>
              <SmartLink
                href={item.href}
                className={styles.navLink}
                data-active={pathname === item.href || undefined}
              >
                {item.label}
              </SmartLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
