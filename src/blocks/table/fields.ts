import { z } from "zod";
import { dataSourceBindingSchema } from "@/modules/data-sources/validation";
import { commonContent, styleContent } from "../common";

export const tableSchema = z.object({
  ...commonContent,
  ...styleContent,
  columns: z.array(z.string().max(200)).max(50).default([]),
  rows: z.array(z.array(z.string().max(500)).max(50)).max(50).default([]),
  /**
   * When present, the table reads live rows from an external data-source
   * connection instead of the literal `columns`/`rows` above — see
   * blocks/generic-data-resolve.ts. Static content stays valid and unused
   * while a binding is active; removing the binding falls back to it.
   */
  dataSource: dataSourceBindingSchema.optional(),
});

export type TableContent = z.infer<typeof tableSchema>;

export const makeTable = (): TableContent =>
  tableSchema.parse({
    columns: ["Name", "Detail", "Status"],
    rows: [
      ["Item one", "First detail", "Active"],
      ["Item two", "Second detail", "Draft"],
    ],
  });
