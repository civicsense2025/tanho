import { redirect } from "next/navigation";
import { getAdminUser } from "@/modules/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin" };

export default async function AdminLoginPage() {
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
