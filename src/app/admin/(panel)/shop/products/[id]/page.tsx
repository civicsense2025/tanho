import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { getProduct, listCollectionsWithCounts } from "@/modules/commerce/queries";
import { ProductForm } from "@/modules/commerce/admin/ProductForm";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Product" };

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ProductPageInner params={params} />
    </Suspense>
  );
}

async function ProductPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [data, collections] = await Promise.all([
    getProduct(id),
    listCollectionsWithCounts(),
  ]);
  if (!data) notFound();

  return (
    <AdminPage>
      <ProductForm
        product={data.product}
        variants={data.variants}
        collectionIds={data.collectionIds}
        collectionOptions={collections.map((c) => ({ id: c.id, name: c.name }))}
        stripeConnected={payments.isConfigured()}
      />
    </AdminPage>
  );
}
