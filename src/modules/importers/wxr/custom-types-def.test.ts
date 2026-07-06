import { describe, expect, it } from "vitest";
import { fieldListSchema, customTypeInputSchema } from "@/modules/custom-types/validation";
import { buildZodForFields } from "@/modules/custom-types/builder";
import {
  COMMENTS_FIELDS,
  commentsTypeInput,
  deriveCptFields,
  cptTypeInput,
  mapCommentToEntryData,
  mapCptItemToEntryData,
  normalizeCustomTypeSlug,
  sanitizeFieldKey,
  toIsoDate,
} from "./custom-types-def";
import type { WxrComment, WxrItem } from "./parse";

const baseItem = (over: Partial<WxrItem> = {}): WxrItem => ({
  title: "T",
  link: "https://old.example.com/books/dune/",
  postType: "book",
  status: "publish",
  slug: "dune",
  contentHtml: "<p>Body</p>",
  excerpt: "",
  creator: "jane",
  postId: "9",
  parentId: "0",
  menuOrder: "0",
  categories: [],
  comments: [],
  postmeta: [],
  attachmentUrl: "",
  ...over,
});

describe("Comments custom type", () => {
  it("COMMENTS_FIELDS is a valid field list (passes the meta-schema)", () => {
    expect(fieldListSchema.safeParse(COMMENTS_FIELDS).success).toBe(true);
  });

  it("commentsTypeInput is a valid saveCustomType payload", () => {
    expect(customTypeInputSchema.safeParse(commentsTypeInput()).success).toBe(true);
  });

  it("maps a comment to data that validates against the built schema", () => {
    const comment: WxrComment = {
      id: "11",
      author: "Bob",
      authorEmail: "bob@x.com",
      content: "Nice post!",
      date: "2024-03-01 12:00:00",
      approved: true,
      parentId: "0",
    };
    const data = mapCommentToEntryData(comment, "hello-world");
    const schema = buildZodForFields(COMMENTS_FIELDS);
    const parsed = schema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data).toMatchObject({
      author_name: "Bob",
      author_email: "bob@x.com",
      content: "Nice post!",
      comment_date: "2024-03-01T12:00:00Z",
      source_post: "hello-world",
      approved: true,
    });
  });

  it("omits empty optional fields so email/date validation never sees ''", () => {
    const comment: WxrComment = {
      id: "12",
      author: "",
      authorEmail: "", // must be OMITTED (z.email() rejects "")
      content: "Anon comment",
      date: "", // must be OMITTED (date regex rejects "")
      approved: false,
      parentId: "0",
    };
    const data = mapCommentToEntryData(comment, "");
    expect("author_email" in data).toBe(false);
    expect("comment_date" in data).toBe(false);
    expect("source_post" in data).toBe(false);
    expect(buildZodForFields(COMMENTS_FIELDS).safeParse(data).success).toBe(true);
  });

  it("never emits an empty required richtext content", () => {
    const data = mapCommentToEntryData(
      { id: "1", author: "", authorEmail: "", content: "", date: "", approved: false, parentId: "0" },
      "",
    );
    expect(typeof data.content).toBe("string");
    expect((data.content as string).length).toBeGreaterThan(0);
    expect(buildZodForFields(COMMENTS_FIELDS).safeParse(data).success).toBe(true);
  });
});

describe("toIsoDate", () => {
  it("converts WXR 'YYYY-MM-DD HH:MM:SS' to ISO with Z", () => {
    expect(toIsoDate("2024-03-01 12:00:00")).toBe("2024-03-01T12:00:00Z");
  });
  it("keeps an already-ISO date", () => {
    expect(toIsoDate("2024-03-01")).toBe("2024-03-01");
    expect(toIsoDate("2024-03-01T12:00:00Z")).toBe("2024-03-01T12:00:00Z");
  });
  it("returns '' for an unrecognizable date", () => {
    expect(toIsoDate("")).toBe("");
    expect(toIsoDate("not a date")).toBe("");
  });
});

describe("sanitizeFieldKey", () => {
  it("lowercases, snake-cases, and dedupes to a valid key", () => {
    expect(sanitizeFieldKey("ISBN")).toBe("isbn");
    expect(sanitizeFieldKey("Page Count")).toBe("page_count");
    expect(sanitizeFieldKey("author-bio")).toBe("author_bio");
  });
  it("prefixes a key that doesn't start with a letter", () => {
    expect(sanitizeFieldKey("123abc")).toMatch(/^f_/);
  });
  it("rejects prototype-pollution keys (constructor/prototype → '')", () => {
    expect(sanitizeFieldKey("constructor")).toBe("");
    expect(sanitizeFieldKey("prototype")).toBe("");
    // "__proto__" sanitizes to the harmless key "proto" (leading/trailing
    // underscores stripped) — safe to keep, and buildZodForFields skips any
    // forbidden key anyway.
    expect(sanitizeFieldKey("__proto__")).toBe("proto");
  });
});

describe("deriveCptFields", () => {
  it("drops _-prefixed WP-internal meta and adds original_url", () => {
    const fields = deriveCptFields(["isbn", "_edit_lock", "_thumbnail_id", "page_count"]);
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("original_url");
    expect(keys).toContain("isbn");
    expect(keys).toContain("page_count");
    expect(keys).not.toContain("_edit_lock");
    expect(keys).not.toContain("_thumbnail_id");
  });

  it("produces a field list that passes the meta-schema", () => {
    const fields = deriveCptFields(["isbn", "page_count", "author bio"]);
    expect(fieldListSchema.safeParse(fields).success).toBe(true);
  });

  it("caps at 40 fields", () => {
    const many = Array.from({ length: 60 }, (_, i) => `meta_${i}`);
    const fields = deriveCptFields(many);
    expect(fields.length).toBeLessThanOrEqual(40);
  });

  it("dedupes keys that sanitize to the same thing", () => {
    const fields = deriveCptFields(["Page Count", "page-count", "page_count"]);
    const pageCountFields = fields.filter((f) => f.key === "page_count");
    expect(pageCountFields).toHaveLength(1);
  });
});

describe("cptTypeInput + normalizeCustomTypeSlug", () => {
  it("builds a valid saveCustomType payload for a CPT", () => {
    const input = cptTypeInput("book", ["isbn", "_edit_lock"]);
    const { reserved, ...payload } = input;
    void reserved;
    expect(customTypeInputSchema.safeParse(payload).success).toBe(true);
    expect(payload.slug).toBe("book");
  });

  it("prefixes wp- when the CPT collides with a built-in entity slug", () => {
    expect(normalizeCustomTypeSlug("guide")).toEqual({ slug: "wp-guide", reserved: true });
    expect(normalizeCustomTypeSlug("project")).toEqual({ slug: "wp-project", reserved: true });
  });

  it("prefixes wp- when a CPT can't start with a letter", () => {
    expect(normalizeCustomTypeSlug("2024_events").slug).toMatch(/^wp-/);
  });

  it("leaves a normal CPT slug untouched", () => {
    expect(normalizeCustomTypeSlug("book")).toEqual({ slug: "book", reserved: false });
    expect(normalizeCustomTypeSlug("Case Study")).toEqual({ slug: "case-study", reserved: false });
  });
});

describe("mapCptItemToEntryData", () => {
  it("maps postmeta values into the derived fields + original_url", () => {
    const fields = deriveCptFields(["isbn"]);
    const item = baseItem({ postmeta: [{ key: "isbn", value: "978-0" }, { key: "_edit_lock", value: "x" }] });
    const data = mapCptItemToEntryData(item, fields);
    expect(data).toEqual({ original_url: "https://old.example.com/books/dune/", isbn: "978-0" });
    expect(buildZodForFields(fields).safeParse(data).success).toBe(true);
  });

  it("omits fields with no matching/empty postmeta value", () => {
    const fields = deriveCptFields(["isbn", "page_count"]);
    const item = baseItem({ postmeta: [{ key: "isbn", value: "978-0" }] });
    const data = mapCptItemToEntryData(item, fields);
    expect("page_count" in data).toBe(false);
    expect(buildZodForFields(fields).safeParse(data).success).toBe(true);
  });
});
