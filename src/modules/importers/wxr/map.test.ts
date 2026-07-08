import { beforeEach, describe, expect, it } from "vitest";
import { mapWxrItemToPage, mapWxrAuthor, normalizeSlug, mapStatus, resetBlockIdCounter } from "./map";
import type { WxrItem } from "./parse";

const item = (over: Partial<WxrItem> = {}): WxrItem => ({
  title: "Hello World",
  link: "https://old.example.com/2024/03/hello-world/",
  postType: "post",
  status: "publish",
  slug: "hello-world",
  contentHtml: "<p>Intro</p>",
  excerpt: "",
  creator: "jane",
  postId: "7",
  parentId: "0",
  menuOrder: "0",
  categories: [],
  comments: [],
  postmeta: [],
  attachmentUrl: "",
  ...over,
});

beforeEach(() => resetBlockIdCounter());

describe("normalizeSlug", () => {
  it("keeps a clean slug unchanged", () => {
    expect(normalizeSlug("hello-world", "Hello World", "7")).toEqual({ slug: "hello-world", changed: false });
  });
  it("lowercases and dashes an uppercase/underscore slug", () => {
    expect(normalizeSlug("My_Post", "t", "1").slug).toBe("my-post");
  });
  it("decodes percent-encoding and strips diacritics", () => {
    expect(normalizeSlug("caf%C3%A9", "t", "1").slug).toBe("cafe");
  });
  it("falls back to the title when the slug is empty", () => {
    expect(normalizeSlug("", "About Us", "1")).toEqual({ slug: "about-us", changed: true });
  });
  it("falls back to post-<id> when slug and title are empty", () => {
    expect(normalizeSlug("", "", "42")).toEqual({ slug: "post-42", changed: true });
  });
  it("produces a slug matching Lamina slugSchema", () => {
    const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    expect(re.test(normalizeSlug("Héllo, World!!!", "t", "1").slug)).toBe(true);
    expect(re.test(normalizeSlug("", "", "9").slug)).toBe(true);
  });
});

describe("mapStatus", () => {
  it("publishes only wp:status=publish", () => {
    expect(mapStatus("publish", "t").status).toBe("published");
    expect(mapStatus("draft", "t").status).toBe("draft");
  });
  it("downgrades private/pending/future to draft with an issue", () => {
    const r = mapStatus("private", "Secret");
    expect(r.status).toBe("draft");
    expect(r.issue?.kind).toBe("status-downgraded");
  });
  it("downgrades draft WITHOUT an issue (expected, not noteworthy)", () => {
    expect(mapStatus("draft", "t").issue).toBeUndefined();
  });
});

describe("mapWxrItemToPage", () => {
  it("maps a published post to kind=post, published, with route from slug", async () => {
    const { mapped, issues } = await mapWxrItemToPage(item());
    expect(mapped.kind).toBe("post");
    expect(mapped.route).toBe("/hello-world");
    expect(mapped.status).toBe("published");
    expect(mapped.blocks).toEqual([{ id: "wxr-import-1", type: "richtext", content: { html: "<p>Intro</p>" } }]);
    expect(issues).toEqual([]);
  });

  it("maps a WP page to kind=page", async () => {
    const { mapped } = await mapWxrItemToPage(item({ postType: "page", slug: "about", title: "About" }));
    expect(mapped.kind).toBe("page");
    expect(mapped.route).toBe("/about");
  });

  it("collapses categories + tags into the tag list", async () => {
    const { mapped } = await mapWxrItemToPage(
      item({
        categories: [
          { domain: "category", nicename: "news", name: "News" },
          { domain: "post_tag", nicename: "react", name: "React" },
        ],
      }),
    );
    expect(mapped.tags).toEqual(["News", "React"]);
  });

  it("splits a mixed body into [richtext, image, richtext]", async () => {
    const html =
      "<p>Some intro text.</p>" +
      '<figure class="wp-block-image"><img src="https://cdn/x.jpg" alt="A photo"/><figcaption>Cap</figcaption></figure>' +
      "<p>Some outro text.</p>";
    const { mapped } = await mapWxrItemToPage(item({ contentHtml: html }));
    expect(mapped.blocks.map((b) => b.type)).toEqual(["richtext", "image", "richtext"]);
    expect(mapped.blocks[1]!.content).toEqual({ src: "https://cdn/x.jpg", alt: "A photo", caption: "Cap" });
  });

  it("raises an empty-body issue for an item with no content", async () => {
    const { mapped, issues } = await mapWxrItemToPage(item({ contentHtml: "" }));
    expect(mapped.blocks).toEqual([]);
    expect(issues.some((i) => i.kind === "empty-body")).toBe(true);
  });

  it("raises slug-normalized when the slug had to change", async () => {
    const { mapped, issues } = await mapWxrItemToPage(item({ slug: "Hello_World", title: "Hello World" }));
    expect(mapped.slug).toBe("hello-world");
    expect(issues.some((i) => i.kind === "slug-normalized")).toBe(true);
  });
});

describe("mapWxrAuthor", () => {
  it("maps an author with an email to a subscriber person", () => {
    expect(mapWxrAuthor({ login: "jane", email: "Jane@Example.com", displayName: "Jane Doe" })).toEqual({
      email: "jane@example.com",
      name: "Jane Doe",
      kind: "subscriber",
    });
  });
  it("returns null for an author with no email", () => {
    expect(mapWxrAuthor({ login: "jane", email: "", displayName: "Jane" })).toBeNull();
  });
});
