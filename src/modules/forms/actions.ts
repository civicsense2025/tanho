"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { forms, formResponses } from "./schema";
import { formInputSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => updateTag("forms");

/** Create a form (editor OK). */
export async function createForm(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = formInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const { quiz, ...rest } = parsed.data;
  const [row] = await db
    .insert(forms)
    .values({ ...rest, quiz: rest.type === "quiz" ? quiz : null, updatedAt: Date.now() })
    .returning({ id: forms.id });
  await writeAudit({
    userId: user.id,
    action: "form.create",
    ownerType: "form",
    ownerId: row.id,
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}

/** Update a form (editor OK). */
export async function updateForm(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.forms.findFirst({ where: eq(forms.id, id) });
  if (!existing) return { ok: false, error: "Form not found" };

  const parsed = formInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }
  const { quiz, ...rest } = parsed.data;
  await db
    .update(forms)
    .set({ ...rest, quiz: rest.type === "quiz" ? quiz : null, updatedAt: Date.now() })
    .where(eq(forms.id, id));
  await writeAudit({
    userId: user.id,
    action: "form.update",
    ownerType: "form",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Delete a form and its responses (owner-only). */
export async function deleteForm(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(formResponses).where(eq(formResponses.formId, id));
  await db.delete(forms).where(eq(forms.id, id));
  await writeAudit({
    userId: user.id,
    action: "form.delete",
    ownerType: "form",
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/** Duplicate a form as a fresh draft with no responses (editor OK). */
export async function duplicateForm(id: string): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const src = await db.query.forms.findFirst({ where: eq(forms.id, id) });
  if (!src) return { ok: false, error: "Form not found" };

  const now = Date.now();
  const [row] = await db
    .insert(forms)
    .values({
      name: `${src.name} copy`,
      type: src.type,
      status: "draft",
      fields: src.fields,
      design: src.design,
      settings: src.settings,
      quiz: src.quiz,
      analytics: { views: 0, starts: 0, completions: 0 },
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: forms.id });
  await writeAudit({
    userId: user.id,
    action: "form.duplicate",
    ownerType: "form",
    ownerId: row.id,
    meta: { from: id },
  });
  invalidate();
  return { ok: true, data: { id: row.id } };
}
