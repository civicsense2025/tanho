import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";
import { pages } from "./0002_pages";
import { guides } from "./0003_guides";
import { seoTemplates } from "./0004_seo_templates";
import { newsletter } from "./0005_newsletter";
import { payments } from "./0006_payments";
import { siteSettings } from "./0007_site_settings";
import { contentTypes } from "./0008_content_types";
import { seedBuiltinTypes } from "./0009_seed_builtin_types";
import { fixGuideSeedBlocksField } from "./fix_guide_seed_blocks_field";
import { dropLegacyCollections } from "./0010_drop_legacy_collections";

export const mongoMigrations: MongoMigration[] = [init, pages, guides, seoTemplates, newsletter, payments, siteSettings, contentTypes, seedBuiltinTypes, fixGuideSeedBlocksField, dropLegacyCollections];
