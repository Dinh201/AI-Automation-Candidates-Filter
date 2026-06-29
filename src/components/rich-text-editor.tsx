"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
} from "lucide-react";

const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): any {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: { commands: Record<string, (...a: unknown[]) => boolean> }) =>
          commands.updateAttributes("paragraph", { lineHeight }),
    };
  },
});

const LINE_HEIGHTS = [
  { label: "Single (1.0)", value: "1.0" },
  { label: "Default (1.15)", value: "1.15" },
  { label: "OneAndHalf (1.5)", value: "1.5" },
  { label: "Double (2.0)", value: "2.0" },
];

function TBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-indigo-600/25 text-indigo-300"
          : "text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-3.5 bg-zinc-700 mx-0.5 self-center shrink-0" />;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-zinc-700/80 bg-zinc-950/50">
      <TBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="In đậm (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="In nghiêng (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Gạch chân (Ctrl+U)"
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </TBtn>

      <Sep />

      <TBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Căn trái"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Căn giữa"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Căn phải"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Căn đều hai bên"
      >
        <AlignJustify className="w-3.5 h-3.5" />
      </TBtn>

      <Sep />

      <TBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Danh sách đầu dòng"
      >
        <List className="w-3.5 h-3.5" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Danh sách đánh số"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </TBtn>

      <Sep />

      <select
        title="Line-spacing"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (editor.chain().focus() as any).setLineHeight(e.target.value).run();
            e.target.value = "";
          }
        }}
        className="text-[11px] bg-zinc-800 border border-zinc-700 text-zinc-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:text-zinc-200 transition-colors"
      >
        <option value="" disabled>
          Giãn dòng
        </option>
        {LINE_HEIGHTS.map((lh) => (
          <option key={lh.value} value={lh.value}>
            {lh.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = "100px" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LineHeight,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
        style: `min-height: ${minHeight}; padding: 10px 12px;`,
      },
    },
    immediatelyRender: false,
  });

  return (
    <div className="border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/40 transition-colors focus-within:border-indigo-500/60">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
