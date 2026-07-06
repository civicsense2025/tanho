import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { quietReaders } from "@/modules/people/digest";
import { QuietReaderDigest } from "@/modules/people/admin/QuietReaderDigest";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Reader digest" };

export default function ReaderDigestPage() {
  return (
    <Suspense fallback={null}>
      <ReaderDigestPageInner />
    </Suspense>
  );
}

async function ReaderDigestPageInner() {
  await requireUser();
  const rows = await quietReaders();
  return (
    <AdminPage>
      <QuietReaderDigest rows={rows} />
    </AdminPage>
  );
}
