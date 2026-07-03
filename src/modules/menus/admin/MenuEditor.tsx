"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Menu } from "../queries";
import type { MenuItem } from "../validation";
import { deleteMenu, saveMenu } from "../actions";
import { MenuBuilder } from "./MenuBuilder";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/**
 * Editor card for one menu. Mounted with key={menu.id} so local draft
 * state resets naturally when the selection changes.
 */
export function MenuEditor({ menu }: { menu: Menu }) {
  const router = useRouter();
  const [name, setName] = useState(menu.name);
  const [items, setItems] = useState<MenuItem[]>(menu.items);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const edit = (nextName: string, nextItems: MenuItem[]) => {
    setName(nextName);
    setItems(nextItems);
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    start(async () => {
      const res = await saveMenu(menu.id, { name, items });
      if (!res.ok) return setFlash(res.error);
      setDirty(false);
      setFlash("Saved ✓");
      setTimeout(() => setFlash(null), 1600);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!window.confirm(`Delete "${menu.name}"? Layouts pointing at it fall back gracefully.`)) return;
      await deleteMenu(menu.id);
      router.refresh();
    });

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-card)",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        <Input
          value={name}
          aria-label="Menu name"
          onChange={(e) => edit(e.target.value, items)}
          style={{ maxWidth: 280 }}
        />
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={remove}>
          Delete
        </Button>
        <Button variant="accent" size="sm" onClick={save} loading={pending} disabled={!name.trim()}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>
      <MenuBuilder items={items} onChange={(next) => edit(name, next)} />
    </section>
  );
}
