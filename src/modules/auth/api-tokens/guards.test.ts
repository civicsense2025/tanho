import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { hashApiToken } from "./tokens";

let client: Client;
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let currentAuthHeader = "";

vi.mock("@/lib/db/client", () => ({
  get db() {
    return testDb;
  },
}));

// Mock next/headers so requireApiUser can read a controllable Authorization header.
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => {
      if (name.toLowerCase() === "authorization") return currentAuthHeader || null;
      if (name.toLowerCase() === "x-forwarded-for") return "203.0.113.99";
      return null;
    },
  }),
}));

async function seedOwnerWithToken(rawToken: string): Promise<void> {
  const [user] = await testDb
    .insert(schema.users)
    .values({ id: "u1", email: "owner@example.com", name: "Owner", passwordHash: "x", role: "owner", status: "active" })
    .returning({ id: schema.users.id });
  await testDb.insert(schema.apiTokens).values({
    userId: user!.id,
    name: "test",
    tokenHash: hashApiToken(rawToken),
    prefix: rawToken.slice(0, 8),
    createdAt: Date.now(),
  });
}

beforeEach(async () => {
  client = createClient({ url: ":memory:" });
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  currentAuthHeader = "";
});

describe("requireApiUser rate-limit interaction", () => {
  it("does NOT throttle a valid token used far more than the failure limit", async () => {
    const { requireApiUser } = await import("./guards");
    const token = "lamina_valid_token_abcdefghijklmnop";
    await seedOwnerWithToken(token);
    currentAuthHeader = `Bearer ${token}`;

    // 50 successful authenticated calls (> the 30 failed-attempt limit). None
    // should be refused — success never touches the limiter.
    for (let i = 0; i < 50; i++) {
      const user = await requireApiUser();
      expect(user.email).toBe("owner@example.com");
    }
  });

  it("throttles after 30 failed attempts, then blocks even a valid token", async () => {
    const { requireApiUser, ApiAuthError } = await import("./guards");
    const token = "lamina_valid_token_abcdefghijklmnop";
    await seedOwnerWithToken(token);

    // 30 bad-token attempts trip the limiter.
    currentAuthHeader = "Bearer lamina_wrong_token_xxxxxxxxxxxx";
    for (let i = 0; i < 30; i++) {
      await expect(requireApiUser()).rejects.toBeInstanceOf(ApiAuthError);
    }
    // Now even the CORRECT token is refused (the IP is rate-limited).
    currentAuthHeader = `Bearer ${token}`;
    await expect(requireApiUser()).rejects.toMatchObject({ status: 401, message: /Too many attempts/ });
  });
});
