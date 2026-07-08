import { createId } from "@paralleldrive/cuid2";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Reviews — a polymorphic user-generated review/rating system that attaches
 * to any "reviewable thing" via a `targetType`/`targetId` pair, mirroring the
 * `block_sets.ownerType`/`ownerId` pattern. One review per person per target
 * (unique index); aggregates are cached per target and recomputed on every
 * status change. Per-target-type config lives in `review_targets` (row absent
 * = the documented defaults). Owner replies are single-threaded (one reply
 * per review, Udemy-style).
 *
 * targetType values: "product" | "entry:<entity>" | "custom:<slug>".
 * The platform's custom-types system grows arbitrarily, so a polymorphic
 * string column (not a FK) is the right shape — same tradeoff `block_sets`
 * already makes. Existence/verified checks happen in app logic before insert.
 */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** Polymorphic target — e.g. "product", "entry:project", "custom:courses". */
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    /** Reviewer — a `people` row (login required to submit). */
    personId: text("person_id").notNull(),
    /** 1–5 (or 0 when the target is comment-only via allowRating:false). */
    rating: integer("rating").notNull().default(0),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    /** mediaIds of uploaded photos (resolved via the media module). */
    photos: text("photos", { mode: "json" }).$type<string[]>().notNull().default([]),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "hidden"],
    })
      .notNull()
      .default("pending"),
    moderationNote: text("moderation_note").notNull().default(""),
    /** Set at submit time from computeVerified(); rechecked on edit. */
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    verifiedMethod: text("verified_method", {
      enum: ["order", "enrollment", "membership", "none"],
    })
      .notNull()
      .default("none"),
    /** orderId (products) or entitlement/membership ref — for audit display. */
    verifiedRef: text("verified_ref"),
    helpfulVotes: integer("helpful_votes").notNull().default(0),
    /** Type-specific extras (course completion %, dimension ratings, reaction type). */
    meta: text("meta", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    source: text("source", { enum: ["web", "email", "api", "import"] })
      .notNull()
      .default("web"),
    at: integer("at")
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [
    index("reviews_target_idx").on(t.targetType, t.targetId, t.status),
    index("reviews_person_idx").on(t.personId),
    // One review per person per target — edit-in-place is the supported path.
    uniqueIndex("reviews_person_target_idx").on(t.personId, t.targetType, t.targetId),
  ],
);

/** Owner reply to a review — one per review (Udemy-style single threading). */
export const reviewReplies = sqliteTable("review_replies", {
  id: text("id").primaryKey().$defaultFn(createId),
  reviewId: text("review_id").notNull(),
  body: text("body").notNull(),
  /** Admin user who replied. */
  byUserId: text("by_user_id").notNull(),
  at: integer("at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Per-target-type config. PK = targetType string. Row absent = the documented
 * defaults (post-moderate, optional verified badge, login required, ratings on).
 * A row is created the first time the owner customizes a target type.
 */
export const reviewTargets = sqliteTable("review_targets", {
  targetType: text("target_type").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  moderation: text("moderation", { enum: ["pre", "post"] }).notNull().default("post"),
  verifiedGate: text("verified_gate", {
    enum: ["required", "optional"],
  })
    .notNull()
    .default("optional"),
  requireLogin: integer("require_login", { mode: "boolean" }).notNull().default(true),
  /** false = comment-only target (Patreon-style, no stars; rating stored as 0). */
  allowRating: integer("allow_rating", { mode: "boolean" }).notNull().default(true),
  minRating: integer("min_rating").notNull().default(1),
  maxRating: integer("max_rating").notNull().default(5),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Cached aggregate per target — recomputed synchronously on every review
 * status change. distribution = [count1★, count2★, count3★, count4★, count5★].
 */
export const reviewAggregates = sqliteTable(
  "review_aggregates",
  {
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    average: real("average").notNull().default(0),
    count: integer("count").notNull().default(0),
    distribution: text("distribution", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default([0, 0, 0, 0, 0]),
    computedAt: integer("computed_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [primaryKey({ columns: [t.targetType, t.targetId] })],
);

/** Helpful votes — one per person per review (composite PK prevents double-voting). */
export const reviewVotes = sqliteTable(
  "review_votes",
  {
    reviewId: text("review_id").notNull(),
    personId: text("person_id").notNull(),
    at: integer("at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.personId] })],
);

export type ReviewRow = typeof reviews.$inferSelect;
export type ReviewReplyRow = typeof reviewReplies.$inferSelect;
export type ReviewTargetRow = typeof reviewTargets.$inferSelect;
export type ReviewAggregateRow = typeof reviewAggregates.$inferSelect;
export type ReviewVoteRow = typeof reviewVotes.$inferSelect;
