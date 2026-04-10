import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bookmark, X, BookOpen } from 'lucide-react';
import { notebookService } from '../services/notebookService';
import type { PersonalNote } from '../services/notebookService';
import LawSearchModal from './LawSearchModal';
import '../styles/case-law-notes-widget.css';

const extractText = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    const texts: string[] = [];
    Object.values(parsed).forEach((block: any) => {
      block?.value?.forEach((el: any) => {
        el?.children?.forEach((child: any) => {
          if (child?.text) texts.push(child.text);
        });
      });
    });
    return texts.length ? texts.join(' ') : content;
  } catch {
    return content;
  }
};

const CaseLawNotesWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLawSearch, setShowLawSearch] = useState(false);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState<number | null>(null);
  const location = useLocation();

  // Detect case from URL
  useEffect(() => {
    const match = location.pathname.match(/\/cases\/(\d+)/);
    setCaseId(match ? Number(match[1]) : null);
  }, [location.pathname]);

  // Fetch notes when on a case page
  const loadNotes = async (id: number) => {
    setLoading(true);
    try {
      const all = await notebookService.getCaseNotes(id);
      setNotes(all.filter(n => n.category === 'legal_quote'));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!caseId) { setNotes([]); return; }
    loadNotes(caseId);
    const onUpdate = () => loadNotes(caseId);
    window.addEventListener('notebook-updated', onUpdate);
    return () => window.removeEventListener('notebook-updated', onUpdate);
  }, [caseId]);

  // Only show when on a case page AND has saved notes
  if (!caseId || notes.length === 0) return null;

  return (
    <>
      {/* Trigger Button — same style as FABs */}
      <button
        className="clnw-trigger"
        onClick={() => setIsOpen(true)}
        title="المواد المحفوظة"
      >
        <Bookmark size={15} />
        <span>المواد</span>
        <span className="clnw-trigger__badge">{notes.length}</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="clnw-overlay" onClick={() => setIsOpen(false)}>
          <div className="clnw-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="clnw-modal__header">
              <div className="clnw-modal__title">
                <Bookmark size={16} />
                المواد المحفوظة
                <span className="clnw-modal__count">{notes.length}</span>
              </div>
              <button className="clnw-modal__close" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="clnw-modal__body">
              {loading ? (
                <div className="clnw-modal__empty">جاري التحميل...</div>
              ) : notes.length === 0 ? (
                <div className="clnw-modal__empty">
                  <Bookmark size={32} strokeWidth={1} style={{ opacity: 0.25, marginBottom: 10 }} />
                  <p>لا توجد أنظمة أو مواد مضافة لهذه القضية</p>
                  <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                    استخدم باحث الأنظمة لإضافة مواد قانونية
                  </p>
                </div>
              ) : (
                <div className="clnw-modal__list">
                  {notes.map(note => (
                    <div key={note.id} className="clnw-modal__item">
                      {note.title && (
                        <div className="clnw-modal__item-title">{note.title}</div>
                      )}
                      <div className="clnw-modal__item-text">{extractText(note.content)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="clnw-modal__footer">
              <button
                className="clnw-modal__search-btn"
                onClick={() => { setIsOpen(false); setShowLawSearch(true); }}
              >
                <BookOpen size={14} />
                فتح باحث الأنظمة للإضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Law Search Modal */}
      <LawSearchModal
        isOpen={showLawSearch}
        onClose={() => setShowLawSearch(false)}
        caseId={caseId}
      />
    </>
  );
};

export default CaseLawNotesWidget;
