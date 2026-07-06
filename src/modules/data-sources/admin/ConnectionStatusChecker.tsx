"use client";

import { useEffect, useRef, useState } from "react";
import { testConnectionConfig } from "../connection-actions";
import type { DataSourceConfig } from "../validation";
import styles from "./data-sources.module.css";

type StepState = "pending" | "active" | "done" | "error";
type Step = { key: string; label: string };

const STEPS: Step[] = [
  { key: "validate", label: "Validating fields" },
  { key: "connect", label: "Connecting to host" },
  { key: "auth", label: "Authenticating" },
  { key: "ready", label: "Ready" },
];

/** Debounced input — recompute once the caller stops changing config for a beat. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Returns true once every required field for the given config looks present. */
function isConfigComplete(config: DataSourceConfig): boolean {
  if (config.provider === "postgres") {
    return Boolean(config.host && config.database && config.user && config.password);
  }
  return Boolean(config.projectRef && config.databasePassword);
}

/**
 * Live, animated step-by-step connection status — runs `testConnectionConfig`
 * against the in-progress form config (debounced) so an owner sees whether
 * their database is reachable before they ever hit "Connect". Purely
 * advisory: submitting still re-validates and re-tests server-side.
 */
export function ConnectionStatusChecker({ config }: { config: DataSourceConfig | null }) {
  const debouncedConfig = useDebounced(config, 700);
  const complete = debouncedConfig !== null && isConfigComplete(debouncedConfig);
  const [stepIndex, setStepIndex] = useState(-1);
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!complete) return;
    // Narrowed via `complete`, but TS can't see through it across the closure.
    const activeConfig = debouncedConfig as DataSourceConfig;
    const myRequest = ++requestId.current;
    let advance: ReturnType<typeof setInterval> | undefined;

    // Kick the actual probe off the microtask queue — the effect body itself
    // stays free of setState calls, only the async continuations touch state.
    Promise.resolve()
      .then(() => {
        if (requestId.current !== myRequest) return;
        setStatus("checking");
        setErrorMessage(null);
        setStepIndex(0);
        advance = setInterval(() => {
          setStepIndex((i) => (i < STEPS.length - 2 ? i + 1 : i));
        }, 450);
        return testConnectionConfig(activeConfig);
      })
      .then((res) => {
        if (!res || requestId.current !== myRequest) return;
        clearInterval(advance);
        if (res.ok) {
          setStepIndex(STEPS.length - 1);
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(res.error);
        }
      });

    return () => clearInterval(advance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, JSON.stringify(debouncedConfig)]);

  if (!complete) return null;

  return (
    <div className={styles.statusChecker}>
      <ol className={styles.statusSteps}>
        {STEPS.map((step, i) => {
          const state: StepState =
            status === "error" && i === stepIndex
              ? "error"
              : i < stepIndex || (i === stepIndex && status === "success")
                ? "done"
                : i === stepIndex
                  ? "active"
                  : "pending";
          return (
            <li key={step.key} className={styles.statusStep} data-state={state}>
              <span className={styles.statusDot} aria-hidden />
              <span className={styles.statusLabel}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {status === "error" ? <span className={styles.error}>{errorMessage}</span> : null}
    </div>
  );
}
