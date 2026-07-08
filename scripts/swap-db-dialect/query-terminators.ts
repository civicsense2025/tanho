/**
 * Fixes SQLite-only query terminators (.get() / .all()) on the STATIC-schema
 * query builder that Postgres's async node-postgres driver doesn't have. Each
 * call site already `await`s the query, so `.get()` becomes a destructured first
 * row and `.all()` is simply the array the query already returns.
 *
 * NOTE: RAW SQL execution (the content-schema DDL engine's `db.run(sql)` /
 * `db.all<T>(sql)` for dynamic `ct_*` tables) is NOT handled here — it goes
 * through the dialect-agnostic `rawRun`/`rawAll` helpers in `src/lib/db/raw.ts`,
 * which branch on `currentDialect()` at runtime and therefore need no codemod
 * rewrite. Only the fixed, driver-terminator call sites below need patching.
 */
import { readFileSync, writeFileSync } from "node:fs";

const QUERY_TERMINATOR_FIXES: Array<{ file: string; from: string; to: string }> = [
  {
    file: "src/modules/auth/session.ts",
    from: `  const row = await db\n    .select({\n      sessionId: sessions.id,`,
    to: `  const [row] = await db\n    .select({\n      sessionId: sessions.id,`,
  },
  {
    file: "src/modules/auth/session.ts",
    from: `    .where(eq(sessions.id, id))\n    .get();`,
    to: `    .where(eq(sessions.id, id));`,
  },
  {
    file: "src/modules/auth/api-tokens/guards.ts",
    from: `  const row = await db\n    .select({\n      tokenId: apiTokens.id,`,
    to: `  const [row] = await db\n    .select({\n      tokenId: apiTokens.id,`,
  },
  {
    file: "src/modules/auth/api-tokens/guards.ts",
    from: `    .where(eq(apiTokens.tokenHash, tokenHash))\n    .get();`,
    to: `    .where(eq(apiTokens.tokenHash, tokenHash));`,
  },
  {
    file: "src/modules/auth/api-tokens/actions.ts",
    from: `    .where(eq(apiTokens.userId, user.id))\n    .all();`,
    to: `    .where(eq(apiTokens.userId, user.id));`,
  },
  {
    file: "src/modules/people/viewer.ts",
    from: `  const row = await db\n    .select({\n      expiresAt: sessions.expiresAt,`,
    to: `  const [row] = await db\n    .select({\n      expiresAt: sessions.expiresAt,`,
  },
  {
    file: "src/modules/people/viewer.ts",
    from: `    .where(and(eq(sessions.id, id), eq(sessions.kind, "person")))\n    .get();`,
    to: `    .where(and(eq(sessions.id, id), eq(sessions.kind, "person")));`,
  },
];

export function fixQueryTerminators(dryRun: boolean) {
  const byFile = new Map<string, Array<{ from: string; to: string }>>();
  for (const fix of QUERY_TERMINATOR_FIXES) {
    if (!byFile.has(fix.file)) byFile.set(fix.file, []);
    byFile.get(fix.file)!.push({ from: fix.from, to: fix.to });
  }

  for (const [file, fixes] of byFile) {
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      console.log(`  skip ${file} (not found)`);
      continue;
    }
    let applied = 0;
    for (const { from, to } of fixes) {
      if (src.includes(from)) {
        src = src.replace(from, to);
        applied++;
      }
    }
    if (applied > 0) {
      if (!dryRun) writeFileSync(file, src);
      console.log(`  ${file}: ${applied}/${fixes.length} terminator fix(es) applied`);
    } else {
      console.log(`  ${file}: no matching terminators found (already converted or drifted)`);
    }
  }
}
