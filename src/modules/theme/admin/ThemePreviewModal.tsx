"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import type { PageRow } from "@/modules/pages/queries";

/**
 * Modal shell around a server-rendered preview body (passed as `children` —
 * see ThemePreviewContent). Page picker and light/dark toggle are URL search
 * params (previewPage, previewMode) so choosing a real page triggers a real
 * server re-render with that page's resolved blocks — a client component
 * can't await bound-block data fetches itself.
 */
export function ThemePreviewModal({
  themeName,
  pages,
  mode,
  pageId,
  children,
}: {
  themeName: string;
  pages: PageRow[];
  mode: "light" | "dark";
  pageId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
  };

  const close = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("previewTheme");
    next.delete("previewPage");
    next.delete("previewMode");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  return (
    <Modal onClose={close} width={960}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Previewing “{themeName}”</span>
        <span style={{ flex: 1 }} />
        <Select value={pageId} onChange={(e) => setParam("previewPage", e.target.value)} style={{ maxWidth: 220 }}>
          <option value="demo">Showcase page (all block types)</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </Select>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "accent" : "outline"} size="sm" onClick={() => setParam("previewMode", m)}>
              {m === "light" ? "Light" : "Dark"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={close}>Close</Button>
      </div>
      <div style={{ maxHeight: "75vh", overflowY: "auto", opacity: pending ? 0.6 : 1 }}>
        {children}
      </div>
    </Modal>
  );
}
