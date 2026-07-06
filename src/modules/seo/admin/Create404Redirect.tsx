"use client";

import { useState, useTransition } from "react";
import { saveRedirect } from "@/modules/redirects/actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";

/**
 * One-click "turn this 404 into a redirect" control for the audit table.
 * Expands to a small destination input, then creates a 301 via the existing
 * saveRedirect action. On success the row's button shows a done state (the
 * report re-fetches on the next navigation / refresh).
 */
export function Create404Redirect({ fromPath }: { fromPath: string }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("/");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) return <span style={{ color: "var(--success)", fontSize: "var(--text-xs)" }}>Redirected ✓</span>;

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Redirect…
      </Button>
    );
  }

  const create = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveRedirect(null, { fromPath, toPath: to, code: 301 });
      if (res.error) setError(res.error);
      else setDone(true);
    });

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
      <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/destination" style={{ width: 140 }} />
      <Button variant="accent" size="sm" onClick={create} loading={pending}>
        Save
      </Button>
      {error ? <span style={{ color: "var(--danger)", fontSize: "var(--text-xs)" }}>{error}</span> : null}
    </span>
  );
}
