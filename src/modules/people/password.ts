/**
 * Reader password hashing. Readers and admins share the same argon2id
 * parameters and timing-defense primitives — this module re-exports the auth
 * module's helpers so there is one hashing implementation, not two.
 */
export { hashPassword, verifyPassword, dummyHash } from "@/modules/auth/password";
