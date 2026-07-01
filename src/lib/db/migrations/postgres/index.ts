import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";
import { sql as pages } from "./0002_pages";
import { sql as seo } from "./0003_seo";
import { sql as guides } from "./0004_guides";
import { sql as seoTemplates } from "./0005_seo_templates";

export const postgresMigrations: SqlMigration[] = [
  { name: "0001_init", sql: init },
  { name: "0002_pages", sql: pages },
  { name: "0003_seo", sql: seo },
  { name: "0004_guides", sql: guides },
  { name: "0005_seo_templates", sql: seoTemplates },
];
