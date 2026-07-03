"use client";

import { Section, Row } from "@/components/admin/Section";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";
import { Select } from "@/components/forms/Select";
import type { FormState } from "./product-form-state";

type Setter = <K extends keyof FormState>(k: K, v: FormState[K]) => void;

/** Inventory, Shipping and SEO sections — pure controlled inputs. */
export function ProductDetailSections({ s, set }: { s: FormState; set: Setter }) {
  return (
    <>
      <Section title="Inventory">
        <Row label="Track inventory">
          <Toggle value={s.trackInventory} onChange={(v) => set("trackInventory", v)} />
        </Row>
        <Row label="On hand">
          <Input type="number" value={s.inventory} onChange={(e) => set("inventory", e.target.value)} />
        </Row>
        <Row label="Low-stock threshold">
          <Input
            type="number"
            value={s.lowStockThreshold}
            onChange={(e) => set("lowStockThreshold", e.target.value)}
          />
        </Row>
        <Row label="Allow backorder">
          <Toggle value={s.allowBackorder} onChange={(v) => set("allowBackorder", v)} />
        </Row>
      </Section>

      <Section title="Shipping">
        <Row label="Weight">
          <Input value={s.weight} onChange={(e) => set("weight", e.target.value)} placeholder="0" />
        </Row>
        <Row label="Weight unit">
          <Seg
            value={s.weightUnit}
            onChange={(v) => set("weightUnit", v as FormState["weightUnit"])}
            options={[
              { value: "lb", label: "lb" },
              { value: "kg", label: "kg" },
            ]}
          />
        </Row>
        <Row label="Shipping class">
          <Select
            value={s.shippingClass}
            onChange={(e) => set("shippingClass", e.target.value as FormState["shippingClass"])}
          >
            <option value="standard">Standard</option>
            <option value="heavy">Heavy</option>
            <option value="digital">Digital</option>
          </Select>
        </Row>
      </Section>

      <Section title="SEO">
        <Row label="SEO title">
          <Input value={s.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </Row>
        <Row label="SEO description" stack>
          <Textarea rows={2} value={s.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
        </Row>
      </Section>
    </>
  );
}
