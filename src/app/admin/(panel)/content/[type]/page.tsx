import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { listEntries } from "@/modules/entries/queries";
import { getEntitySchema } from "@/entities/registry-async";
import { toEntitySchemaSummary } from "@/entities/types";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { listCustomTypes } from "@/modules/custom-types/queries";
import { ContentScreen } from "@/modules/entries/admin/ContentScreen";
import { AdminPage } from "@/components/admin/AdminPage";

/**
 * Generic content-type admin route — makes ANY registered type (built-in or
 * a DB-defined `custom:<slug>`) immediately usable for listing/creating
 * entries, without needing a dedicated route per type the way
 * projects/guides/resources have historically had one each.
 */
export default function Page({ params }: { params: Promise<{ type: string }> }) {
  return (
    <Suspense fallback={null}>
      <PageInner params={params} />
    </Suspense>
  );
}

async function PageInner({ params }: { params: Promise<{ type: string }> }) {
  await requireUser();
  const { type } = await params;
  const entity = decodeURIComponent(type);

  const [schema, settings] = await Promise.all([
    getEntitySchema(entity),
    getContentTypesSettings(),
  ]);
  if (!schema || schema.taxonomy || isTypeDisabled(settings, entity)) notFound();

  const items = await listEntries(entity);

  let customFields;
  if (entity.startsWith("custom:")) {
    const slug = entity.slice("custom:".length);
    const rows = await listCustomTypes();
    customFields = rows.find((r) => r.slug === slug)?.fields;
  }

  return (
    <AdminPage>
      <ContentScreen schema={toEntitySchemaSummary(schema)} items={items} customFields={customFields} />
    </AdminPage>
  );
}
