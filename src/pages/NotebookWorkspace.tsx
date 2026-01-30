import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen, Plus, Search, Pin, Trash2, ArrowUpRight,
    Bell, Briefcase, Clock, PanelLeftClose, PanelLeft,
    MoreVertical, X, Check, Cloud, CloudOff
} from 'lucide-react';
import { notebookService } from '../services/notebookService';
import type { PersonalNote, NoteStatistics, CreateNoteData } from '../services/notebookService';
import { CaseService } from '../services/caseService';
import TiptapEditor from '../components/TiptapEditor';
import type { TiptapEditorRef } from '../components/TiptapEditor';
import LegalAIToolbarButton from '../components/LegalAIToolbarButton';
import NotebookAssistantWidget from '../components/NotebookAssistantWidget';
import { convertToHTML, detectContentType } from '../utils/contentConverter';
import type { TextAnnotation } from '../types/textAnnotations';
import '../styles/notebook-workspace-notion.css';
import '../styles/legal-ai-tools.css';

interface CaseOption {
    id: number;
    file_number: string;
    title: string;
}

const NotebookWorkspace: React.FC = () => {
    // State
    const [notes, setNotes] = useState<PersonalNote[]>([]);
    const [statistics, setStatistics] = useState<NoteStatistics | null>(null);
    const [cases, setCases] = useState<CaseOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showCaseSelector, setShowCaseSelector] = useState(false);
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [newNoteMode, setNewNoteMode] = useState(false);

    // Form state for new/editing note - المحتوى الآن HTML string
    const [noteTitle, setNoteTitle] = useState('');
    const [noteCategory, setNoteCategory] = useState<CreateNoteData['category']>('quick_brief');
    const [noteContent, setNoteContent] = useState<string>('');
    const [noteCaseId, setNoteCaseId] = useState<number | null>(null);
    const [noteReminder, setNoteReminder] = useState<string | null>(null);

    // Key for forcing editor re-render when switching notes
    const [editorKey, setEditorKey] = useState(0);

    // Text annotations for AI proofreading
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);

    // Floating assistant widget visibility (closes via X, reopens on note change)
    const [isAssistantVisible, setIsAssistantVisible] = useState(true);

    // Auto-save timer ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingChangesRef = useRef(false);

    // Refs to track current values for auto-save (to avoid stale closures)
    const noteTitleRef = useRef(noteTitle);
    const noteCategoryRef = useRef(noteCategory);
    const noteCaseIdRef = useRef(noteCaseId);
    const noteReminderRef = useRef(noteReminder);
    const selectedNoteIdRef = useRef(selectedNoteId);
    const newNoteModeRef = useRef(newNoteMode);
    const noteContentRef = useRef(noteContent);

    const editorRef = useRef<TiptapEditorRef>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    const categories = [
        { value: 'all', icon: '📝', name: 'الكل' },
        { value: 'quick_brief', icon: '⚡', name: 'ملاحظات الجلسات' },
        { value: 'brainstorming', icon: '💡', name: 'مسودات الأفكار' },
        { value: 'private_todo', icon: '✅', name: 'قائمة المهام' },
        { value: 'legal_quote', icon: '📜', name: 'الاقتباسات' }
    ];

    // Get selected note from notes array
    const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;

    // Fetch data
    const fetchNotes = useCallback(async () => {
        try {
            const response = await notebookService.getNotes({
                category: activeCategory,
                search: searchQuery
            });
            setNotes(response.data);
        } catch (error) {
            console.error('Failed to fetch notes:', error);
        }
    }, [activeCategory, searchQuery]);

    const fetchStatistics = async () => {
        try {
            const stats = await notebookService.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const fetchCases = async () => {
        try {
            const response = await CaseService.getCases();
            const mappedCases = (response.data || []).map((c: any) => ({
                id: Number(c.id),
                file_number: c.file_number || '',
                title: c.title || ''
            }));
            setCases(mappedCases);
        } catch (error) {
            console.error('Failed to fetch cases:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchNotes(), fetchStatistics(), fetchCases()]);
            setLoading(false);
        };
        loadData();
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Keep refs in sync with state for auto-save
    useEffect(() => { noteTitleRef.current = noteTitle; }, [noteTitle]);
    useEffect(() => { noteCategoryRef.current = noteCategory; }, [noteCategory]);
    useEffect(() => { noteCaseIdRef.current = noteCaseId; }, [noteCaseId]);
    useEffect(() => { noteReminderRef.current = noteReminder; }, [noteReminder]);
    useEffect(() => { selectedNoteIdRef.current = selectedNoteId; }, [selectedNoteId]);
    useEffect(() => { newNoteModeRef.current = newNoteMode; }, [newNoteMode]);
    useEffect(() => { noteContentRef.current = noteContent; }, [noteContent]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setShowActionsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Auto-save function - uses refs to get current values
    // الآن يحفظ HTML مباشرة
    const performAutoSave = useCallback(async () => {
        if (!pendingChangesRef.current) return;

        const content = editorRef.current?.getHTML() || noteContentRef.current;
        if (!content || editorRef.current?.isEmpty()) return;

        setSaving(true);
        try {
            // نحفظ HTML مباشرة - لا نحتاج JSON.stringify
            const data: CreateNoteData = {
                title: noteTitleRef.current || undefined,
                content: content,
                category: noteCategoryRef.current,
                case_id: noteCaseIdRef.current,
                reminder_at: noteReminderRef.current,
                tags: []
            };

            if (selectedNoteIdRef.current) {
                // Optimistic update: update local notes array immediately
                setNotes(prevNotes => prevNotes.map(note =>
                    note.id === selectedNoteIdRef.current
                        ? {
                            ...note,
                            title: noteTitleRef.current || note.title,
                            category: noteCategoryRef.current,
                            case_id: noteCaseIdRef.current,
                            reminder_at: noteReminderRef.current,
                            content: content,
                            updated_at: new Date().toISOString()
                        }
                        : note
                ));

                // Then sync with server in background
                await notebookService.updateNote(selectedNoteIdRef.current, data);
            } else if (newNoteModeRef.current) {
                const createdNote = await notebookService.createNote(data);
                setSelectedNoteId(createdNote.id);
                selectedNoteIdRef.current = createdNote.id;
                setNewNoteMode(false);
                newNoteModeRef.current = false;

                // Add new note to local array immediately
                setNotes(prevNotes => [createdNote, ...prevNotes]);
            }

            setLastSaved(new Date());
            pendingChangesRef.current = false;

            // Update statistics in background (non-blocking)
            fetchStatistics();
        } catch (error) {
            console.error('Auto-save failed:', error);
            // On error, refetch to get correct data
            fetchNotes();
        } finally {
            setSaving(false);
        }
    }, [fetchNotes]);

    // Trigger auto-save with debounce
    const triggerAutoSave = useCallback(() => {
        pendingChangesRef.current = true;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            performAutoSave();
        }, 1500); // 1.5 second debounce
    }, [performAutoSave]);

    // Select a note - مع دعم المحتوى القديم (Yoopta)
    const selectNote = useCallback((note: PersonalNote) => {
        // Save current note first if there are pending changes
        if (pendingChangesRef.current) {
            performAutoSave();
        }

        setSelectedNoteId(note.id);
        setNewNoteMode(false);
        setNoteTitle(note.title || '');
        setNoteCategory(note.category);
        setNoteCaseId(note.case_id);
        setNoteReminder(note.reminder_at ? note.reminder_at.slice(0, 16) : null);

        // تحويل المحتوى - يدعم Yoopta القديم و HTML الجديد
        let htmlContent = '';
        try {
            const contentType = detectContentType(note.content);
            console.log('[NotebookWorkspace] Content type detected:', contentType);

            if (contentType === 'yoopta') {
                // تحويل من Yoopta إلى HTML
                htmlContent = convertToHTML(note.content);
                console.log('[NotebookWorkspace] Converted from Yoopta to HTML');
            } else if (contentType === 'html') {
                // المحتوى HTML بالفعل
                htmlContent = note.content;
            } else {
                // نص عادي
                htmlContent = `<p dir="rtl" style="text-align: right">${note.content}</p>`;
            }
        } catch (error) {
            console.error('[NotebookWorkspace] Error parsing content:', error);
            htmlContent = `<p dir="rtl" style="text-align: right">${note.content || ''}</p>`;
        }

        setNoteContent(htmlContent);
        setTextAnnotations([]);
        setIsAssistantVisible(true);
        // Force editor re-render with new content
        setEditorKey(prev => prev + 1);
        pendingChangesRef.current = false;
        setLastSaved(null);
    }, [performAutoSave]);

    // Create new note
    const startNewNote = useCallback(() => {
        // Save current note first if there are pending changes
        if (pendingChangesRef.current) {
            performAutoSave();
        }

        setSelectedNoteId(null);
        setNewNoteMode(true);
        setNoteTitle('');
        setNoteCategory('quick_brief');
        setNoteContent('');
        setNoteCaseId(null);
        setNoteReminder(null);
        setTextAnnotations([]);
        setIsAssistantVisible(true);
        // Force editor re-render
        setEditorKey(prev => prev + 1);
        pendingChangesRef.current = false;
        setLastSaved(null);
    }, [performAutoSave]);

    // Delete note - optimistic update
    const handleDelete = async () => {
        if (!selectedNoteId) return;

        if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
            const deletedNoteId = selectedNoteId;

            // Optimistic: remove from local array immediately
            setNotes(prevNotes => prevNotes.filter(note => note.id !== deletedNoteId));
            setSelectedNoteId(null);
            setNewNoteMode(false);
            setNoteContent('');
            setEditorKey(prev => prev + 1);
            setTextAnnotations([]);
            setIsAssistantVisible(true);

            try {
                await notebookService.deleteNote(deletedNoteId);
                fetchStatistics(); // Update stats in background
            } catch (error) {
                console.error('Failed to delete note:', error);
                // On error, refetch to restore
                fetchNotes();
            }
        }
        setShowActionsMenu(false);
    };

    // Toggle pin - optimistic update
    const handleTogglePin = async () => {
        if (!selectedNoteId || !selectedNote) return;

        const newPinnedState = !selectedNote.is_pinned;

        // Optimistic: update local array immediately
        setNotes(prevNotes => prevNotes.map(note =>
            note.id === selectedNoteId
                ? { ...note, is_pinned: newPinnedState }
                : note
        ));

        try {
            await notebookService.togglePin(selectedNoteId);
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            // On error, revert
            setNotes(prevNotes => prevNotes.map(note =>
                note.id === selectedNoteId
                    ? { ...note, is_pinned: !newPinnedState }
                    : note
            ));
        }
        setShowActionsMenu(false);
    };

    // Convert to task
    const handleConvertToTask = async () => {
        if (!selectedNoteId) return;

        if (confirm('هل تريد تحويل هذه الملاحظة إلى مهمة رسمية؟')) {
            try {
                await notebookService.convertToTask(selectedNoteId);
                await fetchNotes();
                await fetchStatistics();
                alert('تم تحويل الملاحظة إلى مهمة بنجاح');
            } catch (error) {
                console.error('Failed to convert to task:', error);
            }
        }
        setShowActionsMenu(false);
    };

    // Link to case
    const handleLinkCase = (caseId: number | null) => {
        setNoteCaseId(caseId);
        setShowCaseSelector(false);
        triggerAutoSave();
    };

    // Set reminder
    const handleSetReminder = (datetime: string | null) => {
        setNoteReminder(datetime);
        setShowReminderPicker(false);
        triggerAutoSave();
    };

    // Handle content change - الآن يستقبل HTML string
    const handleContentChange = (value: string) => {
        setNoteContent(value);
        triggerAutoSave();
    };

    // Handle title change
    const handleTitleChange = (value: string) => {
        setNoteTitle(value);
        triggerAutoSave();
    };

    // Handle category change
    const handleCategoryChange = (value: CreateNoteData['category']) => {
        setNoteCategory(value);
        triggerAutoSave();
    };

    const getCategoryCount = (category: string): number => {
        if (!statistics) return 0;
        if (category === 'all') return statistics.total;
        return statistics.by_category[category as keyof typeof statistics.by_category] || 0;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getSelectedCase = () => {
        if (!noteCaseId) return null;
        return cases.find(c => c.id === noteCaseId);
    };

    const formatLastSaved = () => {
        if (!lastSaved) return '';
        return lastSaved.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`notebook-workspace ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className="notebook-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-title">
                        <BookOpen size={24} />
                        {!sidebarCollapsed && <span>المفكرة الشخصية</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'توسيع' : 'طي'}
                    >
                        {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {!sidebarCollapsed && (
                    <>
                        {/* Search */}
                        <div className="sidebar-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="بحث..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Categories */}
                        <div className="sidebar-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    className={`category-btn ${activeCategory === cat.value ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat.value)}
                                >
                                    <span className="category-icon">{cat.icon}</span>
                                    <span className="category-name">{cat.name}</span>
                                    <span className="category-count">{getCategoryCount(cat.value)}</span>
                                </button>
                            ))}
                        </div>

                        {/* New Note Button */}
                        <button className="new-note-btn" onClick={startNewNote}>
                            <Plus size={18} />
                            <span>ملاحظة جديدة</span>
                        </button>

                        {/* Notes List */}
                        <div className="notes-list">
                            {loading ? (
                                <div className="loading-spinner">
                                    <div className="spinner" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="empty-notes">
                                    <p>لا توجد ملاحظات</p>
                                </div>
                            ) : (
                                notes.map(note => (
                                    <div
                                        key={note.id}
                                        className={`note-item ${selectedNoteId === note.id ? 'selected' : ''} ${note.is_pinned ? 'pinned' : ''}`}
                                        onClick={() => selectNote(note)}
                                    >
                                        <div className="note-item-header">
                                            {note.is_pinned && <Pin size={12} className="pin-icon" />}
                                            <span className="note-item-title">
                                                {note.title || 'بدون عنوان'}
                                            </span>
                                        </div>
                                        <div className="note-item-meta">
                                            <span className="note-item-category">
                                                {notebookService.getCategoryIcon(note.category)}
                                            </span>
                                            <span className="note-item-date">
                                                <Clock size={10} />
                                                {formatDate(note.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </aside>

            {/* Main Content */}
            <main className="notebook-main">
                {(selectedNoteId || newNoteMode) ? (
                    <>
                        {/* Top Action Bar */}
                        <div className="editor-toolbar">
                            <div className="toolbar-right">
                                <input
                                    type="text"
                                    className="note-title-input"
                                    placeholder="عنوان الملاحظة..."
                                    value={noteTitle}
                                    onChange={e => handleTitleChange(e.target.value)}
                                />

                                {/* Category Selector */}
                                <select
                                    className="category-select"
                                    value={noteCategory}
                                    onChange={e => handleCategoryChange(e.target.value as CreateNoteData['category'])}
                                >
                                    {categories.filter(c => c.value !== 'all').map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Legal AI Tools Button */}
                                <div style={{ position: 'relative' }}>
                                    <LegalAIToolbarButton
                                        onSelectText={() => {
                                            // Get selected text from window selection
                                            const selection = window.getSelection();
                                            if (selection && selection.toString().trim()) {
                                                return selection.toString().trim();
                                            }
                                            return editorRef.current?.getSelectedText?.() || null;
                                        }}
                                        onGetAllText={() => {
                                            // Get all text from editor
                                            return editorRef.current?.getAllText?.() || null;
                                        }}
                                        onReplaceText={(newText: string) => {
                                            editorRef.current?.replaceSelectedText?.(newText);
                                        }}
                                        onReplaceAllText={(newText: string) => {
                                            editorRef.current?.replaceAllText?.(newText);
                                        }}
                                        onSetTextAnnotations={(annotations) => {
                                            console.log('[NotebookWorkspace] Setting text annotations:', annotations);
                                            setTextAnnotations(annotations);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="toolbar-left">
                                {/* Auto-save Status */}
                                <div className="autosave-status">
                                    {saving ? (
                                        <>
                                            <div className="spinner-small" />
                                            <span>جاري الحفظ...</span>
                                        </>
                                    ) : lastSaved ? (
                                        <>
                                            <Cloud size={14} />
                                            <span>تم الحفظ {formatLastSaved()}</span>
                                        </>
                                    ) : pendingChangesRef.current ? (
                                        <>
                                            <CloudOff size={14} />
                                            <span>غير محفوظ</span>
                                        </>
                                    ) : null}
                                </div>

                                {/* Case Link Button */}
                                <div className="toolbar-btn-wrapper">
                                    <button
                                        className={`toolbar-btn ${noteCaseId ? 'active' : ''}`}
                                        onClick={() => setShowCaseSelector(!showCaseSelector)}
                                        title="ربط بقضية"
                                    >
                                        <Briefcase size={16} />
                                        {noteCaseId && getSelectedCase() && (
                                            <span className="linked-case-badge">
                                                {getSelectedCase()?.file_number}
                                            </span>
                                        )}
                                    </button>

                                    {showCaseSelector && (
                                        <div className="dropdown-menu case-selector">
                                            <div className="dropdown-header">
                                                <span>ربط بقضية</span>
                                                <button onClick={() => setShowCaseSelector(false)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => handleLinkCase(null)}
                                            >
                                                <span>بدون ربط</span>
                                                {!noteCaseId && <Check size={14} />}
                                            </button>
                                            {cases.map(c => (
                                                <button
                                                    key={c.id}
                                                    className="dropdown-item"
                                                    onClick={() => handleLinkCase(c.id)}
                                                >
                                                    <span>{c.file_number} - {c.title}</span>
                                                    {noteCaseId === c.id && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Reminder Button */}
                                <div className="toolbar-btn-wrapper">
                                    <button
                                        className={`toolbar-btn ${noteReminder ? 'active' : ''}`}
                                        onClick={() => setShowReminderPicker(!showReminderPicker)}
                                        title="تذكير"
                                    >
                                        <Bell size={16} />
                                        {noteReminder && <span className="reminder-dot" />}
                                    </button>

                                    {showReminderPicker && (
                                        <div className="dropdown-menu reminder-picker">
                                            <div className="dropdown-header">
                                                <span>تذكير</span>
                                                <button onClick={() => setShowReminderPicker(false)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={noteReminder || ''}
                                                onChange={e => handleSetReminder(e.target.value || null)}
                                            />
                                            {noteReminder && (
                                                <button
                                                    className="dropdown-item danger"
                                                    onClick={() => handleSetReminder(null)}
                                                >
                                                    إزالة التذكير
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Pin Button */}
                                {selectedNote && (
                                    <button
                                        className={`toolbar-btn ${selectedNote.is_pinned ? 'active' : ''}`}
                                        onClick={handleTogglePin}
                                        title={selectedNote.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                    >
                                        <Pin size={16} />
                                    </button>
                                )}

                                {/* More Actions */}
                                {selectedNoteId && (
                                    <div className="toolbar-btn-wrapper" ref={actionsMenuRef}>
                                        <button
                                            className="toolbar-btn"
                                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {showActionsMenu && (
                                            <div className="dropdown-menu actions-menu">
                                                <button
                                                    className="dropdown-item"
                                                    onClick={handleConvertToTask}
                                                >
                                                    <ArrowUpRight size={14} />
                                                    <span>تحويل إلى مهمة</span>
                                                </button>
                                                <button
                                                    className="dropdown-item danger"
                                                    onClick={handleDelete}
                                                >
                                                    <Trash2 size={14} />
                                                    <span>حذف</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Editor - TiptapEditor بدلاً من YooptaNotebookEditor */}
                        <div className="editor-container">
                            <TiptapEditor
                                key={editorKey}
                                ref={editorRef}
                                content={noteContent}
                                onChange={handleContentChange}
                                placeholder="اكتب ملاحظتك هنا..."
                                autoFocus={true}
                                minHeight="calc(100vh - 200px)"
                                textAnnotations={textAnnotations}
                                onApplyAnnotation={(annotationId) => {
                                    // إزالة التعليق المطبق من القائمة
                                    setTextAnnotations(prev => prev.filter(a => a.id !== annotationId));
                                }}
                            />
                        </div>

                        <NotebookAssistantWidget
                            isVisible={isAssistantVisible}
                            getDocumentText={() => editorRef.current?.getAllText?.() || null}
                            getDocumentBlocksJson={() => editorRef.current?.getContent?.() || null}
                            onSetTextAnnotations={(annotations) => {
                                console.log('[NotebookWorkspace] Widget setting annotations:', annotations);
                                setTextAnnotations(annotations);
                            }}
                            onRequestClose={() => setIsAssistantVisible(false)}
                        />
                    </>
                ) : (
                    /* Empty State */
                    <div className="empty-state">
                        <BookOpen size={64} strokeWidth={1} />
                        <h2>مرحباً بك في المفكرة الشخصية</h2>
                        <p>اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة للبدء</p>
                        <button className="new-note-btn large" onClick={startNewNote}>
                            <Plus size={20} />
                            <span>ملاحظة جديدة</span>
                        </button>
                        <div className="tips">
                            <h4>نصائح سريعة:</h4>
                            <ul>
                                <li>استخدم شريط الأدوات لتنسيق النص</li>
                                <li>أضف جداول وروابط واقتباسات بسهولة</li>
                                <li>يمكنك النسخ من المحرر إلى الوورد مباشرة</li>
                                <li>الحفظ تلقائي - لا تقلق!</li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NotebookWorkspace;
