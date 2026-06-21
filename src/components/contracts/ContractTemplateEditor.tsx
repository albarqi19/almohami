import React, { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { VariableMention } from './VariableMentionExtension';
import { FontSize } from './FontSizeExtension';
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
  Undo,
  Redo,
  Eye,
  Braces,
  Pencil,
} from 'lucide-react';

interface ContractTemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onPreview?: () => void;
  /** عند تمريره يظهر زر «تعديل القيم» — يُستخدم في إنشاء العقد فقط (لا في تحرير القالب) */
  onEditValues?: () => void;
}

export interface ContractTemplateEditorRef {
  getHTML: () => string;
  getJSON: () => any;
  setContent: (content: string) => void;
  focus: () => void;
  insertVariable: (variable: string) => void;
}

// [P4·UX-09/TPL-4.7] MenuButton مرفوع خارج جسم المكوّن (لا يُعاد تعريفه كل render).
// ألوان الحالة النشطة عبر tokens (لا hex مثبّت) فتعمل في الثيمات الثلاثة.
const MenuButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}> = ({ onClick, isActive = false, disabled = false, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      padding: '8px',
      border: '1px solid var(--color-border)',
      borderRadius: '4px',
      backgroundColor: isActive ? 'var(--law-navy-light, var(--color-primary-soft))' : 'transparent',
      color: isActive ? 'var(--law-navy, var(--color-primary))' : 'var(--color-text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

const Divider: React.FC = () => (
  <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-border)', margin: '0 4px' }} />
);

const ContractTemplateEditor = forwardRef<ContractTemplateEditorRef, ContractTemplateEditorProps>(
  ({ content, onChange, placeholder = 'اكتب محتوى القالب هنا... استخدم {{ لإدراج متغير', className = '', editable = true, onPreview, onEditValues }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          bulletList: { HTMLAttributes: { dir: 'rtl' } },
          orderedList: { HTMLAttributes: { dir: 'rtl' } },
        }),
        TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'], defaultAlignment: 'right' }),
        Underline,
        TextStyle,
        Color,
        FontSize,
        Highlight.configure({ multicolor: true }),
        VariableMention,
      ],
      content,
      editable,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: { class: 'contract-template-editor-content', dir: 'rtl', style: 'text-align: right;' },
      },
    });

    const insertVariable = useCallback(
      (variable: string) => {
        if (!editor) return;
        const key = variable.replace(/^\{\{|\}\}$/g, '');
        editor.chain().focus().insertContent([{ type: 'mention', attrs: { id: key } }, { type: 'text', text: ' ' }]).run();
      },
      [editor],
    );

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getJSON: () => editor?.getJSON() || {},
      setContent: (c: string) => editor?.commands.setContent(c),
      focus: () => editor?.commands.focus(),
      insertVariable,
    }));

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }, [editor, content]);

    if (!editor) return null;
    const ed: Editor = editor;

    return (
      <div
        className={`contract-template-editor ${className}`}
        style={{ direction: 'rtl', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}
      >
        {editable && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '12px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--quiet-gray-50, var(--color-surface-subtle))', alignItems: 'center' }}>
            <MenuButton onClick={() => ed.chain().focus().toggleBold().run()} isActive={ed.isActive('bold')} title="نص عريض"><Bold size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().toggleItalic().run()} isActive={ed.isActive('italic')} title="نص مائل"><Italic size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().toggleUnderline().run()} isActive={ed.isActive('underline')} title="نص تحته خط"><UnderlineIcon size={16} /></MenuButton>
            <Divider />

            <select
              value={ed.isActive('heading', { level: 1 }) ? 'h1' : ed.isActive('heading', { level: 2 }) ? 'h2' : ed.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
              onChange={(e) => {
                const level = e.target.value;
                if (level === 'p') ed.chain().focus().setParagraph().run();
                else ed.chain().focus().toggleHeading({ level: parseInt(level.replace('h', '')) as any }).run();
              }}
              style={{ padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'transparent', color: 'var(--color-text)', fontSize: '14px' }}
            >
              <option value="p">فقرة عادية</option>
              <option value="h1">عنوان رئيسي</option>
              <option value="h2">عنوان فرعي</option>
              <option value="h3">عنوان صغير</option>
            </select>

            <select
              onChange={(e) => {
                const size = e.target.value;
                if (size === 'default') ed.chain().focus().unsetFontSize().run();
                else ed.chain().focus().setFontSize(size).run();
              }}
              style={{ padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'transparent', color: 'var(--color-text)', fontSize: '14px', minWidth: '80px' }}
              title="حجم الخط"
            >
              <option value="default">حجم الخط</option>
              {['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'].map((s) => (
                <option key={s} value={s}>{s.replace('px', '')}</option>
              ))}
            </select>
            <Divider />

            <MenuButton onClick={() => ed.chain().focus().toggleBulletList().run()} isActive={ed.isActive('bulletList')} title="قائمة نقطية"><List size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().toggleOrderedList().run()} isActive={ed.isActive('orderedList')} title="قائمة مرقمة"><ListOrdered size={16} /></MenuButton>
            <Divider />

            <MenuButton onClick={() => ed.chain().focus().setTextAlign('right').run()} isActive={ed.isActive({ textAlign: 'right' })} title="محاذاة يمين"><AlignRight size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().setTextAlign('center').run()} isActive={ed.isActive({ textAlign: 'center' })} title="محاذاة وسط"><AlignCenter size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().setTextAlign('left').run()} isActive={ed.isActive({ textAlign: 'left' })} title="محاذاة يسار"><AlignLeft size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().setTextAlign('justify').run()} isActive={ed.isActive({ textAlign: 'justify' })} title="محاذاة منتظمة"><AlignJustify size={16} /></MenuButton>
            <Divider />

            <MenuButton onClick={() => ed.chain().focus().undo().run()} disabled={!ed.can().undo()} title="تراجع"><Undo size={16} /></MenuButton>
            <MenuButton onClick={() => ed.chain().focus().redo().run()} disabled={!ed.can().redo()} title="إعادة"><Redo size={16} /></MenuButton>
            <Divider />

            {/* [P4·UX-09/TPL-4.9] إدراج متغيّر — يفتح مُنتقي المتغيّرات بكتابة {{ */}
            <button
              type="button"
              onClick={() => ed.chain().focus().insertContent('{{').run()}
              title="إدراج متغيّر"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px' }}
            >
              <Braces size={15} /> متغيّر
            </button>

            {/* تعديل قيم المتغيّرات — يظهر فقط في إنشاء العقد (override للقيم الأصلية) */}
            {onEditValues && (
              <button
                type="button"
                onClick={onEditValues}
                title="تعديل القيم الفعلية (اسم، جوال، هوية...) لهذا العقد"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px' }}
              >
                <Pencil size={15} /> تعديل القيم
              </button>
            )}

            {onPreview && (
              <>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={onPreview}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                >
                  <Eye size={16} /> معاينة
                </button>
              </>
            )}
          </div>
        )}

        <EditorContent
          editor={editor}
          style={{ minHeight: editable ? '400px' : 'auto', padding: '20px', fontSize: '16px', lineHeight: '1.8', fontFamily: 'inherit', color: 'var(--color-text)' }}
        />

        {placeholder && editable && editor.isEmpty && (
          <div style={{ position: 'absolute', top: editable ? '80px' : '20px', right: '20px', color: 'var(--color-text-secondary)', pointerEvents: 'none', fontSize: '16px' }}>
            {placeholder}
          </div>
        )}
      </div>
    );
  },
);

ContractTemplateEditor.displayName = 'ContractTemplateEditor';

export default ContractTemplateEditor;
