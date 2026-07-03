import { getPublishedForm } from "@/modules/forms/queries";
import { toPublicForm } from "@/modules/forms/public/to-public-form";
import type { PublicForm } from "@/modules/forms/public/FormRenderer";
import type { FormBlockContent } from "./fields";

export type FormBlockResolved = { form: PublicForm | null };

/**
 * Server-only: load the embedded form, but only if it's published. A blank or
 * unpublished id resolves to null so Render can show a neutral placeholder.
 * toPublicForm strips answer keys (quiz `correct`/`points`) so they never
 * enter the client payload.
 */
export async function resolveFormBlock(
  content: FormBlockContent,
): Promise<FormBlockResolved> {
  if (!content.formId) return { form: null };
  const row = await getPublishedForm(content.formId);
  if (!row) return { form: null };
  return { form: toPublicForm(row) };
}
