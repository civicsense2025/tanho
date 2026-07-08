"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Code,
} from "lucide-react";
import styles from "./richtext-editor.module.css";

/**
 * TipTap rich text editor for the richtext block's `html` field. Edits HTML in
 * place with a formatting toolbar (bold/italic/headings/lists/links/code).
 * Dynamic `{{record.*}}` tokens are plain text in the stored content —
 * substitution happens upstream in collection/bind.ts before Render, so the
 * editor just preserves them as literal text. Output is re-sanitized
 * server-side at render (src/lib/sanitize.ts), so editor HTML never reaches the
 * page raw.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: value || "",
    // `false` avoids an SSR/hydration mismatch (editor is null on first render).
    immediatelyRender: false,
    editorProps: { attributes: { class: styles.content } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. switching blocks) without clobbering
  // active edits: while focused the user owns the buffer; after an edit the
  // round-tripped value equals editor.getHTML(), so this is a no-op.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || "", false);
  }, [value, editor]);

  const cls = (active: boolean) => `${styles.btn}${active ? ` ${styles.on}` : ""}`;
  const run = (fn: (e: NonNullable<typeof editor>) => void) => () => {
    if (editor) fn(editor);
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", typeof prev === "string" ? prev : "https://");
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url === "") chain.unsetLink().run();
    else chain.setLink({ href: url, rel: "noopener noreferrer", target: "_blank" }).run();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
        <button type="button" aria-label="Bold" className={cls(!!editor?.isActive("bold"))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleBold().run())}>
          <Bold size={15} />
        </button>
        <button type="button" aria-label="Italic" className={cls(!!editor?.isActive("italic"))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleItalic().run())}>
          <Italic size={15} />
        </button>
        <button type="button" aria-label="Heading 2" className={cls(!!editor?.isActive("heading", { level: 2 }))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}>
          <Heading2 size={15} />
        </button>
        <button type="button" aria-label="Heading 3" className={cls(!!editor?.isActive("heading", { level: 3 }))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}>
          <Heading3 size={15} />
        </button>
        <button type="button" aria-label="Bullet list" className={cls(!!editor?.isActive("bulletList"))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleBulletList().run())}>
          <List size={15} />
        </button>
        <button type="button" aria-label="Ordered list" className={cls(!!editor?.isActive("orderedList"))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleOrderedList().run())}>
          <ListOrdered size={15} />
        </button>
        <button type="button" aria-label="Inline code" className={cls(!!editor?.isActive("code"))} disabled={!editor} onClick={run((e) => e.chain().focus().toggleCode().run())}>
          <Code size={15} />
        </button>
        <button type="button" aria-label="Link" className={cls(!!editor?.isActive("link"))} disabled={!editor} onClick={setLink}>
          <Link2 size={15} />
        </button>
      </div>
      <div className="prose">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
