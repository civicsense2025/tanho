import { z } from "zod";

/**
 * Zod schemas for team-management actions. Validation is the first line of
 * defense (CWE-20): bounds are enforced here before any DB write. The
 * `acceptSchema` deliberately omits `roleId` — role assignment is invite-time
 * only, never accepted from a public form (CWE-269 mass-assignment).
 */

/** Invite a new staff member — email + name + the role to grant. */
export const inviteSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(100),
  roleId: z.string().min(1),
  personId: z.string().optional(),
});

/** Accept an invite — token-gated, public. Only token + password are parsed;
 *  any other form fields (e.g. a forged `roleId`) are silently dropped. */
export const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(200),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptInput = z.infer<typeof acceptSchema>;
