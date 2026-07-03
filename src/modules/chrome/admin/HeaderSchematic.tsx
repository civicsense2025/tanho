import type { HeaderRecipe } from "../header-recipes";

/**
 * Mini structural thumbnail for a header recipe — plain divs placed the
 * way the real composer places logo / nav / cta / icons.
 */

const dot = (big = false): React.CSSProperties => ({
  width: big ? 13 : 9,
  height: big ? 8 : 9,
  background: "var(--solid)",
  borderRadius: 2,
  flex: "0 0 auto",
});
const line: React.CSSProperties = {
  width: 11,
  height: 2,
  background: "var(--text-faint)",
  borderRadius: 1,
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, minWidth: 0 };

const Nav = ({ pill, under }: { pill?: boolean; under?: boolean }) => (
  <span
    style={{
      ...row,
      gap: under ? 5 : 4,
      padding: pill ? "2px 5px" : 0,
      border: pill ? "1px solid var(--border-strong)" : undefined,
      borderRadius: pill ? 99 : 0,
    }}
  >
    <span style={line} />
    <span style={line} />
    <span style={line} />
  </span>
);
const Cta = () => <span style={{ width: 16, height: 7, background: "var(--accent)", borderRadius: 99 }} />;
const Icons = ({ n }: { n: number }) => (
  <span style={row}>
    {Array.from({ length: n }).map((_, i) => (
      <span key={i} style={{ width: 5, height: 5, borderRadius: 99, background: "var(--text-faint)" }} />
    ))}
  </span>
);
const Search = () => (
  <span style={{ width: 22, height: 8, border: "1px solid var(--border-strong)", borderRadius: 2 }} />
);

export function HeaderSchematic({ recipe }: { recipe: HeaderRecipe }) {
  const box: React.CSSProperties = {
    height: 44,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xs)",
    background: recipe.overlay ? "var(--accent-tint)" : "var(--bg)",
    padding: "0 7px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
  };
  const right = (
    <span style={row}>
      {recipe.search ? <Search /> : null}
      <Icons n={recipe.icons - (recipe.search ? 1 : 0)} />
      {recipe.avatar ? <span style={{ ...dot(), borderRadius: 99, background: "var(--accent-2)" }} /> : null}
      {recipe.cta ? <Cta /> : null}
    </span>
  );

  if (recipe.navPos === "vertical") {
    return (
      <div style={{ ...box, flexDirection: "row", alignItems: "stretch", padding: 0, gap: 0 }}>
        <span style={{ width: 18, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "5px 0" }}>
          <span style={dot()} />
          <span style={{ ...line, width: 9 }} />
          <span style={{ ...line, width: 9 }} />
        </span>
        <span style={{ flex: 1 }} />
      </div>
    );
  }
  if (recipe.navPos === "centerBelow") {
    return (
      <div style={{ ...box, alignItems: "center" }}>
        <span style={dot()} />
        <Nav />
      </div>
    );
  }

  const split = recipe.navPos === "split";
  const centerNav = ["center", "pill", "tabs"].includes(recipe.navPos);
  const centerLogo = recipe.logoPos !== "left";
  return (
    <div style={box}>
      {recipe.tiers === 2 ? <span style={{ ...line, width: "100%", height: 1, opacity: 0.7 }} /> : null}
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ ...row, flex: 1 }}>
          {split ? <Nav /> : !centerLogo ? <span style={dot()} /> : null}
          {!split && recipe.navPos === "left" ? <Nav pill={false} under={recipe.underline} /> : null}
        </span>
        <span style={row}>
          {split || centerLogo ? <span style={dot(recipe.logoPos === "centerBig")} /> : centerNav ? <Nav pill={recipe.navPos === "pill"} /> : null}
        </span>
        <span style={{ ...row, flex: 1, justifyContent: "flex-end" }}>
          {split || recipe.navPos === "right" ? <Nav /> : null}
          {right}
        </span>
      </span>
    </div>
  );
}
