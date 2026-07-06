import { describe, expect, it } from "vitest";
import { parseGhostContentExport, parseGhostMembersCsv } from "./parse";

describe("parseGhostContentExport", () => {
  const validExport = {
    meta: { exported_on: 1735689600000, version: "6.0.0" },
    data: {
      posts: [
        {
          id: "1",
          title: "Hello",
          slug: "hello",
          html: "<p>Hi</p>",
          status: "published",
          visibility: "public",
        },
      ],
      tags: [{ id: "t1", name: "Essays", slug: "essays" }],
    },
  };

  it("parses a well-formed export", () => {
    const result = parseGhostContentExport(validExport);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({ id: "1", title: "Hello", visibility: "public" });
    expect(result.tags).toEqual([{ id: "t1", name: "Essays", slug: "essays" }]);
    expect(result.issues).toEqual([]);
  });

  it("unwraps the {db: [{meta,data}]} legacy wrapper shape", () => {
    const result = parseGhostContentExport({ db: [validExport] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.posts).toHaveLength(1);
  });

  it("rejects a payload with no data.posts", () => {
    const result = parseGhostContentExport({ meta: {}, data: {} });
    expect(result.ok).toBe(false);
  });

  it("rejects an export exceeding the row-count cap, before iterating any posts", () => {
    const tooMany = {
      meta: {},
      data: { posts: Array.from({ length: 20_001 }, (_, i) => ({ id: String(i), title: "x", slug: `x-${i}` })) },
    };
    const result = parseGhostContentExport(tooMany);
    expect(result.ok).toBe(false);
  });

  it("rejects a completely unrecognizable payload", () => {
    const result = parseGhostContentExport({ foo: "bar" });
    expect(result.ok).toBe(false);
  });

  it("skips a malformed individual post but keeps the well-formed ones, raising an issue", () => {
    const result = parseGhostContentExport({
      meta: {},
      data: { posts: [{ id: "1", title: "Good", slug: "good", visibility: "public" }, { title: "no id or slug" }] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.posts).toHaveLength(1);
    expect(result.issues).toEqual([expect.objectContaining({ kind: "malformed-post" })]);
  });

  it("defaults an unrecognized visibility value to public and raises an issue", () => {
    const result = parseGhostContentExport({
      meta: {},
      data: { posts: [{ id: "1", title: "Weird", slug: "weird", visibility: "secret" }] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.posts[0]!.visibility).toBe("public");
    expect(result.issues).toEqual([expect.objectContaining({ kind: "unknown-visibility" })]);
  });
});

describe("parseGhostMembersCsv", () => {
  const header =
    "id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at";

  it("parses a well-formed CSV", () => {
    const csv = `${header}\n1,dana@example.com,Dana,,true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members).toEqual([
      {
        id: "1",
        email: "dana@example.com",
        name: "Dana",
        note: "",
        subscribed_to_emails: true,
        complimentary_plan: false,
        stripe_customer_id: "",
        created_at: "2026-01-01T00:00:00.000Z",
        deleted_at: "",
      },
    ]);
  });

  it("handles a quoted field with an embedded comma", () => {
    const csv = `${header}\n1,dana@example.com,"Dana, PhD",,true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members[0]!.name).toBe("Dana, PhD");
  });

  it("handles a quoted field with an embedded newline", () => {
    const csv = `${header}\n1,dana@example.com,Dana,"line one\nline two",true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members[0]!.note).toBe("line one\nline two");
  });

  it("handles an escaped double-quote inside a quoted field", () => {
    const csv = `${header}\n1,dana@example.com,Dana,"she said ""hi""",true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members[0]!.note).toBe('she said "hi"');
  });

  it("is tolerant of reordered columns", () => {
    const reordered = "email,id,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at";
    const csv = `${reordered}\ndana@example.com,1,Dana,,true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members[0]).toMatchObject({ id: "1", email: "dana@example.com" });
  });

  it("skips a row with no email and raises an issue, rather than aborting", () => {
    const csv = `${header}\n1,,No Email,,true,false,,2026-01-01T00:00:00.000Z,\n2,ok@example.com,Ok,,true,false,,2026-01-01T00:00:00.000Z,`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members).toHaveLength(1);
    expect(result.members[0]!.email).toBe("ok@example.com");
    expect(result.issues).toEqual([expect.objectContaining({ kind: "missing-email" })]);
  });

  it("skips soft-deleted members (deleted_at set) and reports the count", () => {
    const csv =
      `${header}\n` +
      `1,live@example.com,Live,,true,false,,2026-01-01T00:00:00.000Z,\n` +
      `2,gone@example.com,Gone,,false,false,,2026-01-01T00:00:00.000Z,2026-03-01T00:00:00.000Z\n` +
      `3,also-gone@example.com,Also Gone,,false,true,cus_x,2026-01-01T00:00:00.000Z,2026-03-02T00:00:00.000Z`;
    const result = parseGhostMembersCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only the non-deleted member survives.
    expect(result.members.map((m) => m.email)).toEqual(["live@example.com"]);
    // One summary issue naming the skipped count (not one per row).
    const deleted = result.issues.filter((i) => i.kind === "deleted-member");
    expect(deleted).toHaveLength(1);
    expect(deleted[0]!.detail).toContain("2 deleted members");
  });

  it("rejects an empty file", () => {
    expect(parseGhostMembersCsv("").ok).toBe(false);
  });

  it("rejects a CSV with no recognizable Ghost Members columns", () => {
    expect(parseGhostMembersCsv("foo,bar\n1,2").ok).toBe(false);
  });

  it("rejects a CSV exceeding the row-count cap, before mapping any rows", () => {
    const header =
      "id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at";
    const rows = Array.from({ length: 20_001 }, (_, i) => `${i},p${i}@example.com,P${i},,true,false,,,`);
    const result = parseGhostMembersCsv([header, ...rows].join("\n"));
    expect(result.ok).toBe(false);
  });
});
