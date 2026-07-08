import { describe, expect, it } from "vitest";

import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp, isPrivateRangeIp } from "./ssrf-guard";

/**
 * SECURITY GATE. The SSRF predicates must block by numeric IP range, not by
 * string prefix — otherwise non-canonical IP literals bypass the guard
 * (e.g. `0.0.0.0`, `[::]`, expanded `::1`, IPv4-mapped `::ffff:127.0.0.1`).
 */
describe("isLoopbackOrLinkLocalIp / isPrivateRangeIp — range-based blocking", () => {
  type Row = {
    ip: string;
    loopback?: boolean;
    private?: boolean;
  };
  const cases: Row[] = [
    // IPv4 loopback / link-local / "this host".
    { ip: "0.0.0.0", loopback: true },
    { ip: "0.0.0.1", loopback: true },
    { ip: "127.0.0.1", loopback: true },
    { ip: "127.255.255.255", loopback: true },
    { ip: "169.254.169.254", loopback: true },
    // IPv4 private ranges — blocked only by isPrivateRangeIp.
    { ip: "10.0.0.1", private: true },
    { ip: "192.168.1.1", private: true },
    { ip: "172.16.0.1", private: true },
    { ip: "172.31.255.255", private: true },
    // Public IPv4 — not blocked by either.
    { ip: "8.8.8.8" },
    // IPv6 unspecified / loopback, canonical and non-canonical forms.
    { ip: "::", loopback: true },
    { ip: "::1", loopback: true },
    { ip: "0:0:0:0:0:0:0:1", loopback: true },
    { ip: "[::1]", loopback: true },
    { ip: "[0:0:0:0:0:0:0:1]", loopback: true },
    // IPv6 link-local.
    { ip: "fe80::1", loopback: true },
    // IPv4-mapped loopback / link-local — blocked by both predicates
    // (isPrivateRangeIp applies the IPv4 loopback/link-local checks too).
    { ip: "::ffff:127.0.0.1", loopback: true, private: true },
    { ip: "::ffff:169.254.169.254", loopback: true, private: true },
    { ip: "[::ffff:169.254.169.254]", loopback: true, private: true },
    // IPv4-mapped private — blocked only by isPrivateRangeIp.
    { ip: "::ffff:10.0.0.1", private: true },
    { ip: "::ffff:192.168.1.1", private: true },
    // IPv6 unique-local — blocked only by isPrivateRangeIp.
    { ip: "fc00::1", private: true },
    { ip: "fd00::1", private: true },
    // Public IPv6 — not blocked by either.
    { ip: "2001:db8::1" },
  ];

  for (const { ip, loopback, private: priv } of cases) {
    it(`blocks ${ip} correctly`, () => {
      expect(isLoopbackOrLinkLocalIp(ip)).toBe(loopback ?? false);
      expect(isPrivateRangeIp(ip)).toBe(priv ?? false);
    });
  }

  it("does not block a public IPv4 in either predicate", () => {
    expect(isLoopbackOrLinkLocalIp("8.8.8.8")).toBe(false);
    expect(isPrivateRangeIp("8.8.8.8")).toBe(false);
  });

  it("does not block a public IPv6 in either predicate", () => {
    expect(isLoopbackOrLinkLocalIp("2001:db8::1")).toBe(false);
    expect(isPrivateRangeIp("2001:db8::1")).toBe(false);
  });
});

/**
 * hostnameResolvesToBlockedIp is the caller-facing gate. A literal IP skips DNS
 * and is checked directly — including bracketed IPv6 URL-literal hosts (as
 * produced by `new URL().hostname`), which node:net isIP() would otherwise
 * reject and fall through to a failing DNS lookup (a bypass).
 */
describe("hostnameResolvesToBlockedIp — literal-IP fast path", () => {
  const blockAll = (ip: string) => isLoopbackOrLinkLocalIp(ip) || isPrivateRangeIp(ip);

  it("blocks a bracketed IPv4-mapped metadata endpoint (no DNS, no bypass)", async () => {
    await expect(hostnameResolvesToBlockedIp("[::ffff:a9fe:a9fe]", blockAll)).resolves.toBe(true);
  });

  it("blocks a bracketed ::1 loopback", async () => {
    await expect(hostnameResolvesToBlockedIp("[::1]", blockAll)).resolves.toBe(true);
  });

  it("blocks a bare IPv4 metadata endpoint", async () => {
    await expect(hostnameResolvesToBlockedIp("169.254.169.254", blockAll)).resolves.toBe(true);
  });

  it("does not block a public IPv4 literal", async () => {
    await expect(hostnameResolvesToBlockedIp("8.8.8.8", blockAll)).resolves.toBe(false);
  });
});
