import { resolveAccount } from "./account/resolve";
import { resolveAwardList } from "./award-list/resolve";
import { resolveBooking } from "./booking/resolve";
import { resolveEducationList } from "./education-list/resolve";
import { resolveEntryList } from "./entry-list/resolve";
import { resolveCollection } from "./collection/resolve";
import { resolveExperienceList } from "./experience-list/resolve";
import { resolveFormBlock } from "./form/resolve";
import { resolveGenericData } from "./generic-data-resolve";
import { resolvePostlist } from "./postlist/resolve";
import { resolveProfileHeader } from "./profile-header/resolve";
import { resolveRelatedContent } from "./related-content/resolve";
import { resolveProjectList } from "./project-list/resolve";
import { resolveSkillsList } from "./skills-list/resolve";
// phase3-chrome-blocks resolvers (site header/footer sub-blocks).
import { resolveLogo } from "./logo/resolve";
import { resolveNavMenu } from "./nav-menu/resolve";
import { resolveSocialLinks } from "./social-links/resolve";
import { resolveFooterColumn } from "./footer-column/resolve";
import { resolveSiteFooter } from "./site-footer/resolve";
import { resolveSiteHeader } from "./site-header/resolve";

/**
 * SERVER-ONLY resolver registry for bound blocks.
 *
 * Each `resolve.ts` fetches live CMS data (many via `"use cache"` queries), so
 * it must never enter a client bundle. The block `def.ts` files are imported by
 * the client editor through `registry.ts`, so they deliberately do NOT import
 * their `resolve` — that link lives here instead. Only the server walker
 * (`BlockRenderer`) imports this file, keeping the whole resolve/query graph
 * out of the browser.
 *
 * A block type present here is "bound"; absent means static (no server fetch).
 *
 * The walker dispatches by string type, so each resolver's narrow content type
 * is cast to the shared `Resolver` shape — safe because every resolver reads
 * defensively and the walker has already zod-validated the content.
 */
type Resolver = (content: Record<string, unknown>) => Promise<unknown>;

export const blockResolvers: Record<string, Resolver> = {
  account: resolveAccount,
  "award-list": resolveAwardList,
  booking: resolveBooking,
  "education-list": resolveEducationList,
  "entry-list": resolveEntryList,
  collection: resolveCollection,
  "experience-list": resolveExperienceList,
  form: resolveFormBlock,
  postlist: resolvePostlist,
  "profile-header": resolveProfileHeader,
  "related-content": resolveRelatedContent,
  "project-list": resolveProjectList,
  "skills-list": resolveSkillsList,
  // Not a fully "bound" block (def.bound is NOT set on `table`) — this
  // resolver is a no-op (`content._resolved = null`) unless the block's
  // content declares a `dataSource` binding, so static tables stay freely
  // editable/movable/duplicable while dynamic ones resolve live rows.
  table: resolveGenericData,
  // ─── phase3-chrome-blocks ─────────────────────────────────────────────────
  // Registered here (not via def.bound) so their content stays editable in the
  // inspector — same pattern as `table`. Each resolves live CMS data (site name,
  // menu items) that Render reads from `content._resolved`.
  logo: resolveLogo,
  "nav-menu": resolveNavMenu,
  "social-links": resolveSocialLinks,
  "footer-column": resolveFooterColumn,
  "site-footer": resolveSiteFooter,
  "site-header": resolveSiteHeader,
} as unknown as Record<string, Resolver>;
