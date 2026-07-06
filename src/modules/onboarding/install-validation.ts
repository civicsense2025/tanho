import { z } from "zod";

/**
 * "install" settings namespace — the first-run install flag. Distinct from the
 * "onboarding" namespace (which tracks the wizard's per-step progress): this one
 * records the single, latching "the site has been set up" fact that the site-lock
 * proxy (src/proxy.ts) reads to decide whether public visitors are allowed in.
 *
 * The site is LOCKED (public routes redirect to /setup) until BOTH:
 *   - a first owner exists (users count > 0), AND
 *   - `completedAt` is set here (the install wizard's create-first-owner step).
 *
 * Registered into `settingsSchemas` (src/modules/settings/validation.ts) and
 * read/written through the same generic settings machinery as every other
 * namespace.
 */
export const installStateSchema = z.object({
  /** Epoch-ms when first-run install finished (first owner created). null = not set up yet. */
  completedAt: z.number().nullable().default(null),
});

export type InstallState = z.infer<typeof installStateSchema>;

export const INSTALL_DEFAULTS: InstallState = installStateSchema.parse({});
