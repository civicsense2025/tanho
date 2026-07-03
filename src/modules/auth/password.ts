import { hash, verify } from "@node-rs/argon2";

/** OWASP-recommended argon2id parameters. */
const PARAMS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, PARAMS);
  } catch {
    return false;
  }
}

/**
 * Pre-computed hash of an unguessable value. Verified against when the
 * email doesn't match a user, so both paths cost one argon2 verification
 * (reduces the login timing side channel).
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= hash(crypto.randomUUID(), PARAMS);
  return dummyHashPromise;
}
