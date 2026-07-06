"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Menu } from "../queries";
import { createMenu } from "../actions";
import { MenuEditor } from "./MenuEditor";
import { Button } from "@/components/core/Button";
import styles from "./menus-screen.module.css";

const listBtn = (active: boolean): React.CSSProperties => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "9px 12px",
  border: "none",
  borderRadius: "var(--radius-xs)",
  background: active ? "var(--surface-hover)" : "transparent",
  color: active ? "var(--text)" : "var(--text-muted)",
  fontSize: "var(--text-sm)",
  cursor: "pointer",
});

/**
 * Menu list + the nested item builder for the selected menu. The editor is
 * keyed by menu id, so switching selection resets its draft state.
 */
export function MenusScreen({ menus }: { menus: Menu[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(menus[0]?.id ?? null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Deleted/unknown selections fall back to the first menu.
  const selected = menus.find((m) => m.id === selectedId) ?? menus[0] ?? null;

  const create = () =>
    start(async () => {
      setFlash(null);
      const res = await createMenu({ name: "Untitled menu", items: [] });
      if (!res.ok) return setFlash(res.error);
      setSelectedId(res.data!.id);
      router.refresh();
    });

  return (
    <div className={styles.layout}>
      <aside
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-2)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {menus.map((m) => (
          <button key={m.id} type="button" style={listBtn(m.id === selected?.id)} onClick={() => setSelectedId(m.id)}>
            {m.name}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={create} loading={pending}>
          + New menu
        </Button>
        {flash ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", padding: "0 12px 6px" }}>{flash}</span>
        ) : null}
      </aside>

      {selected ? (
        <MenuEditor key={selected.id} menu={selected} />
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-10)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ margin: "0 0 var(--space-4)" }}>No menus yet.</p>
          <Button variant="accent" size="sm" onClick={create} loading={pending}>
            + New menu
          </Button>
        </div>
      )}
    </div>
  );
}
