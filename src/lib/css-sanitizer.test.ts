import { describe, expect, it } from "vitest";
import { sanitizeCss, sanitizeAdvancedDecls, CUSTOM_SCOPE_CLASS } from "./css-sanitizer";

/**
 * The CSS sanitiser is a SECURITY BOUNDARY (the `customCss` escape hatch reaches a
 * <style> on public pages). This is the adversarial gate: XSS/breakout/DoS/scope-
 * escape vectors must all be neutralised, while safe declarations survive and get
 * page-scoped. Treat a regression here as a shipping blocker.
 */

const SCOPE = `.${CUSTOM_SCOPE_CLASS}`;

describe("css-sanitizer — breakout / XSS vectors are neutralised", () => {
  it("strips a </style> + <script> breakout entirely", () => {
    expect(sanitizeCss("</style><script>alert(1)</script>")).toBe("");
    expect(sanitizeCss("a{}</style><script>x</script>")).toBe("");
  });

  it("rejects HTML-comment breakout sequences", () => {
    expect(sanitizeCss("a { color: red } <!-- x")).toBe("");
    expect(sanitizeCss("a { color: red } --> x")).toBe("");
  });

  it("drops expression() (legacy IE XSS)", () => {
    const out = sanitizeCss("a { width: expression(alert(1)); color: red }");
    expect(out).not.toMatch(/expression/i);
    // The whole rule survives only with the safe decl; expression() decl is gone.
    expect(out === "" || /color:\s*red/.test(out)).toBe(true);
    expect(out).not.toContain("alert");
  });

  it("drops -moz-binding (XBL script injection) but keeps sibling safe decls", () => {
    const out = sanitizeCss("a { -moz-binding: url(http://evil/x.xml); color: red }");
    expect(out).not.toMatch(/binding/i);
    expect(out).toMatch(/color:\s*red/);
  });

  it("drops behavior: (IE HTC script)", () => {
    expect(sanitizeCss("a { behavior: url(x.htc) }")).toBe("");
  });

  it("strips @import (remote fetch / breakout)", () => {
    expect(sanitizeCss('@import url("http://evil.com/x.css");')).toBe("");
    expect(sanitizeCss("@import 'evil.css'; a { color: red }")).toBe("");
  });

  it("strips @charset", () => {
    expect(sanitizeCss('@charset "UTF-8"; a { color: red }')).toBe("");
  });

  it("neutralises a value carrying an injected </style", () => {
    // Even if it parsed, the value fails the safe-value gate; nothing echoes it.
    const out = sanitizeCss('a { content: "</style><script>x</script>" }');
    expect(out).not.toContain("</style");
    expect(out).not.toContain("<script");
  });
});

describe("css-sanitizer — url() policy", () => {
  it("rejects url(javascript:) and url(vbscript:)", () => {
    expect(sanitizeCss("a { background: url(javascript:alert(1)) }")).toBe("");
    expect(sanitizeCss("a { background: url('vbscript:msgbox') }")).toBe("");
  });

  it("rejects url(data:text/html …)", () => {
    expect(sanitizeCss("a { background: url(data:text/html,<script>alert(1)</script>) }")).toBe("");
  });

  it("rejects data:image/svg+xml (SVG can script)", () => {
    expect(sanitizeCss("a { background: url(data:image/svg+xml;base64,PHN2Zz4=) }")).toBe("");
  });

  it("allows a same-origin absolute path url(/…)", () => {
    const out = sanitizeCss("a { background: url(/media/x.png) }");
    expect(out).toContain("url(/media/x.png)");
    expect(out).toContain(`${SCOPE} a`);
  });

  it("allows data:image/png (raster)", () => {
    const out = sanitizeCss("a { background: url(data:image/png;base64,iVBORw0KGgo=) }");
    expect(out).toContain("data:image/png");
  });

  it("rejects external http(s):// and protocol-relative // urls", () => {
    expect(sanitizeCss("a { background: url(https://evil.com/x.png) }")).toBe("");
    expect(sanitizeCss("a { background: url(http://evil.com/x.png) }")).toBe("");
    expect(sanitizeCss("a { background: url(//evil.com/x.png) }")).toBe("");
  });
});

describe("css-sanitizer — function allowlist", () => {
  it("keeps calc/var/clamp/color-mix/gradients/transforms", () => {
    const out = sanitizeCss(
      ".x { width: calc(100% - var(--space-4)); color: color-mix(in srgb, red, blue); background: linear-gradient(red, blue); transform: translateX(10px) rotate(45deg) }",
    );
    expect(out).toMatch(/calc\(/);
    expect(out).toMatch(/color-mix\(/);
    expect(out).toMatch(/linear-gradient\(/);
    expect(out).toMatch(/translateX/i);
  });

  it("drops declarations using a non-allowlisted function (element(), image-set)", () => {
    expect(sanitizeCss("a { background: element(#foo) }")).toBe("");
    expect(sanitizeCss("a { background: -webkit-image-set(url(/x.png) 1x) }")).toBe("");
  });
});

describe("css-sanitizer — property allowlist", () => {
  it("keeps a broad set of layout/box/type/border props", () => {
    const out = sanitizeCss(
      ".x { display: grid; grid-template-columns: 1fr 1fr; padding: 8px; margin: 4px; color: red; font-size: 14px; border-radius: 6px; box-shadow: 0 1px 2px black; transition: all 200ms }",
    );
    for (const prop of ["display", "grid-template-columns", "padding", "margin", "color", "font-size", "border-radius", "box-shadow", "transition"]) {
      expect(out).toContain(prop);
    }
  });

  it("drops unknown / dangerous properties", () => {
    // -o-link (opera url handler), and a made-up property.
    const out = sanitizeCss("a { -o-link: 'javascript:alert(1)'; color: red; totally-made-up: 5 }");
    expect(out).not.toMatch(/-o-link/i);
    expect(out).not.toMatch(/totally-made-up/);
    expect(out).toMatch(/color:\s*red/);
  });
});

describe("css-sanitizer — scoping (never escapes to the admin)", () => {
  it("prefixes an ordinary selector with the page-scope class", () => {
    const out = sanitizeCss(".card { color: red }");
    expect(out).toBe(`${SCOPE} .card { color: red }`);
  });

  it("remaps bare html / body / :root onto the scope root (no escape)", () => {
    expect(sanitizeCss("html { background: red }")).toBe(`${SCOPE} { background: red }`);
    expect(sanitizeCss("body { background: red }")).toBe(`${SCOPE} { background: red }`);
    expect(sanitizeCss(":root { --x: 1px; color: red }")).toContain(SCOPE);
    // Must NOT contain a bare html/body/:root at selector start.
    const out = sanitizeCss("body .x { color: red }");
    expect(out).toBe(`${SCOPE} .x { color: red }`);
    expect(out).not.toMatch(/(^|\})\s*body/);
  });

  it("scopes each selector in a comma list", () => {
    const out = sanitizeCss(".a, .b { color: red }");
    expect(out).toContain(`${SCOPE} .a`);
    expect(out).toContain(`${SCOPE} .b`);
  });

  it("keeps rules inside @media but still scopes their selectors", () => {
    const out = sanitizeCss("@media (min-width: 700px) { .x { color: red } }");
    expect(out).toMatch(/@media \(min-width: 700px\)/);
    expect(out).toContain(`${SCOPE} .x`);
  });

  it("an admin-targeting selector is scoped, so it cannot match admin chrome", () => {
    // Even if the author names an admin-looking class, it's prefixed with the scope
    // (which the admin never renders), so it can only match inside public pages.
    const out = sanitizeCss(".admin-shell { display: none }");
    expect(out).toBe(`${SCOPE} .admin-shell { display: none }`);
  });

  it("does not double-scope when the author already includes the scope class", () => {
    // The targeting guide SHOWS authors `.pb-custom-scope .foo { … }`, so copying
    // it verbatim must yield exactly one scope prefix, not a dead double one.
    const out = sanitizeCss(`${SCOPE} .foo { color: red }`);
    expect(out).toBe(`${SCOPE} .foo { color: red }`);
    expect(out).not.toContain(`${SCOPE} ${SCOPE}`);
    // Also handles the author scoping a descendant with an element hook.
    const out2 = sanitizeCss(`${SCOPE} [data-block="quote"] { outline: 1px solid red }`);
    expect(out2).toBe(`${SCOPE} [data-block="quote"] { outline: 1px solid red }`);
  });
});

describe("css-sanitizer — DoS / bomb guards", () => {
  it("rejects a universal * bomb", () => {
    expect(sanitizeCss("* { display: none }")).toBe("");
    expect(sanitizeCss("* * { color: red }")).toBe("");
    expect(sanitizeCss("html * { color: red }")).toBe("");
    // A comma list mixing a safe selector with a universal bomb drops the whole rule.
    expect(sanitizeCss(".ok, * { color: red }")).toBe("");
  });

  it("keeps a QUALIFIED universal (.card *)", () => {
    const out = sanitizeCss(".card * { color: red }");
    expect(out).toContain(`${SCOPE} .card *`);
  });

  it("rejects oversized input wholesale", () => {
    const huge = ".x { color: red }".repeat(2000); // > 20k bytes
    expect(sanitizeCss(huge)).toBe("");
  });

  it("caps :has() occurrences (budget)", () => {
    const many = Array.from({ length: 40 }, (_, i) => `.a:has(.b${i}) { color: red }`).join("\n");
    // Over the :has budget → the offending rule(s) drop; output must not contain 40 :has.
    const out = sanitizeCss(many);
    const count = (out.match(/:has\(/g) ?? []).length;
    expect(count).toBeLessThanOrEqual(20);
  });

  it("caps the number of selectors in one rule", () => {
    const sel = Array.from({ length: 30 }, (_, i) => `.c${i}`).join(", ");
    expect(sanitizeCss(`${sel} { color: red }`)).toBe("");
  });
});

describe("css-sanitizer — parse safety", () => {
  it("fails closed on unbalanced braces", () => {
    expect(sanitizeCss("a { color: red")).toBe("");
    expect(sanitizeCss("a { color: red }} b { color: blue }")).toBe("");
  });

  it("returns empty for empty / whitespace / non-string input", () => {
    expect(sanitizeCss("")).toBe("");
    expect(sanitizeCss("   \n  ")).toBe("");
    // @ts-expect-error deliberate wrong type
    expect(sanitizeCss(null)).toBe("");
    // @ts-expect-error deliberate wrong type
    expect(sanitizeCss(undefined)).toBe("");
  });

  it("drops comments (never echoes author bytes verbatim)", () => {
    const out = sanitizeCss("/* just a note */ .x { color: red }");
    expect(out).not.toContain("/*");
    expect(out).not.toContain("note");
    expect(out).toContain(`${SCOPE} .x`);
  });

  it("rejects input wholesale when a breakout string hides inside a comment", () => {
    // Fail-closed: a </style> anywhere in the raw input (even a comment) rejects all.
    expect(sanitizeCss("/* </style> */ .x { color: red }")).toBe("");
  });

  it("strips a comment in an at-rule prelude (raws.afterName), never echoing it", () => {
    // postcss stashes a prelude comment in raws.afterName, which clone() would
    // otherwise re-emit verbatim. The output must carry no author comment bytes.
    const out = sanitizeCss("@media screen /* } .evil { color: blue } */ { .x { color: red } }");
    expect(out).not.toContain("/*");
    expect(out).not.toContain("evil");
    expect(out).toMatch(/@media\s+screen/);
    expect(out).toContain(`${SCOPE} .x`);
  });

  it("does not split commas inside :is()/:not() — scopes the whole compound once", () => {
    // A naive split(",") would re-prefix the 2nd arg (`.pb-custom-scope .b`),
    // corrupting a valid selector so it matches nothing. Top-level split keeps
    // :is(.a, .b) intact and prefixes the compound exactly once.
    const out = sanitizeCss(":is(.a, .b) { color: red }");
    expect(out).toContain(`${SCOPE} :is(.a, .b)`);
    expect(out).not.toContain(":is(.a, .pb-custom-scope .b)");
  });

  it("does not split a comma inside an attribute-selector value", () => {
    const out = sanitizeCss('a[data-x="1,2"] { color: red }');
    expect(out).toContain(`${SCOPE} a[data-x="1,2"]`);
    expect(out).not.toContain('1, .pb-custom-scope 2');
  });

  it("still splits genuine top-level selector lists into scoped members", () => {
    const out = sanitizeCss(".a, .b { color: red }");
    expect(out).toContain(`${SCOPE} .a`);
    expect(out).toContain(`${SCOPE} .b`);
  });
});

describe("css-sanitizer — at-rules", () => {
  it("keeps @supports and @container, scoping inner rules", () => {
    const sup = sanitizeCss("@supports (display: grid) { .x { display: grid } }");
    expect(sup).toMatch(/@supports/);
    expect(sup).toContain(`${SCOPE} .x`);

    const cont = sanitizeCss("@container (min-width: 300px) { .x { color: red } }");
    expect(cont).toMatch(/@container/);
    expect(cont).toContain(`${SCOPE} .x`);
  });

  it("keeps @keyframes WITHOUT scoping percentage steps", () => {
    const out = sanitizeCss("@keyframes spin { 0% { opacity: 0 } 100% { opacity: 1 } }");
    expect(out).toMatch(/@keyframes spin/);
    expect(out).toMatch(/0%/);
    expect(out).toMatch(/100%/);
    // Steps are NOT prefixed with the scope class.
    expect(out).not.toMatch(new RegExp(`${SCOPE.replace(".", "\\.")}\\s*0%`));
  });

  it("drops @font-face (avoids external font url loading)", () => {
    expect(sanitizeCss("@font-face { font-family: x; src: url(https://evil/x.woff) }")).toBe("");
  });

  it("rejects an at-rule params carrying url() or breakout chars", () => {
    expect(sanitizeCss("@media url(javascript:x) { .a { color: red } }")).toBe("");
  });
});

describe("css-sanitizer — safe declarations survive intact", () => {
  it("preserves a realistic card style, scoped", () => {
    const out = sanitizeCss(`
      .feature {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        padding: 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      @media (min-width: 900px) {
        .feature { grid-template-columns: repeat(3, minmax(0, 1fr)) }
      }
    `);
    expect(out).toContain(`${SCOPE} .feature`);
    expect(out).toMatch(/display:\s*grid/);
    expect(out).toMatch(/var\(--surface\)/);
    expect(out).toMatch(/@media \(min-width: 900px\)/);
    // Nothing dangerous leaked.
    expect(out).not.toMatch(/<|expression|@import|javascript:/i);
  });
});

describe("sanitizeAdvancedDecls — raw-value bucket keeps the same allowlist", () => {
  it("keeps legit px/hex/em pairs on allow-listed properties", () => {
    const out = sanitizeAdvancedDecls({
      "letter-spacing": "0.05em",
      "max-width": "250px",
      color: "#ff0000",
      "border-radius": "12px",
    });
    expect(out).toEqual({
      "letter-spacing": "0.05em",
      "max-width": "250px",
      color: "#ff0000",
      "border-radius": "12px",
    });
  });

  it("keeps allow-listed functions (calc/var/clamp/transform)", () => {
    const out = sanitizeAdvancedDecls({
      width: "calc(100% - 20px)",
      transform: "translateY(-4px)",
      "font-size": "clamp(1rem, 2vw, 2rem)",
      color: "var(--accent)",
    });
    expect(Object.keys(out).sort()).toEqual(["color", "font-size", "transform", "width"]);
  });

  it("drops unknown / dangerous properties", () => {
    const out = sanitizeAdvancedDecls({
      behavior: "url(evil.htc)", // not on ALLOWED_PROPS
      "-moz-binding": "url(x.xml)", // not on ALLOWED_PROPS
      color: "blue", // kept
    });
    expect(out).toEqual({ color: "blue" });
  });

  it("drops breakout/script values but keeps siblings", () => {
    const out = sanitizeAdvancedDecls({
      content: "</style><script>alert(1)</script>",
      color: "expression(alert(1))",
      background: "url(javascript:alert(1))",
      "font-weight": "700", // safe sibling survives
    });
    expect(out).toEqual({ "font-weight": "700" });
  });

  it("drops external and protocol-relative url(); allows same-origin + data:image raster", () => {
    expect(sanitizeAdvancedDecls({ "background-image": "url(https://evil.com/x.png)" })).toEqual({});
    expect(sanitizeAdvancedDecls({ "background-image": "url(//evil.com/x.png)" })).toEqual({});
    expect(sanitizeAdvancedDecls({ "background-image": "url(data:image/svg+xml;base64,PHN2Zz4=)" })).toEqual({});
    expect(sanitizeAdvancedDecls({ "background-image": "url(/local/hero.png)" })).toEqual({
      "background-image": "url(/local/hero.png)",
    });
  });

  it("allows a custom property (--x) with a safe value", () => {
    expect(sanitizeAdvancedDecls({ "--my-gap": "8px" })).toEqual({ "--my-gap": "8px" });
  });

  it("is total: non-objects and non-string values yield {}", () => {
    expect(sanitizeAdvancedDecls(null)).toEqual({});
    expect(sanitizeAdvancedDecls("nope")).toEqual({});
    expect(sanitizeAdvancedDecls({ color: 123 as unknown as string })).toEqual({});
  });

  it("caps the number of kept declarations", () => {
    const many: Record<string, string> = {};
    // 60 valid custom props; the cap (40) should truncate.
    for (let i = 0; i < 60; i++) many[`--v${i}`] = "1px";
    expect(Object.keys(sanitizeAdvancedDecls(many)).length).toBe(40);
  });
});
