"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { resolveEmbedUrlAction } from "@/modules/embeds/actions";
import type { EmbedProvider } from "@/modules/embeds/resolve";

const PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  figma: "Figma",
  maps: "Google Maps",
  vimeo: "Vimeo",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  twitter: "Twitter/X",
  custom: "Donation / form (ActBlue, Donorbox…)",
};

/**
 * The embed block's `url` field — paste any share link (a YouTube/Vimeo/
 * Spotify/SoundCloud/Twitter/Figma/Maps URL), click Resolve, and this calls
 * the shared resolver (modules/embeds/resolve.ts) via a Server Action once,
 * storing the final resolved provider+url. Resolution never happens live at
 * render — see blocks/embed/Render.tsx.
 */
export function EmbedUrlField({
  provider,
  url,
  onChange,
}: {
  provider: EmbedProvider;
  url: string;
  onChange: (next: { provider: EmbedProvider; url: string }) => void;
}) {
  const [draft, setDraft] = useState(url);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resolve = () => {
    if (!draft.trim()) {
      setError("Paste a link first.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await resolveEmbedUrlAction(draft.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ provider: result.provider, url: result.url });
    });
  };

  const isResolved = url !== "" && draft === url;

  return (
    <Field
      label="Embed link"
      hint="Paste a YouTube, Vimeo, Spotify, SoundCloud, Twitter/X, Figma, or Maps link"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://…"
            style={{ flex: 1 }}
          />
          <Button type="button" variant="outline" size="sm" onClick={resolve} disabled={pending}>
            {pending ? "Resolving…" : "Resolve"}
          </Button>
        </div>
        {error ? (
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</p>
        ) : isResolved ? (
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Resolved as a {PROVIDER_LABEL[provider]} embed.
          </p>
        ) : null}
      </div>
    </Field>
  );
}
