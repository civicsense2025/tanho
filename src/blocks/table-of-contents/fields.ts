import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

export const tableOfContentsSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Optional title shown above the list (empty = no title). */
  title: z.string().max(80).default("On this page"),
  /** Shallowest heading level to include. */
  minLevel: z.enum(HEADING_LEVELS).default("h2"),
  /** Deepest heading level to include. */
  maxLevel: z.enum(HEADING_LEVELS).default("h3"),
  /** List marker style. */
  marker: z.enum(["numbered", "bulleted", "plain"]).default("plain"),
  /** Collapse nested groups behind a native <details> (no JS). */
  collapsible: z.boolean().default(false),
  /** Stick the TOC to the top of the viewport as you scroll (offset by the header). */
  sticky: z.boolean().default(false),
  /** Highlight the section currently in view (progressive-enhancement JS). */
  highlightActive: z.boolean().default(true),
  /** Smooth-scroll to a heading on click (pure CSS scroll-behavior). */
  smoothScroll: z.boolean().default(true),
});

export type TableOfContentsContent = z.infer<typeof tableOfContentsSchema>;

export const makeTableOfContents = (): TableOfContentsContent =>
  tableOfContentsSchema.parse({});
