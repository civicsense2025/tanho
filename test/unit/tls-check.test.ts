import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { warnIfNoTls } from "../../src/lib/db/tls-check";

// @types/node marks process.env.NODE_ENV readonly; this test needs to flip it
// per-case to exercise the prod-only branch, so route the write through an
// indexed assignment (still a real mutation of the same process.env object,
// just not typed as an illegal direct property write).
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("warnIfNoTls", () => {
  const originalEnv = process.env.NODE_ENV;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
    setNodeEnv(originalEnv);
  });

  it("is a no-op outside production, even with plaintext remote hosts", () => {
    setNodeEnv("development");
    warnIfNoTls("postgres://user:pass@remote.example.com:5432/db", "postgres", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns in production when TLS is not requested on a public host (postgres)", () => {
    setNodeEnv("production");
    warnIfNoTls("postgres://user:pass@remote.example.com:5432/db", "postgres", "test");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("sslmode=require");
    // Never leak the connection string (which may carry credentials).
    expect(warnSpy.mock.calls[0][0]).not.toContain("user:pass");
  });

  it("does not warn when sslmode=require is present (postgres)", () => {
    setNodeEnv("production");
    warnIfNoTls("postgres://user:pass@remote.example.com:5432/db?sslmode=require", "postgres", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for localhost even without TLS (postgres)", () => {
    setNodeEnv("production");
    warnIfNoTls("postgres://user:pass@localhost:5432/db", "postgres", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for private-IP hosts even without TLS (postgres)", () => {
    setNodeEnv("production");
    warnIfNoTls("postgres://user:pass@10.0.5.20:5432/db", "postgres", "test");
    warnIfNoTls("postgres://user:pass@192.168.1.10:5432/db", "postgres", "test");
    warnIfNoTls("postgres://user:pass@172.20.0.5:5432/db", "postgres", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for known always-TLS managed hosts (postgres)", () => {
    setNodeEnv("production");
    warnIfNoTls("postgres://user:pass@ep-cool-name.us-east-2.aws.neon.tech:5432/db", "postgres", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns in production when TLS is not requested on a public host (mongodb)", () => {
    setNodeEnv("production");
    warnIfNoTls("mongodb://user:pass@remote.example.com:27017/db", "mongodb", "test");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("tls=true");
  });

  it("does not warn when tls=true is present (mongodb)", () => {
    setNodeEnv("production");
    warnIfNoTls("mongodb://user:pass@remote.example.com:27017/db?tls=true", "mongodb", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for mongodb+srv (defaults to TLS)", () => {
    setNodeEnv("production");
    warnIfNoTls("mongodb+srv://user:pass@cluster0.mongodb.net/db", "mongodb", "test");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not throw on a malformed URL", () => {
    setNodeEnv("production");
    expect(() => warnIfNoTls("not a url", "postgres", "test")).not.toThrow();
  });
});
