"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import type { PageDraft, PatchPage } from "./types";

/**
 * Core identity fields — title, slug, route. The design's PageFields. Editing
 * the title in the editor is the same value that shows in the top bar; slug and
 * route drive where the page lives. Kept deliberately small; structural meta
 * (status/template/layout) lives in PageMeta.
 */
export function PageFields({
  page,
  patchPage,
  compact = false,
}: {
  page: PageDraft;
  patchPage: PatchPage;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field label="Title">
        <Input
          value={page.title}
          onChange={(e) => patchPage({ title: e.target.value })}
          placeholder="Untitled page"
        />
      </Field>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: "var(--space-3)",
        }}
      >
        <Field label="Slug" hint="Lowercase, dashes">
          <Input
            value={page.slug}
            onChange={(e) => patchPage({ slug: e.target.value })}
            placeholder="my-page"
          />
        </Field>
        <Field label="Route" hint="Where it lives, e.g. /about">
          <Input
            value={page.route}
            onChange={(e) => patchPage({ route: e.target.value })}
            placeholder="/my-page"
          />
        </Field>
      </div>
    </div>
  );
}
