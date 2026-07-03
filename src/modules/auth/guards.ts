import { redirect } from "next/navigation";
import { getAdminUser, type AdminUser } from "./session";

/**
 * Authorization guard — called at the top of EVERY admin server action and
 * in the admin panel layout (defense in depth; the layout alone is not the
 * security boundary). `role: "owner"` gates settings, payments, people
 * deletion, and integrations.
 */
export async function requireUser(role?: "owner"): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (role === "owner" && user.role !== "owner") {
    throw new Error("Forbidden: owner role required");
  }
  return user;
}
