import Link from "next/link";
import type { AdminUser } from "@/modules/auth/session";
import { AccountMenu } from "./AccountMenu";
import { NavBucket, type NavItem } from "./NavBucket";

/**
 * Admin chrome — faithful to the design's AdminScreen top bar. A header row
 * (presence on the left; View-site + account menu on the right) over a divider,
 * then the secondary nav as grouped dropdown BUCKETS (not a flat link list, and
 * no redundant "Dashboard"/"Admin" — the account menu owns identity, and the
 * dashboard is where you land). `ecomOn` locks the Shop bucket; `setupComplete`
 * drops the Settings indicator dot.
 */
export function AdminTopBar({
  user,
  ecomOn = false,
  setupComplete = true,
  shopVisible = true,
}: {
  user: AdminUser;
  ecomOn?: boolean;
  setupComplete?: boolean;
  /** False when BOTH products and collections are disabled in Settings → Content types — hides the whole Shop bucket. */
  shopVisible?: boolean;
}) {
  const shopItems: NavItem[] = ecomOn
    ? [
      { label: "Orders", href: "/admin/shop/orders" },
      { label: "Products", href: "/admin/shop/products" },
      { label: "Collections", href: "/admin/shop/collections" },
      { label: "Shipping", href: "/admin/shop/shipping" },
    ]
    : [
      { label: "Orders", href: "/admin/shop/products", locked: true },
      { label: "Products", href: "/admin/shop/products", locked: true },
      { label: "Collections", href: "/admin/shop/products", locked: true },
      { label: "Shipping", href: "/admin/shop/products", locked: true },
    ];

  return (
    <header
      style={{
        maxWidth: "var(--width-prose)",
        margin: "0 auto",
        padding: "var(--space-6) var(--gutter) 0",
      }}
    >
      {/* Header row: presence (left) · notifications/view-site/account (right). */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          paddingBottom: "var(--space-4)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Presence user={user} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textDecoration: "none" }}
          >
            ← View site
          </Link>
          <span style={{ width: 1, height: 24, background: "var(--border)" }} />
          <AccountMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </div>

      {/* Secondary nav — grouped dropdown buckets; Settings pushed right. */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-6)",
          padding: "var(--space-4) 0",
          flexWrap: "wrap",
        }}
      >
        <NavBucket label="Nav" items={[
          { label: "Header", href: "/admin/nav/header" },
          { label: "Footer", href: "/admin/nav/footer" },
          { label: "Menus", href: "/admin/nav/menus" },
        ]} />
        <NavBucket label="Content" items={[
          { label: "Pages", href: "/admin/pages" },
          { label: "Content types", href: "/admin/content/types" },
          { label: "Forms", href: "/admin/content/forms" },
          { label: "Media library", href: "/admin/media" },
          { label: "Tags", href: "/admin/content/tags" },
          { label: "Redirects", href: "/admin/content/redirects" },
          { label: "Import content", href: "/admin/content/import" },
          // Reusable design assets — separated from the content you author above.
          { label: "Block packs", href: "/admin/block-packs", group: "Reusable" },
          { label: "Design packs", href: "/admin/design-packs" },
        ]} />
        <NavBucket label="People" items={[
          { label: "All people", href: "/admin/people" },
          { label: "Reader digest", href: "/admin/people/digest" },
          { label: "People settings", href: "/admin/settings/people" },
        ]} />
        <NavBucket label="Growth" items={[
          { label: "Scheduling", href: "/admin/scheduling" },
          { label: "SEO", href: "/admin/growth/seo" },
        ]} />
        <NavBucket label="Analytics" items={[
          { label: "Overview", href: "/admin/analytics/overview" },
          { label: "Traffic", href: "/admin/analytics/traffic" },
        ]} />
        {shopVisible ? <NavBucket label="Shop" items={shopItems} /> : null}
        <span style={{ flex: 1 }} />
        <NavBucket label="Settings" indicator={!setupComplete} items={[
          { label: "Setup guide", href: "/admin/onboarding" },
          { label: "General", href: "/admin/settings/general" },
          { label: "Brand", href: "/admin/settings/brand" },
          { label: "Data sources", href: "/admin/settings/data-sources" },
          { label: "Membership", href: "/admin/settings/membership" },
          { label: "Payments", href: "/admin/settings/payments" },
          { label: "Donations", href: "/admin/settings/donations" },
          { label: "AI & crawlers", href: "/admin/settings/ai" },
          { label: "Policies", href: "/admin/settings/policies" },
        ]} />
      </nav>
    </header>
  );
}

/** Presence cluster — the current owner shown as online. */
function Presence({ user }: { user: AdminUser }) {
  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        title={`${user.name} · online`}
        style={{
          position: "relative",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--maroon-tint)",
          color: "var(--accent)",
          border: "2px solid var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          fontWeight: 500,
        }}
      >
        {initials}
        <span
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "var(--success)",
            border: "2px solid var(--bg)",
          }}
        />
      </span>
    </div>
  );
}
