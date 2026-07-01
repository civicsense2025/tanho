"use client";

import { useCallback, useRef } from "react";
import { ProjectForm } from "@/components/ProjectForm";
import type { ProjectDraftMessage } from "@/components/PreviewFrame";

interface Props {
  projectId: string;
  slug: string;
  initial: React.ComponentProps<typeof ProjectForm>["initial"];
  initialBlocks: React.ComponentProps<typeof ProjectForm>["initialBlocks"];
  initialBody: string;
}

/** Owns the split-pane layout + iframe for live preview -- kept separate from
 * ProjectForm so the "new project" page (which has no id to preview yet) can
 * render the plain form without any of this. */
export function ProjectEditorWithPreview({ projectId, slug, initial, initialBlocks, initialBody }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDraftChange = useCallback(
    (draft: Omit<ProjectDraftMessage, "type">) => {
      iframeRef.current?.contentWindow?.postMessage({ type: "project-draft-update", ...draft } satisfies ProjectDraftMessage, window.location.origin);
    },
    []
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--space-8)", alignItems: "start" }}>
      <ProjectForm
        projectId={projectId}
        initial={initial}
        initialBlocks={initialBlocks}
        initialBody={initialBody}
        onDraftChange={handleDraftChange}
      />
      <div style={{ position: "sticky", top: "var(--space-8)" }}>
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-muted)",
            marginBottom: "var(--space-3)",
          }}
        >
          Live preview
        </div>
        <iframe
          ref={iframeRef}
          src={`/projects/${slug}?preview=1&id=${projectId}`}
          style={{ width: "100%", height: "80vh", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)" }}
          title="Live preview"
        />
      </div>
    </div>
  );
}
