import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { getPageForEdit } from "@/modules/pages/queries";
import { getActiveFontRender } from "@/modules/fonts/queries";
import { themeScopeStyle } from "../scope-style";
import { showcaseBlocks } from "./showcase-blocks";
import type { ThemeInput } from "../validation";

/**
 * Server-rendered preview body — a real block tree (the showcase page, or a
 * chosen real page's actual blocks) scoped to the candidate theme's derived
 * tokens. Block resolution (bound blocks: post lists, forms, etc.) needs the
 * server, so this can't be a client component; the modal shell around it is
 * client-side and receives this as `children`.
 */
export async function ThemePreviewContent({
  theme,
  mode,
  pageId,
}: {
  theme: ThemeInput;
  mode: "light" | "dark";
  pageId?: string;
}) {
  const [blocks, font] = await Promise.all([
    pageId ? loadPageBlocks(pageId) : Promise.resolve(showcaseBlocks()),
    getActiveFontRender(theme.fontFamilyId),
  ]);
  const style = themeScopeStyle(theme, mode, font.cssStack);

  return (
    <div
      style={{
        ...style,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        padding: "var(--space-8) var(--gutter)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {blocks.length > 0 ? (
        <RenderBlocks blocks={blocks} mode="editor" />
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>This page has no content yet.</p>
      )}
    </div>
  );
}

async function loadPageBlocks(pageId: string) {
  const result = await getPageForEdit(pageId);
  return result?.blocks ?? showcaseBlocks();
}
