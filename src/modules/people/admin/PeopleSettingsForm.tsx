"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/modules/settings/actions";
import type { PeopleSettings } from "../people-settings";
import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";

/** People settings screen — accounts, newsletter, profiles, privacy. Owner-only. */
export function PeopleSettingsForm({ initial }: { initial: PeopleSettings }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PeopleSettings>(k: K, v: PeopleSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings("people", s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: flash.includes("✓") ? "var(--success)" : "var(--danger)",
            }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section title="Accounts" desc="Who can sign up, and how new members are handled.">
        <Row label="Public sign-ups">
          <Seg
            value={s.signups}
            onChange={(v) => set("signups", v as PeopleSettings["signups"])}
            options={[
              { value: "open", label: "Open" },
              { value: "invite-only", label: "Invite only" },
            ]}
          />
        </Row>
        <Row label="Verify email">
          <Toggle value={s.verifyEmail} onChange={(v) => set("verifyEmail", v)} />
        </Row>
        <Row label="Approve members manually">
          <Toggle value={s.approveMembers} onChange={(v) => set("approveMembers", v)} />
        </Row>
        <Row label="Default role">
          <Seg
            value={s.defaultRole}
            onChange={(v) => set("defaultRole", v as PeopleSettings["defaultRole"])}
            options={[
              { value: "reader", label: "Reader" },
              { value: "subscriber", label: "Subscriber" },
              { value: "member", label: "Member" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Newsletter" desc="Signup, confirmation, and welcome behavior.">
        <Row label="Newsletter enabled">
          <Toggle value={s.newsletterEnabled} onChange={(v) => set("newsletterEnabled", v)} />
        </Row>
        <Row label="Double opt-in">
          <Toggle value={s.doubleOptIn} onChange={(v) => set("doubleOptIn", v)} />
        </Row>
        <Row label="Welcome email">
          <Toggle value={s.welcomeEmail} onChange={(v) => set("welcomeEmail", v)} />
        </Row>
        <Row label="Default list">
          <Input value={s.defaultList} onChange={(e) => set("defaultList", e.target.value)} />
        </Row>
      </Section>

      <Section title="Public profiles" desc="Member directory and public profile pages.">
        <Row label="Public profiles">
          <Toggle value={s.publicProfiles} onChange={(v) => set("publicProfiles", v)} />
        </Row>
        <Row label="Show avatars">
          <Toggle value={s.showAvatars} onChange={(v) => set("showAvatars", v)} />
        </Row>
        <Row label="Show joined date">
          <Toggle value={s.showJoined} onChange={(v) => set("showJoined", v)} />
        </Row>
        <Row label="Directory page">
          <Toggle value={s.directory} onChange={(v) => set("directory", v)} />
        </Row>
        <Row label="Profile URL base">
          <Input value={s.profileBase} onChange={(e) => set("profileBase", e.target.value)} />
        </Row>
        <Row label="Gravatar fallback">
          <Toggle value={s.gravatar} onChange={(v) => set("gravatar", v)} />
        </Row>
      </Section>

      <Section title="Privacy" desc="Activity retention and self-serve data export.">
        <Row label="Activity log">
          <Toggle value={s.activityLog} onChange={(v) => set("activityLog", v)} />
        </Row>
        <Row label="Self-serve data export">
          <Toggle value={s.selfExport} onChange={(v) => set("selfExport", v)} />
        </Row>
      </Section>
    </div>
  );
}
