import { z } from "zod";
import { commonContent } from "../common";

export const tableSchema = z.object({
  ...commonContent,
  columns: z.array(z.string().max(200)).max(50).default([]),
  rows: z.array(z.array(z.string().max(500)).max(50)).max(50).default([]),
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
