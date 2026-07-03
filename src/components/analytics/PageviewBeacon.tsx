"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendTrack } from "./beacon";

/**
 * Fires one "pageview" event per path. Mounted once in the public layout; it
 * re-fires on client-side navigation because the pathname changes. Renders
 * nothing. No PII is sent — just the event name and path.
 */
export function PageviewBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    sendTrack("pageview", pathname);
  }, [pathname]);

  return null;
}
