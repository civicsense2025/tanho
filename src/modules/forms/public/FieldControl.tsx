"use client";

import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Field } from "@/components/forms/Field";
import { formatMoney } from "@/modules/commerce/format-money";
import { isScreen } from "../field-kinds";
import type { FormField } from "../validation";
import { ScreenBlock } from "./ScreenBlock";
import { FileUploadField } from "./FileUploadField";
import { SignaturePad } from "./SignaturePad";
import styles from "./form.module.css";

/** Renders one field: a labelled input by kind, or a presentational screen. */
export function FieldControl({
  field,
  paymentsEnabled,
}: {
  field: FormField;
  paymentsEnabled: boolean;
}) {
  if (isScreen(field.kind)) return <ScreenBlock field={field} />;

  return (
    <Field label={field.label || undefined} hint={field.help || undefined}>
      <Control field={field} paymentsEnabled={paymentsEnabled} />
    </Field>
  );
}

function Control({
  field,
  paymentsEnabled,
}: {
  field: FormField;
  paymentsEnabled: boolean;
}) {
  const { id, kind, required, placeholder } = field;
  const opts = field.options.map((o) => ({
    label: o.label || o.value,
    value: o.value || o.label,
    image: o.image,
  }));

  switch (kind) {
    case "textarea":
      return <Textarea name={id} placeholder={placeholder} required={required} rows={4} />;
    case "number":
    case "rating":
    case "scale":
    case "nps":
      return (
        <Input
          type="number"
          name={id}
          placeholder={placeholder}
          required={required}
          min={field.min}
          max={field.max}
        />
      );
    case "date":
      return <Input type="date" name={id} required={required} />;
    case "email":
      return (
        <Input type="email" name={id} placeholder={placeholder} required={required} autoComplete="email" />
      );
    case "phone":
      return <Input type="tel" name={id} placeholder={placeholder} required={required} />;
    case "select":
      return (
        <Select name={id} required={required} defaultValue="">
          <option value="" disabled>
            {placeholder || "Choose one"}
          </option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "yesno":
      return (
        <div className={styles.choiceRow} role="radiogroup">
          {["yes", "no"].map((v) => (
            <label key={v} className={styles.choice}>
              <input type="radio" name={id} value={v} required={required} />
              <span>{v === "yes" ? "Yes" : "No"}</span>
            </label>
          ))}
        </div>
      );
    case "radio":
    case "picture":
      return (
        <div className={styles.choiceRow} role="radiogroup">
          {opts.map((o) => (
            <label key={o.value} className={styles.choice}>
              <input type="radio" name={id} value={o.value} required={required} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
    case "checkboxes":
    case "ranking":
      return (
        <div className={styles.choiceRow}>
          {opts.map((o) => (
            <label key={o.value} className={styles.choice}>
              <input type="checkbox" name={id} value={o.value} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
    case "file":
      return <FileUploadField id={id} required={required} />;
    case "signature":
      return <SignaturePad id={id} required={required} />;
    case "payment":
      return (
        <PaymentField
          amountCents={field.amountCents}
          currency={field.currency}
          enabled={paymentsEnabled}
        />
      );
    default:
      return <Input type="text" name={id} placeholder={placeholder} required={required} />;
  }
}

/**
 * Payment field: never collects a value itself — the charge happens via a
 * Checkout Session created by submit-actions.ts after a valid submission.
 * When Stripe isn't configured, shows a clearly disabled note and does NOT
 * block submission (white-label graceful degradation).
 */
function PaymentField({
  amountCents,
  currency,
  enabled,
}: {
  amountCents: number;
  currency: string;
  enabled: boolean;
}) {
  if (!enabled) {
    return <p className={styles.paymentDisabled}>Payments are not enabled for this form.</p>;
  }
  return (
    <p className={styles.paymentNote}>
      Payment of {formatMoney(amountCents, currency)} — you&apos;ll be redirected to secure
      checkout after submitting.
    </p>
  );
}
