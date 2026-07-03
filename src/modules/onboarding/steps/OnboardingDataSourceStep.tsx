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
 * security-reviewed OAuth start/callback routes, it opens in a new tab —
 * the manual/paste CreateConnectionForm stays the primary in-wizard path,
 * fully embedded with no redirect.
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {beginner ? (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Think of this as your site&apos;s private filing cabinet — connect one and your pages can
          show live data from it.
        </p>
      ) : null}

      {!advanced ? (
        <HelpDisclosure label="What's a database, and do I need one?" defaultOpen={beginner}>
          A database stores information your site can show live — a list of products, bookings, or
          anything else that changes over time. You only need this if you want a page to display
          data like that; static pages work fine without one.
        </HelpDisclosure>
      ) : null}

      {initial.supabaseOAuthConfigured ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <a href="/api/oauth/supabase?intent=create" target="_blank" rel="noreferrer">
            Connect with Supabase (opens in a new tab)
          </a>
        </div>
      ) : null}

      <CreateConnectionForm
        initialEntryMode={advanced ? "manual" : "paste"}
        onConnected={setConnectionId}
      />
    </div>
  );
}
