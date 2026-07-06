import { describe, expect, it } from "vitest";
import { mapOldAnnouncementConfig } from "./config-cutover-map";

describe("mapOldAnnouncementConfig", () => {
  it("enabled: false produces NO blocks at all — not a hidden block, genuinely absent", () => {
    const { blocks } = mapOldAnnouncementConfig({
      enabled: false,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "Hello" }],
    });
    expect(blocks).toHaveLength(0);
  });

  it("enabled: true with messages produces one announcement block", () => {
    const { blocks } = mapOldAnnouncementConfig({
      enabled: true,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "Free shipping", cta: { label: "Shop now", url: "/shop" } }],
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.type).toBe("announcement");
  });

  it("maps the old nested cta.{label,url} shape to the new flat ctaLabel/ctaHref fields", () => {
    const { blocks } = mapOldAnnouncementConfig({
      enabled: true,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "Sale", cta: { label: "Shop", url: "/sale" } }],
    });
    const content = blocks[0]!.content as { messages: Array<{ text: string; ctaLabel: string; ctaHref: string }> };
    expect(content.messages[0]).toEqual({ text: "Sale", ctaLabel: "Shop", ctaHref: "/sale" });
  });

  it("a message with no cta maps to empty ctaLabel/ctaHref, not undefined (schema requires strings)", () => {
    const { blocks } = mapOldAnnouncementConfig({
      enabled: true,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "No CTA here" }],
    });
    const content = blocks[0]!.content as { messages: Array<{ ctaLabel: string; ctaHref: string }> };
    expect(content.messages[0]!.ctaLabel).toBe("");
    expect(content.messages[0]!.ctaHref).toBe("");
  });

  it("caps at 5 messages, matching the new schema's own max — never overflows validateBlockTree", () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({ text: `Message ${i}` }));
    const { blocks } = mapOldAnnouncementConfig({
      enabled: true,
      style: "marquee",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages,
    });
    const content = blocks[0]!.content as { messages: unknown[] };
    expect(content.messages).toHaveLength(5);
  });

  it("enabled: true but zero messages produces no block — nothing meaningful to show", () => {
    const { blocks } = mapOldAnnouncementConfig({
      enabled: true,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [],
    });
    expect(blocks).toHaveLength(0);
  });

  it("style: marquee reports the rotation-behavior-changed issue; a static style with default rotateMs does not", () => {
    const marquee = mapOldAnnouncementConfig({
      enabled: true,
      style: "marquee",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "x" }],
    });
    expect(marquee.issues.some((i) => i.kind === "announcement-marquee-behavior-changed")).toBe(true);

    const staticDefault = mapOldAnnouncementConfig({
      enabled: true,
      style: "solid",
      tone: "ink",
      dismissible: true,
      rotateMs: 6000,
      messages: [{ text: "x" }],
    });
    expect(staticDefault.issues.some((i) => i.kind === "announcement-rotation-dropped")).toBe(false);
  });
});
