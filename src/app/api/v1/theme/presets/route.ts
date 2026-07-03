import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listThemePresets } from "@/modules/theme/preset-queries";
import { saveAsTheme } from "@/modules/theme/actions";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/theme/presets — list saved/imported/library theme presets.
 * POST /api/v1/theme/presets — save the given scalars as a new named preset.
 *   Body: { name: string; theme: ThemeInput }. Does not change the active theme.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listThemePresets());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const body = await parseBody<{ name?: unknown; theme?: unknown }>(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const result = await saveAsTheme(body.name, body.theme);
    if (!result.ok) return fail(result.error, 400);
    return ok({ id: result.id }, 201);
  });
}
