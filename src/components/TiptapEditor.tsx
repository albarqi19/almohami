import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
// سنتجاهل Table مؤقتاً حتى نحل مشكلة الاستيراد
// import Table from '@tiptap/extension-table';
// import TableRow from '@tiptap/extension-table-row';
// import TableHeader from '@tiptap/extension-table-header';
// import TableCell from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Table as TableIcon,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Type
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export interface TiptapEditorRef {
  getHTML: () => string;
  getJSON: () => any;
  setContent: (content: string) => void;
  focus: () => void;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
  content,
  onChange,
  placeholder = 'اكتب محتوى المذكرة هنا...',
  className = '',
  editable = true
}, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          HTMLAttributes: {
            dir: 'rtl',
          },
        },
        orderedList: {
          HTMLAttributes: {
            dir: 'rtl',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'right',
      }),
      Underline,
      // Table extensions مؤقتاً معطلة
      // Table.configure({
      //   resizable: true,
      // }),
      // TableRow,
      // TableHeader,
      // TableCell,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
        dir: 'rtl',
        style: 'text-align: right;'
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    getJSON: () => editor?.getJSON() || {},
    setContent: (content: string) => editor?.commands.setContent(content),
    focus: () => editor?.commands.focus(),
  }));

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  const MenuButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '8px',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );

  const ColorPicker = ({ 
    currentColor, 
    onChange, 
    colors = [
      '#000000', '#374151', '#6B7280', '#9CA3AF', 
      '#EF4444', '#F97316', '#F59E0B', '#10B981',
      '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
    ]
  }: {
    currentColor: string;
    onChange: (color: string) => void;
    colors?: string[];
  }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '4px',
      padding: '8px',
      backgroundColor: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'absolute',
      top: '100%',
      left: '0',
      zIndex: 1000,
      minWidth: '120px'
    }}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: color,
            border: currentColor === color ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={`tiptap-editor ${className}`} style={{ direction: 'rtl' }}>
      {editable && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '12px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-background)'
        }}>
          {/* Text Formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="نص عريض"
          >
            <Bold size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="نص مائل"
          >
            <Italic size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="نص تحته خط"
          >
            <UnderlineIcon size={16} />
          </MenuButton>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />

          {/* Headings */}
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              'p'
            }
            onChange={(e) => {
              const level = e.target.value;
              if (level === 'p') {
                editor.chain().focus().setParagraph().run();
              } else {
                const headingLevel = parseInt(level.replace('h', ''));
                editor.chain().focus().toggleHeading({ level: headingLevel as any }).run();
              }
            }}
            style={{
              padding: '6px 8px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              fontSize: '14px'
            }}
          >
            <option value="p">فقرة عادية</option>
            <option value="h1">عنوان رئيسي</option>
            <option value="h2">عنوان فرعي</option>
            <option value="h3">عنوان صغير</option>
          </select>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />

          {/* Lists */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="قائمة نقطية"
          >
            <List size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="قائمة مرقمة"
          >
            <ListOrdered size={16} />
          </MenuButton>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />

          {/* Text Alignment */}
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="محاذاة يمين"
          >
            <AlignRight size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="محاذاة وسط"
          >
            <AlignCenter size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="محاذاة يسار"
          >
            <AlignLeft size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="محاذاة منتظمة"
          >
            <AlignJustify size={16} />
          </MenuButton>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />

          {/* Undo/Redo */}
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="تراجع"
          >
            <Undo size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="إعادة"
          >
            <Redo size={16} />
          </MenuButton>
        </div>
      )}
      
      <EditorContent 
        editor={editor} 
        style={{
          minHeight: editable ? '300px' : 'auto',
          padding: '16px',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'inherit',
        }}
      />
      
      {placeholder && editable && editor.isEmpty && (
        <div style={{
          position: 'absolute',
          top: editable ? '60px' : '16px',
          right: '16px',
          color: 'var(--color-text-light)',
          pointerEvents: 'none',
          fontSize: '16px'
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
