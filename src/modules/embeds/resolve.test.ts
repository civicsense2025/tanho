import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEmbedUrl } from "./resolve";

describe("resolveEmbedUrl — sync providers", () => {
  it("rejects a completely invalid URL", async () => {
    await expect(resolveEmbedUrl("not a url")).resolves.toEqual({ ok: false, error: "Not a valid URL" });
  });

  it("rejects a URL matching no known provider", async () => {
    const result = await resolveEmbedUrl("https://example.com/whatever");
    expect(result.ok).toBe(false);
  });

  it("rejects a non-https URL for a provider that only allows https", async () => {
    const result = await resolveEmbedUrl("http://youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.ok).toBe(false);
  });

  describe("youtube", () => {
    it("resolves a youtu.be short link to the embed form", async () => {
      const result = await resolveEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result).toEqual({ ok: true, provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    });

    it("resolves a youtube.com/watch?v= link to the embed form", async () => {
      const result = await resolveEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({ ok: true, provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    });

    it("passes through an already-embed-form URL unchanged", async () => {
      const result = await resolveEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(result).toEqual({ ok: true, provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    });

    it("rejects a youtu.be link with an invalid-shaped id", async () => {
      const result = await resolveEmbedUrl("https://youtu.be/../../etc");
      expect(result.ok).toBe(false);
    });
  });

  describe("figma", () => {
    it("resolves a figma embed URL", async () => {
      const result = await resolveEmbedUrl("https://www.figma.com/embed?embed_host=share&url=x");
      expect(result).toMatchObject({ ok: true, provider: "figma" });
    });

    it("rejects a non-embed figma URL", async () => {
      const result = await resolveEmbedUrl("https://www.figma.com/file/abc123");
      expect(result.ok).toBe(false);
    });
  });

  describe("maps", () => {
    it("resolves a google maps embed URL", async () => {
      const result = await resolveEmbedUrl("https://www.google.com/maps/embed?pb=x");
      expect(result).toMatchObject({ ok: true, provider: "maps" });
    });

    it("rejects a non-embed maps URL", async () => {
      const result = await resolveEmbedUrl("https://www.google.com/maps/place/x");
      expect(result.ok).toBe(false);
    });
  });

  describe("vimeo", () => {
    it("resolves a plain vimeo.com share URL to the player embed form", async () => {
      const result = await resolveEmbedUrl("https://vimeo.com/76979871");
      expect(result).toEqual({ ok: true, provider: "vimeo", url: "https://player.vimeo.com/video/76979871" });
    });

    it("resolves a vimeo.com share URL with an unlisted-video hash", async () => {
      const result = await resolveEmbedUrl("https://vimeo.com/76979871/abcdef1234");
      expect(result).toEqual({ ok: true, provider: "vimeo", url: "https://player.vimeo.com/video/76979871?h=abcdef1234" });
    });

    it("passes through an already-embed-form player.vimeo.com URL unchanged", async () => {
      const result = await resolveEmbedUrl("https://player.vimeo.com/video/76979871");
      expect(result).toEqual({ ok: true, provider: "vimeo", url: "https://player.vimeo.com/video/76979871" });
    });

    it("rejects a vimeo.com URL that isn't a numeric video id", async () => {
      const result = await resolveEmbedUrl("https://vimeo.com/categories/animation");
      expect(result.ok).toBe(false);
    });
  });

  describe("spotify", () => {
    it("resolves a plain track share URL to the embed form", async () => {
      const result = await resolveEmbedUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
      expect(result).toEqual({
        ok: true,
        provider: "spotify",
        url: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      });
    });

    it("resolves an episode URL the same way", async () => {
      const result = await resolveEmbedUrl("https://open.spotify.com/episode/7makk4oTQel546B0PZlDM5");
      expect(result).toEqual({
        ok: true,
        provider: "spotify",
        url: "https://open.spotify.com/embed/episode/7makk4oTQel546B0PZlDM5",
      });
    });

    it("passes through an already-embed-form URL unchanged", async () => {
      const result = await resolveEmbedUrl("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
      expect(result).toMatchObject({ ok: true, provider: "spotify" });
    });

    it("rejects an unrecognized spotify path", async () => {
      const result = await resolveEmbedUrl("https://open.spotify.com/search/whatever");
      expect(result.ok).toBe(false);
    });
  });

  describe("twitter/x", () => {
    it("resolves a twitter.com status URL", async () => {
      const result = await resolveEmbedUrl("https://twitter.com/jack/status/20");
      expect(result).toEqual({ ok: true, provider: "twitter", url: "https://twitter.com/jack/status/20" });
    });

    it("resolves an x.com status URL the same way", async () => {
      const result = await resolveEmbedUrl("https://x.com/jack/status/20");
      expect(result).toEqual({ ok: true, provider: "twitter", url: "https://x.com/jack/status/20" });
    });

    it("rejects a twitter.com URL that isn't a status link", async () => {
      const result = await resolveEmbedUrl("https://twitter.com/jack");
      expect(result.ok).toBe(false);
    });
  });
});

describe("resolveEmbedUrl — soundcloud (mocked network)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("resolves a soundcloud share URL via the oEmbed endpoint's returned iframe src", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        html: '<iframe width="100%" height="400" src="https://w.soundcloud.com/player/?visual=true&amp;url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293&amp;show_artwork=true"></iframe>',
      }),
    });

    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result).toEqual({
      ok: true,
      provider: "soundcloud",
      url: "https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293&show_artwork=true",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://soundcloud.com/oembed?url="),
      expect.objectContaining({ redirect: "error" }),
    );
  });

  it("fails gracefully on a non-200 response, never throwing", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    const result = await resolveEmbedUrl("https://soundcloud.com/nonexistent/track");
    expect(result.ok).toBe(false);
  });

  it("fails gracefully on a network error/timeout, never throwing", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("The operation was aborted"));
    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result.ok).toBe(false);
  });

  it("fails gracefully on malformed JSON, never throwing", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result.ok).toBe(false);
  });

  it("fails gracefully when the response has no html field", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ title: "x" }) });
    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result.ok).toBe(false);
  });

  it("fails gracefully when the html field has no parseable iframe src", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ html: "<p>no iframe here</p>" }) });
    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result.ok).toBe(false);
  });

  it("rejects the resolved iframe src if it doesn't point at w.soundcloud.com (defense against a compromised/spoofed oEmbed response)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ html: '<iframe src="https://evil.example.com/steal-cookies"></iframe>' }),
    });
    const result = await resolveEmbedUrl("https://soundcloud.com/forss/flickermood");
    expect(result.ok).toBe(false);
  });

  it("never calls fetch for a non-soundcloud URL", async () => {
    await resolveEmbedUrl("https://example.com/whatever");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe("custom (donation / form) provider — allowlist security", () => {
    it("resolves an allowlisted donation host (ActBlue)", async () => {
      const r = await resolveEmbedUrl("https://secure.actblue.com/donate/my-campaign");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.provider).toBe("custom");
    });

    it("resolves other allowlisted hosts (Donorbox, Givebutter)", async () => {
      expect((await resolveEmbedUrl("https://donorbox.org/embed/my-form")).ok).toBe(true);
      expect((await resolveEmbedUrl("https://app.givebutter.com/c/xyz")).ok).toBe(true);
    });

    it("REJECTS a non-allowlisted host (no arbitrary iframes)", async () => {
      expect((await resolveEmbedUrl("https://evil.example.com/iframe")).ok).toBe(false);
      expect((await resolveEmbedUrl("https://actblue.com.evil.com/donate")).ok).toBe(false);
    });

    it("rejects http (https-only)", async () => {
      expect((await resolveEmbedUrl("http://secure.actblue.com/donate/x")).ok).toBe(false);
    });
  });
});
