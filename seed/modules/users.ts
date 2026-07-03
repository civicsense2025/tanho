import { randomBytes } from "node:crypto";
import { hashPassword } from "../../src/modules/auth/password";
import { users } from "../../src/modules/auth/schema";
import { log, type SeedDb } from "../lib";

/**
 * Seeds the owner account. Credentials come from SEED_OWNER_EMAIL /
 * SEED_OWNER_PASSWORD, or a random password is generated and printed ONCE.
 */
export async function seedOwner(db: SeedDb) {
  const existing = await db.query.users.findFirst();
  if (existing) {
    log("users: an account already exists — skipping owner seed");
    return;
  }

  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@example.com").toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? randomBytes(9).toString("base64url");
  if (password.length < 12) {
    throw new Error("SEED_OWNER_PASSWORD must be at least 12 characters");
  }

  await db.insert(users).values({
    email,
    name: "Owner",
    passwordHash: await hashPassword(password),
    role: "owner",
  });

  log(`owner account created: ${email}`);
  if (!process.env.SEED_OWNER_PASSWORD) {
    log(`owner password (shown once — change it after first login): ${password}`);
  }
}
