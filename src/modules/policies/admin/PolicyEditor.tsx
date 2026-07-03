"use client";

import { Section, Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Button } from "@/components/core/Button";
import { templateForSlug } from "../templates";
import type { PolicyDraft } from "./types";
import styles from "./policies.module.css";

/** The right-pane editor for one policy: fields, body, template reset. */
export function PolicyEditor({
  draft,
  onChange,
  onSave,
  onDelete,
  saving,
}: {
  draft: PolicyDraft;
  onChange: (next: Partial<PolicyDraft>) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const tmpl = templateForSlug(draft.slug);
  return (
    <div className={styles.editor}>
      <Section title={draft.id ? "Edit policy" : "New policy"}>
        <Row label="Title">
          <Input value={draft.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Row>
        <Row label="Slug">
          <Input
            value={draft.slug}
            placeholder="privacy"
            onChange={(e) => onChange({ slug: e.target.value })}
          />
        </Row>
        <Row label="Group">
          <Seg
            value={draft.group}
            onChange={(v) => onChange({ group: v as PolicyDraft["group"] })}
            options={[
              { value: "site", label: "Site" },
              { value: "store", label: "Store" },
            ]}
          />
        </Row>
        <Row label="Status">
          <Seg
            value={draft.status}
            onChange={(v) => onChange({ status: v as PolicyDraft["status"] })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ]}
          />
        </Row>
        <Row label="Effective date">
          <Input
            value={draft.effectiveDate}
            placeholder="2026-01-01"
            onChange={(e) => onChange({ effectiveDate: e.target.value })}
          />
        </Row>
        <Row label="Show in footer">
          <Seg
            value={draft.footerLinked ? "on" : "off"}
            onChange={(v) => onChange({ footerLinked: v === "on" })}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
          />
        </Row>
      </Section>

      <Section
        title="Body"
        desc="Markdown headings (##) and paragraphs. Sanitised on render."
      >
        <Textarea
          className={styles.bodyArea}
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
        />
        {tmpl ? (
          <div className={styles.toolbar}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ body: tmpl.body })}
            >
              Reset to template
            </Button>
          </div>
        ) : null}
      </Section>

      <div className={styles.toolbar}>
        {draft.id ? (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
        <span className={styles.spacer} />
        <Button variant="accent" size="sm" onClick={onSave} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}
