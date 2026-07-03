import type { z } from "zod";

/** How a value renders in an EntityList column cell. */
export type ListColumnAlign = "start" | "end";

/**
 * Column metadata for the admin EntityList. `key` addresses a field on the
 * entry's `data` record (or a synthetic key the screen renders itself).
 */
export type ListColumn = {
  key: string;
  header: string;
  width?: string;
  align?: ListColumnAlign;
};

/**
 * The contract for one content type. Registered once in the entity registry;
 * the admin grids, create/edit forms, and public router all read from it.
 *
 * - `dataSchema` validates the entry's `data` JSON on every write.
 * - `basePath` is the public route prefix (e.g. "/work", "/guides").
 * - `titleKey` names the field the list uses as the row title fallback.
 */
export type EntitySchema<S extends z.ZodType = z.ZodType> = {
  entity: string;
  label: string;
  plural: string;
  basePath: string;
  dataSchema: S;
  listColumns: ListColumn[];
  /** Field within `data` used as the display title when the row title is empty. */
  titleKey?: string;
  /** Hidden content types are managed elsewhere (taxonomy: hub/platform/matrix_pair). */
  taxonomy?: boolean;
};

export type AnyEntitySchema = EntitySchema<z.ZodType>;

/**
 * The subset of an EntitySchema that's safe to pass from a Server Component
 * into a client component as a prop — `dataSchema` is a Zod schema instance
 * (functions/class internals), which Next.js's server→client boundary
 * cannot serialize. Validation only ever happens server-side
 * (entries/actions.ts), so client-side admin UI (ContentScreen, EntryForm)
 * only ever needs this summary, never the live Zod object.
 */
export type EntitySchemaSummary = Omit<AnyEntitySchema, "dataSchema">;

/** Strips the non-serializable `dataSchema` field for passing to a client component. */
export function toEntitySchemaSummary(schema: AnyEntitySchema): EntitySchemaSummary {
  const { dataSchema: _dataSchema, ...summary } = schema;
  return summary;
}
