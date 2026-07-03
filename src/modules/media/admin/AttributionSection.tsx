"use client";

import { useState } from "react";
import type { MediaWithUsage } from "../queries";
import { LICENSE_IDS, LICENSES, needsCredit } from "../licenses";
import { updateMedia } from "../actions";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { attributionLine } from "./format";
import styles from "./sheet.module.css";

/**
 * "Attribution & sourcing" — license select (with a credit-required
 * warning), credit / source / sourceUrl fields saving on blur, and the
 * copyable attribution line from the design.
 */
export function AttributionSection({
  item,
  onSaved,
}: {
  item: MediaWithUsage;
  onSaved: () => void;
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const save = (patch: Record<string, unknown>) => {
    void updateMedia(item.id, patch).then((res) => {
      if (!res.ok) setFlash(res.error);
      else {
        setFlash(null);
        onSaved();
      }
    });
  };
  const saveField = (key: "credit" | "source" | "sourceUrl", value: string) => {
    if (value === item[key]) return;
    save({ [key]: value });
  };

  const copy = () => {
    void navigator.clipboard.writeText(attributionLine(item)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <>
      <h3 className={styles.sectionTitle}>Attribution &amp; sourcing</h3>
      <div className={styles.fields}>
        <Field label="License">
          <Select
            value={item.license}
            onChange={(e) => save({ license: e.target.value })}
            aria-label="License"
          >
            {LICENSE_IDS.map((id) => (
              <option key={id} value={id}>
                {LICENSES[id].label}
              </option>
            ))}
          </Select>
        </Field>
        {needsCredit(item) && (
          <span className={styles.warnLine}>
            This license requires a credit — add one before publishing.
          </span>
        )}

        <Field label="Credit">
          <Input
            key={`credit:${item.credit}`}
            defaultValue={item.credit}
            placeholder="Photographer or author"
            maxLength={120}
            onBlur={(e) => saveField("credit", e.target.value)}
          />
        </Field>
        <Field label="Source">
          <Input
            key={`source:${item.source}`}
            defaultValue={item.source}
            placeholder="Where it came from"
            maxLength={120}
            onBlur={(e) => saveField("source", e.target.value)}
          />
        </Field>
        <Field label="Source URL" hint="https:// links only">
          <Input
            key={`sourceUrl:${item.sourceUrl}`}
            type="url"
            defaultValue={item.sourceUrl}
            placeholder="https://"
            maxLength={400}
            onBlur={(e) => saveField("sourceUrl", e.target.value.trim())}
          />
        </Field>
        {flash && <span className={styles.flash}>{flash}</span>}

        <div className={styles.attribution}>
          <span className={styles.attributionText} title={attributionLine(item)}>
            {attributionLine(item)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            disabled={!item.credit}
            className={copied ? styles.copiedBtn : undefined}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
      </div>
    </>
  );
}
