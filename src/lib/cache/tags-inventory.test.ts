import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STATIC_CACHE_TAGS } from "./tags-inventory";

const SRC_ROOT = join(__dirname, "..", "..");

/** Recursively lists every .ts/.tsx file under `dir`, skipping test files. */
function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extracts every STRING-LITERAL argument passed to `cacheTag(...)` across the
 * app. Skips template-literal arguments (`` `entries:${type}` ``) — those are
 * per-entity tags that can't be enumerated statically and are deliberately
 * out of scope for STATIC_CACHE_TAGS (see its file comment for why that's
 * safe).
 */
function findStaticCacheTagLiterals(): string[] {
  const literals: string[] = [];
  for (const file of listSourceFiles(SRC_ROOT)) {
    const content = readFileSync(file, "utf8");
    const callRegex = /cacheTag\(([^)]*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = callRegex.exec(content))) {
      const argsSrc = match[1];
      const stringLiteralRegex = /"([^"]*)"|'([^']*)'/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = stringLiteralRegex.exec(argsSrc))) {
        literals.push(strMatch[1] ?? strMatch[2]);
      }
    }
  }
  return literals;
}

describe("STATIC_CACHE_TAGS", () => {
  it("includes every static cacheTag() string literal used in the app", () => {
    const found = new Set(findStaticCacheTagLiterals());
    const inventory = new Set(STATIC_CACHE_TAGS);
    const missing = [...found].filter((tag) => !inventory.has(tag));
    expect(missing, `Add these tags to STATIC_CACHE_TAGS: ${missing.join(", ")}`).toEqual([]);
  });
});
