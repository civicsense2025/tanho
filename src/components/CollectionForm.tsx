"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea, Button } from "@/components/ui";
import { slugify } from "@/lib/utils";
import type { Collection } from "@/lib/db";

interface Props {
  collectionId?: string;
  initial?: Partial<Collection>;
}

export function CollectionForm({ collectionId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = { name, slug: slug || slugify(name), description: description || null, sortOrder };
      const url = collectionId ? `/api/collections/${collectionId}` : "/api/collections";
      const method = collectionId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Save failed");
      }
      router.push("/admin/collections");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!collectionId) return;
    if (!confirm("Delete this collection? Entries assigned to it are not deleted, just unassigned.")) return;
    const res = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/collections");
      router.refresh();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Featured Guides" />
      </Field>
      <Field label="Slug">
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || "auto-from-name"} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Sort order">
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </Field>

      {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>}

      <div style={{ display: "flex", gap: "var(--space-4)" }}>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : collectionId ? "Save changes" : "Create collection"}</Button>
        {collectionId && <Button onClick={remove} variant="outline">Delete</Button>}
      </div>
    </div>
  );
}
