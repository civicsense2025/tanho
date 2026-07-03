"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getViewer } from "@/modules/people/viewer";
import { forms, formResponses } from "./schema";
import {
  buildSubmissionSchema,
  isHoneypotTripped,
  HONEYPOT_FIELD,
  type SubmitState,
} from "./submission-schema";
import { allowSubmission } from "./rate-limit";
import {
  bumpCompletions,
  emailFromValues,
  notifyOwner,
  routeToCrm,
  scoreQuiz,
} from "./response-pipeline";
import { createFormPaymentCheckout, paymentField } from "./payment";

/**
 * Public submission entry point. Enforces, in order: honeypot (silent drop),
 * per-form+IP rate limit, requireLogin, and server-side validation of EVERY
 * value against the FORM'S OWN field defs (unknown fields rejected). Only then
 * does it persist and route into the CRM. The client shape is never trusted.
 */
export async function submitForm(
  formId: string,
  formData: FormData,
): Promise<SubmitState> {
  // Honeypot: if the hidden field is filled, a bot did it. Accept silently
  // (so the bot sees success) but persist nothing.
  if (isHoneypotTripped(formData.get(HONEYPOT_FIELD))) {
    return { ok: true, message: "Thanks — we got your response." };
  }

  const form = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
  if (!form || form.status !== "published") {
    return { ok: false, error: "This form is not available." };
  }

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  if (form.settings.spam !== false && !(await allowSubmission(formId, ip))) {
    return { ok: false, error: "Too many submissions. Try again in a few minutes." };
  }

  let personId: string | null = null;
  if (form.settings.requireLogin) {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, error: "Please sign in to submit this form." };
    personId = viewer.personId;
  }

  // Collect only known field ids from the FormData, then validate against the
  // form's field defs. .strict() in the built schema rejects anything else.
  const raw = collectValues(form.fields, formData);
  const schema = buildSubmissionSchema(form.fields);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  }
  const values = parsed.data as Record<string, unknown>;

  // Quiz scoring is server-authoritative.
  const quizResult =
    form.type === "quiz" ? scoreQuiz(form.fields, values, form.quiz ?? null) : null;

  const crmPersonId = await routeToCrm({
    fields: form.fields,
    values,
    settings: form.settings,
    formName: form.name,
  });
  personId = personId ?? crmPersonId;

  const [response] = await db
    .insert(formResponses)
    .values({
      formId,
      personId,
      source: form.settings.trackSource ? "web" : "web",
      values,
      outcome: quizResult?.outcome ?? null,
      score: quizResult?.score ?? null,
    })
    .returning({ id: formResponses.id });

  await db
    .update(forms)
    .set({ analytics: bumpCompletions(form.analytics) })
    .where(eq(forms.id, formId));

  if (form.settings.notify && form.settings.notifyTo) {
    await notifyOwner({
      to: form.settings.notifyTo,
      formName: form.name,
      email: emailFromValues(form.fields, values),
    });
  }

  // Submit-then-pay: a form with a configured payment field redirects to a
  // Checkout Session instead of the normal message/redirect flow. Falls back
  // to the normal flow when Stripe isn't configured or the field has no
  // amount set, so the form still works with no keys.
  const field = paymentField(form.fields);
  if (field && field.amountCents > 0) {
    const url = await createFormPaymentCheckout({
      responseId: response.id,
      formName: form.name,
      field,
      returnPath: returnPath(form.settings.redirect, hdrs.get("referer")),
    });
    if (url) return { ok: true, redirect: url };
  }

  if (
    form.settings.postSubmit === "redirect" &&
    form.settings.redirect.startsWith("/") &&
    !form.settings.redirect.startsWith("//")
  ) {
    return { ok: true, redirect: form.settings.redirect };
  }
  return { ok: true, message: buildMessage(form.settings.message, quizResult, form) };
}

/**
 * Where to send the visitor back after Checkout. There's no dedicated public
 * "/forms/:id" route (forms are embedded via a page block), so prefer the
 * form's own configured redirect, then the page the visitor submitted from
 * (same-origin only), then home.
 */
function returnPath(settingsRedirect: string, referer: string | null): string {
  if (settingsRedirect.startsWith("/") && !settingsRedirect.startsWith("//")) {
    return settingsRedirect;
  }
  if (referer) {
    try {
      const url = new URL(referer);
      return url.pathname + url.search;
    } catch {
      /* fall through */
    }
  }
  return "/";
}

/** Pull each declared field's value(s) from FormData; ignore everything else. */
function collectValues(
  fields: { id: string; kind: string; multi: boolean }[],
  formData: FormData,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const multiple =
      field.multi || field.kind === "checkboxes" || field.kind === "ranking";
    if (multiple) {
      out[field.id] = formData.getAll(field.id).map((v) => String(v));
    } else {
      const v = formData.get(field.id);
      if (v !== null) out[field.id] = String(v);
    }
  }
  return out;
}

/** Optionally append the quiz score line to the success message. */
function buildMessage(
  message: string,
  quiz: { score: number; outcome: string | null } | null,
  form: { settings: { quizShowScore: boolean } },
): string {
  if (!quiz || !form.settings.quizShowScore) return message;
  const suffix = quiz.outcome ? ` Result: ${quiz.outcome}.` : ` Score: ${quiz.score}.`;
  return message + suffix;
}
