import { z } from "zod";
import { commonContent } from "../common";

export const codeSchema = z.object({
  ...commonContent,
  filename: z.string().max(200).default(""),
  language: z.string().max(50).default(""),
  code: z.string().max(20_000).default(""),
});

export type CodeContent = z.infer<typeof codeSchema>;

export const makeCode = (): CodeContent =>
  codeSchema.parse({
    filename: "example.ts",
    language: "ts",
    code: 'export function greet(name: string) {\n  return "Hello, " + name;\n}',
  });
