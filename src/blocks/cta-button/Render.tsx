import type { RenderCtx } from "../types";
import { ChromeLink } from "../ChromeLink";
import type { CtaButtonContent } from "./fields";
import styles from "./cta.module.css";

const VARIANT_CLASS: Record<CtaButtonContent["variant"], string> = {
  solid: styles.solid,
  accent: styles.accent,
  outline: styles.outline,
};

/**
 * Header/footer call-to-action — an anchor reusing the core Button's visual
 * values. Pure port of the old CTAButton. An unset href degrades to `#` so the
 * button is still visible in the editor while the author fills it in.
 */
export function RenderCtaButton({ content }: { content: CtaButtonContent; ctx: RenderCtx }) {
  if (!content.label) return null;
  return (
    <ChromeLink href={content.href || "#"} className={`${styles.cta} ${VARIANT_CLASS[content.variant]}`}>
      {content.label}
      {content.variant === "outline" ? <span aria-hidden> ↗</span> : null}
    </ChromeLink>
  );
}
