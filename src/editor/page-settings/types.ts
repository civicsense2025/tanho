import type { PageLayoutSettings } from "@/blocks/layout";

/**
 * The editable page-detail state the editor threads through the inspector's
 * Page tab and the stacked layout. A serializable subset of the DB row — the
 * fields `savePageDetails` accepts (see pageDetailsSchema.partial()).
 */
export type PageDraft = {
  title: string;
  slug: string;
  route: string;
  kind: "page" | "post";
  parentId: string | null;
  status: "draft" | "published";
  template: "blank" | "landing" | "article" | "shop" | "docs";
  layout: PageLayoutSettings;
  tags: string[];
  priority: number;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
};

/** A minimal page reference for the "parent" picker (posts nest under a page). */
export type PageOption = { id: string; title: string; route: string };

export type PatchPage = (partial: Partial<PageDraft>) => void;
