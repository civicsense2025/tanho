import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { RenderEmbed } from "./Render";
import { embedSchema } from "./fields";
import type { RenderCtx } from "../types";

// RenderEmbed returns a plain React element (or a Fragment wrapping several)
// BEFORE anything mounts to a DOM — inspecting .type/.props directly is the
// same no-DOM-library approach the walker's own tests use (see
// renderer/gating.test.tsx), not a new testing dependency for one block.
const ctx = {} as RenderCtx;

function render(content: Partial<Parameters<typeof embedSchema.parse>[0]>) {
  return RenderEmbed({ content: embedSchema.parse(content), ctx }) as ReactElement;
}

describe("RenderEmbed — iframe providers", () => {
  it("renders an iframe for a valid youtube embed URL", () => {
    const el = render({ provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    expect(el.type).toBe("iframe");
    expect((el.props as { src: string }).src).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("renders an iframe for a valid vimeo embed URL", () => {
    const el = render({ provider: "vimeo", url: "https://player.vimeo.com/video/76979871" });
    expect(el.type).toBe("iframe");
  });

  it("renders an iframe for a valid spotify embed URL", () => {
    const el = render({ provider: "spotify", url: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC" });
    expect(el.type).toBe("iframe");
  });

  it("renders an iframe for a valid soundcloud (already-resolved) embed URL", () => {
    const el = render({
      provider: "soundcloud",
      url: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293",
    });
    expect(el.type).toBe("iframe");
  });

  it("falls back to a placeholder for a vimeo url pointing at the wrong host", () => {
    const el = render({ provider: "vimeo", url: "https://evil.example.com/video/123" });
    expect(el.type).not.toBe("iframe");
  });

  it("falls back to a placeholder for a soundcloud url NOT already resolved to w.soundcloud.com", () => {
    // Render must never trust a plain share URL for soundcloud — that
    // provider requires the async resolver (modules/embeds/resolve.ts) to
    // have already run; a raw share link here should never produce an iframe.
    const el = render({ provider: "soundcloud", url: "https://soundcloud.com/forss/flickermood" });
    expect(el.type).not.toBe("iframe");
  });

  it("falls back to a placeholder for an empty url", () => {
    const el = render({ provider: "youtube", url: "" });
    expect(el.type).not.toBe("iframe");
  });

  it("every rendered iframe carries the sandbox attribute", () => {
    const el = render({ provider: "figma", url: "https://www.figma.com/embed?url=x" });
    expect(el.type).toBe("iframe");
    expect((el.props as { sandbox: string }).sandbox).toContain("allow-scripts");
  });
});

describe("RenderEmbed — twitter (blockquote + script)", () => {
  it("renders a blockquote + Script for a valid tweet URL, never an iframe", () => {
    const el = render({ provider: "twitter", url: "https://twitter.com/jack/status/20" });
    // Fragment wrapping [blockquote, Script] — not an iframe.
    expect(el.type).not.toBe("iframe");
    const children = (el.props as { children: ReactElement[] }).children;
    const [blockquote, script] = children;
    expect(blockquote!.type).toBe("blockquote");
    expect((blockquote!.props as { className: string }).className).toBe("twitter-tweet");
    expect((script!.props as { src: string }).src).toBe("https://platform.twitter.com/widgets.js");
  });

  it("resolves x.com URLs the same way as twitter.com", () => {
    const el = render({ provider: "twitter", url: "https://x.com/jack/status/20" });
    const children = (el.props as { children: ReactElement[] }).children;
    expect(children[0]!.type).toBe("blockquote");
  });

  it("uses a stable script id so next/script's LoadCache dedupes across multiple tweet blocks on one page", () => {
    const first = render({ provider: "twitter", url: "https://twitter.com/jack/status/20" });
    const second = render({ provider: "twitter", url: "https://twitter.com/jack/status/30" });
    const firstScript = (first.props as { children: ReactElement[] }).children[1]!;
    const secondScript = (second.props as { children: ReactElement[] }).children[1]!;
    expect((firstScript.props as { id: string }).id).toBe((secondScript.props as { id: string }).id);
  });

  it("falls back to a placeholder for a non-status twitter URL", () => {
    const el = render({ provider: "twitter", url: "https://twitter.com/jack" });
    expect(el.type).not.toBe("blockquote");
    const children = (el.props as { children?: ReactElement[] }).children;
    expect(children).toBeUndefined(); // placeholder, not the [blockquote, script] fragment
  });

  it("falls back to a placeholder for a non-twitter hostname", () => {
    const el = render({ provider: "twitter", url: "https://evil.example.com/jack/status/20" });
    expect((el.props as { children?: ReactElement[] }).children).toBeUndefined();
  });

  it("embedSchema itself rejects a non-https tweet URL before Render ever sees it (schema is the first line of defense)", () => {
    expect(() => embedSchema.parse({ provider: "twitter", url: "http://twitter.com/jack/status/20" })).toThrow();
  });
});
