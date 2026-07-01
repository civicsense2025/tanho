import { getAdminSession } from "@/lib/auth";
import { listContentEntries, listContentTypes } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { TextLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScheduledPage() {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");

  const [entries, types] = await Promise.all([
    listContentEntries({ status: "scheduled" }),
    listContentTypes(),
  ]);
  const typesById = new Map(types.map((t) => [t.id, t]));

  // A flat list, not a calendar -- unnecessary complexity for what's likely a handful of
  // scheduled items at a time. Sorted ascending so the soonest-to-publish entry is first,
  // matching the order the cron route itself processes them in.
  const sorted = [...entries].sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""));

  return (
    <AdminPageShell title="Scheduled">
      {sorted.length === 0 ? (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Nothing scheduled.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {sorted.map((e) => {
            const type = typesById.get(e.contentTypeId);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  {type?.icon && <span>{type.icon}</span>}
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{e.title}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>{type?.name || e.contentTypeId}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {e.scheduledAt ? new Date(e.scheduledAt).toLocaleString() : "—"}
                  </span>
                  <TextLink arrow="forward" muted href={`/admin/content-entries/${e.id}`} style={{ fontSize: "var(--text-xs)" }}>
                    Edit
                  </TextLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminPageShell>
  );
}
