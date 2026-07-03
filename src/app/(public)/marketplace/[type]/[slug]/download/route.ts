import {
  PACK_TYPE_BY_URL,
  PACK_URL_TYPES,
  isMarketplacePublic,
  type PackUrlType,
} from "@/modules/marketplace/public";
import { getPublishedEntry } from "@/modules/entries/queries";
import { serializeBlockPack } from "@/modules/blocks/packs/actions";
import { serializeDesignPack } from "@/modules/blocks/design-packs/actions";

type Params = { type: string; slug: string };

function resolveType(type: string): PackUrlType | null {
  return (PACK_URL_TYPES as string[]).includes(type) ? (type as PackUrlType) : null;
}

/**
 * GET /marketplace/[type]/[slug]/download — serves the pack as a `.pack.json`
 * file download. Uses the public serializers (no auth gate) so peer instances
 * and visitors can fetch the portable pack. 404 when the marketplace is
 * disabled/private, the type is unknown, or the pack is not published.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
): Promise<Response> {
  if (!(await isMarketplacePublic())) {
    return new Response("Not found", { status: 404 });
  }
  const { type, slug } = await params;
  const urlType = resolveType(type);
  if (!urlType) return new Response("Not found", { status: 404 });

  const entry = await getPublishedEntry(PACK_TYPE_BY_URL[urlType], slug);
  if (!entry) return new Response("Not found", { status: 404 });

  const result =
    urlType === "block-pack"
      ? await serializeBlockPack(entry.id)
      : await serializeDesignPack(entry.id);
  if (!result.ok) return new Response("Not found", { status: 404 });

  const body = JSON.stringify(result.data, null, 2);
  const filename = `${slug}.pack.json`;
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
