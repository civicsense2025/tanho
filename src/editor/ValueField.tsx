"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import { MediaPicker } from "@/modules/media/admin/MediaPicker";
import { InsertFieldToken } from "./InsertFieldToken";
import { RichTextEditor } from "./RichTextEditor";

/** Field names that store a media-library URL or https image/video path.
 *  Adding a name here wires the MediaPicker + URL input combo in the inspector. */
const MEDIA_FIELDS = new Set([
  "src",        // image, video, logo, gallery items, carousel slides, lottie
  "poster",     // video poster image
  "beforeSrc",  // before-after block
  "afterSrc",   // before-after block
  "avatar",     // testimonial items
  "image",      // productgrid
]);

/** Best-practice hints shown below media fields. Keyed by field name. */
const MEDIA_HINTS: Record<string, string> = {
  src: "Pick from the media library or paste a URL.",
  poster: "Optional poster image shown before the video plays.",
  beforeSrc: "The \"before\" image — pick from the media library or paste a URL.",
  afterSrc: "The \"after\" image — pick from the media library or paste a URL.",
  avatar: "Optional avatar or logo image.",
  image: "Product image — pick from the media library or paste a URL.",
};

/** Video-specific hint: for the video block's `src` field, suggest using the
 *  embed block for YouTube/Vimeo instead of hosting large video files. */
const VIDEO_SRC_HINT =
  "For YouTube, Vimeo, or other hosted videos, use the Embed block instead — " +
  "it loads faster and saves bandwidth. This field is for self-hosted video files.";

type Value = unknown;
type OnChange = (v: Value) => void;

const label = (k: string) =>
  k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/**
 * Generic value-driven control: renders an editor for any JSON value shape.
 * Phase 3's block form — per-kind smart fields replace this in Phase 4.
 */
export function ValueField({
  name,
  value,
  onChange,
  enumOptions,
  itemEnumOptions,
  blockType,
}: {
  name: string;
  value: Value;
  onChange: OnChange;
  /** When provided AND value is a string, render a Select dropdown with these
   *  options instead of a free-text Input. Extracted from the block's zod schema
   *  by the caller (Inspector.tsx) for enum-typed fields. */
  enumOptions?: readonly string[];
  /** When the value is an array of objects, this maps each item key to its
   *  enum options (if any). Lets nested array items render Select dropdowns
   *  for their enum fields (e.g. buttons items: variant, target). */
  itemEnumOptions?: Record<string, readonly string[]>;
  /** The block type — used to show block-specific hints (e.g. video src). */
  blockType?: string;
}) {
  if (name === "blocks" || name === "hideOn" || name === "_resolved") return null;
  // richtext edits `html` via TipTap (RichTextEditor); `md` stays in storage as
  // a legacy fallback but is no longer surfaced — Render still renders md-only
  // content on the published page.
  if (blockType === "richtext" && name === "md") return null;

  if (typeof value === "boolean") {
    return (
      <Field label={label(name)}>
        <Toggle value={value} onChange={onChange} />
      </Field>
    );
  }
  if (typeof value === "number") {
    return (
      <Field label={label(name)}>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </Field>
    );
  }
  if (typeof value === "string") {
    // Enum fields: render a Select dropdown with the schema's options.
    if (enumOptions && enumOptions.length > 0) {
      return (
        <Field label={label(name)}>
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            {enumOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
      );
    }
    if (MEDIA_FIELDS.has(name)) {
      // Video block's src gets a special hint suggesting the Embed block for
      // hosted videos (YouTube/Vimeo) instead of large self-hosted files.
      const hint = blockType === "video" && name === "src" ? VIDEO_SRC_HINT : MEDIA_HINTS[name];
      return (
        <Field label={label(name)} hint={hint}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <MediaPicker value={value} onChange={onChange} />
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/api/media/… or https://…" />
          </div>
        </Field>
      );
    }
    // richtext: a single TipTap rich editor owns the `html` field.
    if (blockType === "richtext" && name === "html") {
      return (
        <Field label="Content">
          <RichTextEditor value={value} onChange={onChange} />
        </Field>
      );
    }
    const long = value.length > 80 || name === "md" || name === "html" || name === "code" || name === "body";
    return (
      <Field label={label(name)}>
        {long ? (
          <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {/* In a content-type template editor, offer a one-click {{field}} insert
            so owners don't have to remember/type token syntax. No-op elsewhere. */}
        <InsertFieldToken onInsert={(token) => onChange(`${value}${token}`)} />
      </Field>
    );
  }
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string")) {
      return (
        <Field label={label(name)} hint="One item per line">
          <Textarea
            rows={Math.min(6, value.length + 1)}
            value={(value as string[]).join("\n")}
            onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
          />
        </Field>
      );
    }
    return (
      <Field label={label(name)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {(value as Record<string, unknown>[]).map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {Object.entries(item).map(([k, v]) => (
                <ValueField
                  key={k}
                  name={k}
                  value={v}
                  enumOptions={itemEnumOptions?.[k]}
                  blockType={blockType}
                  onChange={(nv) => {
                    const next = value.slice() as Record<string, unknown>[];
                    next[i] = { ...item, [k]: nv };
                    onChange(next);
                  }}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const proto = (value[0] ?? {}) as Record<string, unknown>;
              const blank = Object.fromEntries(
                Object.entries(proto).map(([k, v]) => [
                  k,
                  typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : "",
                ]),
              );
              onChange([...value, blank]);
            }}
          >
            + Add item
          </Button>
        </div>
      </Field>
    );
  }
  return null;
}
