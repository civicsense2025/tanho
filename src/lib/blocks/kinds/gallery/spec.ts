import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

const schema = z.object({
  images: z.array(z.object({ url: z.string(), caption: z.string().optional() })).default([]),
});

export type GalleryContent = z.infer<typeof schema>;

export const gallerySpec = defineBlock({
  type: "gallery",
  kind: "content",
  label: "Gallery",
  category: "media",
  schema,
  defaultContent: { images: [] },
  variants: [
    { id: "grid-2", label: "2 columns", description: "The default." },
    { id: "grid-3", label: "3 columns" },
    { id: "grid-4", label: "4 columns" },
  ],
  // Only `columns` needs opting in (off by default); every other universal control is
  // available because a present styleCaps NARROWS rather than lists.
  styleCaps: { columns: true },
});
