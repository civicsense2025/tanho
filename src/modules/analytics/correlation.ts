import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "./schema";
import { orderItems, orders } from "@/modules/commerce/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Order statuses that represent a real, completed purchase — excludes
 *  pending (not yet paid), refunded/disputed (reversed), and cancelled. */
const PAID_STATUSES = ["paid", "unfulfilled", "fulfilled"] as const;

export type CorrelationRow = {
  path: string;
  productName: string;
  personCount: number;
};

/**
 * For every (viewed page, purchased product) pair, count distinct people who
 * viewed the page AND placed a real paid order containing that product
 * within `windowDays` after the view — an onboarding "here's what's already
 * converting" reveal, not a live recommendation engine. Ranked by
 * personCount descending, top `limit`.
 */
export async function contentToPurchaseCorrelations(
  windowDays = 14,
  limit = 10,
): Promise<CorrelationRow[]> {
  const windowMs = windowDays * DAY_MS;
  const rows = await db.all<{ path: string; productName: string; personCount: number }>(sql`
    select
      ${analyticsEvents.path} as path,
      ${orderItems.name} as productName,
      count(distinct ${analyticsEvents.personId}) as personCount
    from ${analyticsEvents}
    inner join ${orders}
      on ${orders.personId} = ${analyticsEvents.personId}
      and ${orders.placedAt} >= ${analyticsEvents.at}
      and ${orders.placedAt} < ${analyticsEvents.at} + ${windowMs}
    inner join ${orderItems} on ${orderItems.orderId} = ${orders.id}
    where ${analyticsEvents.name} = 'pageview'
      and ${analyticsEvents.personId} is not null
      and ${orders.status} in ${PAID_STATUSES}
    group by ${analyticsEvents.path}, ${orderItems.name}
    order by personCount desc
    limit ${limit}
  `);

  return rows.map((r) => ({
    path: r.path || "/",
    productName: r.productName,
    personCount: Number(r.personCount),
  }));
}
