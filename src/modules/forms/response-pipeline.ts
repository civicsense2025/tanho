import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people, emailSubscriptions } from "@/modules/people/schema";
import { logActivity } from "@/modules/people/activity";
import { email as emailAdapter } from "@/adapters/email";
import type { FormField, FormSettings, QuizConfig } from "./validation";
import type { FormAnalytics } from "./schema";

/** Pure helpers (unit-tested) live at the top; DB routing below. */

/** The email a submission belongs to — the first email-kind field's value. */
export function emailFromValues(
  fields: FormField[],
  values: Record<string, unknown>,
): string | null {
  const field = fields.find((f) => f.kind === "email");
  if (!field) return null;
  const raw = values[field.id];
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return email || null;
}

/** A short human label for the activity timeline / notification. */
export function nameFromValues(
  fields: FormField[],
  values: Record<string, unknown>,
): string {
  const nameField = fields.find(
    (f) => f.kind === "text" && /name/i.test(f.label),
  );
  const raw = nameField ? values[nameField.id] : "";
  return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
}

/**
 * The CRM routing DECISION for a submission — pure, so it's unit-testable
 * without a database. Returns null when nothing should be stored; otherwise the
 * matched email, the person kind to create a NEW contact as, the activity label
 * to log, and the tags to apply. routeToCrm executes this plan against the DB.
 */
export type CrmPlan = {
  email: string;
  name: string;
  newKind: "subscriber" | "lead";
  subscribe: boolean;
  activityLabel: string;
  tags: string[];
};

export function crmPlan(args: {
  fields: FormField[];
  values: Record<string, unknown>;
  settings: FormSettings;
  formName: string;
}): CrmPlan | null {
  const { fields, values, settings, formName } = args;
  if (settings.storeIn === "none") return null;
  const email = emailFromValues(fields, values);
  if (!email) return null;
  return {
    email,
    name: nameFromValues(fields, values),
    newKind: settings.storeIn === "subscribers" ? "subscriber" : "lead",
    subscribe: settings.storeIn === "subscribers",
    activityLabel: `Submitted ${formName}`,
    tags: settings.tagOnSubmit,
  };
}

export type QuizResult = { score: number; outcome: string | null };

/**
 * Server-authoritative quiz scoring: sum `points` for each field whose answer
 * matches its `correct` set, then map the total to an outcome band (or leave
 * outcome null in "score" mode). Pure — no client input trusted.
 */
export function scoreQuiz(
  fields: FormField[],
  values: Record<string, unknown>,
  quiz: QuizConfig | null,
): QuizResult {
  let score = 0;
  for (const field of fields) {
    if (!field.correct.length || !field.points) continue;
    const answer = values[field.id];
    const given = Array.isArray(answer) ? answer.map(String) : [String(answer ?? "")];
    const correct = new Set(field.correct);
    const allRight =
      given.length > 0 && given.every((g) => correct.has(g)) && given.length === correct.size;
    const anyRight = given.some((g) => correct.has(g));
    if (field.kind === "checkboxes" || field.kind === "ranking" ? allRight : anyRight) {
      score += field.points;
    }
  }

  let outcome: string | null = null;
  if (quiz?.mode === "outcome" && quiz.outcomes.length) {
    const sorted = [...quiz.outcomes].sort((a, b) => b.min - a.min);
    outcome = sorted.find((o) => score >= o.min)?.label ?? null;
  }
  return { score, outcome };
}

/** Increment the denormalised completion counter. */
export function bumpCompletions(a: FormAnalytics): FormAnalytics {
  return { ...a, completions: (a.completions ?? 0) + 1 };
}

/**
 * Route a submission into the CRM per settings.storeIn (server-only). Matches
 * or creates a person by the form's email field, never downgrades an existing
 * member, honors a prior unsubscribe, records activity, and applies tags.
 * Returns the linked personId (or null when there's nothing to store).
 */
export async function routeToCrm(args: {
  fields: FormField[];
  values: Record<string, unknown>;
  settings: FormSettings;
  formName: string;
}): Promise<string | null> {
  const plan = crmPlan(args);
  if (!plan) return null;

  const existing = await db.query.people.findFirst({ where: eq(people.email, plan.email) });
  let personId: string;
  if (existing) {
    personId = existing.id;
    if (plan.name && !existing.name) {
      await db.update(people).set({ name: plan.name }).where(eq(people.id, personId));
    }
  } else {
    const [row] = await db
      .insert(people)
      .values({ email: plan.email, name: plan.name, kind: plan.newKind, status: "active" })
      .returning({ id: people.id });
    personId = row.id;
  }

  if (plan.subscribe) {
    await addSubscription(personId, args.settings.doubleOptIn);
  }
  if (plan.tags.length) {
    await applyTags(personId, plan.tags);
  }

  await logActivity(personId, "form", plan.activityLabel);
  return personId;
}

/** Add a newsletter subscription, honoring a prior unsubscribe and opt-in. */
async function addSubscription(personId: string, doubleOptIn: boolean) {
  const list = "default";
  const sub = await db.query.emailSubscriptions.findFirst({
    where: and(
      eq(emailSubscriptions.personId, personId),
      eq(emailSubscriptions.list, list),
    ),
  });
  if (sub?.status === "unsubscribed") return; // never silently re-enable
  const status = doubleOptIn ? "pending" : "subscribed";
  if (!sub) {
    await db.insert(emailSubscriptions).values({ personId, list, status });
  } else if (sub.status === "pending" && !doubleOptIn) {
    await db
      .update(emailSubscriptions)
      .set({ status: "subscribed" })
      .where(eq(emailSubscriptions.id, sub.id));
  }
}

/** Merge tags onto a person (deduped). */
async function applyTags(personId: string, incoming: string[]) {
  const row = await db.query.people.findFirst({ where: eq(people.id, personId) });
  if (!row) return;
  const merged = [...new Set([...(row.tags ?? []), ...incoming])].slice(0, 100);
  await db.update(people).set({ tags: merged }).where(eq(people.id, personId));
}

/** Send the owner an internal notification (console adapter by default). */
export async function notifyOwner(args: {
  to: string;
  formName: string;
  email: string | null;
}): Promise<void> {
  if (!args.to) return;
  await emailAdapter.send({
    to: args.to,
    subject: `New response: ${args.formName}`,
    text: `A new response to "${args.formName}"${args.email ? ` from ${args.email}` : ""}.`,
  });
}
