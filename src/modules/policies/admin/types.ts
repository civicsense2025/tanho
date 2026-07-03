import type { PolicyRow } from "../queries";

/** The editable shape held in the manager's local state. */
export type PolicyDraft = {
  id: string | null;
  slug: string;
  title: string;
  group: "site" | "store";
  body: string;
  status: "draft" | "published";
  footerLinked: boolean;
  effectiveDate: string;
};

/** Seed a fresh, empty draft. */
export const emptyDraft = (): PolicyDraft => ({
  id: null,
  slug: "",
  title: "",
  group: "site",
  body: "",
  status: "draft",
  footerLinked: false,
  effectiveDate: "",
});

/** Project a DB row into an editable draft. */
export const rowToDraft = (r: PolicyRow): PolicyDraft => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  group: r.group,
  body: r.body,
  status: r.status,
  footerLinked: r.footerLinked,
  effectiveDate: r.effectiveDate,
});
