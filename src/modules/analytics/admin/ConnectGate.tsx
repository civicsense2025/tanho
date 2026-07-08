"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/core/Button";
import buttonStyles from "@/components/core/Button.module.css";
import type { ConnectState } from "../connect-actions";
import { GoogleOAuthSetupGuide } from "./GoogleOAuthSetupGuide";
import styles from "./analytics.module.css";

type GoogleService = "google-analytics" | "google-search-console";

/**
 * Real Google OAuth consent gate. When the deployment hasn't set its own
 * GOOGLE_OAUTH_CLIENT_ID/SECRET, shows a configure hint instead of a broken
 * connect button (BYO — never requires the platform vendor's Google account).
 * Otherwise the button is a plain navigation to the owner-only start route,
 * which redirects to Google's consent screen. Editors see the gate but the
 * start route itself rejects non-owners.
 */
export function ConnectGate({
  title,
  body,
  connectLabel,
  startHref,
  isOwner,
  isGoogleOAuthConfigured,
  service,
  productionUrl,
}: {
  title: string;
  body: string;
  connectLabel: string;
  /** e.g. /api/oauth/google/google-analytics */
  startHref: string;
  isOwner: boolean;
  isGoogleOAuthConfigured: boolean;
  service: GoogleService;
  productionUrl?: string;
}) {
  return (
    <div className={styles.gate}>
      <h2 className={styles.gateTitle}>{title}</h2>
      <p className={styles.gateBody}>{body}</p>
      {!isGoogleOAuthConfigured ? (
        <>
          <span className={styles.gateNote}>
            Google OAuth is not configured. Follow the steps below to set it up.
          </span>
          <GoogleOAuthSetupGuide service={service} productionUrl={productionUrl} />
        </>
      ) : isOwner ? (
        <Link
          href={startHref}
          prefetch={false}
          className={[buttonStyles.btn, buttonStyles.md, buttonStyles.accent].join(" ")}
        >
          {connectLabel}
        </Link>
      ) : (
        <span className={styles.gateNote}>Owner access required to connect this.</span>
      )}
    </div>
  );
}

/**
 * Disconnect control for an already-connected Google surface. A thin client
 * wrapper around the provider-specific server action passed in.
 */
export function DisconnectButton({
  disconnect,
  label = "Disconnect",
}: {
  disconnect: () => Promise<ConnectState>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDisconnect = () =>
    startTransition(async () => {
      setError(null);
      const res = await disconnect();
      if (res.error) setError(res.error);
    });

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <Button variant="outline" size="sm" onClick={onDisconnect} loading={pending}>
        {label}
      </Button>
      {error ? <span className={styles.gateNote}>{error}</span> : null}
    </span>
  );
}
