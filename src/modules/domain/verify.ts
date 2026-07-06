import { resolve4, resolveCname } from "node:dns/promises";
import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp } from "@/lib/ssrf-guard";
import { dnsRecordHint } from "./dns-hint";

export type DomainCheckResult =
  | { status: "verified" }
  | { status: "pending"; detail: string }
  | { status: "error"; detail: string };

/**
 * On-demand DNS check — no ACME challenge, no reachability probe. This
 * platform doesn't run the customer's reverse proxy, so the only signal we
 * can offer is "does the record match what we told you to add." TLS and
 * actual HTTP reachability remain the customer's proxy's responsibility.
 */
export async function verifyDomainDns(domain: string): Promise<DomainCheckResult> {
  const hint = dnsRecordHint(domain, process.env.APP_URL ?? "http://localhost:3000");

  // The SSRF check and the record-type check are different query shapes
  // (a general A/AAAA lookup vs. a specific A or CNAME resolve), so they
  // can't be merged into a single DNS round-trip — but they're independent
  // of each other, so run them concurrently rather than back-to-back.
  const [blocked, recordResult] = await Promise.all([
    hostnameResolvesToBlockedIp(domain, isLoopbackOrLinkLocalIp),
    (async (): Promise<{ kind: "verified" | "no-record" | "no-match" | "not-found"; detail?: string }> => {
      try {
        if (hint.type === "A") {
          const addresses = await resolve4(domain);
          return addresses.length > 0 ? { kind: "verified" } : { kind: "no-record" };
        }
        const cnames = await resolveCname(domain);
        return cnames.some((c) => c.replace(/\.$/, "") === hint.value.replace(/\.$/, ""))
          ? { kind: "verified" }
          : { kind: "no-match", detail: `Found a CNAME, but it doesn't point at ${hint.value} yet.` };
      } catch {
        return { kind: "not-found" };
      }
    })(),
  ]);

  if (blocked) {
    return {
      status: "error",
      detail: "This domain resolves to a loopback or link-local address, which can't be a public site.",
    };
  }

  switch (recordResult.kind) {
    case "verified":
      return { status: "verified" };
    case "no-record":
      return { status: "pending", detail: "No A record found yet." };
    case "no-match":
      return { status: "pending", detail: recordResult.detail! };
    case "not-found":
      return { status: "pending", detail: "DNS record not found yet — propagation can take up to 24-48 hours." };
  }
}
