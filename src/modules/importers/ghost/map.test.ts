import { beforeEach, describe, expect, it } from "vitest";
import { mapGhostMember, mapGhostPost, resetBlockIdCounter } from "./map";
import type { GhostMember, GhostPost } from "./parse";

const basePost: GhostPost = {
  id: "1",
  title: "Why I migrated",
  slug: "why-i-migrated",
  html: "<p>Hello world</p>",
  status: "published",
  visibility: "public",
};

const baseMember: GhostMember = {
  id: "1",
  email: "dana@example.com",
  name: "Dana",
  note: "",
  subscribed_to_emails: true,
  complimentary_plan: false,
  stripe_customer_id: "",
  created_at: "2026-01-01T00:00:00.000Z",
  deleted_at: "",
};

describe("mapGhostPost", () => {
  beforeEach(() => resetBlockIdCounter());

  it("maps a public post to no gate", async () => {
    const { mapped, issues } = await mapGhostPost(basePost);
    expect(mapped.gateTier).toBeNull();
    expect(mapped.blocks).toEqual([{ id: "ghost-import-1", type: "richtext", content: { html: "<p>Hello world</p>" } }]);
    expect(issues).toEqual([]);
  });

  it("maps a members-only post to an untiered paywall gate", async () => {
    const { mapped } = await mapGhostPost({ ...basePost, visibility: "members" });
    expect(mapped.gateTier).toBe("");
    expect(mapped.blocks[0]).toMatchObject({ type: "paywall", content: { tier: "" } });
    expect(mapped.blocks[1]).toMatchObject({ type: "richtext" });
  });

  it("maps a paid post to an untiered paywall gate (Ghost's CSV has no finer tier detail)", async () => {
    const { mapped } = await mapGhostPost({ ...basePost, visibility: "paid" });
    expect(mapped.gateTier).toBe("");
    expect(mapped.blocks[0]).toMatchObject({ type: "paywall", content: { tier: "" } });
  });

  it("maps the route from the post slug", async () => {
    const { mapped } = await mapGhostPost(basePost);
    expect(mapped.route).toBe("/why-i-migrated");
  });

  it("prefers html over lexical when both are present", async () => {
    const { mapped } = await mapGhostPost({ ...basePost, lexical: "{}" });
    expect(mapped.blocks).toEqual([{ id: "ghost-import-1", type: "richtext", content: { html: "<p>Hello world</p>" } }]);
  });

  it("raises an issue and drops the body for a lexical-only post", async () => {
    const { mapped, issues } = await mapGhostPost({ ...basePost, html: undefined, lexical: "{}" });
    expect(mapped.blocks).toEqual([]);
    expect(issues).toEqual([
      expect.objectContaining({ kind: "lexical-only-post" }),
    ]);
  });

  it("maps a draft post's status through unchanged", async () => {
    const { mapped } = await mapGhostPost({ ...basePost, status: "draft" });
    expect(mapped.status).toBe("draft");
  });

  it("splits a post longer than one richtext block's cap across multiple sequential richtext blocks", async () => {
    const paragraphs = Array.from({ length: 200 }, (_, i) => `<p>Paragraph ${i}: ${"x".repeat(2000)}</p>`);
    const longHtml = paragraphs.join(""); // ~400,000+ chars, well over one 150,000-char chunk target
    const { mapped, issues } = await mapGhostPost({ ...basePost, html: longHtml });

    const richtextBlocks = mapped.blocks.filter((b) => b.type === "richtext");
    expect(richtextBlocks.length).toBeGreaterThan(1);
    // No content lost, none duplicated, order preserved.
    expect(richtextBlocks.map((b) => b.content.html).join("")).toBe(longHtml);
    // No cap-exceeded issue raised — a long post is accepted, not rejected.
    expect(issues).toEqual([]);
    // Every chunk individually fits richtextSchema's 200,000-char cap.
    for (const b of richtextBlocks) {
      expect((b.content.html as string).length).toBeLessThan(200_000);
    }
  });
});

describe("mapGhostMember", () => {
  it("maps a free subscriber (no comp plan, no stripe id) to a subscriber, no membership grant", () => {
    const mapped = mapGhostMember(baseMember);
    expect(mapped.kind).toBe("subscriber");
    expect(mapped.grantMembership).toBe(false);
  });

  it("maps a complimentary-plan member to a member with a membership grant", () => {
    const mapped = mapGhostMember({ ...baseMember, complimentary_plan: true });
    expect(mapped.kind).toBe("member");
    expect(mapped.grantMembership).toBe(true);
  });

  it("maps a member with a stripe customer id to a member with a membership grant", () => {
    const mapped = mapGhostMember({ ...baseMember, stripe_customer_id: "cus_123" });
    expect(mapped.kind).toBe("member");
    expect(mapped.grantMembership).toBe(true);
  });

  it("falls back to the email as the name when Ghost's name is blank", () => {
    const mapped = mapGhostMember({ ...baseMember, name: "" });
    expect(mapped.name).toBe("dana@example.com");
  });
});
