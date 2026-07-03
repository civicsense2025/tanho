import type { RenderCtx } from "../types";
import type { ProductgridContent } from "./fields";

/** Static promo grid — author copy only (illustrative; not live products). */
export function RenderProductgrid({ content }: { content: ProductgridContent; ctx: RenderCtx }) {
  if (content.items.length === 0) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${content.cols}, minmax(0, 1fr))`,
        gap: "var(--space-6)",
      }}
    >
      {content.items.map((item, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div
            style={{
              aspectRatio: "4 / 3",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              background: "var(--surface)",
              border: "var(--border-width) solid var(--border)",
            }}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--line-0), var(--line-0) 1px, transparent 1px, transparent 10px)",
                }}
              />
            )}
          </div>
          {item.name ? (
            <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)" }}>
              {item.name}
            </span>
          ) : null}
          {item.price ? (
            <span style={{ fontSize: "var(--text-body)", color: "var(--text-muted)" }}>
              {item.price}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
