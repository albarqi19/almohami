import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, X, Send, Briefcase } from 'lucide-react';
import { notebookService } from '../services/notebookService';
import type { CreateNoteData } from '../services/notebookService';
import '../styles/notebook-widget.css';

interface FloatingWidgetProps {
    defaultCaseId?: number;
    defaultCaseNumber?: string;
}

const NotebookFloatingWidget: React.FC<FloatingWidgetProps> = ({ defaultCaseId, defaultCaseNumber }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<CreateNoteData['category']>('quick_brief');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const location = useLocation();

    // Auto-detect case from URL
    const [detectedCaseId, setDetectedCaseId] = useState<number | null>(null);

    useEffect(() => {
        const match = location.pathname.match(/\/cases\/(\d+)/);
        if (match) {
            setDetectedCaseId(Number(match[1]));
        } else {
            setDetectedCaseId(null);
        }
    }, [location.pathname]);

    const caseId = defaultCaseId || detectedCaseId;

    const categories = [
        { value: 'quick_brief', icon: '⚡', name: 'جلسة' },
        { value: 'brainstorming', icon: '💡', name: 'فكرة' },
        { value: 'private_todo', icon: '✅', name: 'مهمة' },
        { value: 'legal_quote', icon: '📜', name: 'اقتباس' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        try {
            await notebookService.createNote({
                content: content.trim(),
                category,
                case_id: caseId || null
            });
            setSuccess(true);
            setContent('');
            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
            }, 1500);
        } catch (error) {
            console.error('Failed to create quick note:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className={`notebook-fab ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="المفكرة الشخصية"
            >
                {isOpen ? <X size={24} /> : <BookOpen size={24} />}
            </button>

            {/* Quick Add Panel */}
            {isOpen && (
                <div className="notebook-quick-panel">
                    <div className="quick-panel-header">
                        <span className="quick-panel-title">📝 ملاحظة سريعة</span>
                        {caseId && (
                            <span className="quick-panel-case">
                                <Briefcase size={12} />
                                {defaultCaseNumber || `قضية #${caseId}`}
                            </span>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="quick-category-row">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`quick-cat-btn ${category === cat.value ? 'active' : ''}`}
                                    onClick={() => setCategory(cat.value as CreateNoteData['category'])}
                                    title={cat.name}
                                >
                                    {cat.icon}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="quick-content-input"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="اكتب ملاحظتك هنا..."
                            rows={3}
                            autoFocus
                        />

                        <div className="quick-panel-footer">
                            <button
                                type="submit"
                                className="quick-submit-btn"
                                disabled={loading || !content.trim()}
                            >
                                {success ? (
                                    <>✓ تم الحفظ</>
                                ) : loading ? (
                                    'جاري الحفظ...'
                                ) : (
                                    <>
                                        <Send size={16} />
                                        حفظ
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default NotebookFloatingWidget;
