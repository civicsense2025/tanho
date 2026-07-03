import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listForms } from "@/modules/forms/queries";
import { handle, ok } from "@/lib/api/v1";

/** GET /api/v1/forms — list all forms. Editor+. */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listForms());
  });
}
