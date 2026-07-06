import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getSymbol } from "@/modules/blocks/symbol-actions";
import { registryMap } from "@/modules/blocks/registry-queries";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { SymbolEditor } from "@/editor/SymbolEditor";

export const metadata = { title: "Saved block" };

export default function SymbolEditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <SymbolEditorPageInner params={params} />
    </Suspense>
  );
}

async function SymbolEditorPageInner({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [symbol, regMap] = await Promise.all([getSymbol(id), registryMap()]);
  if (!symbol) notFound();

  const enabledTypes = [...regMap.values()].filter((r) => r.enabled).map((r) => r.type);
  // Pre-resolve bound blocks so the canvas draws their real design, matching the
  // page editor (a symbol tree can contain postlist/metric/etc.).
  const initialBlocks = await resolveBoundBlocks(symbol.blockTree);

  return (
    <SymbolEditor id={symbol.id} name={symbol.name} initialBlocks={initialBlocks} enabledTypes={enabledTypes} />
  );
}
