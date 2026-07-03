import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPeerCatalog,
  fetchPeerPack,
  fetchAllPeerCatalogs,
} from "./federation";

const CATALOG = {
  format: "oys-marketplace@1",
  name: "Peer",
  description: "d",
  packs: [
    {
      type: "block-pack",
      slug: "hero",
      title: "Hero",
      description: "A hero",
      downloadUrl: "/marketplace/block-pack/hero/download",
      requiredBlockTypes: ["heading"],
    },
  ],
};

/** Install a fake global.fetch for the duration of a test. */
function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const fn = vi.fn(async (url: string | URL | Request) => {
    const u = typeof url === "string" ? url : url.toString();
    return handler(u);
  });
  global.fetch = fn as unknown as typeof global.fetch;
  return fn;
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("fetchPeerCatalog", () => {
  it("returns the parsed catalog for a valid peer", async () => {
    mockFetch(() => jsonRes(CATALOG));
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.catalog.format).toBe("oys-marketplace@1");
      expect(res.catalog.name).toBe("Peer");
      expect(res.catalog.packs).toHaveLength(1);
      expect(res.catalog.packs[0].slug).toBe("hero");
      expect(res.catalog.packs[0].requiredBlockTypes).toEqual(["heading"]);
    }
  });

  it("strips a trailing slash from the peer URL", async () => {
    const fn = mockFetch(() => jsonRes(CATALOG));
    await fetchPeerCatalog("https://peer.example/");
    expect(fn.mock.calls[0][0]).toBe("https://peer.example/marketplace/catalog.json");
  });

  it("returns an error (never throws) when fetch rejects", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof global.fetch;
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("boom");
  });

  it("returns an error for a non-200 response", async () => {
    mockFetch(() => new Response("nope", { status: 404 }));
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("404");
  });

  it("returns an error for invalid JSON", async () => {
    mockFetch(() => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } }));
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("Invalid JSON");
  });

  it("rejects a catalog with the wrong format tag", async () => {
    mockFetch(() => jsonRes({ format: "oys-marketplace@9", name: "x", packs: [] }));
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("oys-marketplace@1");
  });

  it("tolerates malformed pack entries (skips them, keeps valid ones)", async () => {
    mockFetch(() =>
      jsonRes({
        format: "oys-marketplace@1",
        name: "x",
        packs: [
          { type: "block-pack", slug: "ok", title: "Ok" },
          { type: "bad" }, // missing slug — skipped
          "nope", // not an object — skipped
        ],
      }),
    );
    const res = await fetchPeerCatalog("https://peer.example");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.catalog.packs).toHaveLength(1);
  });
});

describe("fetchPeerPack", () => {
  it("returns the raw pack JSON for a 200 response", async () => {
    const pack = { format: "oys-pack@1", kind: "block-pack", name: "Hero", blocks: [] };
    mockFetch(() => jsonRes(pack));
    const res = await fetchPeerPack("https://peer.example", "block-pack", "hero");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.pack).toEqual(pack);
  });

  it("encodes the type and slug into the path", async () => {
    const fn = mockFetch(() => jsonRes({}));
    await fetchPeerPack("https://peer.example", "block-pack", "my hero");
    expect(fn.mock.calls[0][0]).toBe(
      "https://peer.example/marketplace/block-pack/my%20hero/download",
    );
  });

  it("returns an error when fetch throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof global.fetch;
    const res = await fetchPeerPack("https://peer.example", "block-pack", "hero");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("network down");
  });

  it("returns an error for a non-200 response", async () => {
    mockFetch(() => new Response("nope", { status: 500 }));
    const res = await fetchPeerPack("https://peer.example", "block-pack", "hero");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("500");
  });
});

describe("fetchAllPeerCatalogs", () => {
  it("returns one result per peer, keyed by URL, and never rejects", async () => {
    let calls = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      calls += 1;
      const u = typeof url === "string" ? url : url.toString();
      if (u.includes("/good")) return jsonRes(CATALOG);
      throw new Error("offline");
    }) as unknown as typeof global.fetch;

    const results = await fetchAllPeerCatalogs([
      "https://good.example",
      "https://bad.example",
    ]);
    expect(results).toHaveLength(2);
    expect(calls).toBe(2);
    const good = results.find((r) => r.peerUrl === "https://good.example");
    const bad = results.find((r) => r.peerUrl === "https://bad.example");
    expect(good?.result.ok).toBe(true);
    expect(bad?.result.ok).toBe(false);
  });

  it("returns an empty array for no peers", async () => {
    const results = await fetchAllPeerCatalogs([]);
    expect(results).toEqual([]);
  });
});
