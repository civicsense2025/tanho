import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import { FormRenderer } from "@/modules/forms/public/FormRenderer";
import type { FormBlockContent } from "./fields";
import type { FormBlockResolved } from "./resolve";

/**
 * Form block — pure. resolve() loads the published form; this just draws it.
 * In the editor (or when the form is unset/unpublished) it shows a neutral
 * placeholder rather than an interactive form.
 */
export function RenderForm({
  content,
  ctx,
}: {
  content: FormBlockContent & { _resolved?: FormBlockResolved | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Form", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const form = content._resolved?.form ?? null;
  if (!form) {
    return (
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-6)",
          color: "var(--text-faint)",
          fontSize: "var(--text-sm)",
        }}
      >
        No form selected.
      </div>
    );
  }

  return <FormRenderer form={form} />;
}
