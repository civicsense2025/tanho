import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getViewer } from "@/modules/people/viewer";
import { memberships } from "@/modules/people/schema";
import type { AccountContent } from "./fields";

export type AccountResolved = {
  signedIn: boolean;
  name: string;
  memberActive: boolean;
  tier: string | null;
  since: number | null;
  currentPeriodEnd: number | null;
  status: string | null;
};

/**
 * Server-only: resolves the CURRENT viewer's own account state. Never accepts
 * or resolves an id from block content, so the block can only ever show the
 * requesting reader's data — one viewer can't render another's membership.
 */
export async function resolveAccount(
  _content: AccountContent,
): Promise<AccountResolved> {
  const viewer = await getViewer();
  if (!viewer) {
    return {
      signedIn: false,
      name: "",
      memberActive: false,
      tier: null,
      since: null,
      currentPeriodEnd: null,
      status: null,
    };
  }
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.personId, viewer.personId),
      eq(memberships.status, "active"),
    ),
  });
  return {
    signedIn: true,
    name: viewer.name || viewer.email,
    memberActive: viewer.memberActive,
    tier: viewer.tier,
    since: membership?.since ?? null,
    currentPeriodEnd: membership?.currentPeriodEnd ?? null,
    status: membership?.status ?? null,
  };
}
