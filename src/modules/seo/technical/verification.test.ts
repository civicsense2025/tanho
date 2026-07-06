import { describe, expect, it } from "vitest";
import { buildVerification } from "./verification";

const EMPTY = { google: "", bing: "", pinterest: "", yandex: "" };

describe("buildVerification", () => {
  it("returns undefined when every token is empty (no blank meta tags)", () => {
    expect(buildVerification(EMPTY)).toBeUndefined();
  });

  it("maps google + yandex to first-class slots", () => {
    const v = buildVerification({ ...EMPTY, google: "g-code", yandex: "y-code" });
    expect(v).toEqual({ google: "g-code", yandex: "y-code" });
  });

  it("maps bing + pinterest to their documented `other` meta names", () => {
    const v = buildVerification({ ...EMPTY, bing: "b-code", pinterest: "p-code" });
    expect(v).toEqual({ other: { "msvalidate.01": "b-code", "p:domain_verify": "p-code" } });
  });

  it("combines first-class and other tokens", () => {
    const v = buildVerification({ google: "g", bing: "b", pinterest: "", yandex: "" });
    expect(v).toEqual({ google: "g", other: { "msvalidate.01": "b" } });
  });
});
