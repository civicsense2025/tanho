import { describe, expect, it } from "vitest";
import { CORE_TABLES, EXCLUDED_TABLES, PEOPLE_TABLES } from "./manifest";
import { serializeTables, stripSensitiveFields } from "./serialize";

describe("table allowlist", () => {
  it("excludes financial, auth, and audit tables", () => {
    for (const table of ["orders", "sessions", "auditLog", "integrationConnections", "analyticsEvents"]) {
      expect(CORE_TABLES).not.toContain(table);
      expect(PEOPLE_TABLES).not.toContain(table);
      expect(EXCLUDED_TABLES).toContain(table);
    }
  });

  it("does not include people tables in CORE_TABLES", () => {
    for (const table of PEOPLE_TABLES) {
      expect(CORE_TABLES).not.toContain(table);
    }
  });

  it("keeps content tables in CORE_TABLES", () => {
    for (const table of ["pages", "blockSets", "entries", "products", "settings", "theme"]) {
      expect(CORE_TABLES).toContain(table);
    }
  });
});

describe("stripSensitiveFields", () => {
  it("drops any stripe* field from a product row, case-insensitively", () => {
    const row = {
      id: "p1",
      slug: "widget",
      stripeProductId: "prod_123",
      stripePriceId: "price_123",
      STRIPE_CUSTOMER_ID: "cus_x", // pathological casing, still matches /^stripe/i
      priceCents: 2500,
    };
    const stripped = stripSensitiveFields(row) as Record<string, unknown>;
    expect(stripped).not.toHaveProperty("stripeProductId");
    expect(stripped).not.toHaveProperty("stripePriceId");
    expect(stripped).not.toHaveProperty("STRIPE_CUSTOMER_ID");
    expect(stripped.id).toBe("p1");
    expect(stripped.slug).toBe("widget");
    expect(stripped.priceCents).toBe(2500);
  });

  it("recurses into nested objects and arrays", () => {
    const row = {
      id: "o1",
      nested: { stripePaymentIntentId: "pi_1", ok: true },
      list: [{ stripeChargeId: "ch_1", qty: 1 }],
    };
    const stripped = stripSensitiveFields(row) as {
      nested: Record<string, unknown>;
      list: Record<string, unknown>[];
    };
    expect(stripped.nested).not.toHaveProperty("stripePaymentIntentId");
    expect(stripped.nested.ok).toBe(true);
    expect(stripped.list[0]).not.toHaveProperty("stripeChargeId");
    expect(stripped.list[0]!.qty).toBe(1);
  });

  it("leaves non-stripe fields and non-object values untouched", () => {
    expect(stripSensitiveFields("hello")).toBe("hello");
    expect(stripSensitiveFields(42)).toBe(42);
    expect(stripSensitiveFields(null)).toBe(null);
  });
});

describe("serializeTables", () => {
  const sampleRows: Record<string, unknown[]> = {
    settings: [{ namespace: "general", data: {} }],
    theme: [{ id: "theme", accent: "#000" }],
    themePresets: [],
    pages: [{ id: "pg1", slug: "home" }],
    blockSets: [],
    entries: [],
    collections: [],
    products: [{ id: "prod1", slug: "widget", stripeProductId: "prod_abc" }],
    productVariants: [],
    productCollections: [],
    menus: [],
    forms: [],
    policies: [],
    redirects: [],
    profile: [{ id: "profile" }],
    customTypes: [],
    tags: [],
    taggings: [],
    media: [],
    shippingZones: [],
    people: [{ id: "pe1", email: "a@example.com" }],
    personActivity: [{ id: "pa1", personId: "pe1" }],
    memberships: [],
    emailSubscriptions: [],
  };

  it("omits people tables when includePeople is false", () => {
    const { tables, manifest } = serializeTables(sampleRows, { includePeople: false, now: 1000 });
    expect(tables).not.toHaveProperty("people");
    expect(tables).not.toHaveProperty("personActivity");
    expect(tables).not.toHaveProperty("memberships");
    expect(tables).not.toHaveProperty("emailSubscriptions");
    expect(manifest.includesPeople).toBe(false);
  });

  it("includes people tables when includePeople is true", () => {
    const { tables, manifest } = serializeTables(sampleRows, { includePeople: true, now: 1000 });
    expect(tables.people).toEqual(sampleRows.people);
    expect(manifest.includesPeople).toBe(true);
  });

  it("computes manifest counts matching each table's row count", () => {
    const { manifest } = serializeTables(sampleRows, { includePeople: true, now: 1000 });
    expect(manifest.counts.pages).toBe(1);
    expect(manifest.counts.products).toBe(1);
    expect(manifest.counts.blockSets).toBe(0);
    expect(manifest.counts.people).toBe(1);
  });

  it("stamps the manifest with the passed-in timestamp and format", () => {
    const { manifest } = serializeTables(sampleRows, { includePeople: false, now: 42 });
    expect(manifest.generatedAt).toBe(42);
    expect(manifest.format).toBe("lamina-site@1");
    expect(manifest.version).toBe(1);
  });

  it("strips stripe fields from rows as it assembles tables", () => {
    const { tables } = serializeTables(sampleRows, { includePeople: false, now: 1 });
    const product = (tables.products as Record<string, unknown>[])[0]!;
    expect(product).not.toHaveProperty("stripeProductId");
    expect(product.slug).toBe("widget");
  });
});
