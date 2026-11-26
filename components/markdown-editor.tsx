"use client";

import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import TurndownService from "turndown";

type MarkdownEditorProps = {
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  showBugTemplate?: boolean;
  compact?: boolean;
};

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("taskListItem", {
  filter: (node) =>
    node.nodeName === "LI" &&
    node.getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const cleaned = content.trim().replace(/\n+/g, "\n  ");
    return `- [${checked ? "x" : " "}] ${cleaned}\n`;
  },
});

const ALLOWED_HTML_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
  "input",
  "label",
  "div",
  "span",
];

let domPurifyLoader: Promise<typeof import("dompurify")["default"]> | null = null;
function loadDomPurify() {
  domPurifyLoader ??= import("dompurify").then((m) => m.default);
  return domPurifyLoader;
}

function convertGfmTaskListsToTiptap(html: string): string {
  return html
    .replace(/<ul>(\s*<li>\s*<input[^>]*type="checkbox"[^>]*>)/gi, '<ul data-type="taskList">$1')
    .replace(
      /<li>\s*<input([^>]*)type="checkbox"([^>]*)>\s*([\s\S]*?)<\/li>/gi,
      (_match, before, after, body) => {
        const isChecked = /checked/i.test(`${before} ${after}`);
        return `<li data-type="taskItem" data-checked="${isChecked ? "true" : "false"}"><label><input type="checkbox"${isChecked ? " checked" : ""}></label><div>${body}</div></li>`;
      },
    );
}

async function markdownToSafeHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return "";
  const rawHtml = await marked.parse(markdown, { gfm: true, breaks: true });
  let safeHtml = rawHtml;

  if (typeof window !== "undefined") {
    const docWithParse = Document as unknown as {
      parseHTML?: (input: string) => Document;
    };
    if (typeof docWithParse.parseHTML === "function") {
      const parsed = docWithParse.parseHTML(rawHtml);
      safeHtml = parsed.body.innerHTML;
    } else {
      const DOMPurify = await loadDomPurify();
      safeHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ALLOWED_HTML_TAGS,
        ALLOWED_ATTR: ["href", "target", "rel", "type", "checked", "disabled"],
        ALLOW_ARIA_ATTR: false,
        ALLOW_DATA_ATTR: false,
      });
    }
  }

  return convertGfmTaskListsToTiptap(safeHtml);
}

const BUG_TEMPLATE = `## Summary
Describe what went wrong briefly.

## Steps to Reproduce
1. Go to ...
2. Click on ...
3. Observe ...

## Expected vs. Actual
- **Expected:** 
- **Actual:** 
`;

export default function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder = "Write in rich text or Markdown…",
  minHeightClass = "min-h-36",
  showBugTemplate = false,
  compact = false,
}: MarkdownEditorProps) {
  const [rawMode, setRawMode] = useState(false);
  const lastEmittedRef = useRef<string>(value);
  const isUpdatingFromPropRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: `bt-prose px-3 py-2.5 ${minHeightClass} focus:outline-none`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (isUpdatingFromPropRef.current) return;
      const html = currentEditor.getHTML();
      const md = currentEditor.isEmpty ? "" : turndown.turndown(html).trim();
      lastEmittedRef.current = md;
      onChange(md);
    },
  });

  useEffect(() => {
    if (!editor || rawMode) return;
    if (value === lastEmittedRef.current && editor.getText().length > 0) return;

    let cancelled = false;
    void markdownToSafeHtml(value).then((html) => {
      if (cancelled || !editor) return;
      isUpdatingFromPropRef.current = true;
      lastEmittedRef.current = value;
      editor.commands.setContent(html || "", { emitUpdate: false });
      isUpdatingFromPropRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [editor, value, rawMode]);

  function handleAddLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL (https://...)", prev);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) return;
    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  function handleInsertTemplate() {
    const next = value.trim() ? `${value.trim()}\n\n${BUG_TEMPLATE}` : BUG_TEMPLATE;
    lastEmittedRef.current = "";
    onChange(next);
  }

  const btnClass = (active: boolean) =>
    `inline-flex h-6 items-center justify-center rounded px-1.5 text-[11px] font-medium transition ${
      active
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-950"
    }`;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-slate-950 focus-within:ring-2 focus-within:ring-slate-950/10">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/80 bg-slate-50/80 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {!rawMode && editor && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={btnClass(editor.isActive("bold"))}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={btnClass(editor.isActive("italic"))}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={btnClass(editor.isActive("strike"))}
                title="Strikethrough"
              >
                <span className="line-through">S</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={btnClass(editor.isActive("code"))}
                title="Inline code"
              >
                <span className="font-mono">&lt;/&gt;</span>
              </button>

              {!compact && (
                <>
                  <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={btnClass(editor.isActive("heading", { level: 2 }))}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={btnClass(editor.isActive("heading", { level: 3 }))}
                    title="Heading 3"
                  >
                    H3
                  </button>
                </>
              )}

              <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive("bulletList"))}
                title="Bullet list"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive("orderedList"))}
                title="Numbered list"
              >
                1. List
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={btnClass(editor.isActive("taskList"))}
                title="Checklist"
              >
                ☑ Tasks
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={btnClass(editor.isActive("blockquote"))}
                title="Quote"
              >
                “Quote”
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={btnClass(editor.isActive("codeBlock"))}
                title="Code block"
              >
                Code block
              </button>
              <button
                type="button"
                onClick={handleAddLink}
                className={btnClass(editor.isActive("link"))}
                title="Insert link"
              >
                Link
              </button>
            </>
          )}
          {rawMode && (
            <span className="px-1.5 font-mono text-[11px] text-slate-500">
              Markdown source mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showBugTemplate && (
            <button
              type="button"
              onClick={handleInsertTemplate}
              className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            >
              + Bug template
            </button>
          )}
          <button
            type="button"
            onClick={() => setRawMode((prev) => !prev)}
            className={`inline-flex h-6 items-center rounded px-2 font-mono text-[11px] font-medium transition ${
              rawMode
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950"
            }`}
          >
            {rawMode ? "WYSIWYG" : "MD"}
          </button>
        </div>
      </div>

      {rawMode ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => {
            lastEmittedRef.current = e.target.value;
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className={`block w-full resize-y bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-900 outline-none ${minHeightClass}`}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
