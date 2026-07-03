import { getMarketplaceSettings } from "@/modules/marketplace/queries";
import {
  PACK_TYPE_BY_URL,
  isMarketplacePublic,
  buildPackMetaList,
  type PackMeta,
} from "@/modules/marketplace/public";
import { listPublishedEntries } from "@/modules/entries/queries";

type CatalogPack = {
  type: string;
  slug: string;
  title: string;
  description: string;
  downloadUrl: string;
  requiredBlockTypes: string[];
};

type Catalog = {
  format: "oys-marketplace@1";
  name: string;
  description: string;
  packs: CatalogPack[];
};

/**
 * GET /marketplace/catalog.json — machine-readable catalog for peer instances
 * (federated discovery in M6). Returns the full published pack list with
 * download URLs and declared required block types. 404 when the marketplace is
 * disabled or private.
 */
export async function GET(): Promise<Response> {
  if (!(await isMarketplacePublic())) {
    return new Response("Not found", { status: 404 });
  }
  const s = await getMarketplaceSettings();

  const [blockPacks, designPacks] = await Promise.all([
    listPublishedEntries(PACK_TYPE_BY_URL["block-pack"]),
    listPublishedEntries(PACK_TYPE_BY_URL["design-pack"]),
  ]);
  const metas = await buildPackMetaList(blockPacks, designPacks);

  const packs: CatalogPack[] = metas.map((p: PackMeta) => ({
    type: p.type,
    slug: p.slug,
    title: p.title,
    description: p.description,
    downloadUrl: `/marketplace/${p.type}/${p.slug}/download`,
    requiredBlockTypes: p.requiredBlockTypes,
  }));

  const catalog: Catalog = {
    format: "oys-marketplace@1",
    name: s.name,
    description: s.description,
    packs,
  };

  return new Response(JSON.stringify(catalog, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
