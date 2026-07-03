import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/**
 * Menu links can be site-relative, anchors, external URLs or mailto:.
 * Internal routes go through next/link; everything else is a plain anchor
 * (external links get rel noopener).
 */
export function SmartLink({ href, children, ...rest }: Props) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} {...rest}>
      {children}
    </a>
  );
}
