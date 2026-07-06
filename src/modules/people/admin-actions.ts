"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { email as emailAdapter } from "@/adapters/email";
import { orders } from "@/modules/commerce/schema";
import {
  emailSubscriptions,
  memberships,
  people,
  personActivity,
} from "./schema";
import { listPeople, type Segment } from "./queries";
import { logActivity } from "./activity";
import { createPersonSession } from "./session";
import {
  inviteSchema,
  membershipGrantSchema,
  personPatchSchema,
} from "./validation";
import { makeSignedToken, WEEK_MS } from "./tokens";
import { linkTo } from "./links";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Editor-level edit of a CRM person's contact/profile fields. */
export async function updatePerson(id: string, patch: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = personPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid patch" };
  }
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) update[k] = v;
  if (data.email) update.email = data.email.toLowerCase();
  if (Object.keys(update).length === 0) return { ok: true };

  await db.update(people).set(update).where(eq(people.id, id));
  await writeAudit({ userId: user.id, action: "people.update", ownerType: "person", ownerId: id });
  return { ok: true };
}

/** Bulk add a tag across selected people (union, de-duplicated). */
export async function addTag(ids: string[], tag: string): Promise<Result> {
  const user = await requireUser();
  const clean = tag.trim().slice(0, 60);
  if (!clean || ids.length === 0) return { ok: true };
  const rows = await db.query.people.findMany({ where: inArray(people.id, ids) });
  for (const p of rows) {
    if (p.tags.includes(clean)) continue;
    await db.update(people).set({ tags: [...p.tags, clean] }).where(eq(people.id, p.id));
  }
  await writeAudit({ userId: user.id, action: "people.tag.add", meta: { tag: clean, count: ids.length } });
  return { ok: true };
}

/** Bulk remove a tag from selected people. */
export async function removeTag(ids: string[], tag: string): Promise<Result> {
  const user = await requireUser();
  const rows = await db.query.people.findMany({ where: inArray(people.id, ids) });
  for (const p of rows) {
    if (!p.tags.includes(tag)) continue;
    await db
      .update(people)
      .set({ tags: p.tags.filter((t) => t !== tag) })
      .where(eq(people.id, p.id));
  }
  await writeAudit({ userId: user.id, action: "people.tag.remove", meta: { tag, count: ids.length } });
  return { ok: true };
}

/** Bulk-remove selected people (owner-only). Cascades their activity,
 *  memberships, and email subscriptions. Order history is preserved (not
 *  cascade-deleted) by clearing `personId` first, since financial records
 *  should survive a customer being removed. Irreversible — the UI confirms
 *  first. */
export async function deletePeople(ids: string[]): Promise<Result> {
  const user = await requireUser("owner");
  if (ids.length === 0) return { ok: true };
  await db.update(orders).set({ personId: null }).where(inArray(orders.personId, ids));
  await db.delete(personActivity).where(inArray(personActivity.personId, ids));
  await db.delete(memberships).where(inArray(memberships.personId, ids));
  await db.delete(emailSubscriptions).where(inArray(emailSubscriptions.personId, ids));
  await db.delete(people).where(inArray(people.id, ids));
  await writeAudit({ userId: user.id, action: "people.remove", meta: { count: ids.length } });
  return { ok: true };
}

/** Invite a member — creates an invited person + a console invite link. */
export async function inviteMember(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite" };
  }
  const emailLc = parsed.data.email.toLowerCase();
  const existing = await db.query.people.findFirst({ where: eq(people.email, emailLc) });
  if (existing) return { ok: false, error: "Someone with that email already exists." };

  const [row] = await db
    .insert(people)
    .values({ email: emailLc, name: parsed.data.name, kind: "member", status: "invited" })
    .returning({ id: people.id });
  const token = makeSignedToken("invite", row.id, WEEK_MS);
  await emailAdapter.send({
    to: emailLc,
    subject: "You're invited",
    text: `Accept your invitation: ${linkTo("/join", { invite: token })}`,
  });
  await writeAudit({ userId: user.id, action: "people.invite", ownerType: "person", ownerId: row.id });
  return { ok: true, data: { id: row.id } };
}

/** Approve a pending member (invited → active). */
export async function approveMember(id: string): Promise<Result> {
  const user = await requireUser();
  await db.update(people).set({ status: "active" }).where(eq(people.id, id));
  await writeAudit({ userId: user.id, action: "people.approve", ownerType: "person", ownerId: id });
  return { ok: true };
}

/** Grant a comp membership (owner-only). */
export async function grantMembership(input: unknown): Promise<Result> {
  const user = await requireUser("owner");
  const parsed = membershipGrantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid grant" };
  }
  const { personId, tier, priceCents } = parsed.data;
  await db.insert(memberships).values({ personId, tier, priceCents, status: "active" });
  await logActivity(personId, "note", `Comp membership granted: ${tier}`);
  await writeAudit({
    userId: user.id,
    action: "people.membership.grant",
    ownerType: "person",
    ownerId: personId,
    meta: { tier, priceCents },
  });
  return { ok: true };
}

/** Cancel an active membership (owner-only). */
export async function removeMembership(membershipId: string): Promise<Result> {
  const user = await requireUser("owner");
  const row = await db.query.memberships.findFirst({ where: eq(memberships.id, membershipId) });
  await db
    .update(memberships)
    .set({ status: "canceled", cancelAt: Date.now() })
    .where(eq(memberships.id, membershipId));
  if (row) await logActivity(row.personId, "note", "Membership removed");
  await writeAudit({ userId: user.id, action: "people.membership.remove", ownerId: membershipId });
  return { ok: true };
}

/** CSV export of a segment (returns the CSV string; caller offers download). */
export async function exportPeopleCsv(segment: Segment): Promise<Result<string>> {
  await requireUser();
  const rows = await listPeople(segment);
  const headers = ["name", "email", "kind", "status", "membership", "subscribed", "company", "tags"];
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [headers.join(",")];
  for (const p of rows) {
    lines.push(
      [
        esc(p.name),
        esc(p.email),
        esc(p.kind),
        esc(p.status),
        esc(p.membershipTier ?? ""),
        esc(p.subscribed ? "yes" : "no"),
        esc(p.company),
        esc((p.tags ?? []).join(" ")),
      ].join(","),
    );
  }
  return { ok: true, data: lines.join("\n") };
}

/** Delete a person + cascade activity/memberships/subscriptions (owner-only).
 *  Order history is preserved (not cascade-deleted) by clearing `personId`
 *  first — same contract as the bulk deletePeople above. */
export async function deletePerson(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.update(orders).set({ personId: null }).where(eq(orders.personId, id));
  await db.delete(personActivity).where(eq(personActivity.personId, id));
  await db.delete(memberships).where(eq(memberships.personId, id));
  await db.delete(emailSubscriptions).where(eq(emailSubscriptions.personId, id));
  await db.delete(people).where(eq(people.id, id));
  await writeAudit({ userId: user.id, action: "people.delete", ownerType: "person", ownerId: id });
  return { ok: true };
}

/**
 * Impersonate a reader for support (owner-only, audited). Creates a person
 * session as the target and logs the acting admin's id on every use.
 */
export async function impersonate(personId: string): Promise<Result> {
  const user = await requireUser("owner");
  const person = await db.query.people.findFirst({ where: eq(people.id, personId) });
  if (!person) return { ok: false, error: "No such person." };
  await createPersonSession(personId);
  await writeAudit({
    userId: user.id,
    action: "people.impersonate",
    ownerType: "person",
    ownerId: personId,
    meta: { adminId: user.id, adminEmail: user.email },
  });
  return { ok: true };
}
