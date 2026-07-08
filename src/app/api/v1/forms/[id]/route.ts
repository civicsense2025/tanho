import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getForm, getFormResponses } from "@/modules/forms/queries";
import { handle, ok, fail } from "../../_lib";

/** GET /api/v1/forms/:id — one form. ?responses=1 includes submissions. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const form = await getForm(id);
    if (!form) return fail("Form not found", 404);
    const url = new URL(req.url);
    if (url.searchParams.get("responses") === "1") {
      const responses = await getFormResponses(id);
      return ok({ form, responses });
    }
    return ok({ form });
  });
}
