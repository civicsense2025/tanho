"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import {
  connectExistingOAuthProject,
  createOAuthProject,
  listOAuthOrganizations,
  listOAuthProjects,
} from "../oauth-actions";
import type { SupabaseOrganizationSummary, SupabaseProjectSummary } from "@/adapters/supabase-oauth/management";
import styles from "./data-sources.module.css";

type Mode = "choose" | "create" | "connect";

/**
 * Lands right after the Supabase OAuth callback. Two choices: create a
 * brand-new project (zero-credential-entry — we generate + capture the DB
 * password ourselves) or connect an existing one (everything except the DB
 * password comes from the Management API; Supabase can never return that
 * password through any auth method, so the owner pastes it once).
 */
export function SupabaseProjectPicker({
  oauthConnectionId,
  initialIntent,
  emphasizeCreate = false,
  onConnected,
}: {
  oauthConnectionId: string;
  initialIntent: "create" | "connect";
  /** Visually emphasizes "Create a new database" over "Connect existing" — used by the beginner wizard tier. */
  emphasizeCreate?: boolean;
  /** When provided, called instead of router.push/refresh on success (e.g. embedded in the setup wizard). */
  onConnected?: (id: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialIntent === "create" ? "create" : "choose");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // "Create a new database" state.
  const [organizations, setOrganizations] = useState<SupabaseOrganizationSummary[]>([]);
  const [orgId, setOrgId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState("us-east-1");

  // "Connect an existing project" state.
  const [projects, setProjects] = useState<SupabaseProjectSummary[]>([]);
  const [selectedRef, setSelectedRef] = useState("");
  const [existingName, setExistingName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (mode === "create" && organizations.length === 0) {
      startTransition(async () => {
        const res = await listOAuthOrganizations(oauthConnectionId);
        if (!res.ok) setError(res.error);
        else {
          setOrganizations(res.organizations);
          setOrgId(res.organizations[0]?.id ?? "");
        }
      });
    }
    if (mode === "connect" && projects.length === 0) {
      startTransition(async () => {
        const res = await listOAuthProjects(oauthConnectionId);
        if (!res.ok) setError(res.error);
        else setProjects(res.projects);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const selectedProject = projects.find((p) => p.id === selectedRef);

  const submitCreate = () =>
    startTransition(async () => {
      setError(null);
      const res = await createOAuthProject({
        oauthConnectionId,
        name: newName,
        organizationId: orgId,
        region: newRegion,
      });
      if (!res.ok) setError(res.error);
      else if (onConnected) onConnected(res.id);
      else {
        router.push(`/admin/settings/data-sources/${res.id}`);
        router.refresh();
      }
    });

  const submitConnect = () =>
    startTransition(async () => {
      setError(null);
      if (!selectedProject) {
        setError("Pick a project first.");
        return;
      }
      const res = await connectExistingOAuthProject({
        oauthConnectionId,
        name: existingName || selectedProject.name,
        projectRef: selectedProject.id,
        region: selectedProject.region,
        databasePassword: password,
      });
      if (!res.ok) setError(res.error);
      else if (onConnected) onConnected(res.id);
      else {
        router.push(`/admin/settings/data-sources/${res.id}`);
        router.refresh();
      }
    });

  if (mode === "choose") {
    return (
      <div className={styles.form}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Your Supabase account is connected. What would you like to do?
        </p>
        <div className={styles.actions}>
          <Button variant="accent" size="sm" onClick={() => setMode("create")}>
            Create a new database
          </Button>
          <Button variant={emphasizeCreate ? "ghost" : "outline"} size="sm" onClick={() => setMode("connect")}>
            Connect an existing project
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className={styles.form}>
        <div className={styles.fieldRow}>
          <Input
            className={styles.grow}
            placeholder="Connection name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className={styles.fieldRow}>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={styles.grow}>
            <option value="" disabled>
              Select an organization
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <Input
            className={styles.grow}
            placeholder="Region (e.g. us-east-1)"
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
          />
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          We&apos;ll generate a strong database password and store it encrypted — you never need to
          see or handle it.
        </p>
        {error ? <span className={styles.error}>{error}</span> : null}
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
            Back
          </Button>
          <Button variant="accent" size="sm" onClick={submitCreate} loading={pending} disabled={!newName || !orgId}>
            Create database
          </Button>
        </div>
      </div>
    );
  }

  // mode === "connect"
  return (
    <div className={styles.form}>
      <div className={styles.fieldRow}>
        <select
          className={styles.grow}
          value={selectedRef}
          onChange={(e) => {
            setSelectedRef(e.target.value);
            const proj = projects.find((p) => p.id === e.target.value);
            if (proj) setExistingName(proj.name);
          }}
        >
          <option value="" disabled>
            Select a project
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id}) · {p.region}
            </option>
          ))}
        </select>
      </div>
      {selectedProject ? (
        <>
          <div className={styles.fieldRow}>
            <Input
              className={styles.grow}
              placeholder="Connection name"
              value={existingName}
              onChange={(e) => setExistingName(e.target.value)}
            />
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Supabase doesn&apos;t allow any app to retrieve your database password through an API —
            this is a Supabase-side limitation, not something we skipped. Copy it from Settings →
            Database and paste it here.
          </p>
          <a
            href={`https://supabase.com/dashboard/project/${selectedProject.id}/settings/database`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "var(--text-xs)" }}
          >
            Open Settings → Database for {selectedProject.name} ↗
          </a>
          <div className={styles.fieldRow}>
            <Input
              className={styles.grow}
              type="password"
              placeholder="Database password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </>
      ) : null}
      {error ? <span className={styles.error}>{error}</span> : null}
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
          Back
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={submitConnect}
          loading={pending}
          disabled={!selectedProject || !password}
        >
          Connect project
        </Button>
      </div>
    </div>
  );
}
