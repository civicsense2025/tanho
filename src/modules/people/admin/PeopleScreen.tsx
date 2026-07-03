"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EntityList,
  type EntityListColumn,
} from "@/components/admin/EntityList";
import {
  matchesSegment,
  type PersonListItem,
  type Segment,
} from "../queries";
import { addTag, deletePeople, exportPeopleCsv, removeTag } from "../admin-actions";
import { SegmentPills } from "./SegmentPills";
import { InviteButton } from "./InviteButton";
import { personColumns } from "./peopleColumns";
import styles from "./people.module.css";

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** People CRM list — segment pills + shared EntityList with bulk actions. */
export function PeopleScreen({
  people,
  counts,
}: {
  people: PersonListItem[];
  counts: Record<Segment, number>;
}) {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("all-active");
  const [, startTransition] = useTransition();

  const items = useMemo(
    () => people.filter((p) => matchesSegment(p, segment)),
    [people, segment],
  );

  const columns: EntityListColumn<PersonListItem>[] = personColumns;

  const bulk = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>People</h1>
        <span style={{ flex: 1 }} />
        <InviteButton />
      </div>

      <SegmentPills active={segment} counts={counts} onSelect={setSegment} />

      <EntityList
        items={items}
        getId={(p) => p.id}
        columns={columns}
        getTitle={(p) => p.name || p.email}
        getSubtitle={(p) => p.email}
        searchValues={(p) => [p.name, p.email, p.company, ...(p.tags ?? [])]}
        editHref={(p) => `/admin/people/${p.id}`}
        onRowClick={(p) => router.push(`/admin/people/${p.id}`)}
        selectable
        bulkActions={[
          {
            label: "Email",
            onAction: (_ids, rows) => {
              const emails = rows.map((p) => p.email).filter(Boolean);
              if (emails.length) window.location.href = `mailto:?bcc=${emails.join(",")}`;
            },
          },
          {
            label: "Add tag",
            onAction: (ids) => {
              const tag = window.prompt("Tag to add");
              if (tag) bulk(() => addTag(ids, tag));
            },
          },
          {
            label: "Remove tag",
            onAction: (ids) => {
              const tag = window.prompt("Tag to remove");
              if (tag) bulk(() => removeTag(ids, tag));
            },
          },
          {
            label: "Export CSV",
            onAction: () =>
              startTransition(async () => {
                const res = await exportPeopleCsv(segment);
                if (res.ok && res.data) download(`people-${segment}.csv`, res.data);
              }),
          },
          {
            label: "Remove",
            tone: "danger",
            onAction: (ids) => {
              if (window.confirm(`Remove ${ids.length} ${ids.length === 1 ? "person" : "people"}? This can't be undone.`)) {
                bulk(() => deletePeople(ids));
              }
            },
          },
        ]}
        emptyLabel="No people in this segment yet."
        noun="Person"
      />
    </main>
  );
}
