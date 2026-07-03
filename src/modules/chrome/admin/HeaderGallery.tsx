"use client";

import { HEADER_GROUPS, HEADER_RECIPES, type HeaderLayoutId } from "../header-recipes";
import { HeaderSchematic } from "./HeaderSchematic";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-faint)",
};

/** 16 preset cards, grouped; click selects a layout. */
export function HeaderGallery({
  value,
  onSelect,
}: {
  value: HeaderLayoutId;
  onSelect: (id: HeaderLayoutId) => void;
}) {
  const recipes = Object.values(HEADER_RECIPES);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {HEADER_GROUPS.map((group) => (
        <div key={group}>
          <span style={eyebrow}>{group}</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "var(--space-3)",
              marginTop: "var(--space-2)",
            }}
          >
            {recipes
              .filter((r) => r.group === group)
              .map((r) => {
                const active = r.id === value;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(r.id)}
                    style={{
                      textAlign: "left",
                      background: active ? "var(--accent-tint)" : "var(--surface-card)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-2)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <HeaderSchematic recipe={r} />
                    <span style={{ fontSize: "var(--text-xs)", color: active ? "var(--text)" : "var(--text-muted)" }}>
                      {r.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
