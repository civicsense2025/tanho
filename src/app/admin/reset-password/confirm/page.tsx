import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/modules/auth/session";
import { ConfirmResetForm } from "./ConfirmResetForm";

export const metadata = { title: "Set a new password · Admin" };

export default function ConfirmResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ConfirmResetPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function ConfirmResetPageInner({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (await getAdminUser()) redirect("/admin");
  const { token } = await searchParams;
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ConfirmResetForm token={token ?? ""} />
    </div>
  );
}
