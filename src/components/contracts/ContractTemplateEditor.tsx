import React, { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
  Type,
} from 'lucide-react';

interface ContractTemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onPreview?: () => void;
}

export interface ContractTemplateEditorRef {
  getHTML: () => string;
  getJSON: () => any;
  setContent: (content: string) => void;
  focus: () => void;
  insertVariable: (variable: string) => void;
}

const ContractTemplateEditor = forwardRef<
  ContractTemplateEditorRef,
  ContractTemplateEditorProps
>(
  (
    {
      content,
      onChange,
      placeholder = 'اكتب محتوى القالب هنا... استخدم {{ لإدراج متغير',
      className = '',
      editable = true,
      onPreview,
    },
    ref
  ) => {
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
        TextStyle,
        Color,
        FontSize,
        Highlight.configure({
          multicolor: true,
        }),
        VariableMention,
      ],
      content,
      editable,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'contract-template-editor-content',
          dir: 'rtl',
          style: 'text-align: right;',
        },
      },
    });

    const insertVariable = useCallback(
      (variable: string) => {
        if (editor) {
          editor.chain().focus().insertContent(variable).run();
        }
      },
      [editor]
    );

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getJSON: () => editor?.getJSON() || {},
      setContent: (content: string) => editor?.commands.setContent(content),
      focus: () => editor?.commands.focus(),
      insertVariable,
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
      title,
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
          border: '1px solid var(--color-border, #e5e7eb)',
          borderRadius: '4px',
          backgroundColor: isActive ? '#dbeafe' : 'transparent',
          color: isActive ? '#1d4ed8' : 'var(--color-text, #374151)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {children}
      </button>
    );

    return (
      <div
        className={`contract-template-editor ${className}`}
        style={{
          direction: 'rtl',
          border: '1px solid var(--color-border, #e5e7eb)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'white',
        }}
      >
        {editable && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              padding: '12px',
              borderBottom: '1px solid var(--color-border, #e5e7eb)',
              backgroundColor: 'var(--color-background, #f9fafb)',
              alignItems: 'center',
            }}
          >
            {/* تنسيق النصوص */}
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

            <div
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'var(--color-border, #e5e7eb)',
                margin: '0 4px',
              }}
            />

            {/* العناوين */}
            <select
              value={
                editor.isActive('heading', { level: 1 })
                  ? 'h1'
                  : editor.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
              }
              onChange={(e) => {
                const level = e.target.value;
                if (level === 'p') {
                  editor.chain().focus().setParagraph().run();
                } else {
                  const headingLevel = parseInt(level.replace('h', ''));
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: headingLevel as any })
                    .run();
                }
              }}
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                fontSize: '14px',
              }}
            >
              <option value="p">فقرة عادية</option>
              <option value="h1">عنوان رئيسي</option>
              <option value="h2">عنوان فرعي</option>
              <option value="h3">عنوان صغير</option>
            </select>

            {/* حجم الخط */}
            <select
              onChange={(e) => {
                const size = e.target.value;
                if (size === 'default') {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(size).run();
                }
              }}
              style={{
                padding: '6px 8px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                fontSize: '14px',
                minWidth: '80px',
              }}
              title="حجم الخط"
            >
              <option value="default">حجم الخط</option>
              <option value="10px">10</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="20px">20</option>
              <option value="24px">24</option>
              <option value="28px">28</option>
              <option value="32px">32</option>
              <option value="36px">36</option>
              <option value="48px">48</option>
            </select>

            <div
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'var(--color-border, #e5e7eb)',
                margin: '0 4px',
              }}
            />

            {/* القوائم */}
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

            <div
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'var(--color-border, #e5e7eb)',
                margin: '0 4px',
              }}
            />

            {/* المحاذاة */}
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

            <div
              style={{
                width: '1px',
                height: '32px',
                backgroundColor: 'var(--color-border, #e5e7eb)',
                margin: '0 4px',
              }}
            />

            {/* التراجع والإعادة */}
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

            {/* زر المعاينة */}
            {onPreview && (
              <>
                <div style={{ flex: 1 }} />
                <button
                  onClick={onPreview}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  <Eye size={16} />
                  معاينة
                </button>
              </>
            )}
          </div>
        )}

        <EditorContent
          editor={editor}
          style={{
            minHeight: editable ? '400px' : 'auto',
            padding: '20px',
            fontSize: '16px',
            lineHeight: '1.8',
            fontFamily: 'inherit',
          }}
        />

        {placeholder && editable && editor.isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: editable ? '80px' : '20px',
              right: '20px',
              color: 'var(--color-text-light, #9ca3af)',
              pointerEvents: 'none',
              fontSize: '16px',
            }}
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

ContractTemplateEditor.displayName = 'ContractTemplateEditor';

export default ContractTemplateEditor;
