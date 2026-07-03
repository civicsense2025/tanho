import { describe, expect, it } from "vitest";
import type { MenuItem } from "../validation";
import {
  flattenItems,
  indentItem,
  moveItem,
  outdentItem,
  removeItem,
  updateItem,
} from "./item-ops";

const mi = (id: string, children?: MenuItem[]): MenuItem => ({
  id,
  label: id,
  href: "/",
  ...(children ? { children } : {}),
});

const tree = (): MenuItem[] => [mi("a"), mi("b", [mi("b1"), mi("b2")]), mi("c")];

describe("item-ops", () => {
  it("flattens depth-first with depths and affordances", () => {
    const rows = flattenItems(tree());
    expect(rows.map((r) => r.item.id)).toEqual(["a", "b", "b1", "b2", "c"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 0, 1, 1, 0]);
    expect(rows[0].canIndent).toBe(false); // first sibling can't indent
    expect(rows[3].canOutdent).toBe(true);
  });

  it("updates a nested item without touching others", () => {
    const next = updateItem(tree(), "b1", { label: "Hello" });
    expect(flattenItems(next).find((r) => r.item.id === "b1")?.item.label).toBe("Hello");
    expect(next).not.toBe(tree());
    expect(next[0].label).toBe("a");
  });

  it("removes items at any depth", () => {
    expect(flattenItems(removeItem(tree(), "b2")).map((r) => r.item.id)).toEqual([
      "a",
      "b",
      "b1",
      "c",
    ]);
  });

  it("moves within siblings and clamps at the edges", () => {
    expect(moveItem(tree(), "c", -1).map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(moveItem(tree(), "a", -1).map((i) => i.id)).toEqual(["a", "b", "c"]);
    const nested = moveItem(tree(), "b2", -1);
    expect(nested[1].children?.map((i) => i.id)).toEqual(["b2", "b1"]);
  });

  it("indents under the previous sibling", () => {
    const next = indentItem(tree(), "c");
    expect(next.map((i) => i.id)).toEqual(["a", "b"]);
    expect(next[1].children?.map((i) => i.id)).toEqual(["b1", "b2", "c"]);
  });

  it("outdents to just after the parent", () => {
    const next = outdentItem(tree(), "b1");
    expect(next.map((i) => i.id)).toEqual(["a", "b", "b1", "c"]);
    expect(next[1].children?.map((i) => i.id)).toEqual(["b2"]);
  });

  it("outdent removes an emptied children array", () => {
    const one = outdentItem([mi("p", [mi("only")])], "only");
    expect(one.map((i) => i.id)).toEqual(["p", "only"]);
    expect(one[0].children).toBeUndefined();
  });
});
