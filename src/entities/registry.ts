import type { AnyEntitySchema } from "./types";
import { projectSchema } from "./schemas/project";
import { hubSchema } from "./schemas/hub";
import { platformSchema } from "./schemas/platform";
import { guideSchema } from "./schemas/guide";
import { resourceSchema } from "./schemas/resource";
import { matrixPairSchema } from "./schemas/matrix-pair";

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
];

const byEntity = new Map<string, AnyEntitySchema>();

export function register(schema: AnyEntitySchema): void {
  byEntity.set(schema.entity, schema);
}

for (const s of builtins) register(s);

/** The schema for one content type, or undefined if it isn't registered. */
export function get(entity: string): AnyEntitySchema | undefined {
  return byEntity.get(entity);
}

/** Every registered entity schema (built-ins + custom). */
export function all(): AnyEntitySchema[] {
  return [...byEntity.values()];
}

/** Content types shown as editable grids (excludes taxonomy). */
export function contentEntities(): AnyEntitySchema[] {
  return all().filter((s) => !s.taxonomy);
}
