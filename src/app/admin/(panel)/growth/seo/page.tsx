import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { SeoForm } from "@/modules/seo/admin/SeoForm";
import { AdminPage } from "@/components/admin/AdminPage";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { SEO_CONTENT_TYPES } from "@/modules/seo/validation";

export const metadata = { title: "SEO" };

export default async function AdminSeoPage() {
  await requireUser("owner");
  const [seo, general, contentTypes] = await Promise.all([
    getSeoSettings(),
    getGeneralSettings(),
    getContentTypesSettings(),
  ]);
  const ogPreviewUrl = seo.defaultOgMediaId ?? "";
  const disabledTypes = Object.fromEntries(
    SEO_CONTENT_TYPES.map((type) => [type, isTypeDisabled(contentTypes, type)]),
  );
  return (
    <AdminPage>
      <h1
        style={{
          margin: "0 0 var(--space-6)",
          fontSize: "var(--text-h2)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        SEO
      </h1>
      <SeoForm initial={seo} siteName={general.name} ogPreviewUrl={ogPreviewUrl} disabledTypes={disabledTypes} />
    </AdminPage>
  );
}
