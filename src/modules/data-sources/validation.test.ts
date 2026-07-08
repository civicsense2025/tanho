import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSourceBindingSchema, postgresConfigSchema } from "./validation";
import { dataSourceConfigSchema } from "./validation.server";

const BASE = {
  provider: "postgres" as const,
  port: 5432,
  database: "mydb",
  user: "alice",
  password: "secret",
};

describe("postgresConfigSchema (sync)", () => {
  it("accepts a well-formed config without touching the network", () => {
    const result = postgresConfigSchema.safeParse({ ...BASE, host: "db.internal.example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects sslmode=disable", () => {
    const result = postgresConfigSchema.safeParse({
      ...BASE,
      host: "db.example.com",
      connectionStringExtra: "sslmode=disable",
    });
    expect(result.success).toBe(false);
  });
});

describe("dataSourceConfigSchema (async, includes host-blocklist)", () => {
  // The SSRF guard (assertHostNotBlocked in validation.server.ts) skips the
  // loopback/metadata check when NODE_ENV !== "production" — a deliberate
  // escape hatch for local dev (docker-compose Supabase on 127.0.0.1). These
  // tests verify the production behavior, so stub NODE_ENV for the suite.
  const originalNodeEnv = process.env.NODE_ENV;
  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "production");
  });
  afterAll(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "");
  });
  it("accepts a host that resolves to a public-looking address", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({ ...BASE, host: "1.2.3.4" });
    expect(result.success).toBe(true);
  });

  it("rejects a loopback IP literal", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({ ...BASE, host: "127.0.0.1" });
    expect(result.success).toBe(false);
  });

  it("rejects the AWS/GCP/Azure metadata IP literal", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({ ...BASE, host: "169.254.169.254" });
    expect(result.success).toBe(false);
  });

  it("rejects a hostname that resolves to loopback (localhost)", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({ ...BASE, host: "localhost" });
    expect(result.success).toBe(false);
  });

  it("allows an RFC1918 private IP literal (self-hosted DB use case)", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({ ...BASE, host: "192.168.1.50" });
    expect(result.success).toBe(true);
  });

  it("does not require a host at all for the supabase provider", async () => {
    const result = await dataSourceConfigSchema.safeParseAsync({
      provider: "supabase",
      projectRef: "abcdefghij",
      databasePassword: "secret",
      usePooler: true,
      database: "postgres",
    });
    expect(result.success).toBe(true);
  });
});

describe("dataSourceBindingSchema filter op/value cross-validation", () => {
  const base = { connectionId: "conn1", table: "products", columns: ["id"], limit: 10 };

  it("accepts a scalar value with a scalar op", () => {
    const result = dataSourceBindingSchema.safeParse({
      ...base,
      filters: [{ column: "price", op: "gte", value: 100 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an array value with the \"in\" op", () => {
    const result = dataSourceBindingSchema.safeParse({
      ...base,
      filters: [{ column: "status", op: "in", value: ["active", "pending"] }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an array value with a scalar op like eq", () => {
    const result = dataSourceBindingSchema.safeParse({
      ...base,
      filters: [{ column: "price", op: "eq", value: [1, 2, 3] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a scalar value with the \"in\" op", () => {
    const result = dataSourceBindingSchema.safeParse({
      ...base,
      filters: [{ column: "status", op: "in", value: "active" }],
    });
    expect(result.success).toBe(false);
  });
});
