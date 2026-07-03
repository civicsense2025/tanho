"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { impersonate } from "../admin-actions";
import { StatusChip } from "@/components/admin/EntityList";
import { Button } from "@/components/core/Button";
import styles from "./profile.module.css";

function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/\s+|@/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

/** Profile header: initials avatar, name/email, kind + status pills, actions. */
export function ProfileHeader({
  personId,
  name,
  email,
  kind,
  status,
  isOwner,
}: {
  personId: string;
  name: string;
  email: string;
  kind: string;
  status: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const startImpersonate = () =>
    startTransition(async () => {
      if (!window.confirm(`Impersonate ${email}? This is logged.`)) return;
      const res = await impersonate(personId);
      if (res.ok) router.push("/account");
    });

  return (
    <header className={styles.header}>
      <span className={styles.avatar} aria-hidden>
        {initials(name, email)}
      </span>
      <div className={styles.headerMain}>
        <h1 className={styles.name}>{name || email}</h1>
        <p className={styles.email}>{email}</p>
        <div className={styles.pills}>
          <span className={styles.kindPill}>{kind}</span>
          <StatusChip status={status} />
        </div>
      </div>
      <span style={{ flex: 1 }} />
      <div className={styles.headerActions}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.href = `mailto:${email}`;
          }}
        >
          Email
        </Button>
        {isOwner ? (
          <Button size="sm" variant="ghost" onClick={startImpersonate} loading={pending}>
            Impersonate
          </Button>
        ) : null}
      </div>
    </header>
  );
}
