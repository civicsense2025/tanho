"use client";

import { useState } from "react";
import { HelpDisclosure } from "@/components/admin/HelpDisclosure";
import { CreateConnectionForm } from "@/modules/data-sources/admin/CreateConnectionForm";
import { AllowlistEditor } from "@/modules/data-sources/admin/AllowlistEditor";
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
