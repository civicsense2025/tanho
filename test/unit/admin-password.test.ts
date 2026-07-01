import { describe, it, expect, afterEach } from "vitest";
import { createHash } from "crypto";
import { safeSecretEqual } from "../../src/lib/crypto";
import { verifyAdminPassword } from "../../src/lib/admin-password";

const sha256Hex = (s: string) => createHash("sha256").update(s, "utf-8").digest("hex");

describe("safeSecretEqual", () => {
  it("true for equal strings, false for unequal / different length", () => {
    expect(safeSecretEqual("hunter2", "hunter2")).toBe(true);
    expect(safeSecretEqual("hunter2", "hunter3")).toBe(false);
    expect(safeSecretEqual("short", "longerstring")).toBe(false);
    expect(safeSecretEqual("", "")).toBe(true);
  });
});

describe("verifyAdminPassword", () => {
  const saved = { pw: process.env.ADMIN_PASSWORD, hash: process.env.ADMIN_PASSWORD_HASH };
  afterEach(() => {
    process.env.ADMIN_PASSWORD = saved.pw;
    if (saved.hash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = saved.hash;
  });

  it("hash mode: accepts the right password, rejects wrong (ADMIN_PASSWORD ignored)", () => {
    process.env.ADMIN_PASSWORD_HASH = sha256Hex("correct horse");
    process.env.ADMIN_PASSWORD = "a-different-plaintext-that-must-be-ignored";
    expect(verifyAdminPassword("correct horse")).toBe(true);
    expect(verifyAdminPassword("wrong")).toBe(false);
    expect(verifyAdminPassword("a-different-plaintext-that-must-be-ignored")).toBe(false);
  });

  it("hash mode is case-insensitive on the stored hex", () => {
    process.env.ADMIN_PASSWORD_HASH = sha256Hex("swordfish").toUpperCase();
    expect(verifyAdminPassword("swordfish")).toBe(true);
  });

  it("plaintext fallback when no hash is set", () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = "letmein";
    expect(verifyAdminPassword("letmein")).toBe(true);
    expect(verifyAdminPassword("nope")).toBe(false);
  });
});
