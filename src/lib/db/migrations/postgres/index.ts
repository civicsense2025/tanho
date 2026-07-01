import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";
import { sql as pages } from "./0002_pages";
import { sql as seo } from "./0003_seo";

export const postgresMigrations: SqlMigration[] = [
  { name: "0001_init", sql: init },
  { name: "0002_pages", sql: pages },
  { name: "0003_seo", sql: seo },
];
