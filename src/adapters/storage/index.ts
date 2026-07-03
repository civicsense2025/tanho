import type { StorageAdapter } from "../types";
import { LocalStorageAdapter } from "./local";

/**
 * Storage singleton — the one import site for file storage. STORAGE_DRIVER
 * is reserved for future drivers (s3, r2, …); every value currently falls
 * back to local disk so setting the env var ahead of a driver landing is
 * harmless.
 */
function createStorage(): StorageAdapter {
  switch (process.env.STORAGE_DRIVER) {
    case "local":
    default:
      return new LocalStorageAdapter();
  }
}

export const storage: StorageAdapter = createStorage();
