"use client";

import { Section, Row } from "@/components/admin/Section";
import { Seg } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import type { FormState } from "./product-form-state";
import { ALLOWED_FULFILLMENT_BY_KIND } from "../validation";

type Setter = <K extends keyof FormState>(k: K, v: FormState[K]) => void;
type SetS = (updater: (prev: FormState) => FormState) => void;

/** Type, billing, tax, and access-grant section — pure controlled inputs. */
export function ProductTypeSection({ s, set, setS, setFlash }: { s: FormState; set: Setter; setS: SetS; setFlash: (v: string | null) => void }) {
  return (
    <Section title="Type & billing" desc="What you're selling and how customers pay.">
      <Row label="Type">
        <Select
          value={s.kind}
          onChange={(e) => {
            const kind = e.target.value as FormState["kind"];
            setS((p) => ({
              ...p,
              kind,
              // Auto-derive fulfillment mode from kind. Server validation
              // enforces the kind→fulfillmentMode contract; this keeps the
              // form in sync so the user doesn't hit a validation error.
              fulfillmentMode: ALLOWED_FULFILLMENT_BY_KIND[kind][0],
            }));
            setFlash(null);
          }}
        >
          <option value="physical">Physical (ships)</option>
          <option value="digital">Digital (download / access)</option>
          <option value="service">Service (bookable)</option>
          <option value="course">Course (content unlock)</option>
        </Select>
      </Row>
      <Row label="Billing">
        <Seg
          value={s.billingModel}
          onChange={(v) => set("billingModel", v as FormState["billingModel"])}
          options={[
            { value: "one-time", label: "One-time" },
            { value: "recurring", label: "Recurring" },
          ]}
        />
      </Row>
      {s.billingModel === "recurring" ? (
        <Row label="Membership tier">
          <Input value={s.membershipTier} onChange={(e) => set("membershipTier", e.target.value)} placeholder="e.g. premium — must match a memberships tier" />
        </Row>
      ) : null}
      <Row label="Tax code">
        <Input value={s.taxCode} onChange={(e) => set("taxCode", e.target.value)} placeholder="Auto from type — edit only if you know the Stripe code" />
      </Row>
      <Row label="Tax behavior">
        <Seg
          value={s.taxBehavior}
          onChange={(v) => set("taxBehavior", v as FormState["taxBehavior"])}
          options={[
            { value: "exclusive", label: "Add at checkout" },
            { value: "inclusive", label: "Included in price" },
          ]}
        />
      </Row>
      {s.kind === "course" || s.kind === "digital" ? (
        <>
          <Row label="Access grant type">
            <Select value={s.accessGrantTargetType} onChange={(e) => set("accessGrantTargetType", e.target.value as FormState["accessGrantTargetType"])}>
              <option value="">— none —</option>
              <option value="entry">Entry (page / content)</option>
              <option value="membership">Membership tier</option>
              <option value="pack">Pack (block / design)</option>
              <option value="download">Download URL</option>
            </Select>
          </Row>
          {s.accessGrantTargetType ? (
            <Row label="Access grant target">
              <Input
                value={s.accessGrantTargetId}
                onChange={(e) => set("accessGrantTargetId", e.target.value)}
                placeholder={
                  s.accessGrantTargetType === "entry"
                    ? "entry id"
                    : s.accessGrantTargetType === "membership"
                      ? "tier slug"
                      : s.accessGrantTargetType === "pack"
                        ? "packType:entryId"
                        : "download url"
                }
              />
            </Row>
          ) : null}
        </>
      ) : null}
    </Section>
  );
}
