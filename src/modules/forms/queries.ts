import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { forms, formResponses, type FormResponseRow, type FormRow } from "./schema";

/** All forms, newest first — the admin list. */
export async function listForms(): Promise<FormRow[]> {
  return db.select().from(forms).orderBy(desc(forms.updatedAt));
}

/** One form by id, or null. */
export async function getForm(id: string): Promise<FormRow | null> {
  if (!id) return null;
  const row = await db.query.forms.findFirst({ where: eq(forms.id, id) });
  return row ?? null;
}

/** One form by id ONLY if published — the public route + form block use this. */
export async function getPublishedForm(id: string): Promise<FormRow | null> {
  const row = await getForm(id);
  return row && row.status === "published" ? row : null;
}

/**
 * Responses for a form, newest first. Admin-only in practice — the only
 * callers are the admin Results tab and getForm's owner-gated screen. A form's
 * responses are never exposed on a public surface.
 */
export async function getFormResponses(
  formId: string,
  limit = 200,
): Promise<FormResponseRow[]> {
  if (!formId) return [];
  return db
    .select()
    .from(formResponses)
    .where(eq(formResponses.formId, formId))
    .orderBy(desc(formResponses.at))
    .limit(Math.min(Math.max(limit, 1), 500));
}
