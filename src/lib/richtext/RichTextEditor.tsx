"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Button, Textarea } from "@/components/ui";

/** Tags TipTap's schema (StarterKit + Image) can actually represent. Used only to warn before a
 * lossy HTML-mode -> Visual-mode reparse; sanitization itself is handled separately at render
 * time by renderRichText(), not here. */
const SUPPORTED_TAGS = new Set([
  "p", "br", "hr",
  "h1", "h2", "h3",
  "strong", "b", "em", "i", "s", "u", "code",
  "pre",
  "blockquote",
  "ul", "ol", "li",
  "a", "img",
]);

function findUnsupportedTags(html: string): string[] {
  if (typeof window === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const found = new Set<string>();
  doc.body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!SUPPORTED_TAGS.has(tag)) found.add(tag);
  });
  return Array.from(found);
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Wires TipTap's image extension to the same upload endpoint every other block/field uses. */
  onUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

/** Shared rich-text editor: one component, two views (Visual / HTML) over the same `value`
 * string -- not two components with an explicit conversion step. Both views read/write the exact
 * same canonical, sanitized-HTML value, so toggling modes never has a separate "draft" state that
 * could diverge from what's actually saved. Used both as the `richtext` block kind's editor and
 * (once wired) a future content-entry `richtext` field's editor -- deliberately has no
 * dependency on the block system's `{ html }` wrapper convention. */
export function RichTextEditor({ value, onChange, onUpload, placeholder }: RichTextEditorProps) {
  const [mode, setMode] = useState<"rich" | "html">("rich");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: placeholder || "Write something…" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // useEditor only parses `content` on mount -- switching HTML -> Rich needs an explicit reparse
  // of whatever was typed in HTML mode, since `value` may have changed underneath the editor
  // while it wasn't mounted/visible.
  useEffect(() => {
    if (mode !== "rich" || !editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // Only re-sync on the mode transition itself, not on every keystroke (onUpdate already
    // keeps `value` in sync while in rich mode).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editor]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUpload || !editor) return;
    const url = await onUpload(file);
    editor.chain().focus().setImage({ src: url }).run();
    e.target.value = "";
  }

  function switchToRich() {
    const unsupported = findUnsupportedTags(value);
    if (unsupported.length > 0) {
      const proceed = window.confirm(
        `Switching to Visual mode may remove formatting the editor doesn't support: ${unsupported.join(", ")}. Continue?`
      );
      if (!proceed) return;
    }
    setMode("rich");
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-2)",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexWrap: "wrap",
        }}
      >
        {mode === "rich" && editor && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">B</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">I</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough">S</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Inline code">{"</>"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2">H2</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3">H3</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">• List</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">1. List</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Blockquote">"</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Code block">{"{ }"}</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Link"
              onClick={() => {
                const url = window.prompt("Link URL");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
            >
              Link
            </Button>
            {onUpload && (
              <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                <span style={{ fontSize: "var(--text-2xs)", padding: "6px 12px", color: "var(--text-muted)" }}>Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
            )}
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-1)" }}>
          <Button type="button" variant={mode === "rich" ? "outline" : "ghost"} size="sm" onClick={switchToRich}>
            Visual
          </Button>
          <Button type="button" variant={mode === "html" ? "outline" : "ghost"} size="sm" onClick={() => setMode("html")}>
            HTML
          </Button>
        </div>
      </div>
      {mode === "rich" ? (
        <div className="prose" style={{ padding: "var(--space-4)" }}>
          <EditorContent editor={editor} />
        </div>
      ) : (
        <Textarea
          mono
          rows={10}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>Content HTML…</p>"
          style={{ border: "none", borderRadius: 0 }}
        />
      )}
    </div>
  );
}
