import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/modules/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin" };

/**
 * `getAdminUser()` reads cookies(), which Cache Components requires to
 * happen inside a Suspense boundary — see AdminLoginPageInner below.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPageInner />
    </Suspense>
  );
}

async function AdminLoginPageInner() {
  if (await getAdminUser()) redirect("/admin");
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoginForm />
    </div>
  );
}
