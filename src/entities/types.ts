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
