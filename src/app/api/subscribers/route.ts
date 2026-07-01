import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listSubscribers } from "@/lib/db";

/** Escapes a value for a CSV cell: quote-wraps, doubles embedded quotes, and prefixes a leading
 * '=' '+' '-' '@' (or tab/CR) with a single quote so spreadsheet apps never interpret a cell as
 * a formula (CSV/formula injection) -- `source` is attacker-influenceable via CSV subscriber
 * import, not just `email`. */
function csvCell(v: string | null): string {
  let s = v ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscribers = await listSubscribers();

  // ?format=csv → downloadable export (owner keeps their list — the whole point).
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const header = "email,status,source,created_at";
    const rows = subscribers.map((s) =>
      [csvCell(s.email), csvCell(s.status), csvCell(s.source), csvCell(s.createdAt)].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subscribers.csv"',
      },
    });
  }

  return NextResponse.json(subscribers);
}
