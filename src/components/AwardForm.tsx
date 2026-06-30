"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea, Button } from "@/components/ui";

interface AwardData {
  title: string;
  organization: string;
  description: string;
  date: string;
  url: string;
  sort_order: number;
}

interface Props {
  awardId?: number;
  initial?: Partial<AwardData>;
}

const DEFAULT: AwardData = { title: "", organization: "", description: "", date: "", url: "", sort_order: 0 };

export function AwardForm({ awardId, initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<AwardData>({ ...DEFAULT, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key: keyof AwardData, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  async function save() {
    setSaving(true);
    const res = awardId
      ? await fetch(`/api/awards/${awardId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : await fetch("/api/awards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Save failed");
      setSaving(false);
    }
  }

  async function remove() {
    if (!awardId) return;
    if (!confirm("Delete this award?")) return;
    setDeleting(true);
    const res = await fetch(`/api/awards/${awardId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      alert("Delete failed");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Field label="Title">
        <Input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Forbes 30 Under 30" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        <Field label="Organization">
          <Input value={data.organization} onChange={(e) => set("organization", e.target.value)} placeholder="Forbes" />
        </Field>
        <Field label="Date">
          <Input value={data.date} onChange={(e) => set("date", e.target.value)} placeholder="Dec 2022" />
        </Field>
      </div>
      <Field label="URL">
        <Input value={data.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
      </Field>
      <Field label="Description">
        <Textarea rows={3} value={data.description} onChange={(e) => set("description", e.target.value)} placeholder="What the award is for…" />
      </Field>
      <Field label="Sort order">
        <Input type="number" value={data.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border)" }}>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {awardId && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--danger)" }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
