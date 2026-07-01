import type { MongoMigration } from "../../migrate-runner-mongodb";
import { init } from "./0001_init";

export const mongoMigrations: MongoMigration[] = [init];
