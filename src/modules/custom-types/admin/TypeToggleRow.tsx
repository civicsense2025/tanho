"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleContentType } from "../content-types-actions";

/**
 * One content-type row: icon tile, label + fields summary, "N total · M live"
 * count, and an on/off switch. Turning a type off hides it from the site and
 * search — when live content exists we confirm first (the design's guardrail).
 * `canDisable` false = a core type with no switch.
 */
export function TypeToggleRow({
  typeKey,
  label,
  fields,
  total,
  live,
  disabled,
  canDisable,
  first,
  manageHref,
}: {
  typeKey: string;
  label: string;
  fields: string;
  total: number;
  live: number;
  disabled: boolean;
  canDisable: boolean;
  first: boolean;
  /** Where this type's records are managed (records live off this page). */
  manageHref: string;
}) {
  const router = useRouter();
  const [off, setOff] = useState(disabled);
  const [pending, start] = useTransition();

  const flip = () => {
    if (!off && live > 0) {
      const ok = window.confirm(
        `${live} published ${label.toLowerCase()} ${live === 1 ? "is" : "are"} live. Turning off "${label}" hides ${live === 1 ? "it" : "them"} from your site and search indexing. Continue?`,
      );
      if (!ok) return;
    }
    start(async () => {
      const res = await toggleContentType(typeKey);
      if (res.ok) {
        setOff(res.disabled);
        router.refresh();
      } else {
        window.alert(res.error);
      }
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-4) var(--space-5)",
        borderTop: first ? "none" : "1px solid var(--border)",
        opacity: off ? 0.55 : 1,
        transition: "var(--transition)",
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-2-tint)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-2)",
          flexShrink: 0,
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          fontWeight: 600,
        }}
      >
        {label.slice(0, 2).toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>{label}</span>
          {off ? (
            <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "1px 7px" }}>
              Off · noindex
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{fields}</div>
      </div>
      <Link
        href={manageHref}
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-muted)",
          textDecoration: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-pill)",
          padding: "2px 10px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title={`Manage ${label.toLowerCase()}`}
      >
        Manage →
      </Link>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap" }}>
        {total} total{live > 0 ? ` · ${live} live` : ""}
      </span>
      {canDisable ? (
        <button
          type="button"
          onClick={flip}
          disabled={pending}
          role="switch"
          aria-checked={!off}
          title={off ? `Turn on ${label}` : `Turn off ${label}`}
          style={{
            width: 38,
            height: 22,
            borderRadius: 999,
            border: "none",
            cursor: pending ? "default" : "pointer",
            background: off ? "var(--border-strong)" : "var(--accent)",
            position: "relative",
            transition: "var(--transition)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: off ? 2 : 18,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--bg)",
              transition: "left var(--dur) var(--ease)",
            }}
          />
        </button>
      ) : (
        <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", width: 38, textAlign: "center", flexShrink: 0 }}>
          Core
        </span>
      )}
    </div>
  );
}
