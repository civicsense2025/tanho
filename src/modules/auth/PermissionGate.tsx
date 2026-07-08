"use client";

import type { ReactNode } from "react";
import { usePermissions } from "./usePermissions";

/**
 * Conditionally renders children based on whether the current admin has the
 * given permission key. Use this in client components that live inside a
 * `<PermissionsProvider>` (typically the page wrapper).
 *
 * ```tsx
 * <PermissionGate perm="team:manage">
 *   <DisableButton />
 * </PermissionGate>
 * ```
 *
 * The `fallback` prop lets you render an alternative (e.g. a disabled hint)
 * instead of nothing when the permission is missing.
 */
export function PermissionGate({
  perm,
  children,
  fallback = null,
}: {
  perm: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const perms = usePermissions();
  return perms.has(perm) ? <>{children}</> : <>{fallback}</>;
}
