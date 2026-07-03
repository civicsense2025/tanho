import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getOrder, listOrdersForPerson } from "@/modules/commerce/queries";
import { OrderDetail } from "@/modules/commerce/admin/OrderDetail";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Order" };

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <OrderPageInner params={params} />
    </Suspense>
  );
}

async function OrderPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getOrder(id);
  if (!data) notFound();
  const pastOrders = data.person
    ? (await listOrdersForPerson(data.person.id)).filter((o) => o.id !== data.order.id)
    : [];
  return (
    <AdminPage>
      <OrderDetail data={data} isOwner={user.role === "owner"} pastOrders={pastOrders} />
    </AdminPage>
  );
}
