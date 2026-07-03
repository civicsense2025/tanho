import type { ReactNode } from "react";
import { AnalyticsTabs } from "@/modules/analytics/admin/AnalyticsTabs";

/** Wraps the analytics screens with their Overview/Traffic sub-nav. */
export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "var(--space-6) var(--gutter) 0" }}>
        <AnalyticsTabs />
      </div>
      {children}
    </div>
  );
}
