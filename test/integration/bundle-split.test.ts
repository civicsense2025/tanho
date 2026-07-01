import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * The server-renderer / client-editor bundle split is load-bearing: BlockTree is reachable from
 * the client PreviewFrame, and the data-bound homepage blocks pull DB drivers (fs/net/dns) that
 * must never enter a client bundle. This guard walks the *static import graph* of the
 * client-reachable content-render path and asserts it never transitively reaches the homepage
 * registry, the block editors, or the DB layer. It's a fast proxy for the full bundle-analyzer
 * assertion and catches the regression at the source, in CI.
 */

const SRC = resolve(__dirname, "../../src");

// Modules that must NOT appear anywhere in the content-render import graph.
const FORBIDDEN = [/components\/homepage\//, /lib\/blocks\/editors/, /lib\/db\//];

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = resolve(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // node_modules / bare import — not part of our source graph
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base.endsWith(".ts") || base.endsWith(".tsx") ? base : base + ext;
    if (existsSync(p)) return p;
  }
  return null;
}

function collectGraph(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = readFileSync(entry, "utf8");
  const importRe = /import[\s\S]*?from\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src))) {
    const resolved = resolveImport(entry, m[1]);
    if (resolved) collectGraph(resolved, seen);
  }
  return seen;
}

describe("block bundle split", () => {
  it("the client-reachable content render path never imports homepage/editors/db", () => {
    const entry = resolve(SRC, "components/BlockTree.tsx");
    const graph = [...collectGraph(entry)];
    const leaks = graph.filter((f) => FORBIDDEN.some((re) => re.test(f)));
    expect(leaks, `bundle-split leak via BlockTree: ${leaks.join(", ")}`).toEqual([]);
  });

  it("RenderContentBlock stays free of the data-bound/DB graph", () => {
    const entry = resolve(SRC, "lib/blocks/core/RenderBlock.tsx");
    const graph = [...collectGraph(entry)];
    const leaks = graph.filter((f) => FORBIDDEN.some((re) => re.test(f)));
    expect(leaks).toEqual([]);
  });

  it("the server-only block renderers never transitively import TipTap or a 'use client' module", () => {
    const entry = resolve(SRC, "lib/blocks/renderers.ts");
    const graph = [...collectGraph(entry)];

    // @tiptap/* is a bare import (skipped by resolveImport), so scan raw specifiers, not graph paths.
    const tiptapLeaks: string[] = [];
    const useClientLeaks: string[] = [];
    const importRe = /import[\s\S]*?from\s*["']([^"']+)["']/g;
    for (const file of graph) {
      const src = readFileSync(file, "utf8");
      const head = src.trimStart();
      if (head.startsWith('"use client"') || head.startsWith("'use client'")) {
        useClientLeaks.push(file);
      }
      importRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = importRe.exec(src))) {
        if (m[1].includes("@tiptap")) tiptapLeaks.push(`${file} -> ${m[1]}`);
      }
    }
    expect(tiptapLeaks, `renderers.ts graph pulled @tiptap: ${tiptapLeaks.join(", ")}`).toEqual([]);
    expect(useClientLeaks, `renderers.ts graph pulled a "use client" module: ${useClientLeaks.join(", ")}`).toEqual([]);
  });
});
