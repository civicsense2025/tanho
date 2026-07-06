/**
 * Optional-capability registry — the graceful-degradation contract.
 *
 * OYS is self-hostable: a customer owns the code and may `npm remove` a heavy optional
 * dependency they don't want (e.g. lottie-web). A block that depends on such a package
 * declares `requiresCapability` on its def; if the package isn't installed we must NOT
 * crash the build or a page — the block is simply hidden from the picker and renders
 * nothing. This module is the single place "is capability X available?" is answered.
 *
 * Detection is a resolve check, evaluated ONCE at module load. We use `require.resolve`
 * (not an import) so it's synchronous — the picker (which reads the compiled registry)
 * needs a sync answer — and so a missing package is a caught boolean here rather than a
 * hard module-not-found at a call site. The island does its OWN async `import()` wrapped
 * in try/catch when it actually plays an animation, so the two layers agree: absent dep →
 * not offered in the editor AND a no-op at runtime.
 */

/** Named optional capabilities a block may require. Add one per optional dependency. */
export type Capability = "lottie";

/** The package whose presence backs each capability. */
const CAPABILITY_PACKAGE: Record<Capability, string> = {
  lottie: "lottie-web",
};

/** True if `pkg` resolves in this install (i.e. it wasn't removed). Never throws. */
function packageAvailable(pkg: string): boolean {
  try {
    // require.resolve throws MODULE_NOT_FOUND if the customer removed the dep. In a
    // pure-ESM/edge context require may be undefined — treat "can't check" as available
    // so we never hide a block we can't prove is missing (the island still no-ops safely).
    const req: NodeRequire | undefined =
      typeof require === "function"
        ? require
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).require;
    if (!req?.resolve) return true;
    req.resolve(pkg);
    return true;
  } catch {
    return false;
  }
}

/** Memoized availability per capability (resolve check is stable for a process). */
const AVAILABILITY: Record<Capability, boolean> = Object.fromEntries(
  (Object.keys(CAPABILITY_PACKAGE) as Capability[]).map((cap) => [
    cap,
    packageAvailable(CAPABILITY_PACKAGE[cap]),
  ]),
) as Record<Capability, boolean>;

/** Is the optional dependency backing this capability installed? */
export function hasCapability(cap: Capability): boolean {
  return AVAILABILITY[cap] ?? true;
}
