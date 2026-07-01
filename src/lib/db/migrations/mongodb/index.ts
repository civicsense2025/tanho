import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";
import { pages } from "./0002_pages";
import { guides } from "./0003_guides";
import { seoTemplates } from "./0004_seo_templates";

export const mongoMigrations: MongoMigration[] = [init, pages, guides, seoTemplates];
