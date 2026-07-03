"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { createConnection } from "../connection-actions";
import { parsePostgresConnectionString } from "../connection-string";
import type { DataSourceConfig } from "../validation";
import styles from "./data-sources.module.css";

type Provider = DataSourceConfig["provider"];
type PostgresEntryMode = "paste" | "manual";

/** Create a new external data-source connection (owner-only). */
export function CreateConnectionForm({
  initialEntryMode = "paste",
  onConnected,
}: {
  /** Initial Postgres entry-mode tab — used by the advanced wizard tier to default to manual entry. */
  initialEntryMode?: PostgresEntryMode;
  /** When provided, called instead of router.push/refresh on success (e.g. embedded in the setup wizard). */
  onConnected?: (id: string) => void;
} = {}) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("postgres");
  const [entryMode, setEntryMode] = useState<PostgresEntryMode>(initialEntryMode);
  const [connectionString, setConnectionString] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5432");
  const [database, setDatabase] = useState("postgres");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [connectionStringExtra, setConnectionStringExtra] = useState<string | undefined>(undefined);
  const [projectRef, setProjectRef] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parseConnectionString = () => {
    const result = parsePostgresConnectionString(connectionString);
    if ("error" in result) {
      setPasteError(result.error);
      return;
    }
    setPasteError(null);
    setHost(result.host);
    setPort(String(result.port));
    setDatabase(result.database);
    setUser(result.user);
    setPassword(result.password);
    setConnectionStringExtra(result.connectionStringExtra);
    // Switch to field view so the owner can see and correct the parsed
    // values before submitting — reuses the existing manual submit path
    // untouched, this is purely a fill path.
    setEntryMode("manual");
  };

  const submit = () =>
    startTransition(async () => {
      const config: DataSourceConfig =
        provider === "postgres"
          ? {
              provider: "postgres",
              host,
              port: Number(port) || 5432,
              database,
              user,
              password,
              connectionStringExtra,
            }
          : {
              provider: "supabase",
              projectRef,
              databasePassword: password,
              usePooler: true,
              region,
              database: "postgres",
            };

      const res = await createConnection({ name, config });
      if (!res.ok) setError(res.error);
      else if (onConnected) onConnected(res.id);
      else {
        router.push(`/admin/settings/data-sources/${res.id}`);
        router.refresh();
      }
    });

  return (
    <div className={styles.form}>
      <div className={styles.fieldRow}>
        <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
          <option value="postgres">Postgres</option>
          <option value="supabase">Supabase</option>
        </select>
        <Input
          className={styles.grow}
          placeholder="Connection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {provider === "postgres" ? (
        <>
          <div className={styles.actions}>
            <Button
              variant={entryMode === "paste" ? "accent" : "outline"}
              size="sm"
              onClick={() => setEntryMode("paste")}
            >
              Paste connection string
            </Button>
            <Button
              variant={entryMode === "manual" ? "accent" : "outline"}
              size="sm"
              onClick={() => setEntryMode("manual")}
            >
              Enter fields manually
            </Button>
          </div>

          {entryMode === "paste" ? (
            <div className={styles.fieldRow}>
              <Input
                className={styles.grow}
                type="password"
                placeholder="postgres://user:password@host:5432/dbname?sslmode=require"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
              />
              <Button variant="solid" size="sm" onClick={parseConnectionString} disabled={!connectionString}>
                Parse
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.fieldRow}>
                <Input className={styles.grow} placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)} />
                <Input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ width: 90 }} />
              </div>
              <div className={styles.fieldRow}>
                <Input className={styles.grow} placeholder="Database" value={database} onChange={(e) => setDatabase(e.target.value)} />
                <Input className={styles.grow} placeholder="User" value={user} onChange={(e) => setUser(e.target.value)} />
              </div>
              <div className={styles.fieldRow}>
                <Input className={styles.grow} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </>
          )}

          {pasteError ? <span className={styles.error}>{pasteError}</span> : null}
        </>
      ) : (
        <>
          <div className={styles.fieldRow}>
            <Input className={styles.grow} placeholder="Project ref" value={projectRef} onChange={(e) => setProjectRef(e.target.value)} />
            <Input className={styles.grow} placeholder="Region (e.g. us-east-1)" value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className={styles.fieldRow}>
            <Input
              className={styles.grow}
              type="password"
              placeholder="Database password (Settings > Database — not the service-role key)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </>
      )}

      {error ? <span className={styles.error}>{error}</span> : null}

      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={submit} loading={pending} disabled={!name}>
          Connect
        </Button>
      </div>
    </div>
  );
}
