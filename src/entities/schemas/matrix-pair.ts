import { z } from "zod";
import type { EntitySchema } from "../types";
import { slugRef } from "./common";

/**
 * One cell in the flagship hub's source→target roadmap matrix. `guide` links
 * to the guide that covers the pair when one exists. Taxonomy.
 */
export const matrixPairDataSchema = z.object({
  source: slugRef.or(z.literal("")).default(""),
  target: slugRef.or(z.literal("")).default(""),
  matrixStatus: z.enum(["live", "planned"]).default("planned"),
  guide: slugRef.or(z.literal("")).optional(),
});

export type MatrixPairData = z.infer<typeof matrixPairDataSchema>;

export const matrixPairSchema: EntitySchema<typeof matrixPairDataSchema> = {
  entity: "matrix_pair",
  label: "Matrix pair",
  plural: "Matrix pairs",
  basePath: "/guides",
  dataSchema: matrixPairDataSchema,
  taxonomy: true,
  listColumns: [
    { key: "source", header: "Source", width: "1fr" },
    { key: "target", header: "Target", width: "1fr" },
    { key: "matrixStatus", header: "Status", width: "8rem" },
  ],
};
