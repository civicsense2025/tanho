import { getOrderByCode } from "@/modules/commerce/order-lookup";

export const metadata = { title: "Thank you" };

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const order = code ? await getOrderByCode(code) : null;

  return (
    <div style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>Thank you</h1>
      {order ? (
        <p style={{ color: "var(--text-muted)" }}>
          Your donation of {money(order.totalCents, order.currency)} is on its way to being processed
          {order.status === "pending" ? " (confirming payment)" : ""}.
        </p>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>Thank you for your support.</p>
      )}
    </div>
  );
}
