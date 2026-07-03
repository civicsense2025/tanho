import type { EntityListColumn } from "@/components/admin/EntityList";
import { StatusChip } from "@/components/admin/EntityList";
import { formatCents } from "../money";
import type { OrderRow } from "../queries";
import styles from "./commerce.module.css";

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Columns for the orders list: email, date, total, status. */
export const orderColumns: EntityListColumn<OrderRow>[] = [
  {
    key: "email",
    header: "Customer",
    render: (o) => <span>{o.email}</span>,
  },
  {
    key: "date",
    header: "Date",
    render: (o) => <span className={styles.mono}>{day(o.placedAt)}</span>,
  },
  {
    key: "total",
    header: "Total",
    render: (o) => <span>{formatCents(o.totalCents, o.currency)}</span>,
  },
  {
    key: "status",
    header: "Status",
    align: "end",
    render: (o) => <StatusChip status={o.status} />,
  },
];
