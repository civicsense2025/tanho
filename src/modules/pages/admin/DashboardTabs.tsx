"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PagesList } from "./PagesList";
import type { PageRow } from "@/modules/pages/queries";
import type { CodePageSummary } from "@/app/(public)/code-pages/registry";
import { get } from "@/entities/registry";
import type { EntryRow } from "@/modules/entries/schema";
import { EntityList, StatusChip, type EntityListColumn } from "@/components/admin/EntityList";

type TabId = "pages" | "posts" | "projects" | "guides" | "resources";

/** Content types backed by the shared entries table (see ContentScreen). */
const ENTITY_TABS: Record<"projects" | "guides" | "resources", string> = {
  projects: "project",
  guides: "guide",
  resources: "resource",
};

/** Renders one list-column cell value from an entry — mirrors ContentScreen's renderCell. */
function renderCell(item: EntryRow, key: string): React.ReactNode {
  if (key === "status") return <StatusChip status={item.status} />;

  const value = item.data[key];

  if (Array.isArray(value)) {
    return (
      <span style={{ color: "var(--text-faint)" }}>
        {value.map((v) => String(v)).join(" · ")}
      </span>
    );
  }

  if (typeof value === "boolean") {
    const color = value ? "var(--accent-2)" : "var(--text-faint)";
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
        {value ? "Public" : "Internal"}
      </span>
    );
  }

  return value === undefined || value === null ? "" : String(value);
}

/**
 * Dashboard content tabs — the design's Pages / Posts / Projects / Guides /
 * Resources pill row with counts. Every tab renders its entity list inline:
 * Pages/Posts use the embedded PagesList; the entries-backed tabs (Projects,
 * Guides, Resources) reuse the shared EntityList primitive with the same
 * column mapping ContentScreen uses, so behavior stays consistent with the
 * full /admin/content/<type> screens. Rows there link out to that screen
 * (where the inline edit panel lives) rather than duplicating the create/edit
 * form on the dashboard.
 */
export function DashboardTabs({
  pages,
  posts,
  projects,
  guides,
  resources,
  codePages,
  counts,
}: {
  pages: PageRow[];
  posts: PageRow[];
  projects: EntryRow[];
  guides: EntryRow[];
  resources: EntryRow[];
  codePages: CodePageSummary[];
  counts: Record<TabId, number>;
}) {
  const [tab, setTab] = useState<TabId>("pages");

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "pages", label: "Pages" },
    { id: "posts", label: "Posts" },
    { id: "projects", label: "Projects" },
    { id: "guides", label: "Guides" },
    { id: "resources", label: "Resources" },
  ];

  return (
    <div style={{ marginBottom: "var(--space-10)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-5)" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
                fontWeight: active ? 500 : 400,
                background: active ? "var(--solid)" : "transparent",
                color: active ? "var(--text-on-accent)" : "var(--text-faint)",
                transition: "var(--transition)",
                whiteSpace: "nowrap",
              }}
            >
              {t.label} <span style={{ opacity: 0.65 }}>{counts[t.id]}</span>
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <Link href="/admin/pages/new" style={{ fontSize: "var(--text-sm)", color: "var(--accent)", textDecoration: "none" }}>
          + New page
        </Link>
      </div>

      {tab === "pages" && <PagesList pages={pages} codePages={codePages} />}
      {tab === "posts" && (
        posts.length ? <PagesList pages={posts} /> : <Empty label="No posts yet — create a page and tag it a post." />
      )}
      {tab === "projects" && <EntityTypeList entity="projects" items={projects} />}
      {tab === "guides" && <EntityTypeList entity="guides" items={guides} />}
      {tab === "resources" && <EntityTypeList entity="resources" items={resources} />}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
      {label}
    </div>
  );
}

/**
 * Inline entries list for a dashboard tab — reuses the shared EntityList
 * component and the same column mapping ContentScreen builds from the
 * entity's registry schema, so the dashboard view matches
 * /admin/content/<type> exactly. Rows link to that screen (where the entry's
 * inline edit panel opens on click).
 */
function EntityTypeList({
  entity,
  items,
}: {
  entity: keyof typeof ENTITY_TABS;
  items: EntryRow[];
}) {
  const router = useRouter();
  const type = ENTITY_TABS[entity];
  const schema = get(type);
  const href = `/admin/content/${entity}`;

  if (!schema) return <Empty label={`Unknown content type: ${type}`} />;

  const columns: EntityListColumn<EntryRow>[] = schema.listColumns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,
    render: (item) => renderCell(item, col.key),
  }));

  return (
    <EntityList
      items={items}
      getId={(item) => item.id}
      columns={columns}
      getTitle={(item) => item.title}
      getSubtitle={(item) => item.slug}
      getStatus={(item) => item.status}
      searchValues={(item) => [
        item.title,
        item.slug,
        ...Object.values(item.data).map((v) =>
          Array.isArray(v) ? v.map(String).join(" ") : String(v ?? ""),
        ),
      ]}
      onRowClick={() => router.push(href)}
      emptyLabel={`No ${schema.plural.toLowerCase()} yet. Create your first one.`}
      noun={schema.label}
    />
  );
}
