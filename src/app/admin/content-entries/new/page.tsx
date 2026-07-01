import { getAdminSession } from "@/lib/auth";
import { getContentTypeBySlug, listContentTypes } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { EntryForm } from "@/components/EntryForm";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NewEntryPage({ searchParams }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { type: typeSlug } = await searchParams;
  if (!typeSlug) notFound();
  const type = await getContentTypeBySlug(typeSlug);
  if (!type) notFound();

  return (
    <AdminPageShell title={`New ${type.name}`}>
      <EntryForm contentType={type} onUpload={async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        return url;
      }} />
    </AdminPageShell>
  );
}
