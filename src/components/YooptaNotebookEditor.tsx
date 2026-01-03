import React, { useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import type { YooptaContentValue, YooptaOnChangeOptions } from '@yoopta/editor';

// Plugins
import Paragraph from '@yoopta/paragraph';
import Headings from '@yoopta/headings';
import Lists from '@yoopta/lists';
import Blockquote from '@yoopta/blockquote';
import Callout from '@yoopta/callout';
import Divider from '@yoopta/divider';
import Code from '@yoopta/code';
import Link from '@yoopta/link';

// Tools
import ActionMenuList, { DefaultActionMenuRender } from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool';

// Marks
import { Bold, Italic, CodeMark, Underline, Strike, Highlight } from '@yoopta/marks';

import '../styles/yoopta-editor.css';

function createEmptyRightAlignedContent(): YooptaContentValue {
    const id = `paragraph-0-${Date.now()}`;
    return {
        [id]: {
            id,
            type: 'Paragraph',
            value: [
                {
                    id: 'text-0',
                    type: 'paragraph',
                    children: [{ text: '' }],
                },
            ],
            meta: {
                order: 0,
                depth: 0,
                align: 'right',
            },
        },
    } as YooptaContentValue;
}

function getBlockIdByOrder(content: YooptaContentValue | undefined, order: number): string | null {
    if (!content) return null;
    for (const block of Object.values(content)) {
        if (block && typeof block === 'object' && block.meta?.order === order) {
            return block.id;
        }
    }
    return null;
}

// Plugins configuration - using simpler plugins that work well together
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plugins: any[] = [
    Paragraph,
    Headings.HeadingOne,
    Headings.HeadingTwo,
    Headings.HeadingThree,
    Lists.BulletedList,
    Lists.NumberedList,
    Lists.TodoList,
    Blockquote,
    Callout,
    Divider,
    Code,
    Link,
];

// Marks configuration
const marks = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

// Custom Arabic Action Menu Render
const ArabicActionMenuRender = (props: React.ComponentProps<typeof DefaultActionMenuRender>) => {
    return (
        <DefaultActionMenuRender
            {...props}
        />
    );
};

// Tools configuration
const TOOLS = {
    ActionMenu: {
        tool: ActionMenuList,
        render: ArabicActionMenuRender,
    },
    Toolbar: {
        tool: Toolbar,
        render: DefaultToolbarRender,
    },
    LinkTool: {
        tool: LinkTool,
        render: DefaultLinkToolRender,
    },
};

export interface YooptaNotebookEditorRef {
    getContent: () => YooptaContentValue | undefined;
    setContent: (content: YooptaContentValue) => void;
    isEmpty: () => boolean;
    focus: () => void;
    getSelectedText: () => string | null;
    getAllText: () => string | null;
    replaceSelectedText: (newText: string) => void;
    replaceAllText: (newText: string) => void;
}

interface YooptaNotebookEditorProps {
    initialContent?: YooptaContentValue;
    onChange?: (value: YooptaContentValue) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
}

const YooptaNotebookEditor = forwardRef<YooptaNotebookEditorRef, YooptaNotebookEditorProps>(({
    initialContent,
    onChange,
    readOnly = false,
    className = '',
    autoFocus = true,
}, ref) => {
    const editor = useMemo(() => createYooptaEditor(), []);
    const [value, setValue] = React.useState<YooptaContentValue | undefined>(
        initialContent ?? createEmptyRightAlignedContent()
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const alignmentFixInProgressRef = useRef(false);
    const lastActiveAlignRef = useRef<'left' | 'center' | 'right'>('right');
    const lastPathOrderRef = useRef<number | null>(0);

    // Keep Yoopta floating block actions visually attached to the hovered block, but on the RIGHT side for RTL.
    // Yoopta's internal implementation anchors actions to `rect.left` and shifts them left; for RTL we want `rect.right`.
    useEffect(() => {
        if (readOnly) return;
        const root = containerRef.current;
        if (!root) return;

        const GAP_PX = 8;
        let lastHoveredBlockEl: HTMLElement | null = null;
        let rafId: number | null = null;

        const applyPosition = () => {
            const actionsEl = document.querySelector('.yoopta-block-actions') as HTMLElement | null;
            if (!actionsEl || !lastHoveredBlockEl) return;

            const rect = lastHoveredBlockEl.getBoundingClientRect();

            // Keep Yoopta's approach (viewport-fixed coordinates) but anchor to the block's RIGHT edge.
            actionsEl.style.position = 'fixed';
            actionsEl.style.left = `${Math.round(rect.right + GAP_PX)}px`;
            actionsEl.style.right = 'auto';
            actionsEl.style.top = `${Math.round(rect.top + 2)}px`;
            actionsEl.style.transform = 'scale(1)';
        };

        const schedule = () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = null;
                applyPosition();
            });
        };

        const onMouseMove = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const actionsEl = document.querySelector('.yoopta-block-actions') as HTMLElement | null;
            if (actionsEl && actionsEl.contains(target)) {
                // Hovering the buttons themselves: keep last block position.
                schedule();
                return;
            }

            const blockEl = target.closest?.('[data-yoopta-block]') as HTMLElement | null;
            if (!blockEl) return;

            lastHoveredBlockEl = blockEl;
            schedule();
        };

        const onScroll = () => schedule();

        root.addEventListener('mousemove', onMouseMove, true);
        // Use capture to catch scrolls from nested containers (like `.editor-container`).
        document.addEventListener('scroll', onScroll, true);

        return () => {
            root.removeEventListener('mousemove', onMouseMove, true);
            document.removeEventListener('scroll', onScroll, true);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [readOnly]);

    // Arabic localization for Yoopta floating toolbar (appears on text selection).
    // Yoopta toolbar ships with English aria-labels and some visible text (e.g. "Link", block titles).
    // There is no first-class locale prop, so we translate within the toolbar DOM only.
    useEffect(() => {
        const dictionary: Record<string, string> = {
            // Groups
            'Block formatting': 'تنسيق البلوك',
            'Text formatting': 'تنسيق النص',

            // Marks / actions
            Bold: 'عريض',
            Italic: 'مائل',
            Underline: 'تسطير',
            Strike: 'يتوسطه خط',
            Code: 'كود',
            Alignment: 'محاذاة',
            Highlight: 'تمييز',
            Link: 'رابط',
            LinkTool: 'رابط',

            // Common block titles
            Paragraph: 'فقرة',
            HeadingOne: 'عنوان 1',
            HeadingTwo: 'عنوان 2',
            HeadingThree: 'عنوان 3',
            'Heading 1': 'عنوان 1',
            'Heading 2': 'عنوان 2',
            'Heading 3': 'عنوان 3',
            BulletedList: 'قائمة نقطية',
            NumberedList: 'قائمة رقمية',
            TodoList: 'قائمة مهام',
            'Bulleted List': 'قائمة نقطية',
            'Numbered List': 'قائمة رقمية',
            'Todo List': 'قائمة مهام',
            Blockquote: 'اقتباس',
            Callout: 'تنبيه',
            Divider: 'فاصل',

            // Action menu list misc
            'No actions available': 'لا توجد خيارات',
        };

        const translateValue = (value: string | null): string | null => {
            if (!value) return value;
            return dictionary[value] ?? value;
        };

        const translateElement = (root: HTMLElement) => {
            const elements = root.querySelectorAll<HTMLElement>('*');
            const all = [root, ...Array.from(elements)];

            for (const el of all) {
                // Never touch editor content.
                if (el.matches('[data-yoopta-editor], [data-yoopta-editor] *')) continue;

                // Attributes commonly used for labels/tooltips
                for (const attr of ['aria-label', 'title', 'placeholder'] as const) {
                    const current = el.getAttribute(attr);
                    const translated = translateValue(current);
                    if (translated && translated !== current) {
                        el.setAttribute(attr, translated);
                    }
                }

                // Visible text (e.g. Link / Paragraph / Heading 1)
                if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
                    const raw = el.textContent ?? '';
                    const trimmed = raw.trim();
                    const translated = dictionary[trimmed];
                    if (translated) {
                        const leading = raw.match(/^\s*/)?.[0] ?? '';
                        const trailing = raw.match(/\s*$/)?.[0] ?? '';
                        el.textContent = `${leading}${translated}${trailing}`;
                    }
                }
            }
        };

        const translateToolbarIfPresent = () => {
            const roots: Array<HTMLElement> = [];
            const toolbarPortal = document.querySelector('#yoo-toolbar-portal') as HTMLElement | null;
            if (toolbarPortal) roots.push(toolbarPortal);
            const toolbar = document.querySelector('.yoopta-toolbar-root') as HTMLElement | null;
            if (toolbar) roots.push(toolbar);
            const linkPortal = document.querySelector('#yoo-link-tool-portal') as HTMLElement | null;
            if (linkPortal) roots.push(linkPortal);
            const actionMenuPortal = document.querySelector('#yoo-toolbar-action-menu-list-portal') as HTMLElement | null;
            if (actionMenuPortal) roots.push(actionMenuPortal);
            const highlightPortal = document.querySelector('#yoo-highlight-color-portal') as HTMLElement | null;
            if (highlightPortal) roots.push(highlightPortal);
            // Slash/action menu lists (also used inside toolbar action menu)
            const actionMenuLists = Array.from(document.querySelectorAll('[data-action-menu-list]')) as HTMLElement[];
            roots.push(...actionMenuLists);
            roots.forEach(translateElement);
        };

        translateToolbarIfPresent();

        let scheduled = false;
        const scheduleTranslate = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                translateToolbarIfPresent();
            });
        };

        const isInsideYooptaUi = (node: Node): boolean => {
            const el = node instanceof HTMLElement ? node : node.parentElement;
            if (!el) return false;
            return Boolean(
                el.closest(
                    '#yoo-toolbar-portal, #yoo-toolbar-action-menu-list-portal, #yoo-link-tool-portal, #yoo-highlight-color-portal, .yoopta-toolbar-root, [data-action-menu-list]'
                )
            );
        };

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'characterData') {
                    if (isInsideYooptaUi(m.target)) {
                        scheduleTranslate();
                        return;
                    }
                    continue;
                }

                for (const added of Array.from(m.addedNodes)) {
                    if (isInsideYooptaUi(added)) {
                        scheduleTranslate();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    const normalizeAlign = (align: unknown): 'left' | 'center' | 'right' | undefined => {
        return align === 'left' || align === 'center' || align === 'right' ? align : undefined;
    };

    // Helper function to get ALL text from the editor
    const getAllTextFromEditor = (): string | null => {
        if (!value) return null;
        
        const texts: string[] = [];
        const blocks = Object.values(value);
        
        // Sort blocks by meta.order
        blocks.sort((a, b) => (a.meta?.order || 0) - (b.meta?.order || 0));
        
        for (const block of blocks) {
            if (block.value && Array.isArray(block.value)) {
                for (const element of block.value) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const children = (element as any)?.children;
                    if (children && Array.isArray(children)) {
                        for (const child of children) {
                            if (child.text) {
                                texts.push(child.text);
                            }
                        }
                    }
                }
            }
        }
        
        const result = texts.join('\n').trim();
        return result || null;
    };

    // Helper function to get selected text from the editor
    const getSelectedTextFromEditor = (): string | null => {
        // Try to get the selection from the window
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            // Check if selection is within our editor
            const editorEl = containerRef.current;
            if (editorEl) {
                const anchorNode = selection.anchorNode;
                if (anchorNode && editorEl.contains(anchorNode)) {
                    return selection.toString().trim();
                }
            }
        }
        return null;
    };

    // Helper function to replace selected text in the editor
    const replaceSelectedTextInEditor = (newText: string): void => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const editorEl = containerRef.current;
        if (!editorEl) return;

        const anchorNode = selection.anchorNode;
        if (!anchorNode || !editorEl.contains(anchorNode)) return;

        // Get the range and replace content
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
            // Delete the selected content
            range.deleteContents();
            
            // Split text by newlines for multi-paragraph handling
            const lines = newText.split('\n');
            const fragment = document.createDocumentFragment();
            
            lines.forEach((line, index) => {
                const textNode = document.createTextNode(line);
                fragment.appendChild(textNode);
                if (index < lines.length - 1) {
                    fragment.appendChild(document.createElement('br'));
                }
            });
            
            range.insertNode(fragment);
            
            // Collapse selection to end
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger input event to notify the editor
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: newText
            });
            editorEl.dispatchEvent(inputEvent);
        }
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        getContent: () => value,
        setContent: (content: YooptaContentValue) => {
            setValue(content);
        },
        isEmpty: () => {
            if (!value) return true;
            const keys = Object.keys(value);
            if (keys.length === 0) return true;
            // Check if there's only one empty paragraph
            if (keys.length === 1) {
                const block = value[keys[0]];
                if (block.type === 'Paragraph') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const firstValue = block.value?.[0] as any;
                    const children = firstValue?.children;
                    if (children && children.length === 1 && children[0].text === '') {
                        return true;
                    }
                }
            }
            return false;
        },
        focus: () => {
            // Focus the editor container
            containerRef.current?.focus();
        },
        getSelectedText: getSelectedTextFromEditor,
        getAllText: getAllTextFromEditor,
        replaceSelectedText: replaceSelectedTextInEditor,
        replaceAllText: (newText: string) => {
            // استبدال كل المحتوى بنص جديد
            const lines = newText.split('\n');
            const newContent: YooptaContentValue = {};
            const timestamp = Date.now();
            
            lines.forEach((line, index) => {
                const blockId = `paragraph-${index}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
                newContent[blockId] = {
                    id: blockId,
                    type: 'Paragraph',
                    meta: {
                        order: index,
                        depth: 0,
                        align: 'right'
                    },
                    value: [
                        {
                            id: `p-value-${index}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                            type: 'paragraph',
                            children: [{ text: line }],
                            props: {
                                nodeType: 'block'
                            }
                        }
                    ]
                };
            });
            
            // استخدام setContent بدلاً من setValue المباشر
            setValue(newContent);
            if (onChange) {
                onChange(newContent);
            }
            
            // Force re-render and focus
            setTimeout(() => {
                containerRef.current?.focus();
            }, 50);
        },
    }), [value, onChange]);

    // Update internal value when initialContent changes
    useEffect(() => {
        setValue(initialContent ?? createEmptyRightAlignedContent());
    }, [initialContent]);

    const handleChange = (newValue: YooptaContentValue, options: YooptaOnChangeOptions) => {
        setValue(newValue);
        if (onChange) {
            onChange(newValue);
        }

        // Yoopta default behavior: when pressing Enter at the start/end of a block it inserts a new block.
        // Importantly: Yoopta sets meta.align to "left" by default on insert_block unless blockData.meta.align is provided.
        // For RTL Arabic we want:
        // - new notebook/default blocks: right
        // - inserted new blocks inherit previous block's align (left/center/right)
        if (alignmentFixInProgressRef.current) return;

        if (!newValue || typeof newValue !== 'object') return;

        const operations = options.operations || [];

        const insertOps = operations.filter(
            (op) => op.type === 'insert_block'
        ) as Array<{ type: 'insert_block'; block: { id: string; meta?: { order?: number; align?: 'left' | 'center' | 'right' } } }>;

        const toggleOps = operations.filter(
            (op) => op.type === 'toggle_block'
        ) as Array<{
            type: 'toggle_block';
            properties: { toggledBlock: { id: string; meta?: { align?: 'left' | 'center' | 'right' } } };
            prevProperties: { sourceBlock: { id: string; meta?: { align?: 'left' | 'center' | 'right' } } };
        }>;

        if (insertOps.length === 0 && toggleOps.length === 0) return;

        const updatesById = new Map<string, 'left' | 'center' | 'right'>();

        const blocks = Object.values(newValue).filter(Boolean);
        // Build quick lookup by order (used for insert ops)
        const byOrder = new Map<number, (typeof blocks)[number]>();
        if (insertOps.length > 0) {
            for (const block of blocks) {
                const order = block?.meta?.order;
                if (typeof order === 'number') byOrder.set(order, block);
            }
        }

        const lastCursorOrder = lastPathOrderRef.current;

        for (const op of insertOps) {
            const insertedId = op.block?.id;
            const insertedOrder = op.block?.meta?.order;
            if (!insertedId) continue;
            if (typeof insertedOrder !== 'number') continue;

            const insertedBlock = (newValue as any)?.[insertedId];
            const insertedAlign = normalizeAlign(insertedBlock?.meta?.align ?? op.block?.meta?.align);

            // Infer the align we should use from the block that triggered the insertion.
            // Enter behavior in Yoopta:
            // - If cursor is at end: insertedOrder is usually lastCursorOrder + 1, and previous block is the source.
            // - If cursor is at start (and block has text): insertedOrder can equal lastCursorOrder, and the original block is shifted to insertedOrder + 1.
            let desiredAlign: 'left' | 'center' | 'right' = lastActiveAlignRef.current || 'right';

            if (typeof lastCursorOrder === 'number') {
                if (insertedOrder === lastCursorOrder) {
                    const next = byOrder.get(insertedOrder + 1);
                    desiredAlign = normalizeAlign(next?.meta?.align) || desiredAlign;
                } else if (insertedOrder === lastCursorOrder + 1) {
                    const prev = byOrder.get(insertedOrder - 1);
                    desiredAlign = normalizeAlign(prev?.meta?.align) || desiredAlign;
                } else {
                    const prev = byOrder.get(insertedOrder - 1);
                    const next = byOrder.get(insertedOrder + 1);
                    desiredAlign =
                        normalizeAlign(prev?.meta?.align) ||
                        normalizeAlign(next?.meta?.align) ||
                        desiredAlign;
                }
            } else {
                const prev = byOrder.get(insertedOrder - 1);
                const next = byOrder.get(insertedOrder + 1);
                desiredAlign =
                    normalizeAlign(prev?.meta?.align) ||
                    normalizeAlign(next?.meta?.align) ||
                    desiredAlign;
            }

            // Only apply if Yoopta's inserted align doesn't match what we want.
            if (insertedAlign !== desiredAlign) {
                updatesById.set(insertedId, desiredAlign);
            }
        }

        // Preserve alignment when toggling block types (e.g. Heading -> List).
        // Yoopta can reset align to left/undefined when changing a block type.
        for (const op of toggleOps) {
            const toggledId = op.properties?.toggledBlock?.id;
            if (!toggledId) continue;

            const desiredAlign =
                normalizeAlign(op.prevProperties?.sourceBlock?.meta?.align) ||
                lastActiveAlignRef.current ||
                'right';

            const currentBlock = (newValue as any)?.[toggledId];
            const currentAlign = normalizeAlign(
                currentBlock?.meta?.align ?? op.properties?.toggledBlock?.meta?.align
            );

            // If it got reset to left/undefined while user context is right/center, restore it.
            if ((currentAlign === undefined || currentAlign === 'left') && desiredAlign !== 'left') {
                updatesById.set(toggledId, desiredAlign);
            }
        }

        if (updatesById.size === 0) return;

        // Apply updates via Yoopta API on next tick.
        // In some cases the insert operation is reported before the editor's internal maps
        // are fully ready for immediate updateBlock; deferring makes it consistent.
        alignmentFixInProgressRef.current = true;
        setTimeout(() => {
            try {
                for (const [id, align] of updatesById) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (editor as any).updateBlock(id, { meta: { align } });
                }
            } finally {
                alignmentFixInProgressRef.current = false;
            }
        }, 0);
    };

    const handlePathChange = (path: unknown) => {
        // YooptaPath is internal; we only need numeric current.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentOrder = (path as any)?.current;
        if (typeof currentOrder !== 'number') return;

        lastPathOrderRef.current = currentOrder;

        // Try to read the current block from the editor instance first.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentBlock = (editor as any).getBlock?.({ at: currentOrder });
        const currentAlign: unknown = currentBlock?.meta?.align;

        // Keep last align updated when we are inside a block with explicit align.
        const normalized = normalizeAlign(currentAlign);
        if (normalized) {
            lastActiveAlignRef.current = normalized;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`yoopta-notebook-editor ${className}`}
            dir="rtl"
        >
            <YooptaEditor
                editor={editor}
                plugins={plugins}
                marks={marks}
                tools={TOOLS}
                value={value}
                onChange={handleChange}
                onPathChange={handlePathChange}
                readOnly={readOnly}
                autoFocus={autoFocus}
                style={{
                    width: '100%',
                    minHeight: '100%',
                }}
            />
        </div>
    );
});

YooptaNotebookEditor.displayName = 'YooptaNotebookEditor';

export default YooptaNotebookEditor;

// Helper function to convert plain text to Yoopta format
export function textToYooptaContent(text: string): YooptaContentValue {
    const paragraphs = text.split('\n').filter(p => p.trim());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any = {};

    paragraphs.forEach((paragraph, index) => {
        const id = `paragraph-${index}-${Date.now()}`;
        content[id] = {
            id,
            type: 'Paragraph',
            value: [
                {
                    id: `text-${index}`,
                    type: 'paragraph',
                    children: [{ text: paragraph }],
                },
            ],
            meta: {
                order: index,
                depth: 0,
                align: 'right',
            },
        };
    });

    // If empty, create one empty paragraph
    if (Object.keys(content).length === 0) {
        const id = `paragraph-0-${Date.now()}`;
        content[id] = {
            id,
            type: 'Paragraph',
            value: [
                {
                    id: 'text-0',
                    type: 'paragraph',
                    children: [{ text: '' }],
                },
            ],
            meta: {
                order: 0,
                depth: 0,
                align: 'right',
            },
        };
    }

    return content as YooptaContentValue;
}

// Helper function to convert Yoopta content to plain text (for backward compatibility)
export function yooptaContentToText(content: YooptaContentValue): string {
    if (!content) return '';

    const blocks = Object.values(content).sort((a, b) =>
        (a.meta?.order || 0) - (b.meta?.order || 0)
    );

    return blocks.map(block => {
        if (block.value && Array.isArray(block.value)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return block.value.map((node: any) => {
                if (node.children && Array.isArray(node.children)) {
                    return node.children.map((child: { text?: string }) => child.text || '').join('');
                }
                return '';
            }).join('\n');
        }
        return '';
    }).join('\n');
}
