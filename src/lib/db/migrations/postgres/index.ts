import type { SqlMigration } from "../../migrate-runner";
import { sql as init } from "./0001_init";

export const postgresMigrations: SqlMigration[] = [{ name: "0001_init", sql: init }];
