import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";
import { pages } from "./0002_pages";
import { guides } from "./0003_guides";
import { seoTemplates } from "./0004_seo_templates";
import { newsletter } from "./0005_newsletter";
import { payments } from "./0006_payments";
import { siteSettings } from "./0007_site_settings";

export const mongoMigrations: MongoMigration[] = [init, pages, guides, seoTemplates, newsletter, payments, siteSettings];
