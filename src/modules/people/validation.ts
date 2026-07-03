import { z } from "zod";

/** Reader-account credentials. Reader passwords are min 8, matching admins. */
export const joinSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

export const signinSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

/** Newsletter signup — email plus an optional list slug. */
export const subscribeSchema = z.object({
  email: z.string().email().max(254),
  list: z.string().min(1).max(60).default("default"),
});

const socialSchema = z.object({
  icon: z.string().max(40),
  label: z.string().max(80),
  href: z.string().max(300),
});

/** Admin edit of a CRM person's contact + profile fields. */
export const personPatchSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(60).optional(),
  company: z.string().max(160).optional(),
  location: z.string().max(160).optional(),
  tags: z.array(z.string().max(60)).max(50).optional(),
  notes: z.string().max(4000).optional(),
  socials: z.array(socialSchema).max(20).optional(),
});

/** Comp membership grant (owner-only) — tier name + integer cents price. */
export const membershipGrantSchema = z.object({
  personId: z.string().min(1),
  tier: z.string().min(1).max(60),
  priceCents: z.number().int().min(0).max(100_000_00).default(0),
});

export const inviteSchema = z.object({
  name: z.string().max(120).default(""),
  email: z.string().email().max(254),
});

export type PersonPatch = z.infer<typeof personPatchSchema>;
