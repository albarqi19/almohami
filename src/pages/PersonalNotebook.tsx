import React, { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, Plus, Search, Pin, Check, Clock, Briefcase,
    MoreVertical, Trash2, ArrowUpRight, X, Bell
} from 'lucide-react';
import { notebookService } from '../services/notebookService';
import type { PersonalNote, NoteStatistics, CreateNoteData } from '../services/notebookService';
import { CaseService } from '../services/caseService';
import '../styles/notebook-page.css';

interface NoteModalProps {
    isOpen: boolean;
    note: PersonalNote | null;
    onClose: () => void;
    onSave: (data: CreateNoteData) => Promise<void>;
    onDelete?: (id: number) => Promise<void>;
    onConvertToTask?: (id: number) => Promise<void>;
    cases: Array<{ id: number; case_number: string; title: string }>;
}

const NoteModal: React.FC<NoteModalProps> = ({
    isOpen, note, onClose, onSave, onDelete, onConvertToTask, cases
}) => {
    const [formData, setFormData] = useState<CreateNoteData>({
        title: '',
        content: '',
        category: 'quick_brief',
        case_id: null,
        reminder_at: null,
        tags: []
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (note) {
            setFormData({
                title: note.title || '',
                content: note.content,
                category: note.category,
                case_id: note.case_id,
                reminder_at: note.reminder_at ? note.reminder_at.slice(0, 16) : null,
                tags: note.tags || []
            });
        } else {
            setFormData({
                title: '',
                content: '',
                category: 'quick_brief',
                case_id: null,
                reminder_at: null,
                tags: []
            });
        }
    }, [note, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.content.trim()) return;

        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { value: 'quick_brief', icon: '⚡', name: 'ملاحظات الجلسات' },
        { value: 'brainstorming', icon: '💡', name: 'مسودات الأفكار' },
        { value: 'private_todo', icon: '✅', name: 'قائمة المهام' },
        { value: 'legal_quote', icon: '📜', name: 'الاقتباسات القانونية' }
    ];

    if (!isOpen) return null;

    return (
        <div className="notebook-modal-overlay" onClick={onClose}>
            <div className="notebook-modal" onClick={e => e.stopPropagation()}>
                <div className="notebook-modal-header">
                    <h2>{note ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}</h2>
                    <button className="notebook-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="notebook-modal-body">
                        <div className="notebook-form-group">
                            <label>العنوان (اختياري)</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="عنوان الملاحظة..."
                            />
                        </div>

                        <div className="notebook-form-group">
                            <label>التصنيف</label>
                            <div className="category-selector">
                                {categories.map(cat => (
                                    <div
                                        key={cat.value}
                                        className={`category-option ${formData.category === cat.value ? 'selected' : ''}`}
                                        onClick={() => setFormData({ ...formData, category: cat.value as CreateNoteData['category'] })}
                                    >
                                        <span className="cat-icon">{cat.icon}</span>
                                        <span className="cat-name">{cat.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="notebook-form-group">
                            <label>المحتوى <span style={{ color: 'var(--color-error)' }}>*</span></label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="اكتب ملاحظتك هنا..."
                                required
                            />
                        </div>

                        <div className="notebook-form-group">
                            <label>ربط بقضية (اختياري)</label>
                            <select
                                value={formData.case_id || ''}
                                onChange={e => setFormData({ ...formData, case_id: e.target.value ? Number(e.target.value) : null })}
                            >
                                <option value="">بدون ربط</option>
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.case_number} - {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="notebook-form-group">
                            <label>تذكير (اختياري)</label>
                            <input
                                type="datetime-local"
                                value={formData.reminder_at || ''}
                                onChange={e => setFormData({ ...formData, reminder_at: e.target.value || null })}
                            />
                        </div>
                    </div>

                    <div className="notebook-modal-footer">
                        {note && onDelete && (
                            <button
                                type="button"
                                className="modal-btn danger"
                                onClick={() => onDelete(note.id)}
                                style={{ marginLeft: 'auto' }}
                            >
                                <Trash2 size={16} />
                                حذف
                            </button>
                        )}
                        {note && onConvertToTask && (
                            <button
                                type="button"
                                className="modal-btn convert"
                                onClick={() => onConvertToTask(note.id)}
                            >
                                <ArrowUpRight size={16} />
                                تحويل لمهمة
                            </button>
                        )}
                        <button type="button" className="modal-btn cancel" onClick={onClose}>
                            إلغاء
                        </button>
                        <button type="submit" className="modal-btn primary" disabled={loading}>
                            {loading ? 'جاري الحفظ...' : (note ? 'حفظ التعديلات' : 'إنشاء الملاحظة')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PersonalNotebook: React.FC = () => {
    const [notes, setNotes] = useState<PersonalNote[]>([]);
    const [statistics, setStatistics] = useState<NoteStatistics | null>(null);
    const [cases, setCases] = useState<Array<{ id: number; case_number: string; title: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);

    const categories = [
        { value: 'all', icon: '📝', name: 'الكل' },
        { value: 'quick_brief', icon: '⚡', name: 'ملاحظات الجلسات' },
        { value: 'brainstorming', icon: '💡', name: 'مسودات الأفكار' },
        { value: 'private_todo', icon: '✅', name: 'قائمة المهام' },
        { value: 'legal_quote', icon: '📜', name: 'الاقتباسات' }
    ];

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedCases = (response.data || []).map((c: any) => ({
                id: Number(c.id),
                case_number: c.case_number || '',
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

    // Listen for updates from floating widget
    useEffect(() => {
        const handleNotebookUpdate = () => {
            fetchNotes();
            fetchStatistics();
        };

        window.addEventListener('notebook-updated', handleNotebookUpdate);
        return () => window.removeEventListener('notebook-updated', handleNotebookUpdate);
    }, [fetchNotes]);

    const handleSaveNote = async (data: CreateNoteData) => {
        if (selectedNote) {
            await notebookService.updateNote(selectedNote.id, data);
        } else {
            await notebookService.createNote(data);
        }
        await fetchNotes();
        await fetchStatistics();
        setModalOpen(false);
        setSelectedNote(null);
    };

    const handleDeleteNote = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
            await notebookService.deleteNote(id);
            await fetchNotes();
            await fetchStatistics();
            setModalOpen(false);
            setSelectedNote(null);
        }
    };

    const handleConvertToTask = async (id: number) => {
        if (confirm('هل تريد تحويل هذه الملاحظة إلى مهمة رسمية؟')) {
            await notebookService.convertToTask(id);
            await fetchNotes();
            await fetchStatistics();
            setModalOpen(false);
            setSelectedNote(null);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, note: PersonalNote) => {
        e.stopPropagation();
        await notebookService.togglePin(note.id);
        await fetchNotes();
        await fetchStatistics();
    };

    const handleToggleComplete = async (e: React.MouseEvent, note: PersonalNote) => {
        e.stopPropagation();
        await notebookService.toggleComplete(note.id);
        await fetchNotes();
        await fetchStatistics();
    };

    const openNoteModal = (note?: PersonalNote) => {
        setSelectedNote(note || null);
        setModalOpen(true);
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="notebook-page">
            {/* Header */}
            <header className="notebook-header">
                <div className="notebook-header__title">
                    <BookOpen />
                    <span>المفكرة الشخصية</span>
                </div>

                <div className="notebook-search">
                    <Search />
                    <input
                        type="text"
                        placeholder="بحث في الملاحظات..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="notebook-header__actions">
                    <button className="notebook-add-btn" onClick={() => openNoteModal()}>
                        <Plus />
                        <span>ملاحظة جديدة</span>
                    </button>
                </div>
            </header>

            {/* Category Tabs */}
            <div className="notebook-tabs">
                {categories.map(cat => (
                    <button
                        key={cat.value}
                        className={`notebook-tab ${activeCategory === cat.value ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.value)}
                    >
                        <span className="tab-icon">{cat.icon}</span>
                        <span>{cat.name}</span>
                        <span className="tab-count">{getCategoryCount(cat.value)}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="notebook-content">
                {loading ? (
                    <div className="notebook-loading">
                        <div className="spinner" />
                    </div>
                ) : notes.length === 0 ? (
                    <div className="notebook-empty">
                        <BookOpen />
                        <h3>لا توجد ملاحظات</h3>
                        <p>ابدأ بإضافة ملاحظاتك الخاصة لتظهر هنا</p>
                        <button className="notebook-add-btn" onClick={() => openNoteModal()}>
                            <Plus />
                            <span>أضف ملاحظة</span>
                        </button>
                    </div>
                ) : (
                    <div className="notes-grid">
                        {notes.map(note => (
                            <div
                                key={note.id}
                                className={`note-card ${note.is_pinned ? 'pinned' : ''} ${note.is_completed ? 'completed' : ''}`}
                                onClick={() => openNoteModal(note)}
                            >
                                <div className="note-card-header">
                                    <h3 className="note-title">
                                        {note.title || 'بدون عنوان'}
                                    </h3>
                                    <span className={`note-category-badge ${notebookService.getCategoryColor(note.category)}`}>
                                        {notebookService.getCategoryIcon(note.category)} {notebookService.getCategoryLabel(note.category)}
                                    </span>
                                </div>

                                <p className="note-content-preview">{note.content}</p>

                                {note.tags && note.tags.length > 0 && (
                                    <div className="note-tags">
                                        {note.tags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="note-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="note-card-footer">
                                    <div className="note-meta">
                                        <span className="note-meta-item">
                                            <Clock size={14} />
                                            {formatDate(note.created_at)}
                                        </span>
                                        {note.case && (
                                            <span className="note-linked-case">
                                                <Briefcase size={12} />
                                                {note.case.case_number}
                                            </span>
                                        )}
                                        {note.reminder_at && !note.reminder_sent && (
                                            <span className="note-reminder">
                                                <Bell size={12} />
                                                تذكير
                                            </span>
                                        )}
                                    </div>

                                    <div className="note-actions">
                                        <button
                                            className={`note-action-btn pin-btn ${note.is_pinned ? 'active' : ''}`}
                                            onClick={e => handleTogglePin(e, note)}
                                            title={note.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                        >
                                            <Pin size={16} />
                                        </button>
                                        {note.category === 'private_todo' && (
                                            <button
                                                className={`note-action-btn complete-btn ${note.is_completed ? 'active' : ''}`}
                                                onClick={e => handleToggleComplete(e, note)}
                                                title={note.is_completed ? 'إلغاء الإكمال' : 'إكمال'}
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Note Modal */}
            <NoteModal
                isOpen={modalOpen}
                note={selectedNote}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedNote(null);
                }}
                onSave={handleSaveNote}
                onDelete={selectedNote ? handleDeleteNote : undefined}
                onConvertToTask={selectedNote ? handleConvertToTask : undefined}
                cases={cases}
            />
        </div>
    );
};

export default PersonalNotebook;
