"use client";

import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { sendTrack, type TrackProps } from "./beacon";

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  /** Allowlisted event name fired on click (e.g. cta_click, pricing_choose). */
  event: string;
  params?: TrackProps;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * An <a> that fires an analytics event on click, then lets the navigation
 * proceed normally. Used by the button/pricing/newsletter block renders when
 * an author has set a trackEvent. The block Render stays pure; this island is
 * the only interactive part. The beacon is non-blocking, so the click never
 * waits on the network.
 */
export function TrackedLink({
  href,
  event,
  params,
  children,
  ...rest
}: TrackedLinkProps) {
  const pathname = usePathname();
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        sendTrack(event, pathname, params);
        rest.onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
