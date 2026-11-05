import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, Space } from 'antd';

const EMPTY_HTML = '<p></p>';

const TOOLS = [
  { label: 'Bold', text: 'B', run: (c) => c.toggleBold(), active: 'bold' },
  { label: 'Italic', text: 'I', run: (c) => c.toggleItalic(), active: 'italic' },
  {
    label: 'Heading',
    text: 'H',
    run: (c) => c.toggleHeading({ level: 3 }),
    active: ['heading', { level: 3 }],
  },
  { label: 'Bullet list', text: '• List', run: (c) => c.toggleBulletList(), active: 'bulletList' },
  {
    label: 'Numbered list',
    text: '1. List',
    run: (c) => c.toggleOrderedList(),
    active: 'orderedList',
  },
];

// Controlled like an antd input: value and onChange carry HTML, and empty text is ''.
const RichTextEditor = forwardRef(function RichTextEditor(
  { id, value, onChange, onBlur, label = 'Description' },
  ref
) {
  // What the editor last reported. A value matching it is the editor's own typing coming back.
  const lastSent = useRef(value ?? '');

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [StarterKit.configure({ heading: { levels: [3] } })],
    content: value ?? '',
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastSent.current = html === EMPTY_HTML ? '' : html;
      onChange(lastSent.current);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: { 'aria-label': label, id: id ?? '', class: 'p-3' },
    },
  });

  // Lets the form move focus here when this field has an error.
  useImperativeHandle(ref, () => ({ focus: () => editor?.commands.focus() }), [editor]);

  // Loading a saved product changes value from outside the editor.
  useEffect(() => {
    // Comparing with the editor's live text instead would undo fast typing, because this value
    // can be a few keystrokes behind it.
    if (!editor || (value ?? '') === lastSent.current) {
      return;
    }
    lastSent.current = value ?? '';
    editor.commands.setContent(value ?? '', { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="rte-content rounded-lg border border-text/20 bg-white">
      <Space wrap size={4} className="border-b border-soft p-2">
        {TOOLS.map(({ label: name, text, run, active }) => {
          const isActive = Array.isArray(active)
            ? editor?.isActive(...active)
            : editor?.isActive(active);
          return (
            <Button
              key={name}
              size="small"
              type={isActive ? 'primary' : 'default'}
              aria-label={name}
              aria-pressed={Boolean(isActive)}
              onClick={() => run(editor.chain().focus()).run()}
            >
              {text}
            </Button>
          );
        })}
      </Space>
      <EditorContent editor={editor} />
    </div>
  );
});

export default RichTextEditor;
