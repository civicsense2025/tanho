import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Strips the surrounding brackets of an IPv6 URL literal (`[::1]` → `::1`). */
function stripBrackets(ip: string): string {
  const s = ip.trim();
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1);
  return s;
}

/** Parses an IPv4 string into 4 numeric octets, or null if malformed. */
function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  if (!octets.every((o) => Number.isInteger(o) && o >= 0 && o <= 255)) return null;
  return octets;
}

/** Parses an IPv6 string (bare or bracketed, incl. IPv4-mapped tails) into 8
 * 16-bit groups, or null if malformed. */
function parseIpv6(ip: string): number[] | null {
  const s = stripBrackets(ip).toLowerCase();
  const parts = s.split(":");
  // An IPv4-mapped tail (a.b.c.d) occupies the last two 16-bit groups.
  let v4Tail: number[] | null = null;
  const lastSeg = parts[parts.length - 1];
  if (lastSeg && lastSeg.includes(".")) {
    const octets = lastSeg.split(".").map(Number);
    if (octets.length !== 4 || !octets.every((o) => Number.isInteger(o) && o >= 0 && o <= 255)) return null;
    v4Tail = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    parts.pop();
  }
  const targetLen = v4Tail ? 6 : 8;
  const dblIdx = parts.indexOf("");
  let groups: number[];
  if (dblIdx !== -1) {
    const head = parts.slice(0, dblIdx).filter((p) => p !== "");
    let i = dblIdx;
    while (i < parts.length && parts[i] === "") i++;
    const tail = parts.slice(i).filter((p) => p !== "");
    const fill = targetLen - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head.map((p) => parseInt(p, 16)), ...new Array(fill).fill(0), ...tail.map((p) => parseInt(p, 16))];
  } else {
    groups = parts.map((p) => parseInt(p, 16));
  }
  if (groups.length !== targetLen) return null;
  if (!groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)) return null;
  return v4Tail ? [...groups, v4Tail[0], v4Tail[1]] : groups;
}

/** Extracts the embedded IPv4 octets from an IPv4-mapped IPv6 group array. */
function v4MappedOctets(groups: number[]): number[] | null {
  if (!groups.slice(0, 5).every((g) => g === 0) || groups[5] !== 0xffff) return null;
  return [(groups[6] >> 8) & 0xff, groups[6] & 0xff, (groups[7] >> 8) & 0xff, groups[7] & 0xff];
}

function isLoopbackOrLinkLocalV4(octets: number[]): boolean {
  if (octets[0] === 127) return true; // loopback 127.0.0.0/8
  if (octets[0] === 169 && octets[1] === 254) return true; // link-local, incl. cloud metadata
  if (octets[0] === 0) return true; // 0.0.0.0/8 — reaches localhost on Linux
  return false;
}

function isPrivateV4(octets: number[]): boolean {
  if (octets[0] === 10) return true; // 10.0.0.0/8
  if (octets[0] === 192 && octets[1] === 168) return true; // 192.168.0.0/16
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true; // 172.16.0.0/12
  return false;
}

/**
 * Blocks a resolved IP that has no legitimate use as a fetch/connection
 * target from server code: loopback, link-local (incl. cloud metadata
 * endpoints at 169.254.169.254), the 0.0.0.0/8 "this host" range (which
 * reaches localhost on Linux), and IPv6 equivalents (incl. all canonical
 * and non-canonical forms of `::1` and IPv4-mapped addresses). Deliberately
 * does NOT block RFC1918 private ranges — self-hosted databases on a
 * LAN/VPC are a legitimate target for the data-sources feature; callers
 * that need a stricter policy (no private ranges at all) should also call
 * isPrivateRangeIp().
 */
export function isLoopbackOrLinkLocalIp(ip: string): boolean {
  const bare = stripBrackets(ip);
  const version = isIP(bare);
  if (version === 4) {
    const octets = ipv4Octets(bare);
    return octets ? isLoopbackOrLinkLocalV4(octets) : false;
  }
  if (version === 6) {
    const groups = parseIpv6(bare);
    if (!groups) return false;
    if (groups.every((g) => g === 0)) return true; // :: unspecified
    if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true; // ::1 loopback
    if ((groups[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    const octets = v4MappedOctets(groups); // ::ffff:a.b.c.d — apply IPv4 predicates
    return octets ? isLoopbackOrLinkLocalV4(octets) : false;
  }
  return false;
}

/** RFC1918 + unique-local IPv6 — legitimate for self-hosted DB connections,
 * but not for outbound fetches to third-party "peer" URLs. IPv4-mapped
 * addresses are checked against the IPv4 ranges (incl. loopback/link-local). */
export function isPrivateRangeIp(ip: string): boolean {
  const bare = stripBrackets(ip);
  const version = isIP(bare);
  if (version === 4) {
    const octets = ipv4Octets(bare);
    return octets ? isPrivateV4(octets) : false;
  }
  if (version === 6) {
    const groups = parseIpv6(bare);
    if (!groups) return false;
    if ((groups[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    const octets = v4MappedOctets(groups); // ::ffff:a.b.c.d — apply IPv4 predicates
    return octets ? isLoopbackOrLinkLocalV4(octets) || isPrivateV4(octets) : false;
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
  // A literal IP in the URL needs no DNS lookup. Strip IPv6 URL-literal
  // brackets first — `new URL().hostname` keeps them for IPv6 (e.g.
  // `[::ffff:a9fe:a9fe]`), but node:net isIP() rejects bracketed input and
  // returns 0, which would otherwise fall through to a DNS lookup that fails
  // and returns false — a bypass for literal-IP hosts.
  const bare = stripBrackets(hostname);
  if (isIP(bare)) return blocklist(bare);
  let addresses: { address: string }[];
  try {
    addresses = await dnsLookup(bare, { all: true });
  } catch {
    // Unresolvable hostname — let the caller's own fetch/connect fail
    // naturally rather than treating a DNS error as a security decision.
    return false;
  }
  return addresses.some((a) => blocklist(a.address));
}
