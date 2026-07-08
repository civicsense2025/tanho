import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_FILE_FIXES } from "./client-files";

const REPO_ROOT = process.cwd();

describe("swap-db-dialect client-files drift detection", () => {
  it("CLIENT_FILE_FIXES targets exactly 3 files", () => {
    expect(CLIENT_FILE_FIXES).toHaveLength(3);
    const files = CLIENT_FILE_FIXES.map((f: { file: string; from: string; to: string }) => f.file);
    expect(files).toContain("src/lib/db/client.ts");
    expect(files).toContain("seed/lib.ts");
    expect(files).toContain("drizzle.config.ts");
  });

  for (const { file, from, to } of CLIENT_FILE_FIXES) {
    describe(`${file}`, () => {
      const absPath = resolve(REPO_ROOT, file);

      it("'from' block matches current source (no drift)", () => {
        if (!existsSync(absPath)) {
          // File may not exist in all environments — skip gracefully.
          return;
        }
        const src = readFileSync(absPath, "utf8");
        // If the file is already converted (contains 'to'), the 'from' block
        // won't match — that's expected after a dialect swap. Only fail if
        // the file is NOT converted AND the 'from' block doesn't match
        // (meaning the source drifted from the script's expectations).
        const alreadyConverted = src.includes(to);
        if (!alreadyConverted) {
          expect(
            src.includes(from),
            `src/lib/db/client.ts has drifted from the swap-db-dialect script's expected 'from' block. ` +
            `Update the 'from' string in scripts/swap-db-dialect/client-files.ts to match the current source.`,
          ).toBe(true);
        }
      });

      it("'to' block is different from 'from' block", () => {
        expect(to).not.toBe(from);
      });
    });
  }
});
