import { describe, expect, it } from "vitest";
import {
  buildIdentityRedirects,
  inferFields,
  orderRowsParentsFirst,
  topoSortTypes,
  type PlannedRow,
  type PlannedType,
} from "./plan";

const type = (slug: string, references?: string[]): PlannedType => ({
  slug,
  name: slug,
  isHierarchical: false,
  fields: [],
  references,
});

const row = (
  typeSlug: string,
  slug: string,
  extra: Partial<PlannedRow> = {},
): PlannedRow => ({
  typeSlug,
  slug,
  title: slug,
  data: {},
  status: "published",
  ...extra,
});

describe("topoSortTypes", () => {
  it("puts a referenced type before its dependent", () => {
    const out = topoSortTypes([type("post", ["author"]), type("author")]);
    expect(out.map((t) => t.slug)).toEqual(["author", "post"]);
  });

  it("keeps flat/independent types in original order", () => {
    const out = topoSortTypes([type("a"), type("b"), type("c")]);
    expect(out.map((t) => t.slug)).toEqual(["a", "b", "c"]);
  });

  it("ignores references to types not in the plan (mapped externally)", () => {
    const out = topoSortTypes([type("post", ["category-that-exists-already"])]);
    expect(out.map((t) => t.slug)).toEqual(["post"]);
  });

  it("resolves a multi-level dependency chain", () => {
    const out = topoSortTypes([type("c", ["b"]), type("b", ["a"]), type("a")]);
    const order = out.map((t) => t.slug);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });

  it("throws on a dependency cycle", () => {
    expect(() => topoSortTypes([type("a", ["b"]), type("b", ["a"])])).toThrow(/cyclic/i);
  });
});

describe("orderRowsParentsFirst", () => {
  it("emits a parent before its child (parentSlug edge)", () => {
    const out = orderRowsParentsFirst([
      row("docs", "child", { parentSlug: "root" }),
      row("docs", "root"),
    ]);
    const order = out.map((r) => r.slug);
    expect(order.indexOf("root")).toBeLessThan(order.indexOf("child"));
  });

  it("handles a deep 3-level chain regardless of input order", () => {
    const out = orderRowsParentsFirst([
      row("docs", "leaf", { parentSlug: "mid" }),
      row("docs", "mid", { parentSlug: "root" }),
      row("docs", "root"),
    ]);
    const order = out.map((r) => r.slug);
    expect(order).toEqual(["root", "mid", "leaf"]);
  });

  it("roots (no parent) come before nested rows", () => {
    const out = orderRowsParentsFirst([
      row("docs", "child", { parentSlug: "root" }),
      row("docs", "root"),
      row("docs", "another-root"),
    ]);
    const rootIdx = out.findIndex((r) => r.slug === "root");
    const childIdx = out.findIndex((r) => r.slug === "child");
    expect(rootIdx).toBeLessThan(childIdx);
    // Every ancestor precedes every descendant.
    for (let i = 0; i < out.length; i++) {
      const r = out[i]!;
      if (r.parentSlug) {
        const parentIdx = out.findIndex((x) => x.slug === r.parentSlug);
        expect(parentIdx).toBeLessThan(i);
      }
    }
  });

  it("treats a parent edge pointing OUTSIDE the batch as a root (existing parent)", () => {
    // parentSlug "already-in-db" is not among these rows → this row is a root.
    const out = orderRowsParentsFirst([row("docs", "child", { parentSlug: "already-in-db" })]);
    expect(out.map((r) => r.slug)).toEqual(["child"]);
  });

  it("resolves parentage by parentPath against a sibling's oldPath", () => {
    const out = orderRowsParentsFirst([
      row("docs", "child", { parentPath: "/src/root" }),
      row("docs", "root", { oldPath: "/src/root" }),
    ]);
    expect(out.map((r) => r.slug)).toEqual(["root", "child"]);
  });

  it("scopes parentage to the same content type", () => {
    // A "b" row whose parentSlug matches an "a" row must NOT be satisfied by it.
    const out = orderRowsParentsFirst([
      row("b", "x", { parentSlug: "shared" }), // parent "shared" not in type b → root
      row("a", "shared"),
    ]);
    // Both emit; x is treated as a root (its parent is out-of-type).
    expect(out).toHaveLength(2);
  });

  it("throws on a parentage cycle", () => {
    expect(() =>
      orderRowsParentsFirst([
        row("docs", "a", { parentSlug: "b" }),
        row("docs", "b", { parentSlug: "a" }),
      ]),
    ).toThrow(/cyclic/i);
  });

  it("is stable for independent roots (original order preserved)", () => {
    const out = orderRowsParentsFirst([row("docs", "one"), row("docs", "two"), row("docs", "three")]);
    expect(out.map((r) => r.slug)).toEqual(["one", "two", "three"]);
  });
});

describe("inferFields", () => {
  it("always includes a richtext body field first", () => {
    const fields = inferFields([{ data: {} }]);
    expect(fields[0]).toEqual({ key: "body", label: "Body", kind: "richtext" });
  });

  it("infers number / boolean / date / text from samples", () => {
    const fields = inferFields([
      { data: { price: 10, featured: true, published_at: "2024-01-02", author: "Ada" } },
      { data: { price: 20, featured: false, published_at: "2024-03-04T05:06:07Z", author: "Lin" } },
    ]);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.kind]));
    expect(byKey.price).toBe("number");
    expect(byKey.featured).toBe("boolean");
    expect(byKey.published_at).toBe("date");
    expect(byKey.author).toBe("text");
  });

  it("labels snake_case keys as Title Case", () => {
    const fields = inferFields([{ data: { publish_date: "2024-01-01" } }]);
    const f = fields.find((x) => x.key === "publish_date");
    expect(f?.label).toBe("Publish Date");
  });

  it("falls back to text when a key's type is mixed across samples", () => {
    const fields = inferFields([{ data: { val: 10 } }, { data: { val: "hello" } }]);
    expect(fields.find((f) => f.key === "val")?.kind).toBe("text");
  });

  it("classifies object/array values as json", () => {
    const fields = inferFields([{ data: { meta: { a: 1 }, list: [1, 2] } }]);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f.kind]));
    expect(byKey.meta).toBe("json");
    expect(byKey.list).toBe("json");
  });

  it("skips reserved spine keys and invalid keys", () => {
    const fields = inferFields([{ data: { id: "x", path: "/y", "Bad-Key": 1, title: "t", real_key: "v" } }]);
    const keys = fields.map((f) => f.key);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("path");
    expect(keys).not.toContain("title");
    expect(keys).not.toContain("Bad-Key");
    expect(keys).toContain("real_key");
  });

  it("skips a key that is always empty/null across samples", () => {
    const fields = inferFields([{ data: { empties: "" } }, { data: { empties: null } }]);
    expect(fields.find((f) => f.key === "empties")).toBeUndefined();
  });

  it("keeps a leading-zero numeric string as text (zip/id safety)", () => {
    const fields = inferFields([{ data: { zip: "02139" } }]);
    expect(fields.find((f) => f.key === "zip")?.kind).toBe("text");
  });
});

describe("buildIdentityRedirects", () => {
  const newPathMap = new Map<string, string>([
    ["a", "/new/a"],
    ["b", "/blog/b"],
    ["same", "/same"],
  ]);
  const resolver = (r: PlannedRow) => newPathMap.get(r.slug);

  it("keeps a real old→new redirect", () => {
    const out = buildIdentityRedirects([row("t", "a", { oldPath: "/old/a" })], resolver);
    expect(out).toEqual([{ from: "/old/a", to: "/new/a" }]);
  });

  it("drops an identity mapping (old already equals new)", () => {
    const out = buildIdentityRedirects([row("t", "same", { oldPath: "/same" })], resolver);
    expect(out).toEqual([]);
  });

  it("drops an identity mapping that differs only by trailing slash / case", () => {
    const map = new Map([["x", "/Foo"]]);
    const out = buildIdentityRedirects(
      [row("t", "x", { oldPath: "/foo/" })],
      (r) => map.get(r.slug),
    );
    expect(out).toEqual([]);
  });

  it("skips rows without an oldPath or without a resolvable new path", () => {
    const out = buildIdentityRedirects(
      [row("t", "a"), row("t", "unknown", { oldPath: "/old/unknown" })],
      resolver,
    );
    expect(out).toEqual([]);
  });

  it("de-dupes a repeated fromPath", () => {
    const out = buildIdentityRedirects(
      [row("t", "a", { oldPath: "/dup" }), row("t", "b", { oldPath: "/dup" })],
      resolver,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.from).toBe("/dup");
  });
});
