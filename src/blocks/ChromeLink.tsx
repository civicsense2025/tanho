import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/**
 * The single link sink for every chrome block (nav-menu, cta-button,
 * footer-column, social-links). Site-relative routes go through next/link;
 * external URLs get `rel="noopener noreferrer"`; anchors/mailto are plain
 * anchors. Pure — safe inside a block Render.
 *
 * Because this is the one shared sink, it re-checks the href scheme at the sink
 * (defence in depth, mirroring the render-time re-sanitisation the codebase
 * uses for custom CSS). Every chrome href is already allowlisted by its Zod
 * schema on save (`^(https?://|/|#|mailto:)`), but a future block that forwards
 * an unvalidated href would otherwise be silently exploitable. Anything not on
 * the allowlist — or a protocol-relative `//host` / backslash variant that
 * would escape same-origin routing — is neutralised to `#`.
 */
const SAFE_HREF = /^(?:https?:\/\/|\/(?![/\\])|#|mailto:)/i;

export function ChromeLink({ href, children, ...rest }: Props) {
  const safe = SAFE_HREF.test(href) ? href : "#";
  if (safe.startsWith("/")) {
    return (
      <Link href={safe} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={safe} rel={safe.startsWith("http") ? "noopener noreferrer" : undefined} {...rest}>
      {children}
    </a>
  );
}
