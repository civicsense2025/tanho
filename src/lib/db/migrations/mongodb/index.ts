import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";
import { pages } from "./0002_pages";

export const mongoMigrations: MongoMigration[] = [init, pages];
