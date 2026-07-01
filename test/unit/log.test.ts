import { describe, it, expect, vi, afterEach } from "vitest";
import { log, _internal } from "../../src/lib/log";

const { redact } = _internal;

describe("redact", () => {
  it("redacts values for sensitive key names (case-insensitive)", () => {
    const out = redact({
      email: "customer@example.com",
      Password: "hunter2",
      API_KEY: "sk_live_abc123",
      authToken: "eyJ.abc.def",
      COOKIE: "session=xyz",
      ssn: "123-45-6789",
      orderId: "ord_123", // NOT sensitive by key name — should survive
    }) as Record<string, unknown>;

    expect(out.email).toBe("[REDACTED]");
    expect(out.Password).toBe("[REDACTED]");
    expect(out.API_KEY).toBe("[REDACTED]");
    expect(out.authToken).toBe("[REDACTED]");
    expect(out.COOKIE).toBe("[REDACTED]");
    expect(out.ssn).toBe("[REDACTED]");
    expect(out.orderId).toBe("ord_123");
  });

  it("redacts a JWT-shaped string even under an innocuous key name", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.abc123signature";
    const out = redact({ payload: jwt }) as Record<string, unknown>;
    expect(out.payload).toBe("[REDACTED]");
  });

  it("redacts only the credential portion of a connection string", () => {
    const out = redact({ dsn: "postgres://user:s3cr3t@db.example.com:5432/mydb" }) as Record<string, unknown>;
    expect(out.dsn).toBe("postgres://[REDACTED]@db.example.com:5432/mydb");
    expect(out.dsn).not.toContain("s3cr3t");
  });

  it("recurses into nested objects and arrays", () => {
    const out = redact({
      user: { email: "a@b.com", id: "u1" },
      items: [{ token: "abc" }, { id: "x" }],
    }) as { user: { email: string; id: string }; items: Array<Record<string, unknown>> };
    expect(out.user.email).toBe("[REDACTED]");
    expect(out.user.id).toBe("u1");
    expect(out.items[0].token).toBe("[REDACTED]");
    expect(out.items[1].id).toBe("x");
  });

  it("captures only name/message/stack for Error instances, never arbitrary properties", () => {
    const err = new Error("boom");
    (err as unknown as Record<string, unknown>).secretField = "should-never-appear";
    const out = redact({ err }) as { err: { name: string; message: string; stack?: string } };
    expect(out.err.name).toBe("Error");
    expect(out.err.message).toBe("boom");
    expect(out.err.stack).toBeDefined();
    expect(JSON.stringify(out.err)).not.toContain("should-never-appear");
  });

  it("redacts a secret embedded in an Error message, preserving surrounding context", () => {
    const err = new Error("auth failed for token eyJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIifQ.abc123signature");
    const out = redact({ err }) as { err: { message: string } };
    expect(out.err.message).toBe("auth failed for token [REDACTED]");
    expect(out.err.message).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("leaves non-sensitive primitives untouched", () => {
    expect(redact({ count: 5, ok: true, name: null })).toEqual({ count: 5, ok: true, name: null });
  });
});

describe("log", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits one structured JSON line with redacted meta, to the level-appropriate stream", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("something failed", { email: "leak@example.com", orderId: "ord_1" });

    expect(errSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("something failed");
    expect(parsed.email).toBe("[REDACTED]");
    expect(parsed.orderId).toBe("ord_1");
    expect(typeof parsed.ts).toBe("string");
  });

  it("info/warn route to console.log/console.warn respectively", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.info("hello");
    log.warn("careful");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
