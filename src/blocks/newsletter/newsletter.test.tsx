import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderNewsletter } from "./Render";
import { newsletterSchema } from "./fields";
import type { RenderCtx } from "../types";

const ctx = { mode: "public", device: "desktop", viewer: null } as unknown as RenderCtx;

const render = (partial: Record<string, unknown>): string =>
  renderToStaticMarkup(<RenderNewsletter content={newsletterSchema.parse(partial)} ctx={ctx} />);

describe("newsletter block", () => {
  it("card variant (default) renders a bordered section with an h2 title", () => {
    const html = render({ title: "Join us", body: "Stay in the loop" });
    expect(html).toContain("<section");
    expect(html).toContain("<h2");
    expect(html).toContain("Join us");
    expect(html).toContain("Stay in the loop");
  });

  it("compact variant renders a footer-column-style label, no section/h2", () => {
    const html = render({ variant: "compact", title: "Newsletter", body: "Get updates" });
    expect(html).not.toContain("<section");
    expect(html).not.toContain("<h2");
    expect(html).toContain("Newsletter");
    expect(html).toContain("Get updates");
  });

  it("compact variant omits the label/body elements entirely when empty, not just visually", () => {
    const html = render({ variant: "compact", title: "", body: "" });
    expect(html).not.toContain("compactLabel");
    expect(html).not.toContain("compactBody");
  });

  it("both variants render the subscribe form", () => {
    const card = render({ variant: "card" });
    const compact = render({ variant: "compact" });
    expect(card).toContain("<form");
    expect(compact).toContain("<form");
  });
});
