import { parse } from "tldts";

/**
 * Pure DNS-record-hint logic, split out from verify.ts so client components
 * (e.g. DomainForm) can import it without pulling in node:dns/promises,
 * which Turbopack refuses to bundle for the browser.
 */
export type DnsRecordHint =
  | { type: "A"; name: "@"; note: string }
  | { type: "CNAME"; name: string; value: string };

/**
 * Apex domains (the registrable domain itself, e.g. "example.com" or
 * "example.co.uk") can't use a CNAME per RFC 1034 §3.6.2 — they need an A
 * record. Subdomains use a CNAME instead. A naive label-count check gets
 * this wrong for multi-label public suffixes (co.uk, com.au, github.io, …),
 * so this uses tldts's public-suffix-list-aware parser instead.
 */
export function isApexDomain(domain: string): boolean {
  const parsed = parse(domain);
  return !!parsed.domain && parsed.subdomain === "";
}

/** The full subdomain path (e.g. "www.blog" for "www.blog.example.com"),
 *  falling back to the first label if tldts can't parse the input (should
 *  only happen for malformed input the schema regex already rejects). */
function subdomainLabel(domain: string): string {
  const parsed = parse(domain);
  return parsed.subdomain || domain.split(".")[0]!;
}

/** What to tell the user to add at their registrar for this domain. We don't
 *  know the customer's server IP, so an apex hint is instructional rather
 *  than a copy-paste value (unlike a hosted provider with a fixed anycast IP). */
export function dnsRecordHint(domain: string, appUrl: string): DnsRecordHint {
  if (isApexDomain(domain)) {
    return {
      type: "A",
      name: "@",
      note: "Point an A record at your server's public IP address.",
    };
  }
  let appHost: string;
  try {
    appHost = new URL(appUrl).hostname;
  } catch {
    appHost = appUrl;
  }
  return { type: "CNAME", name: subdomainLabel(domain), value: appHost };
}
