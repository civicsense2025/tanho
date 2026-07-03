import { Suspense } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { people } from "@/modules/people/schema";
import { getUserPackEntitlements } from "@/modules/marketplace/entitlements";
import { PurchasesScreen } from "@/modules/marketplace/admin/PurchasesScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Your purchases" };

/**
 * The "Your purchases" screen — shows the logged-in admin's pack entitlements
 * (matched by email to a CRM person record) with download and install buttons.
 */
export default function PurchasesPage() {
  return (
    <Suspense fallback={null}>
      <PurchasesPageInner />
    </Suspense>
  );
}

async function PurchasesPageInner() {
  const user = await requireUser();
  const person = await db.query.people.findFirst({ where: eq(people.email, user.email) });
  const entitlements = person ? await getUserPackEntitlements(person.id) : [];

  return (
    <AdminPage width="wide">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-h2)",
            fontWeight: "var(--weight-medium)" as never,
          }}
        >
          Your purchases
        </h1>
        <Link
          href="/admin/marketplace/products"
          style={{ fontSize: "var(--text-sm)", color: "var(--accent)" }}
        >
          ← Pack products
        </Link>
      </div>
      <p
        style={{
          margin: "0 0 var(--space-8)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          maxWidth: 640,
        }}
      >
        Packs you&apos;ve purchased from this storefront. Download a pack as a .pack.json file, or
        install it directly into this instance.
        {!person ? " (No CRM person record matches your admin email — purchases are tracked by buyer email.)" : ""}
      </p>
      <PurchasesScreen entitlements={entitlements} />
    </AdminPage>
  );
}
