import { SmartLink } from "./SmartLink";
import styles from "./header.module.css";

const VARIANT_CLASS = {
  solid: styles.ctaSolid,
  accent: styles.ctaAccent,
  outline: styles.ctaOutline,
} as const;

/** Header call-to-action — an anchor reusing the core Button's visual values. */
export function CTAButton({
  label,
  href,
  variant,
}: {
  label: string;
  href: string;
  variant: "solid" | "accent" | "outline";
}) {
  return (
    <SmartLink href={href} className={`${styles.cta} ${VARIANT_CLASS[variant]}`}>
      {label}
      {variant === "outline" ? <span aria-hidden> ↗</span> : null}
    </SmartLink>
  );
}
