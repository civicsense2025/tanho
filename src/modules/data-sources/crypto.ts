import { openJson, sealJson } from "@/lib/crypto/secretbox";
import type { DataSourceConfig } from "./validation";

/** Encrypt a connection config for storage in `configEncrypted`. */
export function sealConnectionConfig(config: DataSourceConfig): string {
  return sealJson(config);
}

/** Decrypt a stored connection config, or null if tampered/corrupt. */
export function openConnectionConfig(token: string): DataSourceConfig | null {
  return openJson<DataSourceConfig>(token);
}
