import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";
import { sql as stringIds } from "./0002_string_ids";
import { sql as pages } from "./0003_pages";
import { sql as seo } from "./0004_seo";

export const libsqlMigrations: SqlMigration[] = [
  { name: "0001_init", sql: init },
  { name: "0002_string_ids", sql: stringIds },
  { name: "0003_pages", sql: pages },
  { name: "0004_seo", sql: seo },
];
