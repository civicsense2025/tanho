import { describe, expect, it } from "vitest";
import { blockDef } from "./registry";
import { testimonialSchema, makeTestimonial } from "./testimonial/fields";
import { statementSchema, makeStatement } from "./statement/fields";
import { pollSchema, makePoll } from "./poll/fields";
import { embedSchema } from "./embed/fields";

describe("new content blocks register + validate", () => {
  it.each(["testimonial", "statement", "poll"])("%s is registered", (type) => {
    expect(blockDef(type)?.type).toBe(type);
  });

  it("make() defaults satisfy each schema", () => {
    expect(testimonialSchema.safeParse(makeTestimonial()).success).toBe(true);
    expect(statementSchema.safeParse(makeStatement()).success).toBe(true);
    expect(pollSchema.safeParse(makePoll()).success).toBe(true);
  });

  it("testimonial supports grid/carousel/single layouts", () => {
    for (const layout of ["grid", "carousel", "single"]) {
      expect(testimonialSchema.safeParse({ layout, cols: 3, items: [{ quote: "x", name: "y", role: "", avatar: "", rating: 5 }] }).success).toBe(true);
    }
    expect(testimonialSchema.safeParse({ layout: "bogus", items: [] }).success).toBe(false);
  });

  it("poll requires at least 2 options", () => {
    expect(pollSchema.safeParse({ question: "q", options: [{ label: "a", seed: 0 }] }).success).toBe(false);
    expect(pollSchema.safeParse({ question: "q", options: [{ label: "a", seed: 0 }, { label: "b", seed: 0 }] }).success).toBe(true);
  });

  it("embed accepts the new custom provider", () => {
    expect(embedSchema.safeParse({ provider: "custom", url: "https://secure.actblue.com/donate/x", ratio: "16 / 9" }).success).toBe(true);
  });
});
