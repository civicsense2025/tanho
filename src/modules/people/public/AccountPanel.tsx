"use client";

import { useState, useTransition } from "react";
import { signoutAction, selfExportAction } from "../account-actions";
import { unsubscribeAction } from "../newsletter-actions";
import { Button } from "@/components/core/Button";
import styles from "./account.module.css";

export type AccountData = {
  name: string;
  email: string;
  memberActive: boolean;
  tier: string | null;
  since: number | null;
  currentPeriodEnd: number | null;
  subscriptions: Array<{ list: string; status: string }>;
  selfExport: boolean;
};

const fmt = (ms: number | null) =>
  ms ? new Date(ms).toISOString().slice(0, 10) : "—";

/** Reader account page body — membership, subscriptions, data export, sign out. */
export function AccountPanel({ data }: { data: AccountData }) {
  const [subs, setSubs] = useState(data.subscriptions);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unsubscribe = (list: string) =>
    startTransition(async () => {
      const res = await unsubscribeAction({ list });
      setFlash(res.message);
      if (res.ok) {
        setSubs((prev) =>
          prev.map((s) => (s.list === list ? { ...s, status: "unsubscribed" } : s)),
        );
      }
    });

  const download = () =>
    startTransition(async () => {
      const res = await selfExportAction();
      if (!res.ok) {
        setFlash(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.name}>{data.name || data.email}</h1>
          <p className={styles.email}>{data.email}</p>
        </div>
        <form action={signoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardHead}>Membership</h2>
        {data.memberActive ? (
          <dl className={styles.meta}>
            <div>
              <dt>Plan</dt>
              <dd>{data.tier ?? "Member"}</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd className={styles.mono}>{fmt(data.since)}</dd>
            </div>
            <div>
              <dt>Renews</dt>
              <dd className={styles.mono}>{fmt(data.currentPeriodEnd)}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.faint}>Free — no paid membership.</p>
        )}
        <p className={styles.billing}>Billing is managed securely; card details never touch this site.</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardHead}>Email subscriptions</h2>
        {subs.length === 0 ? (
          <p className={styles.faint}>You&apos;re not subscribed to any lists.</p>
        ) : (
          <ul className={styles.subs}>
            {subs.map((s) => (
              <li key={s.list} className={styles.sub}>
                <span className={styles.subList}>{s.list}</span>
                <span className={styles.subStatus} data-status={s.status}>
                  {s.status}
                </span>
                {s.status === "subscribed" ? (
                  <button
                    type="button"
                    className={styles.link}
                    disabled={pending}
                    onClick={() => unsubscribe(s.list)}
                  >
                    Unsubscribe
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className={styles.note}>
          Unsubscribes are honored — re-enabling requires a fresh opt-in.
        </p>
      </section>

      {data.selfExport ? (
        <section className={styles.card}>
          <h2 className={styles.cardHead}>Your data</h2>
          <Button variant="outline" size="sm" onClick={download} loading={pending}>
            Download my data
          </Button>
        </section>
      ) : null}

      {flash ? <p className={styles.flash}>{flash}</p> : null}
    </div>
  );
}
