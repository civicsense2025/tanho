import type { AnyEntitySchema } from "./types";
import { projectSchema } from "./schemas/project";
import { hubSchema } from "./schemas/hub";
import { platformSchema } from "./schemas/platform";
import { guideSchema } from "./schemas/guide";
import { resourceSchema } from "./schemas/resource";
import { matrixPairSchema } from "./schemas/matrix-pair";
import { blockPackSchema } from "./schemas/block-pack";
import { designPackSchema } from "./schemas/design-pack";

/**
 * THE entity registry. Every content type registers once; the admin grids,
 * create/edit forms, entry write validation, and the public router all read
 * from here. Custom DB types (Phase 5+) register per-request on top of these.
 */
const builtins: AnyEntitySchema[] = [
  projectSchema,
  guideSchema,
  resourceSchema,
  hubSchema,
  platformSchema,
  matrixPairSchema,
  blockPackSchema,
  designPackSchema,
];

const byEntity = new Map<string, AnyEntitySchema>();

export function register(schema: AnyEntitySchema): void {
  byEntity.set(schema.entity, schema);
}

for (const s of builtins) register(s);

/**
 * The schema for one BUILT-IN content type, or undefined if it isn't
 * registered. Sync, builtins-only — this file must stay importable from
 * client components (e.g. pages/admin/DashboardTabs.tsx) with zero
 * server-only dependencies pulled in transitively. For a lookup that also
 * resolves DB-defined `custom:<slug>` types, use `getEntitySchema` in
 * `./registry-async` (server-only, from a Server Component).
 */
export function get(entity: string): AnyEntitySchema | undefined {
  return byEntity.get(entity);
}

/** Every registered BUILT-IN entity schema (excludes custom types — see `./registry-async` for the full set). */
export function all(): AnyEntitySchema[] {
  return [...byEntity.values()];
}

/** Content types shown as editable grids (excludes taxonomy). Built-ins only — see `./registry-async` for the full set. */
export function contentEntities(): AnyEntitySchema[] {
  return all().filter((s) => !s.taxonomy);
}
