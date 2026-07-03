import type { FooterRecipe } from "../footer-recipes";

/** Mini structural thumbnail for a footer recipe — plain stacked divs. */
export function FooterSchematic({ recipe }: { recipe: FooterRecipe }) {
  const dark = recipe.dark || recipe.contrast;
  const ink = dark ? "#5a564a" : "var(--text-faint)";
  const box: React.CSSProperties = {
    height: 56,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xs)",
    background: dark ? "#14130f" : "var(--bg)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    justifyContent: recipe.centered || recipe.splitBar ? "center" : "flex-start",
    gap: 4,
    overflow: "hidden",
  };
  const line = (w: number | string, h = 2): React.CSSProperties => ({
    width: w,
    height: h,
    background: ink,
    borderRadius: 1,
    flex: "0 0 auto",
  });
  const colGroup = (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={line(14)} />
      <span style={line(11)} />
      <span style={line(12)} />
    </span>
  );

  if (recipe.splitBar) {
    return (
      <div style={box}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={line(20)} />
          <span style={line(16)} />
        </span>
      </div>
    );
  }
  if (recipe.centered) {
    return (
      <div style={{ ...box, alignItems: "center" }}>
        <span style={{ width: 8, height: 8, background: dark ? "#f0ede4" : "var(--solid)", borderRadius: 2 }} />
        <span style={line(22)} />
        <span style={line(16, 1)} />
      </div>
    );
  }
  return (
    <div style={box}>
      {recipe.banner ? <span style={{ ...line("100%", 7), background: "var(--accent-tint)", border: "1px solid var(--border)" }} /> : null}
      <span style={{ display: "flex", gap: 7, alignItems: "flex-start", flex: 1 }}>
        <span style={{ width: 8, height: 8, background: dark ? "#f0ede4" : "var(--solid)", borderRadius: 2 }} />
        {recipe.map ? <span style={{ width: 18, alignSelf: "stretch", border: `1px solid ${ink}`, borderRadius: 2 }} /> : null}
        {recipe.contact ? <span style={{ width: 16, alignSelf: "stretch", border: `1px solid ${ink}`, borderRadius: 2 }} /> : null}
        {Array.from({ length: recipe.cols === 0 ? 0 : recipe.cols === 1 ? 1 : 3 }).map((_, i) => (
          <span key={i}>{colGroup}</span>
        ))}
        {recipe.newsletter ? <span style={{ width: 24, height: 8, border: `1px solid ${ink}`, borderRadius: 2, marginLeft: "auto" }} /> : null}
      </span>
      {recipe.big ? <span style={line("70%", 6)} /> : null}
      {recipe.legalRow ? <span style={line("46%", 1)} /> : null}
      {recipe.bottomBar ? (
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${ink}`, paddingTop: 3 }}>
          <span style={line(18, 1)} />
          {recipe.badges ? <span style={line(12, 3)} /> : <span />}
        </span>
      ) : null}
    </div>
  );
}
