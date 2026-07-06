/**
 * Injects .enableRLS() and an app-role-only pgPolicy() into every
 * pgTable(...) call in already-converted (pg-core) schema source. See
 * scripts/swap-db-dialect.ts for the full conversion this module is part of.
 */

/** Finds the character index matching the opening paren/brace at `openIdx`,
 * tracking string/template-literal AND comment state so backticks/quotes
 * inside JSDoc comments (e.g. `code`, "confirmed") don't desync the depth
 * count — a real bug hit converting src/modules/scheduling/schema.ts. */
export function findMatchingClose(src: string, openIdx: number): number {
  const open = src[openIdx];
  const close = open === "(" ? ")" : open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) throw new Error(`findMatchingClose: unsupported opener ${open}`);

  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (c === "\\") i++; // skip escaped char
      else if (c === inString) inString = null;
      continue;
    }
    // Comments take priority over string/template-literal detection.
    if (c === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inString = c;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`findMatchingClose: no matching ${close} found for opener at ${openIdx}`);
}

/** Adds .enableRLS() and an app-role-only pgPolicy to every pgTable(...) call
 * in already-converted (pg-core) source. Handles both the 2-arg form
 * (pgTable("name", { cols })) and the 3-arg array form
 * (pgTable("name", { cols }, (t) => [ ...constraints ])). Skips any table
 * that already calls .enableRLS() (idempotent re-run). */
export function injectRls(src: string, appRole: string): { src: string; tablesLocked: number } {
  let tablesLocked = 0;
  const callRe = /\bpgTable\(\s*(["'])([a-zA-Z0-9_]+)\1\s*,/g;
  let match: RegExpExecArray | null;
  const edits: Array<{ at: number; insert: string }> = [];

  while ((match = callRe.exec(src))) {
    const tableName = match[2];
    const callStart = match.index + "pgTable".length; // index of "("
    const parenOpen = src.indexOf("(", callStart);
    const parenClose = findMatchingClose(src, parenOpen);

    // Skip if this exact call already has .enableRLS() chained right after.
    const afterClose = src.slice(parenClose + 1, parenClose + 40);
    if (/^\s*\.enableRLS\(\)/.test(afterClose)) continue;

    // Find the columns-object arg (first { after the table name string) to
    // know whether a 3rd (extraConfig) arg already exists.
    const colsOpen = src.indexOf("{", parenOpen);
    const colsClose = findMatchingClose(src, colsOpen);
    const between = src.slice(colsClose + 1, parenClose);
    const hasThirdArg = /,\s*\S/.test(between);

    const policyName = `${tableName}_app_only`;
    const policyLiteral =
      `pgPolicy("${policyName}", { for: "all", to: "${appRole}", ` +
      `using: sql\`true\`, withCheck: sql\`true\` })`;

    if (hasThirdArg) {
      // 3-arg array form: (t) => [ ...existing ]. Insert before the array's
      // closing bracket.
      const arrowArrowIdx = src.indexOf("=>", colsClose);
      const arrOpen = src.indexOf("[", arrowArrowIdx);
      if (arrOpen === -1 || arrOpen > parenClose) {
        throw new Error(
          `injectRls: table "${tableName}" has an unrecognized 3rd-arg shape (expected (t) => [...]) — leaving untouched, add pgPolicy by hand`,
        );
      }
      const arrClose = findMatchingClose(src, arrOpen);
      // The array may already end with a trailing comma + whitespace before
      // its closing bracket (common with Prettier-formatted multi-line
      // arrays) — insert right after the last real token, not after an
      // existing trailing comma, to avoid ",\n  , pgPolicy(...)".
      const beforeClose = src.slice(0, arrClose);
      const trailingWsAndComma = beforeClose.match(/,?\s*$/);
      const insertAt = trailingWsAndComma ? arrClose - trailingWsAndComma[0].length : arrClose;
      edits.push({ at: insertAt, insert: `, ${policyLiteral}` });
    } else {
      // 2-arg form: add a 3rd-arg array right after the columns object.
      edits.push({ at: colsClose + 1, insert: `, () => [${policyLiteral}]` });
    }

    // Chain .enableRLS() onto the whole pgTable(...) call.
    edits.push({ at: parenClose + 1, insert: ".enableRLS()" });
    tablesLocked++;
  }

  // Apply edits back-to-front so earlier indices stay valid.
  edits.sort((a, b) => b.at - a.at);
  let out = src;
  for (const { at, insert } of edits) {
    out = out.slice(0, at) + insert + out.slice(at);
  }

  // Ensure `sql` is imported from drizzle-orm if we added any policies.
  if (tablesLocked > 0 && !/^import\s*\{[^}]*\bsql\b[^}]*\}\s*from\s*"drizzle-orm";/m.test(out)) {
    if (/^import\s*\{([^}]*)\}\s*from\s*"drizzle-orm";/m.test(out)) {
      out = out.replace(/^import\s*\{([^}]*)\}\s*from\s*"drizzle-orm";/m, (_m, names) => {
        const set = new Set(
          names
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        );
        set.add("sql");
        return `import { ${[...set].sort().join(", ")} } from "drizzle-orm";`;
      });
    } else {
      out = `import { sql } from "drizzle-orm";\n${out}`;
    }
  }

  return { src: out, tablesLocked };
}
