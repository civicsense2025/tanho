import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { all as allEntities } from "@/entities/registry";
import { getReviewTargetConfig } from "@/modules/reviews/queries";
import {
  ReviewTargetSettingsScreen,
  type TargetTypeEntry,
} from "@/modules/reviews/admin/ReviewTargetSettingsScreen";
import { db } from "@/lib/db/client";

export const metadata = { title: "Review settings" };

/** Packs are distributed through the federated hub; reviews are not managed here. */
const HUB_ONLY_TYPES = new Set(["block-pack", "design-pack"]);

/** A human label for a polymorphic target type string. */
function targetLabel(targetType: string, customLabels: Map<string, string>): string {
  if (targetType.startsWith("custom:")) {
    return customLabels.get(targetType) ?? targetType;
  }
  if (targetType.startsWith("entry:")) {
    const entity = targetType.slice("entry:".length);
    const schema = allEntities().find((s) => s.entity === entity);
    return schema?.plural ?? entity;
  }
  if (targetType === "product") return "Products";
  return targetType;
}

export default function ReviewSettingsPage() {
  return (
    <Suspense fallback={null}>
      <ReviewSettingsPageInner />
    </Suspense>
  );
}

async function ReviewSettingsPageInner() {
  await requireUser();

  // Real reviewable target types: products (commerce) + DB custom types +
  // registered entry entities. Block/design packs are excluded because their
  // ratings/reviews live in the federated hub marketplace.
  const customTypeRows = await db.query.customTypes.findMany();
  const customTypes = customTypeRows.map((c: { slug: string; name: string }) => ({
    targetType: `custom:${c.slug}`,
    label: c.name,
  }));
  const entryTypes = allEntities()
    .filter((s) => !HUB_ONLY_TYPES.has(s.entity))
    .map((s) => `entry:${s.entity}`);

  const staticTypes: string[] = ["product"];
  const allTypes: string[] = [
    ...staticTypes,
    ...customTypes.map((c) => c.targetType),
    ...entryTypes,
  ];

  const customLabels = new Map<string, string>(
    customTypes.map((c) => [c.targetType, c.label]),
  );

  const configs = await Promise.all(allTypes.map((t) => getReviewTargetConfig(t)));

  const entries: TargetTypeEntry[] = allTypes.map((targetType, i) => ({
    targetType,
    label: targetLabel(targetType, customLabels),
    config: configs[i]!,
  }));

  return (
    <AdminPage width="wide">
      <ReviewTargetSettingsScreen entries={entries} />
    </AdminPage>
  );
}
