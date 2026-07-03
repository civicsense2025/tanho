import { describe, expect, it } from "vitest";
import { makeSignedToken, verifySignedToken, WEEK_MS } from "./tokens";

describe("signed opt-in tokens", () => {
  it("round-trips a valid token and returns its payload", () => {
    const token = makeSignedToken("optin", "a@b.com|default", WEEK_MS);
    expect(verifySignedToken("optin", token)).toBe("a@b.com|default");
  });

  it("rejects a token verified under a different purpose", () => {
    const token = makeSignedToken("optin", "a@b.com|default", WEEK_MS);
    expect(verifySignedToken("verify", token)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = makeSignedToken("optin", "a@b.com|default", WEEK_MS);
    const [, expiry, sig] = token.split(".");
    const forged = `${Buffer.from("evil@b.com|default").toString("base64url")}.${expiry}.${sig}`;
    expect(verifySignedToken("optin", forged)).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const token = makeSignedToken("optin", "a@b.com|default", WEEK_MS);
    const [payload, , sig] = token.split(".");
    const later = Date.now() + 10 * WEEK_MS;
    expect(verifySignedToken("optin", `${payload}.${later}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = makeSignedToken("optin", "a@b.com|default", -1000);
    expect(verifySignedToken("optin", token)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifySignedToken("optin", "not-a-token")).toBeNull();
    expect(verifySignedToken("optin", "a.b")).toBeNull();
  });
});
