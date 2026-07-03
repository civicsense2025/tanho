"use client";

import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import type { Editor } from "./FormBuilder";

/** Settings tab — submission behaviour, CRM routing, spam, quiz options. */
export function SettingsTab({ editor }: { editor: Editor }) {
  const { settings, type } = editor.draft;
  const s = settings;
  const set = editor.patchSettings;

  return (
    <>
      <Section title="After submit" desc="What the visitor sees, and where their data goes.">
        <Row label="Submit label">
          <Input value={s.submitLabel} onChange={(e) => set({ submitLabel: e.target.value })} />
        </Row>
        <Row label="On submit">
          <Seg
            value={s.postSubmit}
            onChange={(v) => set({ postSubmit: v as "message" | "redirect" })}
            options={[
              { value: "message", label: "Show message" },
              { value: "redirect", label: "Redirect" },
            ]}
          />
        </Row>
        {s.postSubmit === "message" ? (
          <Row label="Message" stack>
            <Input value={s.message} onChange={(e) => set({ message: e.target.value })} />
          </Row>
        ) : (
          <Row label="Redirect (path)">
            <Input
              value={s.redirect}
              placeholder="/thank-you"
              onChange={(e) => set({ redirect: e.target.value })}
            />
          </Row>
        )}
      </Section>

      <Section title="Store responses" desc="Route submissions into the CRM.">
        <Row label="Store in">
          <Seg
            value={s.storeIn}
            onChange={(v) => set({ storeIn: v as "contacts" | "subscribers" | "leads" | "none" })}
            options={[
              { value: "none", label: "Don't store" },
              { value: "contacts", label: "Contacts" },
              { value: "subscribers", label: "Subscribers" },
              { value: "leads", label: "Leads" },
            ]}
          />
        </Row>
        {s.storeIn === "subscribers" ? (
          <Row label="Double opt-in">
            <Toggle value={s.doubleOptIn} onChange={(v) => set({ doubleOptIn: v })} />
          </Row>
        ) : null}
        <Row label="Tag on submit">
          <Input
            value={s.tagOnSubmit.join(", ")}
            placeholder="lead, newsletter"
            onChange={(e) =>
              set({
                tagOnSubmit: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </Row>
      </Section>

      <Section title="Protection & access">
        <Row label="Spam filter">
          <Toggle value={s.spam} onChange={(v) => set({ spam: v })} />
        </Row>
        <Row label="Require login">
          <Toggle value={s.requireLogin} onChange={(v) => set({ requireLogin: v })} />
        </Row>
        <Row label="Notify me">
          <Toggle value={s.notify} onChange={(v) => set({ notify: v })} />
        </Row>
        {s.notify ? (
          <Row label="Notify to">
            <Input
              type="email"
              value={s.notifyTo}
              onChange={(e) => set({ notifyTo: e.target.value })}
            />
          </Row>
        ) : null}
      </Section>

      {type === "quiz" ? (
        <Section title="Quiz">
          <Row label="Show score">
            <Toggle value={s.quizShowScore} onChange={(v) => set({ quizShowScore: v })} />
          </Row>
          <Row label="Pass mark">
            <Input
              type="number"
              min={0}
              value={s.quizPassMark}
              onChange={(e) => set({ quizPassMark: Number(e.target.value) || 0 })}
            />
          </Row>
        </Section>
      ) : null}
    </>
  );
}
