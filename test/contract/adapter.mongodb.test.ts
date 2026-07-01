import { runAdapterContract } from "./adapter.contract";
import { mongoHarness } from "../helpers/adapters";

// mongodb runs via in-process mongodb-memory-server — no Docker, works locally and in CI.
runAdapterContract(mongoHarness());
