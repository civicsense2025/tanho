import { runAdapterContract } from "./adapter.contract";
import { libsqlHarness } from "../helpers/adapters";

// libsql runs everywhere with zero infra (temp file DB) and is the default backend.
runAdapterContract(libsqlHarness());
