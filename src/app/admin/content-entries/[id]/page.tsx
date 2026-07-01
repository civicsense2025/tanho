import { getAdminSession } from "@/lib/auth";
import { getContentEntryById, getContentTypeById, listPlatforms, listCollections, getContentEntryCollections } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import { EntryForm } from "@/components/EntryForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditEntryPage({ params }: Props) {
  const authed = await getAdminSession();
  if (!authed) redirect("/admin/login");
  const { id } = await params;
  const entry = await getContentEntryById(id);
  if (!entry) notFound();
  const [type, platforms, allCollections, entryCollections] = await Promise.all([
    getContentTypeById(entry.contentTypeId),
    listPlatforms(),
    listCollections(),
    getContentEntryCollections(entry.id),
  ]);
  if (!type) notFound();

  return (
    <AdminPageShell title={entry.title}>
      <EntryForm
        contentType={type}
        entryId={entry.id}
        initial={entry}
        platforms={platforms}
        allCollections={allCollections}
        entryCollectionIds={entryCollections.map((ec) => ec.collectionId)}
        onUpload={async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const { url } = await res.json();
          return url;
        }}
      />
    </AdminPageShell>
  );
}
