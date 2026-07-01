"use client";

import { useState, type CSSProperties } from "react";
import { Field, Input, Textarea, Button } from "@/components/ui";
import type { SettingRow } from "@/lib/settings";

interface Props {
  initial: SettingRow[];
}

const sectionLabel: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  color: "var(--text)",
};

const SECRET_MASK = "••••••••";

/** key -> UI metadata. Order here is display order. */
const FIELDS: { key: string; label: string; hint?: string; type: "text" | "textarea" | "secret" }[] = [
  { key: "site.siteName", label: "Site name", type: "text" },
  { key: "site.title", label: "Site title", hint: "<title> / og:title default", type: "text" },
  { key: "site.description", label: "Site description", hint: "meta description / og:description default", type: "textarea" },
  { key: "site.author", label: "Author", hint: "Person/author name in JSON-LD", type: "text" },
  { key: "site.tagline", label: "Tagline", type: "text" },
  { key: "site.locale", label: "Locale", hint: "BCP-47, e.g. en", type: "text" },
  { key: "site.url", label: "Site URL", hint: "Absolute origin, no trailing slash", type: "text" },
  { key: "theme.accent", label: "Theme accent", hint: "Hex, e.g. #6e2b32", type: "text" },
  { key: "theme.accent2", label: "Theme accent (secondary)", hint: "Hex, e.g. #585c34", type: "text" },
  { key: "theme.font", label: "Theme font", hint: "e.g. Inter, sans-serif", type: "text" },
  { key: "analytics.googleSiteVerification", label: "Google Search Console token", hint: "HTML tag method — content= value only", type: "text" },
  { key: "analytics.gaMeasurementId", label: "GA4 Measurement ID", hint: "e.g. G-XXXXXXXXXX", type: "text" },
  { key: "integrations.githubToken", label: "GitHub token", hint: "Content write-through — Contents: Read and write", type: "secret" },
  { key: "integrations.githubRepo", label: "GitHub repo", hint: "owner/repo", type: "text" },
  { key: "integrations.githubBranch", label: "GitHub branch", type: "text" },
  { key: "integrations.vercelDeployHookUrl", label: "Vercel deploy hook URL", type: "secret" },
  { key: "integrations.emailProvider", label: "Email provider", hint: "resend | postmark | noop", type: "text" },
  { key: "integrations.emailFrom", label: "Email from address", type: "text" },
  { key: "integrations.resendApiKey", label: "Resend API key", type: "secret" },
  { key: "integrations.postmarkServerToken", label: "Postmark server token", type: "secret" },
];

const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Site identity", keys: ["site.siteName", "site.title", "site.description", "site.author", "site.tagline", "site.locale", "site.url"] },
  { title: "Theme", keys: ["theme.accent", "theme.accent2", "theme.font"] },
  { title: "Search Console & Analytics", keys: ["analytics.googleSiteVerification", "analytics.gaMeasurementId"] },
  {
    title: "Integrations",
    keys: [
      "integrations.githubToken", "integrations.githubRepo", "integrations.githubBranch",
      "integrations.vercelDeployHookUrl", "integrations.emailProvider", "integrations.emailFrom",
      "integrations.resendApiKey", "integrations.postmarkServerToken",
    ],
  },
];

export function SettingsForm({ initial }: Props) {
  const byKey = new Map(initial.map((r) => [r.key, r]));
  // Secret fields start blank (never populated from the server) -- the input's placeholder
  // shows the mask when a value already exists, so leaving it blank on save means "no change."
  const [data, setData] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, f.type === "secret" ? "" : byKey.get(f.key)?.value || ""]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: string) => {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    // Secret fields left blank are omitted entirely so the API's "no change" semantics apply.
    const payload: Record<string, string | null> = {};
    for (const f of FIELDS) {
      const v = data[f.key];
      if (f.type === "secret" && v === "") continue;
      payload[f.key] = v === "" ? null : v;
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else alert("Save failed");
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 style={sectionLabel}>{section.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {section.keys.map((key) => {
              const field = FIELDS.find((f) => f.key === key)!;
              const existing = byKey.get(key);
              const placeholder = field.type === "secret" && existing?.hasValue ? SECRET_MASK : undefined;
              return (
                <Field key={key} label={field.label} hint={field.hint}>
                  {field.type === "textarea" ? (
                    <Textarea rows={2} value={data[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
                  ) : (
                    <Input
                      type={field.type === "secret" ? "password" : "text"}
                      value={data[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      autoComplete="off"
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </section>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        {saved && <span style={{ fontSize: "var(--text-xs)", color: "var(--success)" }}>Saved</span>}
      </div>
    </form>
  );
}
