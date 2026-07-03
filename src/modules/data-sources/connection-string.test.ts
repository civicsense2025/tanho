import { describe, expect, it } from "vitest";
import { parsePostgresConnectionString } from "./connection-string";

describe("parsePostgresConnectionString", () => {
  it("parses a well-formed connection string", () => {
    const result = parsePostgresConnectionString("postgres://alice:secret@db.example.com:5432/mydb?sslmode=require");
    expect(result).toEqual({
      provider: "postgres",
      host: "db.example.com",
      port: 5432,
      database: "mydb",
      user: "alice",
      password: "secret",
      connectionStringExtra: "sslmode=require",
    });
  });

  it("percent-decodes a password containing @, :, and other reserved characters", () => {
    const raw = "postgresql://alice:p%40ss%3Aw%2Frd@db.example.com:5432/mydb?sslmode=require";
    const result = parsePostgresConnectionString(raw);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.password).toBe("p@ss:w/rd");
      expect(result.user).toBe("alice");
      expect(result.host).toBe("db.example.com");
    }
  });

  it("rejects sslmode=disable in the query string, same as manual entry", () => {
    const result = parsePostgresConnectionString("postgres://alice:secret@db.example.com:5432/mydb?sslmode=disable");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/TLS\/SSL must not be disabled/);
    }
  });

  it("returns an error shape instead of throwing for a malformed string", () => {
    expect(() => parsePostgresConnectionString("not a connection string")).not.toThrow();
    const result = parsePostgresConnectionString("not a connection string");
    expect("error" in result).toBe(true);
  });

  it("returns an error shape for a non-postgres URI", () => {
    const result = parsePostgresConnectionString("https://example.com/mydb");
    expect("error" in result).toBe(true);
  });

  it("returns an error shape for an empty string", () => {
    const result = parsePostgresConnectionString("");
    expect("error" in result).toBe(true);
  });
});
