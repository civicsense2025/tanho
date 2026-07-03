import { z } from "zod";

/**
 * An https URL or the empty string. Empty is allowed so optional link fields
 * round-trip through admin forms without a value; a non-empty value MUST be
 * a well-formed https URL — this is the guard that keeps `javascript:` and
 * other dangerous schemes out of rendered `<a href>`s.
 */
export const httpsOrEmpty = z
  .union([z.literal(""), z.url({ protocol: /^https$/ }).max(500)])
  .default("");

/** A short, URL-safe slug reference to another entry (e.g. a hub or resource). */
export const slugRef = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, and dashes");

/** A capped list of free-form tag strings. */
export const tagList = z.array(z.string().max(40)).max(30).default([]);

/** A capped list of slug references. */
export const slugRefList = z.array(slugRef).max(60).default([]);
