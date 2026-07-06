import { createBlock } from "@/blocks/registry";
import type { BlockNode } from "@/blocks/types";

/**
 * A brand-agnostic "kitchen sink" page — one of each block that best shows
 * off a theme's four base colors, type scale, and spacing/shape scalars, so
 * a theme preview has something real to render for installs that don't want
 * to pick one of their own pages. Built from each block's own `make()`
 * default (guaranteed schema-valid) with copy swapped in for a coherent demo.
 */
export function showcaseBlocks(): BlockNode[] {
  const heading = createBlock("heading");
  heading.content = { ...heading.content, text: "A theme you can feel", level: "h1", align: "left" };

  const richtext = createBlock("richtext");
  richtext.content = {
    ...richtext.content,
    md: "Every element on this page reads its color, type, and spacing from the same four base colors — no per-block edits.",
  };

  const buttons = createBlock("buttons");
  buttons.content = {
    ...buttons.content,
    align: "left",
    items: [
      { label: "Primary action", href: "#", variant: "solid", target: "_self" },
      { label: "Secondary", href: "#", variant: "outline", target: "_self" },
    ],
  };

  const metric = createBlock("metric");
  metric.content = {
    ...metric.content,
    cols: 3,
    items: [
      { value: "128", label: "Pages published" },
      { value: "99.9%", label: "Uptime" },
      { value: "4.9", label: "Avg. rating" },
    ],
  };

  const callout = createBlock("callout");
  callout.content = {
    ...callout.content,
    tone: "info",
    title: "Accent-2 shows up here",
    body: "Callouts, chips, and secondary UI lean on the second base color.",
  };

  const pricing = createBlock("pricing");
  pricing.content = {
    ...pricing.content,
    tiers: [
      {
        name: "Starter",
        price: "$0",
        cadence: "/mo",
        features: ["Core features", "Community support"],
        cta: "Get started",
        href: "#",
        featured: false,
      },
      {
        name: "Pro",
        price: "$19",
        cadence: "/mo",
        features: ["Everything in Starter", "Priority support", "Advanced tools"],
        cta: "Choose Pro",
        href: "#",
        featured: true,
      },
    ],
  };

  const section = createBlock("section");
  section.content = {
    ...section.content,
    width: "contained",
    background: "surface",
    py: "lg",
    blocks: [metric, callout],
  };

  return [heading, richtext, buttons, section, pricing];
}
