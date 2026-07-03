"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPage } from "@/modules/pages/actions";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";

const TEMPLATES = [
  ["blank", "Blank — no layout defaults"],
  ["landing", "Landing — wide, marketing"],
  ["article", "Article — narrow reading measure"],
  ["shop", "Shop — wide product layout"],
  ["docs", "Docs — wide with generous gutter"],
] as const;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function NewPageForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState("blank");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const route = `/${effectiveSlug}`;

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await createPage({ title, slug: effectiveSlug, route, template });
      if (!res.ok) return setError(res.error);
      router.push(`/admin/pages/${res.data!.id}`);
    });

  return (
    <div style={{ maxWidth: "480px", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <Field label="Title">
        <Input value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="About the studio" />
      </Field>
      <Field label="Slug" hint={`Will live at ${route || "/"}`}>
        <Input
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="about"
        />
      </Field>
      <Field label="Template" hint="Sets sensible layout defaults; you can still tune the layout per page.">
        <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      {error ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</p>
      ) : null}
      <div>
        <Button variant="accent" onClick={submit} loading={pending} disabled={!title || !effectiveSlug}>
          Create page
        </Button>
      </div>
    </div>
  );
}
