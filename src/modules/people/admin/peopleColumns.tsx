import type { EntityListColumn } from "@/components/admin/EntityList";
import type { PersonListItem } from "../queries";
import styles from "./people.module.css";

const KIND_LABEL: Record<string, string> = {
  member: "Member",
  subscriber: "Subscriber",
  lead: "Lead",
};

const day = (ms: number | null) =>
  ms ? new Date(ms).toISOString().slice(0, 10) : "—";

/** Columns for the people list: role, membership, subscription dot, last active. */
export const personColumns: EntityListColumn<PersonListItem>[] = [
  {
    key: "kind",
    header: "Role",
    render: (p) => <span className={styles.role}>{KIND_LABEL[p.kind] ?? p.kind}</span>,
  },
  {
    key: "membership",
    header: "Membership",
    render: (p) =>
      p.membershipTier ? (
        <span>{p.membershipTier}</span>
      ) : (
        <span className={styles.faint}>Free</span>
      ),
  },
  {
    key: "subscription",
    header: "Subscription",
    render: (p) => (
      <span className={styles.subDot}>
        <span
          className={styles.dot}
          style={{
            background: p.subscribed ? "var(--accent-2)" : "var(--text-faint)",
          }}
        />
        {p.subscribed ? "Subscribed" : "—"}
      </span>
    ),
  },
  {
    key: "lastActive",
    header: "Last active",
    align: "end",
    render: (p) => <span className={styles.mono}>{day(p.lastActiveAt)}</span>,
  },
];
