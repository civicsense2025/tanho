"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/core/Button";
import { createConnection } from "../connection-actions";
import { parsePostgresConnectionString } from "../connection-string";
import type { DataSourceConfig } from "../validation";
import { ConnectionStatusChecker } from "./ConnectionStatusChecker";
import styles from "./data-sources.module.css";

type Provider = DataSourceConfig["provider"];
type PostgresEntryMode = "paste" | "manual";

/** Create a new external data-source connection (owner-only). */
export function CreateConnectionForm({
  initialEntryMode = "paste",
  onConnected,
  isSupabaseOAuthConfigured = false,
}: {
  /** Initial Postgres entry-mode tab — used by the advanced wizard tier to default to manual entry. */
  initialEntryMode?: PostgresEntryMode;
  /** When provided, called instead of router.push/refresh on success (e.g. embedded in the setup wizard). */
  onConnected?: (id: string) => void;
  /**
   * When true, this deployment has its own Supabase OAuth app registered —
   * the Supabase branch leads with "Connect with Supabase" (one-click org/
   * project picker, zero password entry for new projects) and tucks manual
   * project-ref/region/password entry behind a fallback disclosure, instead
   * of showing raw fields as the only option.
   */
  isSupabaseOAuthConfigured?: boolean;
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
  const [showManualSupabase, setShowManualSupabase] = useState(false);

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

  const currentConfig: DataSourceConfig = useMemo(
    () =>
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
          },
    [provider, host, port, database, user, password, connectionStringExtra, projectRef, region],
  );

  const submit = () =>
    startTransition(async () => {
      const config = currentConfig;
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
        <Field label="Provider" style={{ width: 160 }}>
          <Select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            <option value="postgres">Postgres</option>
            <option value="supabase">Supabase</option>
          </Select>
        </Field>
        <Field label="Connection name" className={styles.grow}>
          <Input
            placeholder="e.g. Production Postgres"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </div>

      {provider === "postgres" ? (
        <>
          <div className={styles.segmented} role="tablist" aria-label="Entry mode">
            <button
              type="button"
              role="tab"
              aria-selected={entryMode === "paste"}
              data-active={entryMode === "paste"}
              className={styles.segment}
              onClick={() => setEntryMode("paste")}
            >
              Paste connection string
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={entryMode === "manual"}
              data-active={entryMode === "manual"}
              className={styles.segment}
              onClick={() => setEntryMode("manual")}
            >
              Enter fields manually
            </button>
          </div>

          {entryMode === "paste" ? (
            <Field
              label="Connection string"
              hint="postgres://user:password@host:5432/dbname?sslmode=require"
            >
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
            </Field>
          ) : (
            <>
              <div className={styles.fieldRow}>
                <Field label="Host" className={styles.grow}>
                  <Input placeholder="db.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
                </Field>
                <Field label="Port" style={{ width: 90 }}>
                  <Input placeholder="5432" value={port} onChange={(e) => setPort(e.target.value)} />
                </Field>
              </div>
              <div className={styles.fieldRow}>
                <Field label="Database" className={styles.grow}>
                  <Input placeholder="postgres" value={database} onChange={(e) => setDatabase(e.target.value)} />
                </Field>
                <Field label="User" className={styles.grow}>
                  <Input placeholder="postgres" value={user} onChange={(e) => setUser(e.target.value)} />
                </Field>
              </div>
              <div className={styles.fieldRow}>
                <Field label="Password" className={styles.grow}>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </div>
            </>
          )}

          {pasteError ? <span className={styles.error}>{pasteError}</span> : null}
        </>
      ) : isSupabaseOAuthConfigured && !showManualSupabase ? (
        <div className={styles.oauthCallout}>
          <p className={styles.oauthCalloutText}>
            Sign in with Supabase to pick an organization and project — no password to copy-paste.
            Creating a new project generates and stores its database password for you automatically.
          </p>
          <div className={styles.actions}>
            <a href="/api/oauth/supabase?intent=create" target="_blank" rel="noreferrer">
              <Button variant="accent" size="sm">
                Create a new Supabase project
              </Button>
            </a>
            <a href="/api/oauth/supabase?intent=connect" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                Connect an existing project
              </Button>
            </a>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => setShowManualSupabase(true)}>
            Enter project details manually instead
          </button>
        </div>
      ) : (
        <>
          {isSupabaseOAuthConfigured ? (
            <button type="button" className={styles.linkButton} onClick={() => setShowManualSupabase(false)}>
              ← Back to Connect with Supabase
            </button>
          ) : null}
          <div className={styles.fieldRow}>
            <Field label="Project ref" className={styles.grow} hint="Found in your Supabase project URL">
              <Input placeholder="abcdefghijklmno" value={projectRef} onChange={(e) => setProjectRef(e.target.value)} />
            </Field>
            <Field label="Region" className={styles.grow}>
              <Input placeholder="us-east-1" value={region} onChange={(e) => setRegion(e.target.value)} />
            </Field>
          </div>
          <div className={styles.fieldRow}>
            <Field
              label="Database password"
              className={styles.grow}
              hint="Settings → Database — not the service-role key"
            >
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
        </>
      )}

      <ConnectionStatusChecker
        config={
          entryMode === "manual" || (provider === "supabase" && (showManualSupabase || !isSupabaseOAuthConfigured))
            ? currentConfig
            : null
        }
      />

      {error ? <span className={styles.error}>{error}</span> : null}

      {provider === "supabase" && isSupabaseOAuthConfigured && !showManualSupabase ? null : (
        <div className={styles.actions}>
          <Button variant="accent" size="sm" onClick={submit} loading={pending} disabled={!name}>
            Connect
          </Button>
        </div>
      )}
    </div>
  );
}
