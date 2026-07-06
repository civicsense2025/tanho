import { describe, expect, it } from "vitest";
import { substituteRecordTokens } from "./bind";

describe("substituteRecordTokens", () => {
  const record = { title: "Hello", year: 2026, author: { name: "Tan" }, _href: "/x/y" };

  it("replaces a whole-string token with the stringified value", () => {
    expect(substituteRecordTokens("{{record.title}}", record)).toBe("Hello");
    expect(substituteRecordTokens("{{record.year}}", record)).toBe("2026");
  });

  it("interpolates inline tokens", () => {
    expect(substituteRecordTokens("By {{record.author.name}} ({{record.year}})", record)).toBe("By Tan (2026)");
  });

  it("resolves dotted paths and the reserved _href", () => {
    expect(substituteRecordTokens("{{record.author.name}}", record)).toBe("Tan");
    expect(substituteRecordTokens("{{record._href}}", record)).toBe("/x/y");
  });

  it("missing fields substitute to empty string", () => {
    expect(substituteRecordTokens("{{record.nope}}", record)).toBe("");
  });

  it("leaves non-token strings untouched (same value)", () => {
    const s = "just text";
    expect(substituteRecordTokens(s, record)).toBe(s);
  });

  it("deep-maps nested content objects and arrays", () => {
    const content = {
      text: "{{record.title}}",
      href: "{{record._href}}",
      items: [{ label: "{{record.author.name}}" }, { label: "static" }],
      n: 5,
    };
    expect(substituteRecordTokens(content, record)).toEqual({
      text: "Hello",
      href: "/x/y",
      items: [{ label: "Tan" }, { label: "static" }],
      n: 5,
    });
  });

  it("returns the SAME object reference when nothing contained a token", () => {
    const content = { text: "static", n: 3, items: [{ label: "x" }] };
    expect(substituteRecordTokens(content, record)).toBe(content);
  });

  it("never emits undefined and preserves non-string leaves", () => {
    const content = { flag: true, n: 0, s: "{{record.title}}" };
    const out = substituteRecordTokens(content, record);
    expect(out).toEqual({ flag: true, n: 0, s: "Hello" });
  });
});
