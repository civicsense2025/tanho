import { markdownToSafeHtml } from "@/lib/sanitize";
import type { FormField } from "../validation";
import styles from "./form.module.css";

/**
 * Presentational screen kinds (welcome/statement/ending/heading/paragraph).
 * Body copy is treated as markdown and sanitized server-side through the
 * shared allowlist before it ever reaches the DOM.
 */
export function ScreenBlock({ field }: { field: FormField }) {
  const { kind, label, help } = field;

  if (kind === "heading") {
    return <h3 className={styles.screenHeading}>{label}</h3>;
  }

  const body = help || field.default || "";
  const html = body ? markdownToSafeHtml(body) : "";

  return (
    <div className={styles.screen}>
      {label ? <p className={styles.screenTitle}>{label}</p> : null}
      {html ? (
        <div className={styles.screenBody} dangerouslySetInnerHTML={{ __html: html }} />
      ) : null}
    </div>
  );
}
