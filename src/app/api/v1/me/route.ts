import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { handle, ok } from "@/lib/api/v1";

/**
 * GET /api/v1/me — token validation + site identity. The Swift app calls this
 * during onboarding to confirm a bearer token is valid and to read the site's
 * name/identity for the connection record. Editor-or-owner.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const general = await getGeneralSettings();
    return ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      site: { name: general.name, tagline: general.tagline },
    });
  });
}
