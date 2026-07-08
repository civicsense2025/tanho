import type { StyleState } from "@/blocks/common";
import type { Device } from "@/blocks/types";
import { layerKey } from "./style-fields-config";

/**
 * Immutable, breakpoint-safe write/delete helpers shared by the StyleFields
 * inspector. Extracted verbatim from the component — the logic is unchanged; it
 * just lives in a hook so the component stays under the file-size cap.
 *
 * Contract: `undefined`/"" DELETES a field key (reset), so a cleared override
 * falls through to base rather than clobbering it. An emptied layer collapses
 * to no key; an emptied bucket collapses to no top-level key.
 */
export function useStyleFieldsActions({
  content,
  onChange,
  key,
  styleState,
}: {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  key: "base" | "tablet" | "desktop";
  styleState: "default" | StyleState;
}) {
  /** Immutable, breakpoint-safe write into a `bucket` (style|layout). `undefined`
   *  DELETES the field key (reset), so a cleared override falls through to base
   *  rather than clobbering it. An emptied layer collapses to no key; an emptied
   *  bucket collapses to no top-level key. For the `style` bucket, a non-default
   *  `styleState` nests the write one level deeper into `[state]`. */
  function setField(bucket: "style" | "layout", field: string, value: string | undefined) {
    const container = (content[bucket] ?? {}) as Record<string, Record<string, unknown>>;
    const layerForKey = { ...(container[key] ?? {}) };

    if (bucket === "style" && styleState !== "default") {
      // Nested per-state write: style[key][state][field].
      const stateLayer = { ...((layerForKey[styleState] as Record<string, string>) ?? {}) };
      if (value === undefined || value === "") delete stateLayer[field];
      else stateLayer[field] = value;
      if (Object.keys(stateLayer).length) layerForKey[styleState] = stateLayer;
      else delete layerForKey[styleState];
    } else {
      if (value === undefined || value === "") delete layerForKey[field];
      else layerForKey[field] = value;
    }

    const nextContainer = { ...container };
    if (Object.keys(layerForKey).length) nextContainer[key] = layerForKey;
    else delete nextContainer[key];

    const nextContent = { ...content };
    if (Object.keys(nextContainer).length) nextContent[bucket] = nextContainer;
    else delete nextContent[bucket];
    onChange(nextContent);
  }

  function overridden(bucket: "style" | "layout", d: Device): boolean {
    const k = layerKey(d);
    const container = content[bucket] as Record<string, Record<string, unknown>> | undefined;
    return k !== "base" && !!container?.[k] && Object.keys(container[k]).length > 0;
  }

  /** Device-reset: DELETE the current device's override layer so the mobile-first merge
   *  falls through to base (mirrors setField's delete-on-empty contract — never writes
   *  undefined). In the default state it clears the whole breakpoint layer (style[key]
   *  incl. all state sub-layers + layout[key]); in a per-state mode it clears only that
   *  state sub-layer. */
  function resetDevice() {
    const nextContent = { ...content };
    if (styleState === "default") {
      for (const bucket of ["style", "layout"] as const) {
        const container = { ...((nextContent[bucket] ?? {}) as Record<string, unknown>) };
        if (!container[key]) continue;
        delete container[key];
        if (Object.keys(container).length) nextContent[bucket] = container;
        else delete nextContent[bucket];
      }
    } else {
      const container = { ...((nextContent.style ?? {}) as Record<string, Record<string, unknown>>) };
      const layerForKey = { ...(container[key] ?? {}) };
      delete layerForKey[styleState];
      if (Object.keys(layerForKey).length) container[key] = layerForKey;
      else delete container[key];
      if (Object.keys(container).length) nextContent.style = container;
      else delete nextContent.style;
    }
    onChange(nextContent);
  }

  const hideOn = (content.hideOn as Device[] | undefined) ?? [];
  function toggleHide(d: Device, hidden: boolean) {
    const next = hidden ? [...new Set([...hideOn, d])] : hideOn.filter((x) => x !== d);
    const nextContent = { ...content };
    if (next.length) nextContent.hideOn = next;
    else delete nextContent.hideOn;
    onChange(nextContent);
  }

  function setCustomCss(css: string) {
    const nextContent = { ...content };
    if (css) nextContent.customCss = css;
    else delete nextContent.customCss;
    onChange(nextContent);
  }

  const motion = (content.motion ?? {}) as Record<string, string>;
  /** Write one motion field; empty/undefined clears it; an emptied motion object is deleted. */
  function setMotion(field: string, value: string | undefined) {
    const next = { ...motion };
    if (value === undefined || value === "") delete next[field];
    else next[field] = value;
    const nextContent = { ...content };
    if (Object.keys(next).length) nextContent.motion = next;
    else delete nextContent.motion;
    onChange(nextContent);
  }

  const advancedStyle = (content.advancedStyle ?? {}) as Record<string, Record<string, string>>;
  const advancedLayer = (advancedStyle[key] ?? {}) as Record<string, string>;

  /** Immutable, breakpoint-safe write into the raw `advancedStyle[key]` map. An empty
   *  prop/value clears the row; an emptied layer collapses; an emptied bucket is deleted —
   *  mirrors setField so the mobile-first merge falls through cleanly. */
  function setAdvancedRows(rows: Array<{ prop: string; value: string }>) {
    const layer: Record<string, string> = {};
    for (const r of rows) {
      const p = r.prop.trim();
      if (p && r.value.trim()) layer[p] = r.value.trim();
    }
    const nextBucket = { ...advancedStyle };
    if (Object.keys(layer).length) nextBucket[key] = layer;
    else delete nextBucket[key];
    const nextContent = { ...content };
    if (Object.keys(nextBucket).length) nextContent.advancedStyle = nextBucket;
    else delete nextContent.advancedStyle;
    onChange(nextContent);
  }

  const anyOverride = (d: Device) => overridden("style", d) || overridden("layout", d);
  const customCss = (content.customCss as string | undefined) ?? "";

  return {
    setField,
    overridden,
    resetDevice,
    hideOn,
    toggleHide,
    setCustomCss,
    motion,
    setMotion,
    advancedLayer,
    setAdvancedRows,
    anyOverride,
    customCss,
  };
}
