import { describe, expect, it } from "vitest";
import { detectEnvPrefix, resolveEnvPrefix } from "./prefix";

/** Fresh env object helper — tests must never mutate real `process.env`. */
function env(vars: Record<string, string>): NodeJS.ProcessEnv {
  return { ...vars } as NodeJS.ProcessEnv;
}

describe("detectEnvPrefix", () => {
  it("returns empty string when nothing is set", () => {
    expect(detectEnvPrefix(env({}))).toBe("");
  });

  it("honors ENV_PREFIX when set (with or without trailing underscore)", () => {
    expect(detectEnvPrefix(env({ ENV_PREFIX: "TANHO" }))).toBe("TANHO_");
    expect(detectEnvPrefix(env({ ENV_PREFIX: "TANHO_" }))).toBe("TANHO_");
    expect(detectEnvPrefix(env({ ENV_PREFIX: "tanho" }))).toBe("TANHO_");
    expect(detectEnvPrefix(env({ ENV_PREFIX: "  tanho_  " }))).toBe("TANHO_");
  });

  it("rejects malformed ENV_PREFIX", () => {
    expect(detectEnvPrefix(env({ ENV_PREFIX: "1BAD" }))).toBe("");
    expect(detectEnvPrefix(env({ ENV_PREFIX: "has space" }))).toBe("");
  });

  it("ENV_PREFIX wins over auto-detect even when anchors disagree", () => {
    expect(
      detectEnvPrefix(env({ ENV_PREFIX: "TANHO_", OTHER_DATABASE_URL: "x" })),
    ).toBe("TANHO_");
  });

  it("auto-detects from *_DATABASE_URL anchor", () => {
    expect(
      detectEnvPrefix(env({ TANHO_DATABASE_URL: "libsql://x", TANHO_APP_URL: "y" })),
    ).toBe("TANHO_");
  });

  it("falls back to *_APP_URL when no DATABASE_URL anchor", () => {
    expect(detectEnvPrefix(env({ TANHO_APP_URL: "y" }))).toBe("TANHO_");
  });

  it("does not match the bare anchor (requires a non-empty prefix)", () => {
    expect(detectEnvPrefix(env({ DATABASE_URL: "x" }))).toBe("");
  });

  it("picks the prefix with the most covered vars when multiple candidates", () => {
    // TANHO_ covers two anchors; STAGING_ covers one — TANHO_ wins.
    expect(
      detectEnvPrefix(
        env({
          TANHO_DATABASE_URL: "x",
          TANHO_APP_URL: "y",
          STAGING_DATABASE_URL: "z",
        }),
      ),
    ).toBe("TANHO_");
  });

  it("tie-breaks by longest prefix then lexicographic (deterministic)", () => {
    // Same coverage (one anchor each); longer prefix wins.
    expect(
      detectEnvPrefix(env({ AAA_DATABASE_URL: "x", AAAAA_DATABASE_URL: "y" })),
    ).toBe("AAAAA_");
    // Equal length + coverage → lexicographically smaller wins.
    expect(
      detectEnvPrefix(env({ B_DATABASE_URL: "x", A_DATABASE_URL: "y" })),
    ).toBe("A_");
  });
});

describe("resolveEnvPrefix", () => {
  it("is a no-op when no prefix is detectable", () => {
    const e = env({ DATABASE_URL: "file:./dev.db" });
    expect(resolveEnvPrefix(e)).toBe("");
    expect(e.DATABASE_URL).toBe("file:./dev.db");
  });

  it("copies prefixed vars to canonical names via ENV_PREFIX", () => {
    const e = env({
      ENV_PREFIX: "TANHO_",
      TANHO_DATABASE_URL: "libsql://x",
      TANHO_APP_URL: "https://site.example",
      TANSO_APP_ENCRYPTION_KEY: "deadbeef",
    });
    resolveEnvPrefix(e);
    expect(e.DATABASE_URL).toBe("libsql://x");
    expect(e.APP_URL).toBe("https://site.example");
  });

  it("canonical wins — an explicit canonical value is never overwritten", () => {
    const e = env({
      ENV_PREFIX: "TANHO_",
      DATABASE_URL: "file:./canonical.db",
      TANHO_DATABASE_URL: "libsql://prefixed",
    });
    resolveEnvPrefix(e);
    expect(e.DATABASE_URL).toBe("file:./canonical.db");
  });

  it("canonical wins per-var: unset vars still get filled alongside set ones", () => {
    const e = env({
      ENV_PREFIX: "TANHO_",
      DATABASE_URL: "file:./canonical.db",
      TANHO_DATABASE_URL: "libsql://prefixed",
      TANHO_APP_URL: "https://site.example",
    });
    resolveEnvPrefix(e);
    expect(e.DATABASE_URL).toBe("file:./canonical.db");
    expect(e.APP_URL).toBe("https://site.example");
  });

  it("handles NEXT_PUBLIC_* via the same generic strip", () => {
    const e = env({
      ENV_PREFIX: "TANHO_",
      TANHO_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    });
    resolveEnvPrefix(e);
    expect(e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("pk_test_x");
  });

  it("auto-detects the prefix when ENV_PREFIX is unset", () => {
    const e = env({
      TANHO_DATABASE_URL: "libsql://x",
      TANHO_TURSO_AUTH_TOKEN: "tok",
      TANHO_APP_URL: "https://site.example",
    });
    const applied = resolveEnvPrefix(e);
    expect(applied).toBe("TANHO_");
    expect(e.DATABASE_URL).toBe("libsql://x");
    expect(e.TURSO_AUTH_TOKEN).toBe("tok");
    expect(e.APP_URL).toBe("https://site.example");
  });

  it("does not copy a prefixed key whose stripped name is empty", () => {
    const e = env({ ENV_PREFIX: "TANHO_", TANHO_: "stray" });
    resolveEnvPrefix(e);
    // No empty-string canonical key created.
    expect(e[""]).toBeUndefined();
  });

  it("is idempotent — a second call changes nothing", () => {
    const e = env({ ENV_PREFIX: "TANHO_", TANHO_DATABASE_URL: "libsql://x" });
    resolveEnvPrefix(e);
    expect(e.DATABASE_URL).toBe("libsql://x");
    const snapshot = { ...e };
    resolveEnvPrefix(e);
    expect(e).toEqual(snapshot);
  });

  it("ignores keys that merely contain the prefix substring but don't start with it", () => {
    const e = env({
      ENV_PREFIX: "TANHO_",
      NOT_TANHO_DATABASE_URL: "libsql://decoy",
      TANHO_DATABASE_URL: "libsql://real",
    });
    resolveEnvPrefix(e);
    expect(e.DATABASE_URL).toBe("libsql://real");
    expect(e.NOT_DATABASE_URL).toBeUndefined();
  });
});
