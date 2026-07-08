"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpDisclosure } from "@/components/admin/HelpDisclosure";
import { CreateConnectionForm } from "@/modules/data-sources/admin/CreateConnectionForm";
import { AllowlistEditor } from "@/modules/data-sources/admin/AllowlistEditor";
import dataSourceStyles from "@/modules/data-sources/admin/data-sources.module.css";
import type { WizardStepProps } from "../types";

/**
 * The most intimidating step for a non-technical owner, so the difficulty
 * tier does the most work here. OAuth is a real external redirect (Supabase
 * doesn't offer a way around that, same as any "Sign in with X" flow), so
 * rather than re-thread wizard-resumption state through the already
 * security-reviewed OAuth start/callback routes, CreateConnectionForm itself
 * opens it in a new tab (see its `isSupabaseOAuthConfigured` prop) — the
 * manual/paste path stays reachable in-wizard with no redirect, as a
 * fallback the form surfaces on its own.
 */
export function OnboardingDataSourceStep({ initial, difficulty, onStepComplete }: WizardStepProps) {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const beginner = difficulty === 1;
  const advanced = difficulty === 3;
  const existing = initial.existingConnection;

  // A data source is already configured (e.g. via Settings, or a prior run) —
  // there's nothing to set up, so just reassure the owner it's connected rather
  // than making them create another one. The step is already marked complete in
  // onboarding state (see the wizard page), so the shell's "Next" is enabled and
  // the owner advances when ready — the card isn't skipped past automatically.
  if (existing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          A database is already connected — your pages can read live data from it. Nothing to do here;
          you can manage or add more anytime in Settings.
        </p>
        <div className={dataSourceStyles.card}>
          <div className={dataSourceStyles.row}>
            <span className={dataSourceStyles.name}>{existing.name}</span>
            <span
              className={`${dataSourceStyles.status} ${
                existing.status === "connected"
                  ? dataSourceStyles.statusConnected
                  : existing.status === "error"
                    ? dataSourceStyles.statusError
                    : ""
              }`}
            >
              {existing.status}
            </span>
          </div>
          <span className={dataSourceStyles.meta}>
            {existing.provider} · {existing.allowlistJson.length} table
            {existing.allowlistJson.length === 1 ? "" : "s"} allowlisted
          </span>
        </div>
        <Link
          href="/admin/settings/data-sources"
          style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}
        >
          Manage data sources
        </Link>
      </div>
    );
  }

  if (connectionId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Now pick which tables and columns are safe to show on your site — this list is the only
          thing a page is ever allowed to read.
        </p>
        <AllowlistEditor connectionId={connectionId} initialAllowlist={[]} onSaved={onStepComplete} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* External data source connect — a DIFFERENT, optional concern: bind a
          read-only allowlisted third-party DB to blocks. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-faint)",
          }}
        >
          Connect a data source (optional)
        </div>

        {beginner ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Separately, you can connect an existing database so a page can show live data from it —
            think of it as a private filing cabinet your pages can read.
          </p>
        ) : null}

        {!advanced ? (
          <HelpDisclosure label="What's a data source, and do I need one?" defaultOpen={beginner}>
            A data source is an outside database your site can read live — a list of products,
            bookings, or anything else that changes over time. You only need this if you want a page
            to display data like that; static pages work fine without one.
          </HelpDisclosure>
        ) : null}

        <CreateConnectionForm
          initialEntryMode={advanced ? "manual" : "paste"}
          onConnected={setConnectionId}
          isSupabaseOAuthConfigured={initial.supabaseOAuthConfigured}
        />
      </div>
    </div>
  );
}
