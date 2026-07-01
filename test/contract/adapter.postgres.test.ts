import { describe } from "vitest";
import { runAdapterContract } from "./adapter.contract";
import { postgresHarness } from "../helpers/adapters";

// postgres only runs when DATABASE_URL / POSTGRES_URL is set (CI service container); a solo
// maintainer's `npm test` still exercises the contract via libsql + mongodb.
const harness = postgresHarness();
if (harness.available) {
  runAdapterContract(harness);
} else {
  describe.skip("DbAdapter contract [postgres] — set DATABASE_URL to run", () => {});
}
