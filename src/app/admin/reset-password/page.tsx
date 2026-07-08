import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/modules/auth/session";
import { RequestResetForm } from "./RequestResetForm";

export const metadata = { title: "Reset password · Admin" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

async function ResetPasswordPageInner() {
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
      <RequestResetForm />
    </div>
  );
}
