import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseSubstack } from "./parse";

/** Build a Substack-shaped .zip File from a map of path → text. */
function makeZip(files: Record<string, string>): File {
  const encoded: Record<string, Uint8Array> = {};
  for (const [path, text] of Object.entries(files)) encoded[path] = strToU8(text);
  const bytes = zipSync(encoded);
  // Copy into a standalone ArrayBuffer so it satisfies the File/Blob signature.
  const buf = bytes.slice().buffer;
  return new File([buf], "substack-export.zip", { type: "application/zip" });
}

const POSTS_CSV = `post_id,title,subtitle,post_date,is_published,type,audience
101,First Post,A subtitle,2024-01-02,true,newsletter,everyone
102,Second Post,,2024-02-03,false,newsletter,only_paid`;

const EMAIL_CSV = `email,name,active_subscription
free@example.com,Free Reader,false
paid@example.com,Paid Reader,true`;

const POST_101 = `<div class="post"><p>Hello world, this is the first post.</p><div class="captioned-image-container"><figure><img src="https://cdn.substack.com/first.jpg" alt="First" /><figcaption>A caption</figcaption></figure></div></div>`;
const POST_102 = `<div class="post"><p>This is a draft.</p></div>`;

describe("parseSubstack", () => {
  it("parses posts, resolves title/status from posts.csv, and reads subscribers with paid detection", async () => {
    const file = makeZip({
      "posts/101.first-post.html": POST_101,
      "posts/102.second-post.html": POST_102,
      "posts.csv": POSTS_CSV,
      "email_list.csv": EMAIL_CSV,
    });

    const result = await parseSubstack(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { posts, subscribers } = result.data!;

    // Two posts, titles + slugs + status resolved from the CSV.
    expect(posts).toHaveLength(2);
    const byId = Object.fromEntries(posts.map((p) => [p.id, p]));
    expect(byId["101"]!.title).toBe("First Post");
    expect(byId["101"]!.slug).toBe("first-post");
    expect(byId["101"]!.status).toBe("published");
    expect(byId["101"]!.html).toContain("Hello world");
    // is_published=false → draft.
    expect(byId["102"]!.status).toBe("draft");

    // Subscribers: one free, one paid.
    expect(subscribers).toHaveLength(2);
    const byEmail = Object.fromEntries(subscribers.map((s) => [s.email, s]));
    expect(byEmail["free@example.com"]!.paid).toBe(false);
    expect(byEmail["free@example.com"]!.name).toBe("Free Reader");
    expect(byEmail["paid@example.com"]!.paid).toBe(true);
  });

  it("detects a paid subscriber from a `type`=paid column when there's no active_subscription flag", async () => {
    const file = makeZip({
      "posts/1.hi.html": "<p>hi</p>",
      "email_list.csv": `email,type\na@x.com,free\nb@x.com,paid`,
    });
    const result = await parseSubstack(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byEmail = Object.fromEntries(result.data!.subscribers.map((s) => [s.email, s]));
    expect(byEmail["a@x.com"]!.paid).toBe(false);
    expect(byEmail["b@x.com"]!.paid).toBe(true);
  });

  it("is tolerant of a missing posts.csv — derives title from filename, defaults to published", async () => {
    const file = makeZip({ "posts/my-great-post.html": "<p>body</p>" });
    const result = await parseSubstack(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.posts).toHaveLength(1);
    const [post] = result.data!.posts;
    expect(post!.slug).toBe("my-great-post");
    expect(post!.title).toBe("my great post");
    expect(post!.status).toBe("published");
    expect(result.data!.subscribers).toHaveLength(0);
  });

  it("returns an error result (never throws) for a non-zip file", async () => {
    const garbage = new File([new Uint8Array([1, 2, 3, 4])], "nope.zip", { type: "application/zip" });
    const result = await parseSubstack(garbage);
    expect(result.ok).toBe(false);
  });

  it("skips a subscriber row with no email and records an issue, without throwing", async () => {
    const file = makeZip({
      "posts/1.hi.html": "<p>hi</p>",
      "subscriber_emails.csv": `email,name\n,No Email\nreal@x.com,Real`,
    });
    const result = await parseSubstack(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data!.subscribers.map((s) => s.email)).toEqual(["real@x.com"]);
    expect(result.data!.issues.some((i) => i.kind === "subscriber-no-email")).toBe(true);
  });
});
