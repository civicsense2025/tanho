import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";
import { pages } from "./0002_pages";
import { guides } from "./0003_guides";

export const mongoMigrations: MongoMigration[] = [init, pages, guides];
