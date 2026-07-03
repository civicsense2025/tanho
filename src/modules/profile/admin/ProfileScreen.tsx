"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/modules/profile/actions";
import type { ProfileInput } from "@/modules/profile/validation";
import { Section, Row } from "@/components/admin/Section";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { Repeater } from "./RepeaterCard";
import { AvatarPicker } from "./AvatarPicker";
import styles from "./profile.module.css";

/** The profile / résumé editor — identity + four repeater sections. */
export function ProfileScreen({
  initial,
  initialAvatarUrl,
}: {
  initial: ProfileInput;
  initialAvatarUrl: string;
}) {
  const [s, setS] = useState<ProfileInput>(initial);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
    setFlash(null);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveProfile(s);
      if (res.error) setFlash(res.error);
      else {
        setDirty(false);
        setFlash("Saved ✓");
        setTimeout(() => setFlash(null), 1600);
      }
    });

  return (
    <main className={styles.screen}>
      <div className={styles.bar}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <span style={{ flex: 1 }} />
        {flash ? (
          <span
            className={styles.flash}
            style={{ color: flash.includes("✓") ? "var(--success)" : "var(--accent)" }}
          >
            {flash}
          </span>
        ) : null}
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {dirty ? "Save •" : "Save"}
        </Button>
      </div>

      <Section title="Identity" desc="The hero of your home page — name, bio and avatar.">
        <Row label="Name">
          <Input value={s.name} onChange={(e) => set("name", e.target.value)} />
        </Row>
        <Row label="Bio" stack>
          <Textarea rows={4} value={s.bio} onChange={(e) => set("bio", e.target.value)} />
        </Row>
        <Row label="Avatar">
          <AvatarPicker
            url={avatarUrl}
            onChange={(mediaId, url) => {
              set("avatarMediaId", mediaId);
              setAvatarUrl(url);
            }}
          />
        </Row>
      </Section>

      <Repeater
        title="Experience"
        rows={s.experience}
        onChange={(rows) => set("experience", rows)}
        blank={() => ({ span: "", role: "", org: "", note: "" })}
        renderRow={(row, update) => (
          <div className={styles.grid2}>
            <Input
              placeholder="Span (e.g. 2021 — Now)"
              value={row.span}
              onChange={(e) => update({ span: e.target.value })}
            />
            <Input
              placeholder="Role"
              value={row.role}
              onChange={(e) => update({ role: e.target.value })}
            />
            <Input
              placeholder="Organisation"
              value={row.org}
              onChange={(e) => update({ org: e.target.value })}
            />
            <Input
              placeholder="Note"
              value={row.note}
              onChange={(e) => update({ note: e.target.value })}
            />
          </div>
        )}
      />

      <Repeater
        title="Skills"
        rows={s.skills}
        onChange={(rows) => set("skills", rows)}
        blank={() => ({ group: "", items: [] })}
        addLabel="Add group"
        renderRow={(row, update) => (
          <div className={styles.grid1}>
            <Input
              placeholder="Group (e.g. Design)"
              value={row.group}
              onChange={(e) => update({ group: e.target.value })}
            />
            <Input
              placeholder="Skills, comma separated"
              value={row.items.join(", ")}
              onChange={(e) =>
                update({
                  items: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        )}
      />

      <Repeater
        title="Awards"
        rows={s.awards}
        onChange={(rows) => set("awards", rows)}
        blank={() => ({ title: "", org: "", year: "", tone: "accent" as const })}
        renderRow={(row, update) => (
          <div className={styles.grid2}>
            <Input
              placeholder="Title"
              value={row.title}
              onChange={(e) => update({ title: e.target.value })}
            />
            <Input
              placeholder="Organisation"
              value={row.org}
              onChange={(e) => update({ org: e.target.value })}
            />
            <Input
              placeholder="Year"
              value={row.year}
              onChange={(e) => update({ year: e.target.value })}
            />
            <Select
              value={row.tone}
              onChange={(e) => update({ tone: e.target.value as "accent" | "accent2" })}
            >
              <option value="accent">Accent</option>
              <option value="accent2">Accent 2</option>
            </Select>
          </div>
        )}
      />

      <Repeater
        title="Education"
        rows={s.education}
        onChange={(rows) => set("education", rows)}
        blank={() => ({ span: "", school: "", degree: "" })}
        renderRow={(row, update) => (
          <div className={styles.grid2}>
            <Input
              placeholder="Span"
              value={row.span}
              onChange={(e) => update({ span: e.target.value })}
            />
            <Input
              placeholder="School"
              value={row.school}
              onChange={(e) => update({ school: e.target.value })}
            />
            <Input
              placeholder="Degree"
              value={row.degree}
              onChange={(e) => update({ degree: e.target.value })}
            />
          </div>
        )}
      />
    </main>
  );
}
