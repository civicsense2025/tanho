import { payments } from "@/adapters/payments";
import type { FormRow } from "../schema";
import type { PublicForm } from "./FormRenderer";

/**
 * Reduce a stored form to the public-safe shape sent to the browser. Critically
 * strips `correct` and `points` from every field so a quiz's answer key never
 * reaches the client — scoring happens server-side in submitForm.
 *
 * `paymentsEnabled` is resolved here (server-only — payments.isConfigured()
 * must never be imported into a client bundle) and passed down as a plain
 * boolean prop so the client-side FieldControl can gate the payment field's
 * display without importing the adapter itself.
 */
export function toPublicForm(row: FormRow): PublicForm {
  return {
    id: row.id,
    name: row.name,
    design: row.design,
    settings: row.settings,
    fields: row.fields.map((f) => ({ ...f, correct: [], points: 0 })),
    paymentsEnabled: payments.isConfigured(),
  };
}
