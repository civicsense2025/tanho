import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";
import { sql as stringIds } from "./0002_string_ids";
import { sql as pages } from "./0003_pages";
import { sql as seo } from "./0004_seo";
import { sql as guides } from "./0005_guides";
import { sql as seoTemplates } from "./0006_seo_templates";
import { sql as newsletter } from "./0007_newsletter";
import { sql as payments } from "./0008_payments";
import { sql as siteSettings } from "./0009_site_settings";
import { sql as contentTypes } from "./0010_content_types";
import { seedBuiltinTypes } from "./0011_seed_builtin_types";
import { dropLegacyTables } from "./0012_drop_legacy_tables";

export const libsqlMigrations: SqlMigration[] = [
  { name: "0001_init", sql: init },
  { name: "0002_string_ids", sql: stringIds },
  { name: "0003_pages", sql: pages },
  { name: "0004_seo", sql: seo },
  { name: "0005_guides", sql: guides },
  { name: "0006_seo_templates", sql: seoTemplates },
  { name: "0007_newsletter", sql: newsletter },
  { name: "0008_payments", sql: payments },
  { name: "0009_site_settings", sql: siteSettings },
  { name: "0010_content_types", sql: contentTypes },
  seedBuiltinTypes,
  dropLegacyTables,
];
