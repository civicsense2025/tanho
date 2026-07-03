import { resolveAccount } from "./account/resolve";
import { resolveAwardList } from "./award-list/resolve";
import { resolveBooking } from "./booking/resolve";
import { resolveEducationList } from "./education-list/resolve";
import { resolveExperienceList } from "./experience-list/resolve";
import { resolveFormBlock } from "./form/resolve";
import { resolveGenericData } from "./generic-data-resolve";
import { resolvePostlist } from "./postlist/resolve";
import { resolveProfileHeader } from "./profile-header/resolve";
import { resolveProjectList } from "./project-list/resolve";
import { resolveSkillsList } from "./skills-list/resolve";

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
  "experience-list": resolveExperienceList,
  form: resolveFormBlock,
  postlist: resolvePostlist,
  "profile-header": resolveProfileHeader,
  "project-list": resolveProjectList,
  "skills-list": resolveSkillsList,
  // Not a fully "bound" block (def.bound is NOT set on `table`) — this
  // resolver is a no-op (`content._resolved = null`) unless the block's
  // content declares a `dataSource` binding, so static tables stay freely
  // editable/movable/duplicable while dynamic ones resolve live rows.
  table: resolveGenericData,
} as unknown as Record<string, Resolver>;
