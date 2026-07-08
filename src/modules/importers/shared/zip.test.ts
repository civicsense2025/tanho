import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { extractZip, baseName } from "./zip";

/** Build an in-memory .zip File from a { path: content } map. */
function makeZip(files: Record<string, string | Uint8Array>): File {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    entries[path] = content instanceof Uint8Array ? content : strToU8(content);
  }
  const bytes = zipSync(entries);
  return new File([bytes], "x.zip", { type: "application/zip" });
}

describe("extractZip", () => {
  it("extracts normal small text entries and decodes them", async () => {
    const zip = makeZip({
      "posts/hello.md": "# Hello\n\nBody para.",
      "notes/a.txt": "plain text",
      "empty/": "",
    });

    const result = await extractZip(zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.data!.entries.map((e) => e.path).sort();
    expect(paths).toEqual(["notes/a.txt", "posts/hello.md"]);
    expect(result.data!.skipped).toEqual([]);
    const hello = result.data!.entries.find((e) => e.path === "posts/hello.md")!;
    expect(hello.text).toBe("# Hello\n\nBody para.");
  });

  it("honors the filter option", async () => {
    const zip = makeZip({ "a.md": "md", "b.txt": "txt" });
    const result = await extractZip(zip, { filter: (p) => p.endsWith(".md") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.entries.map((e) => e.path)).toEqual(["a.md"]);
  });

  it("rejects a compressed upload larger than maxBytes before decompression", async () => {
    // ~1MB of incompressible random-ish bytes per entry; pack enough to exceed 50MB.
    const big = new Uint8Array(2 * 1024 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = (i * 2654435761) & 0xff;
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i < 30; i++) entries[`f${i}.bin`] = big;
    const bytes = zipSync(entries, { level: 0 });
    const file = new File([bytes], "big.zip", { type: "application/zip" });
    expect(file.size).toBeGreaterThan(50 * 1024 * 1024);

    const result = await extractZip(file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/larger than/);
  });

  it("rejects a zip-bomb entry without materializing it (no OOM, fast)", async () => {
    // 100MB of zeros compresses to ~100KB, but maxEntryBytes defaults to 20MB.
    // extractZip must reject/skip this WITHOUT inflating the 100MB payload.
    const bomb = new Uint8Array(100 * 1024 * 1024); // zeros, highly compressible
    const bytes = zipSync({ "bomb.bin": bomb });
    // Sanity: the compressed payload really is tiny (this is what makes it a bomb).
    expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
    const file = new File([bytes], "bomb.zip", { type: "application/zip" });

    const start = Date.now();
    const result = await extractZip(file);
    const elapsed = Date.now() - start;

    // Must not throw, hang, or OOM — and must finish near-instantly since it never
    // decompresses the 100MB entry. The oversize entry is either rejected outright
    // or skipped (reported in `skipped`, absent from `entries`); either is safe.
    expect(elapsed).toBeLessThan(5000);
    if (result.ok) {
      expect(result.data!.entries.map((e) => e.path)).not.toContain("bomb.bin");
      expect(result.data!.skipped).toContain("bomb.bin");
    } else {
      expect(result.error).toMatch(/larger than|decompress/);
    }
  });

  it("skips a single oversize entry but keeps the rest", async () => {
    const bomb = new Uint8Array(25 * 1024 * 1024); // > 20MB default per-entry cap
    const bytes = zipSync({ "big.bin": bomb, "ok.md": strToU8("small") });
    const file = new File([bytes], "mixed.zip", { type: "application/zip" });

    const result = await extractZip(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.entries.map((e) => e.path)).toEqual(["ok.md"]);
    expect(result.data!.skipped).toEqual(["big.bin"]);
  });

  it("rejects when total decompressed bytes exceed the cumulative cap", async () => {
    // Five 15MB entries: each under the 20MB per-entry cap, but 75MB total exceeds a
    // 50MB cumulative cap configured below.
    const chunk = new Uint8Array(15 * 1024 * 1024);
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i < 5; i++) entries[`f${i}.bin`] = chunk;
    const bytes = zipSync(entries);
    const file = new File([bytes], "many.zip", { type: "application/zip" });

    const result = await extractZip(file, { maxTotalDecompressedBytes: 50 * 1024 * 1024 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/decompress/);
  });

  it("rejects a zip with too many entries", async () => {
    const entries: Record<string, Uint8Array> = {};
    for (let i = 0; i < 10; i++) entries[`f${i}.txt`] = strToU8("x");
    const file = makeZip(entries);
    const result = await extractZip(file, { maxEntries: 5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/too many/);
  });

  it("baseName extracts the final path segment", () => {
    expect(baseName("posts/2024-01_hi.html")).toBe("2024-01_hi.html");
    expect(baseName("flat.txt")).toBe("flat.txt");
  });
});
