import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockGetConnection = vi.fn();

vi.mock("@/adapters/data-source", () => ({
  getDataSourceAdapter: () => ({ query: mockQuery }),
}));
vi.mock("@/modules/data-sources/queries", () => ({
  getConnection: (...args: unknown[]) => mockGetConnection(...args),
}));
vi.mock("@/modules/data-sources/crypto", () => ({
  openConnectionConfig: () => ({ provider: "postgres" }),
}));
vi.mock("@/modules/data-sources/rate-limit", () => ({
  allowDataSourceQuery: async () => true,
}));

const { resolveGenericData } = await import("./generic-data-resolve");

const baseConnection = {
  id: "conn1",
  provider: "postgres" as const,
  configEncrypted: "sealed",
  allowlistJson: [{ table: "products", columns: ["id", "name", "price"] }],
  status: "connected" as const,
};

describe("resolveGenericData — allowlist defense in depth", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetConnection.mockReset();
  });

  it("returns null when the block has no dataSource binding", async () => {
    expect(await resolveGenericData({})).toBeNull();
  });

  it("returns null when the connection is not found", async () => {
    mockGetConnection.mockResolvedValueOnce(null);
    const result = await resolveGenericData({
      dataSource: { connectionId: "missing", table: "products", columns: ["id"], limit: 10 },
    });
    expect(result).toBeNull();
  });

  it("returns null when the requested table isn't allowlisted, even if block content claims it", async () => {
    mockGetConnection.mockResolvedValueOnce(baseConnection);
    const result = await resolveGenericData({
      dataSource: { connectionId: "conn1", table: "admin_users", columns: ["id"], limit: 10 },
    });
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("strips columns not in the allowlist rather than trusting block content", async () => {
    mockGetConnection.mockResolvedValueOnce(baseConnection);
    mockQuery.mockResolvedValueOnce({ rows: [], truncated: false });
    await resolveGenericData({
      dataSource: {
        connectionId: "conn1",
        table: "products",
        columns: ["id", "name", "secret_internal_note"],
        limit: 10,
      },
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ columns: ["id", "name"] }),
    );
  });

  it("returns null (never throws) when every requested column is disallowed", async () => {
    mockGetConnection.mockResolvedValueOnce(baseConnection);
    const result = await resolveGenericData({
      dataSource: { connectionId: "conn1", table: "products", columns: ["secret_internal_note"], limit: 10 },
    });
    expect(result).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("swallows adapter query errors and returns null instead of throwing to the walker", async () => {
    mockGetConnection.mockResolvedValueOnce(baseConnection);
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const result = await resolveGenericData({
      dataSource: { connectionId: "conn1", table: "products", columns: ["id"], limit: 10 },
    });
    expect(result).toBeNull();
  });
});
