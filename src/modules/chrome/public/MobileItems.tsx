"use client";

import { useState } from "react";
import type { MenuItem } from "@/modules/menus/validation";
import { SmartLink } from "./SmartLink";
import styles from "./mobile.module.css";

/** Nested mobile menu list — parents get a ▸/▾ disclosure toggle. */
export function MobileItems({
  items,
  depth = 0,
  onNavigate,
}: {
  items: MenuItem[];
  depth?: number;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className={styles.list} style={depth ? { paddingLeft: "var(--space-4)" } : undefined}>
      {items.map((item) => (
        <li key={item.id}>
          <span className={styles.itemRow}>
            <SmartLink href={item.href} className={styles.itemLink} onClick={onNavigate}>
              {item.label}
            </SmartLink>
            {item.children?.length ? (
              <button
                type="button"
                className={styles.disclose}
                aria-expanded={open.has(item.id)}
                aria-label={`Toggle ${item.label}`}
                onClick={() => toggle(item.id)}
              >
                {open.has(item.id) ? "▾" : "▸"}
              </button>
            ) : null}
          </span>
          {item.children?.length && open.has(item.id) ? (
            <MobileItems items={item.children} depth={depth + 1} onNavigate={onNavigate} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
