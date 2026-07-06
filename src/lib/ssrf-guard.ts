import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Blocks a resolved IP that has no legitimate use as a fetch/connection
 * target from server code: loopback, link-local (incl. cloud metadata
 * endpoints at 169.254.169.254), and IPv6 equivalents. Deliberately does
 * NOT block RFC1918 private ranges — self-hosted databases on a LAN/VPC are
 * a legitimate target for the data-sources feature; callers that need a
 * stricter policy (no private ranges at all) should also call
 * isPrivateRangeIp().
 */
export function isLoopbackOrLinkLocalIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    if (ip.startsWith("127.")) return true; // loopback
    if (ip.startsWith("169.254.")) return true; // link-local, incl. cloud metadata
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("::ffff:127.")) return true; // IPv4-mapped loopback
    if (lower.startsWith("::ffff:169.254.")) return true; // IPv4-mapped link-local
    return false;
  }
  return false;
}

/** RFC1918 + unique-local IPv6 — legitimate for self-hosted DB connections,
 * but not for outbound fetches to third-party "peer" URLs. */
export function isPrivateRangeIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    if (ip.startsWith("10.")) return true;
    if (ip.startsWith("192.168.")) return true;
    const parts = ip.split(".").map(Number);
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
    return false;
  }
  return false;
}

/**
 * Resolves `hostname` and checks every returned address against `blocklist`.
 * Rejects on the FIRST match — a hostname that resolves to both a public and
 * a private/loopback address is still rejected, since an attacker (or a
 * later DNS change / rebinding) could make the private answer the one that's
 * actually used.
 */
export async function hostnameResolvesToBlockedIp(
  hostname: string,
  blocklist: (ip: string) => boolean,
): Promise<boolean> {
  // A literal IP in the URL needs no DNS lookup.
  if (isIP(hostname)) return blocklist(hostname);
  let addresses: { address: string }[];
  try {
    addresses = await dnsLookup(hostname, { all: true });
  } catch {
    // Unresolvable hostname — let the caller's own fetch/connect fail
    // naturally rather than treating a DNS error as a security decision.
    return false;
  }
  return addresses.some((a) => blocklist(a.address));
}
