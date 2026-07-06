import { describe, expect, it } from "vitest";
import {
  detectSelfLoop,
  detectChain,
  detectShadowedRoute,
  detectDeadTarget,
  detectDuplicateSources,
  buildSafetyReport,
  MAX_CHAIN_LEN,
  type SafetyRule,
} from "./safety";

describe("detectSelfLoop", () => {
  it("flags a source that normalizes to its target", () => {
    expect(detectSelfLoop("/A/", "/a")).toBe(true);
    expect(detectSelfLoop("/a", "/a")).toBe(true);
  });
  it("does not flag a real redirect or a gone rule", () => {
    expect(detectSelfLoop("/a", "/b")).toBe(false);
    expect(detectSelfLoop("/a", null)).toBe(false);
  });
});

describe("detectChain", () => {
  it("finds a multi-hop chain (A→B→C)", () => {
    const rows: SafetyRule[] = [
      { from: "/a", to: "/b" },
      { from: "/b", to: "/c" },
    ];
    const chains = detectChain(rows);
    expect(chains).toHaveLength(1);
    expect(chains[0]).toEqual(["/a", "/b", "/c"]);
  });

  it("does not report a single hop that lands on a non-source", () => {
    expect(detectChain([{ from: "/a", to: "/b" }])).toEqual([]);
  });

  it("breaks cycles without hanging", () => {
    const rows: SafetyRule[] = [
      { from: "/a", to: "/b" },
      { from: "/b", to: "/a" },
    ];
    const chains = detectChain(rows);
    // a cycle is surfaced (closed) rather than looping forever
    expect(chains.length).toBeGreaterThan(0);
  });
});

describe("buildSafetyReport chain classification", () => {
  it("warns for a chain of 2..MAX hops", () => {
    const batch: SafetyRule[] = [
      { from: "/a", to: "/b" },
      { from: "/b", to: "/c" },
    ];
    const rep = buildSafetyReport(batch, [], ["/c"], []);
    expect(rep.warnings.some((w) => w.kind === "chain")).toBe(true);
    expect(rep.errors.some((e) => e.kind === "chain")).toBe(false);
  });

  it("errors for a chain longer than MAX_CHAIN_LEN hops", () => {
    // MAX_CHAIN_LEN is 3 → build a 4-hop chain a→b→c→d→e
    const batch: SafetyRule[] = [
      { from: "/a", to: "/b" },
      { from: "/b", to: "/c" },
      { from: "/c", to: "/d" },
      { from: "/d", to: "/e" },
    ];
    const rep = buildSafetyReport(batch, [], ["/e"], []);
    expect(rep.errors.some((e) => e.kind === "chain")).toBe(true);
    // sanity: the threshold constant is what we think it is
    expect(MAX_CHAIN_LEN).toBe(3);
  });
});

describe("detectShadowedRoute", () => {
  it("flags a source that equals a live route", () => {
    expect(detectShadowedRoute("/About", ["/about", "/pricing"])).toBe(true);
  });
  it("does not flag a source with no matching route", () => {
    expect(detectShadowedRoute("/old", ["/about"])).toBe(false);
  });
});

describe("detectDeadTarget", () => {
  it("flags a target that is neither known nor another redirect source", () => {
    expect(detectDeadTarget("/nowhere", ["/about"], ["/a"])).toBe(true);
  });
  it("accepts a target that is a known route", () => {
    expect(detectDeadTarget("/about", ["/about"], [])).toBe(false);
  });
  it("accepts a target that is another redirect's source (a hop)", () => {
    expect(detectDeadTarget("/b", [], ["/b"])).toBe(false);
  });
  it("never flags a Gone (null) target", () => {
    expect(detectDeadTarget(null, [], [])).toBe(false);
  });
});

describe("detectDuplicateSources", () => {
  it("returns normalized sources that repeat", () => {
    const rows: SafetyRule[] = [
      { from: "/a", to: "/x" },
      { from: "/A/", to: "/y" },
      { from: "/b", to: "/z" },
    ];
    expect(detectDuplicateSources(rows)).toEqual(["/a"]);
  });
  it("returns [] when all sources are unique", () => {
    expect(detectDuplicateSources([{ from: "/a", to: "/x" }, { from: "/b", to: "/y" }])).toEqual([]);
  });
});

describe("buildSafetyReport (integration)", () => {
  it("classifies self-loop and duplicate as errors; shadow and dead-target as warnings", () => {
    const batch: SafetyRule[] = [
      { from: "/loop", to: "/loop" }, // self-loop → error
      { from: "/dupe", to: "/x" }, // dupe → error
      { from: "/dupe", to: "/y" },
      { from: "/live", to: "/somewhere" }, // shadows a live route → warning
      { from: "/old", to: "/dead" }, // dead target → warning
    ];
    const knownTargets = ["/x", "/y", "/somewhere", "/live"];
    const reserved = ["/live"];
    const rep = buildSafetyReport(batch, [], knownTargets, reserved);

    expect(rep.errors.some((e) => e.kind === "self-loop")).toBe(true);
    expect(rep.errors.some((e) => e.kind === "duplicate-source")).toBe(true);
    expect(rep.warnings.some((w) => w.kind === "shadowed-route")).toBe(true);
    expect(rep.warnings.some((w) => w.kind === "dead-target")).toBe(true);
  });
});
