"use client";

import { useEffect, useState } from "react";
import { BlockTree } from "@/components/BlockTree";
import type { Block } from "@/lib/blocks/types";

export interface ProjectDraftMessage {
  type: "project-draft-update";
  body: string;
  blocks: { id: string; type: Block["type"]; content: Record<string, unknown> }[];
}

interface Props {
  initialBody: string;
  initialBlocks: { id: string; type: Block["type"]; content: Record<string, unknown> }[];
}

/** Wraps the same body/BlockTree rendering the real public page uses, fed
 * from either the server-fetched (saved) data or an in-memory draft posted
 * from the admin editor via postMessage -- same components either way, so
 * the preview can't visually drift from what actually ships. Listens only
 * for messages from this window's own origin. */
export function PreviewFrame({ initialBody, initialBlocks }: Props) {
  const [body, setBody] = useState(initialBody);
  const [blocks, setBlocks] = useState(initialBlocks);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as ProjectDraftMessage | undefined;
      if (data?.type !== "project-draft-update") return;
      setBody(data.body);
      setBlocks(data.blocks);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <>
      {body && <div className="prose" style={{ marginBottom: "var(--space-10)" }} dangerouslySetInnerHTML={{ __html: body }} />}
      {blocks.length > 0 && <BlockTree blocks={blocks} />}
    </>
  );
}
