import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";
import { sql as pages } from "./0002_pages";
import { sql as seo } from "./0003_seo";
import { sql as guides } from "./0004_guides";
import { sql as seoTemplates } from "./0005_seo_templates";
import { sql as newsletter } from "./0006_newsletter";
import { sql as payments } from "./0007_payments";
import { sql as siteSettings } from "./0008_site_settings";

export const postgresMigrations: SqlMigration[] = [
  { name: "0001_init", sql: init },
  { name: "0002_pages", sql: pages },
  { name: "0003_seo", sql: seo },
  { name: "0004_guides", sql: guides },
  { name: "0005_seo_templates", sql: seoTemplates },
  { name: "0006_newsletter", sql: newsletter },
  { name: "0007_payments", sql: payments },
  { name: "0008_site_settings", sql: siteSettings },
];
