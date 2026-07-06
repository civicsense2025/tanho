import { describe, expect, it } from "vitest";
import type { BlockNode } from "@/blocks/types";
import { applyRowTemplate, fillBlockTree, fillContentShallow, resolveFieldContent } from "./templating";

describe("applyRowTemplate", () => {
  it("replaces a token with the row value", () => {
    expect(applyRowTemplate("Price: {{price}}", { price: 49 })).toBe("Price: 49");
  });

  it("replaces multiple tokens, including repeats", () => {
    expect(applyRowTemplate("{{title}} — {{title}} ({{year}})", { title: "Hi", year: 2026 })).toBe(
      "Hi — Hi (2026)",
    );
  });

  it("resolves a missing field to empty string (never the literal undefined)", () => {
    expect(applyRowTemplate("[{{nope}}]", { title: "x" })).toBe("[]");
  });

  it("resolves a null field to empty string", () => {
    expect(applyRowTemplate("[{{note}}]", { note: null })).toBe("[]");
  });

  it("tolerates inner whitespace in the token", () => {
    expect(applyRowTemplate("{{ price }}", { price: 5 })).toBe("5");
  });

  it("strips angle brackets from the result (anti-injection)", () => {
    expect(applyRowTemplate("{{title}}", { title: "<script>alert(1)</script>" })).toBe(
      "scriptalert(1)/script",
    );
  });

  it("strips angle brackets even in the literal template text", () => {
    expect(applyRowTemplate("<b>{{title}}</b>", { title: "hi" })).toBe("bhi/b");
  });

  it("returns empty string for empty input", () => {
    expect(applyRowTemplate("", { title: "x" })).toBe("");
  });

  it("stringifies non-string values", () => {
    expect(applyRowTemplate("{{ok}}", { ok: true })).toBe("true");
    expect(applyRowTemplate("{{n}}", { n: 0 })).toBe("0");
  });
});

describe("fillBlockTree", () => {
  const tree: BlockNode[] = [
    { id: "a", type: "heading", content: { text: "{{title}}", level: "h1" } },
    {
      id: "b",
      type: "section",
      content: {
        blocks: [
          { id: "c", type: "callout", content: { title: "Buy {{title}}", body: "Only {{price}}" } },
        ],
      },
    },
  ];

  it("fills string content fields, recursing into nested blocks", () => {
    const out = fillBlockTree(tree, { title: "Widget", price: "$9" });
    expect(out[0]!.content.text).toBe("Widget");
    expect(out[0]!.content.level).toBe("h1"); // non-token string passes through
    const nested = (out[1]!.content.blocks as BlockNode[])[0]!;
    expect(nested.content.title).toBe("Buy Widget");
    expect(nested.content.body).toBe("Only $9");
  });

  it("does not mutate the input tree", () => {
    const before = JSON.stringify(tree);
    fillBlockTree(tree, { title: "X", price: "1" });
    expect(JSON.stringify(tree)).toBe(before);
  });

  it("leaves non-string content values untouched", () => {
    const t: BlockNode[] = [{ id: "a", type: "spacer", content: { size: 4, hideOn: ["mobile"] } }];
    const out = fillBlockTree(t, {});
    expect(out[0]!.content.size).toBe(4);
    expect(out[0]!.content.hideOn).toEqual(["mobile"]);
  });
});

describe("fillContentShallow (template editor canvas preview)", () => {
  it("fills top-level string fields from the row", () => {
    const out = fillContentShallow({ text: "{{title}} — ${{price}}", level: "h1" }, { title: "Widget", price: 9.99 });
    expect(out.text).toBe("Widget — $9.99");
    expect(out.level).toBe("h1");
  });

  it("does NOT recurse into `blocks` (the canvas renders children itself)", () => {
    const nested = [{ id: "c", type: "heading", content: { text: "{{title}}" } }];
    const out = fillContentShallow({ text: "{{title}}", blocks: nested }, { title: "X" });
    expect(out.text).toBe("X");
    // children left verbatim — still holds the raw token, filled later per-block
    expect(out.blocks).toBe(nested);
    expect((out.blocks as typeof nested)[0]!.content.text).toBe("{{title}}");
  });

  it("does not mutate the input content", () => {
    const input = { text: "{{title}}" };
    fillContentShallow(input, { title: "Y" });
    expect(input.text).toBe("{{title}}");
  });
});

describe("field block resolution", () => {
  it("resolveFieldContent attaches {value,label} from the row", () => {
    const out = resolveFieldContent({ field: "price" }, { price: 19.99 }, new Map([["price", "Price"]]));
    expect(out._resolved).toEqual({ value: "19.99", label: "Price" });
  });

  it("strips angle brackets from the resolved value (anti-injection)", () => {
    const out = resolveFieldContent({ field: "name" }, { name: "<script>x</script>" }, new Map());
    expect((out._resolved as { value: string }).value).toBe("scriptx/script");
  });

  it("missing field → empty value, empty label", () => {
    const out = resolveFieldContent({ field: "nope" }, { title: "x" }, new Map());
    expect(out._resolved).toEqual({ value: "", label: "" });
  });

  it("fillBlockTree resolves a `field` block via _resolved (not token fill)", () => {
    const tree: BlockNode[] = [{ id: "f", type: "field", content: { field: "price", display: "heading" } }];
    const out = fillBlockTree(tree, { price: 42 }, new Map([["price", "Price"]]));
    expect(out[0]!.content._resolved).toEqual({ value: "42", label: "Price" });
    // the field key itself is preserved (what saves)
    expect(out[0]!.content.field).toBe("price");
  });

  it("fillBlockTree resolves field blocks nested inside a layout block", () => {
    const tree: BlockNode[] = [
      { id: "s", type: "section", content: { blocks: [{ id: "f", type: "field", content: { field: "title" } }] } },
    ];
    const out = fillBlockTree(tree, { title: "Widget" }, new Map());
    const nested = (out[0]!.content.blocks as BlockNode[])[0]!;
    expect((nested.content._resolved as { value: string }).value).toBe("Widget");
  });
});
