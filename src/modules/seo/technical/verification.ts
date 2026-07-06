import type { Metadata } from "next";
import type { SeoVerification } from "../validation";

/**
 * Map the stored verification tokens to Next's `metadata.verification` shape.
 * Google/Yandex have first-class slots; Bing and Pinterest use their documented
 * `other` meta names (`msvalidate.01`, `p:domain_verify`). Empty tokens are
 * omitted so no blank verification tags render.
 */
export function buildVerification(v: SeoVerification): Metadata["verification"] | undefined {
  const other: Record<string, string> = {};
  if (v.bing) other["msvalidate.01"] = v.bing;
  if (v.pinterest) other["p:domain_verify"] = v.pinterest;

  const out: NonNullable<Metadata["verification"]> = {};
  if (v.google) out.google = v.google;
  if (v.yandex) out.yandex = v.yandex;
  if (Object.keys(other).length) out.other = other;

  return Object.keys(out).length ? out : undefined;
}
