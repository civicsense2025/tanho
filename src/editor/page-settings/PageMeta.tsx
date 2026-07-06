"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import type { PageLayoutSettings } from "@/blocks/layout";
import type { PageDraft, PageOption, PatchPage } from "./types";
import shell from "../editor-shell.module.css";

const TEMPLATES = ["blank", "landing", "article", "shop", "docs"] as const;
const GUTTER = ["none", "narrow", "normal", "wide"] as const;
const PAD_Y = ["none", "sm", "md", "lg"] as const;
const BLOCK_GAP = ["none", "sm", "md", "lg"] as const;
const MAX_WIDTH = ["narrow", "normal", "wide", "full"] as const;

/**
 * Structural page meta — status, kind, template, parent, layout knobs, tags and
 * priority. The design's PageMeta. Layout knobs write into `page.layout` (the
 * shared pageLayout() vocabulary), so the canvas and the published page reflow
 * identically.
 */
export function PageMeta({
  page,
  patchPage,
  pages = [],
}: {
  page: PageDraft;
  patchPage: PatchPage;
  pages?: PageOption[];
}) {
  const patchLayout = (partial: Partial<PageLayoutSettings>) =>
    patchPage({ layout: { ...page.layout, ...partial } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className={shell.pairGrid}>
        <Field label="Status">
          <Select
            value={page.status}
            onChange={(e) => patchPage({ status: e.target.value as PageDraft["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
        <Field label="Type">
          <Select
            value={page.kind}
            onChange={(e) => patchPage({ kind: e.target.value as PageDraft["kind"] })}
          >
            <option value="page">Page</option>
            <option value="post">Post</option>
          </Select>
        </Field>
      </div>

      <Field label="Template" hint="Thin layout wrapper around your blocks">
        <Select
          value={page.template}
          onChange={(e) => patchPage({ template: e.target.value as PageDraft["template"] })}
        >
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </Select>
      </Field>

      {page.kind === "post" ? (
        <Field label="Parent page" hint="Posts nest under a page (e.g. the newsletter)">
          <Select
            value={page.parentId ?? ""}
            onChange={(e) => patchPage({ parentId: e.target.value || null })}
          >
            <option value="">— None —</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.route})
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className={shell.pairGrid}>
        <Field label="Max width">
          <Select value={page.layout.maxWidth ?? "normal"} onChange={(e) => patchLayout({ maxWidth: e.target.value as PageLayoutSettings["maxWidth"] })}>
            {MAX_WIDTH.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Gutter">
          <Select value={page.layout.gutter ?? "normal"} onChange={(e) => patchLayout({ gutter: e.target.value as PageLayoutSettings["gutter"] })}>
            {GUTTER.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Vertical padding">
          <Select value={page.layout.padY ?? "md"} onChange={(e) => patchLayout({ padY: e.target.value as PageLayoutSettings["padY"] })}>
            {PAD_Y.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Block gap">
          <Select value={page.layout.blockGap ?? "md"} onChange={(e) => patchLayout({ blockGap: e.target.value as PageLayoutSettings["blockGap"] })}>
            {BLOCK_GAP.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
      </div>

      <div className={shell.tripleGrid}>
        <Field label="Tags" hint="Comma-separated">
          <Input
            value={page.tags.join(", ")}
            onChange={(e) =>
              patchPage({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="news, updates"
          />
        </Field>
        <Field label="Priority" hint="1–5 (sitemap)">
          <Input
            type="number"
            min={1}
            max={5}
            value={page.priority}
            onChange={(e) => patchPage({ priority: Number(e.target.value) || 3 })}
          />
        </Field>
      </div>
    </div>
  );
}
