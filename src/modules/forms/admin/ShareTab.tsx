"use client";

import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import type { FormRow } from "../schema";
import styles from "./forms.module.css";

/** Share tab — the block embed id and a direct link. */
export function ShareTab({ form }: { form: FormRow }) {
  const published = form.status === "published";

  return (
    <Section
      title="Share"
      desc={
        published
          ? "Add a Form block to any page and paste this id, or link directly."
          : "Publish this form to share it. Unpublished forms show a placeholder."
      }
    >
      <Row label="Form id">
        <Input readOnly value={form.id} onFocus={(e) => e.currentTarget.select()} />
      </Row>
      <Row label="Direct link">
        <Input
          readOnly
          value={`/forms/${form.id}`}
          onFocus={(e) => e.currentTarget.select()}
        />
      </Row>
      <p className={styles.shareHint}>
        In the page editor, add an <strong>Interactive → Form</strong> block and set its
        Form id to <code>{form.id}</code>.
      </p>
    </Section>
  );
}
