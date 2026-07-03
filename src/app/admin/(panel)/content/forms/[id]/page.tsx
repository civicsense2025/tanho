import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getForm, getFormResponses } from "@/modules/forms/queries";
import { FormBuilder } from "@/modules/forms/admin/FormBuilder";
import { AdminPage } from "@/components/admin/AdminPage";
import { payments } from "@/adapters/payments";

export const metadata = { title: "Form" };

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const form = await getForm(id);
  if (!form) notFound();
  const responses = await getFormResponses(id);
  return (
    <AdminPage width="wide">
      <FormBuilder form={form} responses={responses} paymentsEnabled={payments.isConfigured()} />
    </AdminPage>
  );
}
