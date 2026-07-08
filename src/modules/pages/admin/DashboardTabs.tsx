"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PagesList } from "./PagesList";
import type { PageRow } from "@/modules/pages/queries";
import type { CodePageSummary } from "@/app/(public)/code-pages/registry";
import { get } from "@/entities/registry";
import type { EntryRow } from "@/modules/entries/schema";
import type { EntitySchemaSummary } from "@/entities/types";
import type { FieldDef } from "@/modules/custom-types/validation";
import { EntityList, StatusChip, type EntityListColumn } from "@/components/admin/EntityList";
import { createBlankPage } from "@/modules/pages/actions";
import { createBlankEntry, deleteEntry } from "@/modules/entries/actions";

/**
 * Built-in content tabs. `entity` is the type key used for disabled-type
 * filtering and for routing entry-backed tabs to the block editor.
 */
const BUILT_IN_TABS: Array<{
  id: string;
  label: string;
  kind: "page" | "post" | "entry";
  entity: string;
}> = [
    { id: "pages", label: "Pages", kind: "page", entity: "page" },
    { id: "posts", label: "Posts", kind: "post", entity: "post" },
    { id: "projects", label: "Projects", kind: "entry", entity: "project" },
    { id: "guides", label: "Guides", kind: "entry", entity: "guide" },
    { id: "resources", label: "Resources", kind: "entry", entity: "resource" },
  ];

type CustomTypeTab = {
  slug: string;
  name: string;
  plural: string;
  entity: string;
  items: EntryRow[];
  schema?: EntitySchemaSummary;
  customFields?: FieldDef[];
};

/** Renders one list-column cell value from an entry — mirrors the old ContentScreen. */
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
 * Resources pill row with counts. This is the single content list; rows and the
 * "+ New ..." button open the block editor directly, so there are no
 * intermediary list screens.
 */
export function DashboardTabs({
  pages,
  posts,
  projects,
  guides,
  resources,
  customTypes,
  codePages,
  counts,
  disabledTypes,
}: {
  pages: PageRow[];
  posts: PageRow[];
  projects: EntryRow[];
  guides: EntryRow[];
  resources: EntryRow[];
  customTypes: CustomTypeTab[];
  codePages: CodePageSummary[];
  counts: {
    pages: number;
    posts: number;
    projects: number;
    guides: number;
    resources: number;
    custom: Record<string, number>;
  };
  disabledTypes: Set<string>;
}) {
  const builtInTabs = BUILT_IN_TABS.filter((t) => !disabledTypes.has(t.entity));
  const customTabs = customTypes.map((t) => ({
    id: t.slug,
    label: t.name,
    plural: t.plural,
    kind: "entry" as const,
    entity: t.entity,
    items: t.items,
    schema: t.schema,
  }));
  const tabs = [...builtInTabs, ...customTabs];

  const [tab, setTab] = useState<string>("pages");
  const [pending, start] = useTransition();

  const activeTab = tabs.find((t) => t.id === tab);

  const handleCreate = () => {
    if (!activeTab) return;
    start(async () => {
      if (activeTab.kind === "page") {
        await createBlankPage("page");
      } else if (activeTab.kind === "post") {
        await createBlankPage("post");
      } else {
        await createBlankEntry(activeTab.entity, activeTab.label);
      }
    });
  };

  const newLabel = activeTab ? `+ New ${activeTab.label.toLowerCase()}` : "+ New";

  return (
    <div style={{ marginBottom: "var(--space-10)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-5)" }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          const count = t.kind === "entry" ? (t.id === "projects" ? counts.projects : t.id === "guides" ? counts.guides : t.id === "resources" ? counts.resources : counts.custom[t.id] ?? 0) : counts[t.id as "pages" | "posts"];
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
                fontFamily: "var(--font-sans)",
                fontWeight: active ? 500 : 400,
                background: active ? "var(--solid)" : "transparent",
                color: active ? "var(--text-on-accent)" : "var(--text-faint)",
                transition: "var(--transition)",
                whiteSpace: "nowrap",
                opacity: active ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.opacity = "0.6";
                  e.currentTarget.style.color = "var(--text-faint)";
                }
              }}
            >
              {t.label} <span style={{ opacity: 0.65 }}>{count}</span>
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--accent)",
            textDecoration: "none",
            background: "none",
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {newLabel}
        </button>
      </div>

      {tab === "pages" && <PagesList pages={pages} codePages={codePages} onCreate={() => start(() => createBlankPage("page"))} />}
      {tab === "posts" && (
        posts.length ? <PagesList pages={posts} onCreate={() => start(() => createBlankPage("post"))} /> : <Empty label="No posts yet — create a page and tag it a post." />
      )}
      {tab === "projects" && <EntityTypeList entity="project" items={projects} />}
      {tab === "guides" && <EntityTypeList entity="guide" items={guides} />}
      {tab === "resources" && <EntityTypeList entity="resource" items={resources} />}
      {customTabs.map((t) => (
        tab === t.id ? (
          <EntityTypeList
            key={t.id}
            entity={t.entity}
            items={t.items}
            schema={t.schema}
          />
        ) : null
      ))}
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
 * Inline entries list for a dashboard tab. Rows open the block editor directly.
 */
function EntityTypeList({
  entity,
  items,
  schema,
}: {
  entity: string;
  items: EntryRow[];
  schema?: EntitySchemaSummary;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const resolvedSchema = schema ?? get(entity);

  if (!resolvedSchema) return <Empty label={`Unknown content type: ${entity}`} />;

  const columns: EntityListColumn<EntryRow>[] = resolvedSchema.listColumns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,
    render: (item) => renderCell(item, col.key),
  }));

  const editUrl = (id: string) => `/admin/edit/${encodeURIComponent(entity)}/${id}`;

  const remove = (ids: string[]) => {
    start(async () => {
      await Promise.all(ids.map((id) => deleteEntry(id)));
      router.refresh();
    });
  };

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
      onRowClick={(item) => router.push(editUrl(item.id))}
      selectable
      bulkActions={[
        { label: "Delete", tone: "danger", onAction: (ids) => remove(ids) },
      ]}
      emptyLabel={`No ${resolvedSchema.plural.toLowerCase()} yet. Create your first one with the button above.`}
      noun={resolvedSchema.label}
    />
  );
}
