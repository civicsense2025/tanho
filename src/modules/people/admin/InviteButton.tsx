"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "../admin-actions";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import styles from "./people.module.css";

/** Invite a member — opens a small inline form, calls inviteMember. */
export function InviteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await inviteMember({ name, email });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setName("");
      setEmail("");
      router.refresh();
    });

  if (!open) {
    return (
      <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
        Invite
      </Button>
    );
  }

  return (
    <div className={styles.invite}>
      <Input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button size="sm" onClick={submit} loading={pending}>
        Send
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error ? <span className={styles.inviteErr}>{error}</span> : null}
    </div>
  );
}
