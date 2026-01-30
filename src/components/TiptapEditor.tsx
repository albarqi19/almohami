import React, { useEffect, useImperativeHandle, forwardRef, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Quote,
  Link as LinkIcon,
  Unlink,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Plus,
  Minus,
  Trash2,
  RowsIcon,
  Columns,
  Code
} from 'lucide-react';
import type { TextAnnotation } from '../types/textAnnotations';

// Extension for Font Size
import { Extension } from '@tiptap/core';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Types for annotation overlay
interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayHit {
  annotationId: string;
  annotationIndex: number;
  rects: OverlayRect[];
  anchorRect: DOMRect;
}

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  minHeight?: string;
  autoFocus?: boolean;
  textAnnotations?: TextAnnotation[];
  onApplyAnnotation?: (annotationId: string, newText: string) => void;
}

export interface TiptapEditorRef {
  getHTML: () => string;
  getJSON: () => any;
  setContent: (content: string) => void;
  focus: () => void;
  isEmpty: () => boolean;
  getAllText: () => string | null;
  getContent: () => any;
  getSelectedText: () => string | null;
  replaceSelectedText: (newText: string) => void;
  replaceAllText: (newText: string) => void;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
  content,
  onChange,
  placeholder = 'اكتب هنا...',
  className = '',
  editable = true,
  minHeight = '300px',
  autoFocus = false,
  textAnnotations = [],
  onApplyAnnotation
}, ref) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Annotation overlay state
  const containerRef = useRef<HTMLDivElement>(null);
  const [overlayHits, setOverlayHits] = useState<OverlayHit[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

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
        blockquote: {
          HTMLAttributes: {
            dir: 'rtl',
            class: 'tiptap-blockquote',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'tiptap-code-block',
          },
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'right',
      }),
      Underline,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
          dir: 'rtl',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
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

  // Get all text content
  const getAllText = useCallback(() => {
    if (!editor) return null;
    return editor.getText();
  }, [editor]);

  // Check if editor is empty
  const isEmpty = useCallback(() => {
    if (!editor) return true;
    return editor.isEmpty;
  }, [editor]);

  // Get selected text
  const getSelectedText = useCallback(() => {
    if (!editor) return null;
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor]);

  // Replace selected text
  const replaceSelectedText = useCallback((newText: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
  }, [editor]);

  // Replace all text
  const replaceAllText = useCallback((newText: string) => {
    if (!editor) return;
    editor.commands.setContent(newText);
  }, [editor]);

  // Normalize text for matching (remove diacritics, normalize whitespace)
  const normalizeText = useCallback((text: string): string => {
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
      .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // Remove zero-width chars
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Compute annotation overlays
  const recomputeAnnotationOverlays = useCallback(() => {
    const container = containerRef.current;
    if (!container || !editor) {
      setOverlayHits([]);
      return;
    }

    const annotations = (textAnnotations || []).filter(
      (a) => a && a.original_text && a.original_text.trim()
    );

    if (annotations.length === 0) {
      setOverlayHits([]);
      return;
    }

    const editorElement = container.querySelector('.ProseMirror') as HTMLElement;
    if (!editorElement) {
      setOverlayHits([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextHits: OverlayHit[] = [];

    // Get all text nodes from the editor
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: { node: Text; start: number; text: string }[] = [];
    let fullText = '';
    let node: Text | null;

    while ((node = walker.nextNode() as Text)) {
      textNodes.push({
        node,
        start: fullText.length,
        text: node.textContent || ''
      });
      fullText += node.textContent || '';
    }

    const normalizedFullText = normalizeText(fullText);

    annotations.forEach((annotation, idx) => {
      const normalizedNeedle = normalizeText(annotation.original_text);
      if (!normalizedNeedle) return;

      // Find match in normalized text
      const matchIndex = normalizedFullText.indexOf(normalizedNeedle);
      if (matchIndex < 0) return;

      // Map back to original text position (approximate)
      let currentNormPos = 0;
      let startNode: Text | null = null;
      let startOffset = 0;
      let endNode: Text | null = null;
      let endOffset = 0;

      for (const tn of textNodes) {
        const nodeNormText = normalizeText(tn.text);
        const nodeNormStart = currentNormPos;
        const nodeNormEnd = currentNormPos + nodeNormText.length;

        // Find start
        if (!startNode && matchIndex >= nodeNormStart && matchIndex < nodeNormEnd) {
          startNode = tn.node;
          // Approximate offset
          const offsetInNorm = matchIndex - nodeNormStart;
          startOffset = Math.min(offsetInNorm, tn.text.length);
        }

        // Find end
        const endMatchIndex = matchIndex + normalizedNeedle.length;
        if (!endNode && endMatchIndex > nodeNormStart && endMatchIndex <= nodeNormEnd) {
          endNode = tn.node;
          const offsetInNorm = endMatchIndex - nodeNormStart;
          endOffset = Math.min(offsetInNorm, tn.text.length);
        }

        currentNormPos = nodeNormEnd;

        if (startNode && endNode) break;
      }

      if (!startNode || !endNode) return;

      try {
        const range = document.createRange();
        range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.length)));
        range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.length)));

        const clientRects = Array.from(range.getClientRects());
        if (clientRects.length === 0) return;

        const rects: OverlayRect[] = clientRects.map((rect) => ({
          top: rect.top - containerRect.top + container.scrollTop,
          left: rect.left - containerRect.left + container.scrollLeft,
          width: rect.width,
          height: rect.height,
        }));

        nextHits.push({
          annotationId: annotation.id,
          annotationIndex: idx,
          rects,
          anchorRect: clientRects[0],
        });
      } catch (e) {
        console.error('Error creating range for annotation:', e);
      }
    });

    setOverlayHits(nextHits);
  }, [editor, textAnnotations, normalizeText]);

  // Recompute overlays when annotations change
  useEffect(() => {
    if (textAnnotations && textAnnotations.length > 0) {
      // Delay to let DOM settle
      const timer = setTimeout(() => {
        recomputeAnnotationOverlays();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setOverlayHits([]);
    }
  }, [textAnnotations, recomputeAnnotationOverlays]);

  // Also recompute on content changes
  useEffect(() => {
    if (textAnnotations && textAnnotations.length > 0) {
      const timer = setTimeout(() => {
        recomputeAnnotationOverlays();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content, recomputeAnnotationOverlays, textAnnotations]);

  // Handle applying annotation
  const handleApplyAnnotation = useCallback(() => {
    if (!activeAnnotationId || !editor) return;

    const annotation = (textAnnotations || []).find((a) => a.id === activeAnnotationId);
    if (!annotation || !annotation.suggested_text) return;

    // Call the callback if provided
    if (onApplyAnnotation) {
      onApplyAnnotation(annotation.id, annotation.suggested_text);
    }

    // Find and replace the text in the editor
    const fullText = editor.getText();
    const searchText = annotation.original_text;
    const replaceText = annotation.suggested_text;

    const index = fullText.indexOf(searchText);
    if (index >= 0) {
      // Get the position in the document
      let pos = 0;
      editor.state.doc.descendants((node, nodePos) => {
        if (node.isText) {
          const nodeText = node.text || '';
          const matchIndex = nodeText.indexOf(searchText);
          if (matchIndex >= 0 && pos === 0) {
            pos = nodePos + matchIndex;
            return false;
          }
        }
        return true;
      });

      if (pos > 0) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: pos, to: pos + searchText.length })
          .deleteSelection()
          .insertContent(replaceText)
          .run();
      }
    }

    setActiveAnnotationId(null);
    setTooltipPos(null);

    // Recompute overlays after replacement
    setTimeout(() => recomputeAnnotationOverlays(), 100);
  }, [activeAnnotationId, editor, textAnnotations, onApplyAnnotation, recomputeAnnotationOverlays]);

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    getJSON: () => editor?.getJSON() || {},
    setContent: (content: string) => editor?.commands.setContent(content),
    focus: () => editor?.commands.focus(),
    isEmpty: () => isEmpty(),
    getAllText: () => getAllText(),
    getContent: () => editor?.getJSON() || {},
    getSelectedText: () => getSelectedText(),
    replaceSelectedText: (newText: string) => replaceSelectedText(newText),
    replaceAllText: (newText: string) => replaceAllText(newText),
  }));

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.color-picker-wrapper')) {
        setShowColorPicker(false);
      }
      if (!target.closest('.highlight-picker-wrapper')) {
        setShowHighlightPicker(false);
      }
      if (!target.closest('.link-input-wrapper')) {
        setShowLinkInput(false);
      }
      if (!target.closest('.table-menu-wrapper')) {
        setShowTableMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`tiptap-menu-btn ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <div className="tiptap-toolbar-divider" />
  );

  const setLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    let url = linkUrl;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF',
    '#EF4444', '#DC2626', '#B91C1C',
    '#F97316', '#EA580C', '#C2410C',
    '#F59E0B', '#D97706', '#B45309',
    '#10B981', '#059669', '#047857',
    '#3B82F6', '#2563EB', '#1D4ED8',
    '#6366F1', '#4F46E5', '#4338CA',
    '#8B5CF6', '#7C3AED', '#6D28D9',
    '#EC4899', '#DB2777', '#BE185D',
  ];

  const highlightColors = [
    '#FEF3C7', '#FDE68A', '#FCD34D',
    '#D1FAE5', '#A7F3D0', '#6EE7B7',
    '#DBEAFE', '#BFDBFE', '#93C5FD',
    '#E9D5FF', '#D8B4FE', '#C084FC',
    '#FCE7F3', '#FBCFE8', '#F9A8D4',
  ];

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

  return (
    <div ref={containerRef} className={`tiptap-editor ${className}`} style={{ direction: 'rtl', position: 'relative' }}>
      {editable && (
        <div className="tiptap-toolbar">
          {/* Text Formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="نص عريض (Ctrl+B)"
          >
            <Bold size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="نص مائل (Ctrl+I)"
          >
            <Italic size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="نص تحته خط (Ctrl+U)"
          >
            <UnderlineIcon size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="نص يتوسطه خط"
          >
            <Strikethrough size={16} />
          </MenuButton>

          <Divider />

          {/* Font Size */}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                (editor.chain().focus() as any).setFontSize(e.target.value).run();
              }
            }}
            className="tiptap-select"
            title="حجم الخط"
          >
            <option value="">حجم الخط</option>
            {fontSizes.map(size => (
              <option key={size} value={size}>{size.replace('px', '')}</option>
            ))}
          </select>

          {/* Headings */}
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              editor.isActive('heading', { level: 4 }) ? 'h4' :
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
            className="tiptap-select"
            title="نوع النص"
          >
            <option value="p">فقرة عادية</option>
            <option value="h1">عنوان رئيسي</option>
            <option value="h2">عنوان فرعي</option>
            <option value="h3">عنوان ثالث</option>
            <option value="h4">عنوان رابع</option>
          </select>

          <Divider />

          {/* Color Picker */}
          <div className="color-picker-wrapper" style={{ position: 'relative' }}>
            <MenuButton
              onClick={() => setShowColorPicker(!showColorPicker)}
              isActive={showColorPicker}
              title="لون النص"
            >
              <Palette size={16} />
            </MenuButton>
            {showColorPicker && (
              <div className="tiptap-dropdown">
                <div className="tiptap-color-grid">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                      className="tiptap-color-btn"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                  className="tiptap-dropdown-action"
                >
                  إزالة اللون
                </button>
              </div>
            )}
          </div>

          {/* Highlight Picker */}
          <div className="highlight-picker-wrapper" style={{ position: 'relative' }}>
            <MenuButton
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              isActive={editor.isActive('highlight')}
              title="تظليل النص"
            >
              <Highlighter size={16} />
            </MenuButton>
            {showHighlightPicker && (
              <div className="tiptap-dropdown">
                <div className="tiptap-color-grid">
                  {highlightColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="tiptap-color-btn"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowHighlightPicker(false);
                  }}
                  className="tiptap-dropdown-action"
                >
                  إزالة التظليل
                </button>
              </div>
            )}
          </div>

          <Divider />

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

          {/* Blockquote */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="اقتباس"
          >
            <Quote size={16} />
          </MenuButton>

          {/* Code Block */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="كود"
          >
            <Code size={16} />
          </MenuButton>

          <Divider />

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

          <Divider />

          {/* Link */}
          <div className="link-input-wrapper" style={{ position: 'relative' }}>
            <MenuButton
              onClick={() => setShowLinkInput(!showLinkInput)}
              isActive={editor.isActive('link')}
              title="إضافة رابط"
            >
              <LinkIcon size={16} />
            </MenuButton>
            {showLinkInput && (
              <div className="tiptap-dropdown tiptap-link-dropdown">
                <input
                  type="url"
                  placeholder="أدخل الرابط..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setLink();
                    }
                  }}
                  className="tiptap-link-input"
                  dir="ltr"
                />
                <div className="tiptap-link-actions">
                  <button type="button" onClick={setLink} className="tiptap-link-btn primary">
                    إضافة
                  </button>
                  {editor.isActive('link') && (
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetLink().run();
                        setShowLinkInput(false);
                      }}
                      className="tiptap-link-btn danger"
                    >
                      <Unlink size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="table-menu-wrapper" style={{ position: 'relative' }}>
            <MenuButton
              onClick={() => setShowTableMenu(!showTableMenu)}
              isActive={editor.isActive('table')}
              title="جدول"
            >
              <TableIcon size={16} />
            </MenuButton>
            {showTableMenu && (
              <div className="tiptap-dropdown tiptap-table-dropdown">
                {!editor.isActive('table') ? (
                  <button type="button" onClick={addTable} className="tiptap-dropdown-item">
                    <Plus size={14} />
                    إضافة جدول 3×3
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                      className="tiptap-dropdown-item"
                    >
                      <Columns size={14} />
                      إضافة عمود
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                      className="tiptap-dropdown-item"
                    >
                      <RowsIcon size={14} />
                      إضافة صف
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                      className="tiptap-dropdown-item danger"
                    >
                      <Minus size={14} />
                      حذف العمود
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                      className="tiptap-dropdown-item danger"
                    >
                      <Minus size={14} />
                      حذف الصف
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                      className="tiptap-dropdown-item danger"
                    >
                      <Trash2 size={14} />
                      حذف الجدول
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <Divider />

          {/* Undo/Redo */}
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="تراجع (Ctrl+Z)"
          >
            <Undo size={16} />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="إعادة (Ctrl+Y)"
          >
            <Redo size={16} />
          </MenuButton>
        </div>
      )}

      <div className="tiptap-editor-area" style={{ position: 'relative' }}>
        <EditorContent
          editor={editor}
          className="tiptap-content-wrapper"
          style={{
            minHeight: editable ? minHeight : 'auto',
          }}
        />

        {/* Annotation Overlay Layer - inside editor area only */}
        {overlayHits.length > 0 && (
          <div className="tiptap-annotations-layer" aria-hidden="true">
            {overlayHits.flatMap((hit) => {
              const annotation = (textAnnotations || [])[hit.annotationIndex];
              const severity = annotation?.severity || 'medium';
              return hit.rects.map((rect, rectIdx) => (
                <div
                  key={`${hit.annotationId}-${rectIdx}`}
                  className={`tiptap-annotation-hit tiptap-annotation-${severity}`}
                  style={{
                    top: `${rect.top}px`,
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                  }}
                  onMouseEnter={() => {
                    setActiveAnnotationId(hit.annotationId);
                    const top = Math.max(8, hit.anchorRect.top - 8);
                    const left = Math.min(window.innerWidth - 320, Math.max(8, hit.anchorRect.left));
                    setTooltipPos({ top, left });
                  }}
                  onMouseLeave={() => {
                    // Tooltip manages its own hover
                  }}
                />
              ));
            })}
          </div>
        )}

        {placeholder && editable && editor.isEmpty && (
          <div className="tiptap-placeholder">
            {placeholder}
          </div>
        )}
      </div>

      <style>{`
        .tiptap-editor {
          position: relative;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .tiptap-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          background: var(--color-background, #f9fafb);
          align-items: center;
        }

        .tiptap-menu-btn {
          padding: 6px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: var(--color-text, #374151);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .tiptap-menu-btn:hover:not(.disabled) {
          background: var(--color-border, #e5e7eb);
        }

        .tiptap-menu-btn.active {
          background: var(--color-primary-light, #dbeafe);
          color: var(--color-primary, #2563eb);
          border-color: var(--color-primary, #2563eb);
        }

        .tiptap-menu-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tiptap-toolbar-divider {
          width: 1px;
          height: 24px;
          background: var(--color-border, #e5e7eb);
          margin: 0 4px;
        }

        .tiptap-select {
          padding: 4px 8px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          background: white;
          font-size: 13px;
          cursor: pointer;
          min-width: 80px;
        }

        .tiptap-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 160px;
          padding: 8px;
        }

        .tiptap-color-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .tiptap-color-btn {
          width: 24px;
          height: 24px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .tiptap-color-btn:hover {
          transform: scale(1.15);
          border-color: var(--color-primary, #2563eb);
        }

        .tiptap-dropdown-action {
          width: 100%;
          padding: 6px 8px;
          border: none;
          background: var(--color-background, #f9fafb);
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          text-align: center;
        }

        .tiptap-dropdown-action:hover {
          background: var(--color-border, #e5e7eb);
        }

        .tiptap-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          font-size: 13px;
          cursor: pointer;
          text-align: right;
          border-radius: 4px;
        }

        .tiptap-dropdown-item:hover {
          background: var(--color-background, #f9fafb);
        }

        .tiptap-dropdown-item.danger {
          color: var(--color-error, #dc2626);
        }

        .tiptap-link-dropdown {
          min-width: 280px;
        }

        .tiptap-link-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 4px;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .tiptap-link-actions {
          display: flex;
          gap: 8px;
        }

        .tiptap-link-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tiptap-link-btn.primary {
          background: var(--color-primary, #2563eb);
          color: white;
        }

        .tiptap-link-btn.danger {
          background: var(--color-error-light, #fee2e2);
          color: var(--color-error, #dc2626);
        }

        .tiptap-content-wrapper {
          padding: 16px;
          font-size: 16px;
          line-height: 1.7;
        }

        .tiptap-content-wrapper .ProseMirror {
          outline: none;
          min-height: inherit;
        }

        .tiptap-content-wrapper .ProseMirror > * + * {
          margin-top: 0.75em;
        }

        .tiptap-content-wrapper h1 { font-size: 2em; font-weight: 700; }
        .tiptap-content-wrapper h2 { font-size: 1.5em; font-weight: 600; }
        .tiptap-content-wrapper h3 { font-size: 1.25em; font-weight: 600; }
        .tiptap-content-wrapper h4 { font-size: 1.1em; font-weight: 600; }

        .tiptap-content-wrapper ul,
        .tiptap-content-wrapper ol {
          padding-right: 1.5em;
        }

        .tiptap-content-wrapper .tiptap-blockquote {
          border-right: 4px solid var(--color-primary, #2563eb);
          padding: 12px 16px;
          margin: 16px 0;
          background: var(--color-background, #f9fafb);
          border-radius: 0 8px 8px 0;
          font-style: italic;
        }

        .tiptap-content-wrapper .tiptap-code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          overflow-x: auto;
          direction: ltr;
          text-align: left;
        }

        .tiptap-content-wrapper .tiptap-link {
          color: var(--color-primary, #2563eb);
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap-content-wrapper .tiptap-table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }

        .tiptap-content-wrapper .tiptap-table th,
        .tiptap-content-wrapper .tiptap-table td {
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 8px 12px;
          text-align: right;
        }

        .tiptap-content-wrapper .tiptap-table th {
          background: var(--color-background, #f9fafb);
          font-weight: 600;
        }

        .tiptap-content-wrapper .tiptap-table .selectedCell {
          background: var(--color-primary-light, #dbeafe);
        }

        .tiptap-placeholder {
          position: absolute;
          top: 60px;
          right: 16px;
          color: var(--color-text-light, #9ca3af);
          pointer-events: none;
          font-size: 16px;
        }

        /* Print styles */
        @media print {
          .tiptap-toolbar {
            display: none !important;
          }
          .tiptap-editor {
            border: none !important;
          }
        }

        /* Annotation overlay styles */
        .tiptap-annotations-layer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
        }

        .tiptap-annotation-hit {
          position: absolute;
          pointer-events: auto;
          cursor: pointer;
          border-radius: 2px;
          transition: opacity 0.15s;
        }

        .tiptap-annotation-high {
          background: rgba(239, 68, 68, 0.25);
          border-bottom: 2px solid #ef4444;
        }

        .tiptap-annotation-medium {
          background: rgba(245, 158, 11, 0.25);
          border-bottom: 2px solid #f59e0b;
        }

        .tiptap-annotation-low {
          background: rgba(59, 130, 246, 0.25);
          border-bottom: 2px solid #3b82f6;
        }

        .tiptap-annotation-hit:hover {
          opacity: 0.8;
        }

        .tiptap-annotation-tooltip {
          position: fixed;
          z-index: 1001;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 300px;
          direction: rtl;
          text-align: right;
        }

        .tiptap-annotation-tooltip-title {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .tiptap-annotation-tooltip-text {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .tiptap-annotation-tooltip-ref {
          font-size: 12px;
          color: #64748b;
          padding: 6px 8px;
          background: #f1f5f9;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .tiptap-annotation-tooltip-actions {
          display: flex;
          justify-content: flex-end;
        }

        .tiptap-annotation-apply-btn {
          padding: 6px 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tiptap-annotation-apply-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }
      `}</style>

      {/* Annotation Tooltip - outside editor area for fixed positioning */}
      {activeAnnotationId && tooltipPos && (
        <div
          className="tiptap-annotation-tooltip"
          style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
          onMouseEnter={() => {
            // Keep tooltip open
          }}
          onMouseLeave={() => {
            setActiveAnnotationId(null);
            setTooltipPos(null);
          }}
        >
          {(() => {
            const annotation = (textAnnotations || []).find((a) => a.id === activeAnnotationId);
            if (!annotation) return null;
            const hasRealSuggestion =
              Boolean(annotation.suggested_text) &&
              annotation.suggested_text.trim() !== annotation.original_text.trim();
            return (
              <>
                <div className="tiptap-annotation-tooltip-title">ملاحظة</div>
                {annotation.reason && (
                  <div className="tiptap-annotation-tooltip-text">{annotation.reason}</div>
                )}
                {annotation.legal_reference && (
                  <div className="tiptap-annotation-tooltip-ref">{annotation.legal_reference}</div>
                )}
                {hasRealSuggestion && (
                  <div className="tiptap-annotation-tooltip-actions">
                    <button
                      type="button"
                      className="tiptap-annotation-apply-btn"
                      onClick={handleApplyAnnotation}
                    >
                      تطبيق التصحيح
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
