import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * People — the CRM. Everyone who touches the site who isn't an admin:
 * members, subscribers, leads, customers. Public accounts (members) carry
 * a passwordHash; leads/imported contacts may not.
 */
export const people = sqliteTable("people", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  kind: text("kind", { enum: ["member", "subscriber", "lead"] })
    .notNull()
    .default("subscriber"),
  status: text("status", { enum: ["active", "invited", "unsubscribed"] })
    .notNull()
    .default("active"),
  passwordHash: text("password_hash"),
  emailVerifiedAt: integer("email_verified_at"),
  phone: text("phone").notNull().default(""),
  company: text("company").notNull().default(""),
  location: text("location").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id"),
  socials: text("socials", { mode: "json" })
    .$type<Array<{ icon: string; label: string; href: string }>>()
    .notNull()
    .default([]),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  lastActiveAt: integer("last_active_at"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/** Per-person activity timeline. */
export const personActivity = sqliteTable("person_activity", {
  id: text("id").primaryKey().$defaultFn(createId),
  personId: text("person_id").notNull(),
  type: text("type", {
    enum: ["view", "form", "order", "subscribe", "login", "note"],
  }).notNull(),
  label: text("label").notNull(),
  meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
  at: integer("at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Membership — a person's paid tier. Tier names/prices come from settings
 * (membership namespace); this row tracks the person's live status (Stripe
 * drives it in Phase 8; comp memberships can be granted from admin now).
 */
export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey().$defaultFn(createId),
  personId: text("person_id").notNull(),
  tier: text("tier").notNull(),
  status: text("status", { enum: ["active", "past_due", "canceled"] })
    .notNull()
    .default("active"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  priceCents: integer("price_cents").notNull().default(0),
  since: integer("since")
    .notNull()
    .$defaultFn(() => Date.now()),
  currentPeriodEnd: integer("current_period_end"),
  cancelAt: integer("cancel_at"),
});

/** Newsletter lists + membership vocabulary. */
export const emailSubscriptions = sqliteTable("email_subscriptions", {
  id: text("id").primaryKey().$defaultFn(createId),
  personId: text("person_id").notNull(),
  list: text("list").notNull().default("default"),
  status: text("status", { enum: ["pending", "subscribed", "unsubscribed"] })
    .notNull()
    .default("pending"),
  doubleOptInAt: integer("double_opt_in_at"),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});
