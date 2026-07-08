"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Client-side permission context. The server populates this with the admin's
 * resolved permission set (from `AdminUser.permissions`) via
 * `<PermissionsProvider>`, so client components can gate UI without a round-trip.
 *
 * The default is an empty set — fail-closed if a component renders outside a
 * provider (e.g. during SSR without a user).
 */
const PermissionsContext = createContext<Set<string>>(new Set());

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: Set<string>;
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

/** Returns the current admin's permission set for client-side gating. */
export function usePermissions(): Set<string> {
  return useContext(PermissionsContext);
}
