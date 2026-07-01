import { describe, it, expect, vi, beforeEach } from "vitest";

// publishDueScheduledContent's core contract: flips due-scheduled entries to published, sets
// publishedAt to the entry's OWN scheduledAt (not the actual flip time, so publish order matches
// author intent regardless of cron polling jitter), clears scheduledAt (maintaining the Phase B
// invariant "scheduledAt set iff status === 'scheduled'"), leaves not-yet-due entries alone, and
// busts the ISR cache per affected content type.

const listContentEntries = vi.fn();
const updateContentEntry = vi.fn();
const getContentTypeById = vi.fn();
const revalidateContent = vi.fn();

vi.mock("@/lib/db", () => ({
  listContentEntries: (f: unknown) => listContentEntries(f),
  updateContentEntry: (id: string, data: unknown) => updateContentEntry(id, data),
  getContentTypeById: (id: string) => getContentTypeById(id),
}));
vi.mock("@/lib/cache", () => ({ revalidateContent: (slug: string) => revalidateContent(slug) }));

const GUIDE_TYPE = { id: "type-guide", slug: "guide" };
const POST_TYPE = { id: "type-post", slug: "post" };

function entry(overrides: Partial<{ id: string; contentTypeId: string; scheduledAt: string | null; status: string }> = {}) {
  return {
    id: overrides.id ?? "entry-1",
    contentTypeId: overrides.contentTypeId ?? GUIDE_TYPE.id,
    slug: "x", title: "X", status: overrides.status ?? "scheduled",
    scheduledAt: overrides.scheduledAt ?? "2026-01-01T09:00:00.000Z",
    publishedAt: null, sortOrder: 0,
    seoTitle: null, seoDescription: null, ogImage: null, canonicalUrl: null, noIndex: 0,
    data: "{}", createdAt: "", updatedAt: "",
  };
}

beforeEach(() => {
  listContentEntries.mockReset();
  updateContentEntry.mockReset().mockResolvedValue({});
  getContentTypeById.mockReset();
  revalidateContent.mockReset();
});

describe("publishDueScheduledContent", () => {
  it("flips a due entry to published, setting publishedAt to scheduledAt (not the flip time), and clears scheduledAt", async () => {
    listContentEntries.mockResolvedValue([entry({ scheduledAt: "2026-01-01T09:00:00.000Z" })]);
    getContentTypeById.mockResolvedValue(GUIDE_TYPE);
    const { publishDueScheduledContent } = await import("@/lib/scheduling");

    const now = new Date("2026-01-01T09:04:00.000Z"); // 4 minutes of cron polling jitter
    const result = await publishDueScheduledContent(now);

    expect(result).toEqual([{ id: "entry-1" }]);
    expect(updateContentEntry).toHaveBeenCalledWith("entry-1", {
      status: "published",
      scheduledAt: null,
      publishedAt: "2026-01-01T09:00:00.000Z", // the entry's own scheduledAt, not `now`
    });
  });

  it("leaves an entry alone whose scheduledAt is still in the future", async () => {
    listContentEntries.mockResolvedValue([entry({ scheduledAt: "2026-01-01T10:00:00.000Z" })]);
    const { publishDueScheduledContent } = await import("@/lib/scheduling");

    const result = await publishDueScheduledContent(new Date("2026-01-01T09:00:00.000Z"));

    expect(result).toEqual([]);
    expect(updateContentEntry).not.toHaveBeenCalled();
  });

  it("processes multiple due entries and revalidates each affected content type exactly once", async () => {
    listContentEntries.mockResolvedValue([
      entry({ id: "e1", contentTypeId: GUIDE_TYPE.id }),
      entry({ id: "e2", contentTypeId: GUIDE_TYPE.id }),
      entry({ id: "e3", contentTypeId: POST_TYPE.id }),
    ]);
    getContentTypeById.mockImplementation(async (id: string) => (id === GUIDE_TYPE.id ? GUIDE_TYPE : POST_TYPE));
    const { publishDueScheduledContent } = await import("@/lib/scheduling");

    const result = await publishDueScheduledContent(new Date("2026-01-01T09:05:00.000Z"));

    expect(result.map((r) => r.id)).toEqual(["e1", "e2", "e3"]);
    expect(revalidateContent).toHaveBeenCalledTimes(2); // guide + post, not once per entry
    expect(revalidateContent).toHaveBeenCalledWith("guide");
    expect(revalidateContent).toHaveBeenCalledWith("post");
  });

  it("does nothing when there are no scheduled entries", async () => {
    listContentEntries.mockResolvedValue([]);
    const { publishDueScheduledContent } = await import("@/lib/scheduling");
    expect(await publishDueScheduledContent()).toEqual([]);
    expect(revalidateContent).not.toHaveBeenCalled();
  });
});
