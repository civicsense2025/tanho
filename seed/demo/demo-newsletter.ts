import { b, rich } from "./demo-blocks";
import { upsertPage } from "./demo-page-helpers";
import type { SeedDb } from "../lib";

/**
 * Demo newsletter page + 3 issues (posts). The newsletter page carries the
 * subscribe band + a live post archive; issues are kind=post nested under it
 * at /p/:slug. The third issue puts a real paywall block mid-post — everything
 * after the cut line is withheld from non-members by the RSC walker.
 */
export async function seedDemoNewsletter(db: SeedDb): Promise<void> {
  const newsletterId = await upsertPage(db, {
    slug: "newsletter",
    route: "/newsletter",
    title: "The newsletter",
    template: "landing",
    seoTitle: "The newsletter — Tan Ho Studio",
    seoDescription: "Field notes on owning your site. Roughly monthly, no spam.",
    blocks: [
      b("heading", { text: "Field notes", level: "h1", align: "left" }),
      rich(
        "<p>A roughly-monthly letter about moving off rented platforms, running a one-person " +
          "studio, and the small software that makes it possible.</p>",
      ),
      b("newsletter", {
        title: "Get new issues in your inbox",
        body: "No spam, unsubscribe anytime. Members get the full archive.",
        placeholder: "you@example.com",
        cta: "Subscribe",
        list: "default",
        trackEvent: "newsletter_subscribe",
      }),
      b("section", {
        width: "contained",
        background: "none",
        py: "lg",
        blocks: [b("postlist", { limit: 10, source: "posts" })],
      }),
    ],
  });

  const issue = (
    slug: string,
    title: string,
    order: number,
    blocks: Parameters<typeof upsertPage>[1]["blocks"],
    hasPaywall = false,
  ) =>
    upsertPage(db, {
      slug,
      route: `/p/${slug}`,
      title,
      kind: "post",
      parentId: newsletterId,
      template: "article",
      sortOrder: order,
      hasPaywall,
      seoTitle: `${title} — Field notes`,
      blocks,
    });

  await issue("own-your-domain-first", "Own your domain first", 1, [
    b("heading", { text: "Own your domain first", level: "h1", align: "left" }),
    rich(
      "<p>If you do one thing this year to Lamina, buy your domain and point it at " +
        "something you control. Everything else — your host, your CMS, your newsletter — " +
        "can change later without breaking a single link.</p>" +
        "<p>A domain is the one address no platform can take from you. Rent the software; " +
        "own the address.</p>",
    ),
    b("callout", {
      tone: "tip",
      title: "The five-minute version",
      body: "Register the domain in your own name, add it to a registrar you trust, and set up email forwarding. That's the whole foundation.",
    }),
  ]);

  await issue("moving-off-a-hosted-builder", "Moving off a hosted builder", 2, [
    b("heading", { text: "Moving off a hosted builder", level: "h1", align: "left" }),
    rich(
      "<p>Leaving a hosted site builder feels scary mostly because of one fear: losing your " +
        "search rankings. Here's the good news — if you keep your URLs and redirect the old " +
        "ones, Google barely notices.</p>",
    ),
    b("list", {
      style: "number",
      items: [
        "Export your content and inventory the exact URLs you have today.",
        "Rebuild those same routes on the new platform.",
        "Add 301 redirects for anything that had to change.",
        "Submit the new sitemap and watch the crawl.",
      ],
    }),
    b("callout", {
      tone: "warning",
      title: "Don't skip the redirects",
      body: "Broken old links are the one thing that actually tanks rankings. Map every one.",
    }),
  ]);

  await issue(
    "the-economics-of-one-person-software",
    "The economics of one-person software",
    3,
    [
      b("heading", {
        text: "The economics of one-person software",
        level: "h1",
        align: "left",
      }),
      rich(
        "<p>Everyone asks how a studio of one can build and maintain real software. The public " +
          "answer is: durable tools and ruthless scope. The honest answer — the numbers, the " +
          "monthly costs, what I actually charge — is for members.</p>",
      ),
      b("paywall", {
        tier: "",
        title: "The rest is for members",
        body: "The full cost breakdown and pricing model are members-only. Join to keep reading.",
        cta: "Unlock the archive",
        ctaHref: "/membership",
        note: "Members also get every past issue and the templates.",
      }),
      b("heading", { text: "The actual numbers", level: "h2", align: "left" }),
      rich(
        "<p>My fixed monthly software cost to run everything — hosting, database, email, " +
          "payments — is under $40. Here's the line-by-line…</p>",
      ),
      b("metric", {
        cols: 3,
        items: [
          { value: "$38/mo", label: "Total infra cost" },
          { value: "3", label: "Active revenue lines" },
          { value: "~12h", label: "Weekly on the studio" },
        ],
      }),
    ],
    true,
  );
}
