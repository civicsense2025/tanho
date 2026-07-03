import { describe, expect, it } from "vitest";
import { openJson, openSecret, sealJson, sealSecret } from "./secretbox";

describe("secretbox", () => {
  it("round-trips a string", () => {
    const secret = "ya29.a0Af_refresh_token_example";
    const sealed = sealSecret(secret);
    expect(sealed).not.toContain(secret);
    expect(openSecret(sealed)).toBe(secret);
  });

  it("round-trips JSON", () => {
    const value = { refresh_token: "r", scope: ["a", "b"], n: 42 };
    const sealed = sealJson(value);
    expect(openJson<typeof value>(sealed)).toEqual(value);
  });

  it("produces a distinct ciphertext each time (random IV)", () => {
    const a = sealSecret("same");
    const b = sealSecret("same");
    expect(a).not.toBe(b);
    expect(openSecret(a)).toBe("same");
    expect(openSecret(b)).toBe("same");
  });

  it("returns null on a tampered ciphertext (auth tag fails)", () => {
    const sealed = sealSecret("do-not-tamper");
    const [iv, tag, ct] = sealed.split(".");
    // Flip a byte in the ciphertext.
    const bad = Buffer.from(ct!, "base64url");
    bad[0] = bad[0]! ^ 0xff;
    const tampered = [iv, tag, bad.toString("base64url")].join(".");
    expect(openSecret(tampered)).toBeNull();
  });

  it("returns null on malformed input", () => {
    expect(openSecret("")).toBeNull();
    expect(openSecret("not.a.valid.token")).toBeNull();
    expect(openSecret("only-one-part")).toBeNull();
    expect(openJson("garbage")).toBeNull();
  });
});
