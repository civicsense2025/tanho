import { createId } from "@paralleldrive/cuid2";
import { blockSets, pages } from "../../src/modules/pages/schema";
import { log, type SeedDb } from "../lib";

const b = (type: string, content: Record<string, unknown>) => ({
  id: `b_${createId()}`,
  type,
  content,
});

/** Neutral home page — generic starter copy, replace freely. */
export async function seedPages(db: SeedDb) {
  const existing = await db.query.pages.findFirst();
  if (existing) {
    log("pages: content already exists — skipping page seed");
    return;
  }

  const blocks = [
    b("heading", { text: "A site you own, end to end", level: "h1", align: "left" }),
    b("richtext", {
      md: "Everything on this page is a **block** — edit it, reorder it, or delete it in the admin. Nothing here is hardcoded.",
      html: "",
    }),
    b("section", {
      width: "contained",
      background: "surface",
      py: "lg",
      blocks: [
        b("heading", { text: "Start with the basics", level: "h2", align: "left" }),
        b("list", {
          style: "check",
          items: [
            "Rename this site in Settings",
            "Pick your palette in Brand",
            "Replace this page in Pages",
          ],
        }),
      ],
    }),
  ];

  const [row] = await db
    .insert(pages)
    .values({
      slug: "home",
      route: "/",
      title: "Home",
      status: "published",
      template: "landing",
      publishedAt: Date.now(),
    })
    .returning({ id: pages.id });

  for (const variant of ["draft", "published"] as const) {
    await db.insert(blockSets).values({
      ownerType: "page",
      ownerId: row.id,
      variant,
      blocks,
    });
  }
  log("home page seeded");
}
