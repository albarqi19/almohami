import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Briefcase, CheckSquare, Calendar, FileText, Loader2 } from 'lucide-react';
import { globalSearch } from '../services/globalSearchService';
import type {
  GlobalSearchResults,
  GlobalSearchCase,
  GlobalSearchTask,
  GlobalSearchSession,
  GlobalSearchDocument,
} from '../services/globalSearchService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FlatResult =
  | { kind: 'case'; item: GlobalSearchCase }
  | { kind: 'task'; item: GlobalSearchTask }
  | { kind: 'session'; item: GlobalSearchSession }
  | { kind: 'document'; item: GlobalSearchDocument };

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setError(null);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await globalSearch(trimmed);
        if (id === requestIdRef.current) {
          setResults(data);
          setActiveIndex(0);
        }
      } catch (err) {
        if (id === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'حدث خطأ في البحث');
          setResults(null);
        }
      } finally {
        if (id === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const flatResults = React.useMemo<FlatResult[]>(() => {
    if (!results) return [];
    const out: FlatResult[] = [];
    results.cases?.forEach((item) => out.push({ kind: 'case', item }));
    results.tasks?.forEach((item) => out.push({ kind: 'task', item }));
    results.sessions?.forEach((item) => out.push({ kind: 'session', item }));
    results.documents?.forEach((item) => out.push({ kind: 'document', item }));
    return out;
  }, [results]);

  const navigateToResult = React.useCallback(
    (result: FlatResult) => {
      switch (result.kind) {
        case 'case':
          navigate(`/cases/${result.item.id}`);
          break;
        case 'task':
          navigate(`/tasks/${result.item.id}`);
          break;
        case 'session':
          if (result.item.case_id) {
            navigate(`/cases/${result.item.case_id}`);
          } else {
            navigate('/sessions');
          }
          break;
        case 'document':
          if (result.item.case_id) {
            navigate(`/cases/${result.item.case_id}`);
          } else {
            navigate('/documents');
          }
          break;
      }
      onClose();
    },
    [navigate, onClose]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(flatResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = flatResults[activeIndex];
      if (target) navigateToResult(target);
    }
  };

  const trimmed = query.trim();
  const showHint = trimmed.length < MIN_QUERY_LENGTH;
  const showEmpty = !showHint && !loading && !error && results !== null && flatResults.length === 0;
  const hasResults = !loading && !error && flatResults.length > 0;

  let runningIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="clickup-search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="clickup-search-modal"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="clickup-search-modal__input-wrapper">
              {loading ? (
                <Loader2 size={18} className="gs-spinner" />
              ) : (
                <Search size={18} />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="ابحث في القضايا، المهام، الجلسات، الوثائق..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <kbd onClick={onClose}>ESC</kbd>
            </div>

            {showHint && (
              <div className="clickup-search-modal__hints">
                <span>اكتب على الأقل حرفين للبدء بالبحث</span>
              </div>
            )}

            {error && (
              <div className="gs-state gs-state--error">
                <span>{error}</span>
              </div>
            )}

            {showEmpty && (
              <div className="gs-state">
                <span>لا توجد نتائج مطابقة لـ &quot;{trimmed}&quot;</span>
              </div>
            )}

            {hasResults && (
              <div className="gs-results">
                {results?.cases && results.cases.length > 0 && (
                  <ResultGroup
                    label="القضايا"
                    icon={<Briefcase size={14} />}
                    color="#6366f1"
                  >
                    {results.cases.map((item) => {
                      const idx = runningIndex++;
                      return (
                        <CaseRow
                          key={`case-${item.id}`}
                          item={item}
                          active={idx === activeIndex}
                          onSelect={() => navigateToResult({ kind: 'case', item })}
                          onHover={() => setActiveIndex(idx)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {results?.tasks && results.tasks.length > 0 && (
                  <ResultGroup
                    label="المهام"
                    icon={<CheckSquare size={14} />}
                    color="#f59e0b"
                  >
                    {results.tasks.map((item) => {
                      const idx = runningIndex++;
                      return (
                        <TaskRow
                          key={`task-${item.id}`}
                          item={item}
                          active={idx === activeIndex}
                          onSelect={() => navigateToResult({ kind: 'task', item })}
                          onHover={() => setActiveIndex(idx)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {results?.sessions && results.sessions.length > 0 && (
                  <ResultGroup
                    label="الجلسات"
                    icon={<Calendar size={14} />}
                    color="#0ea5e9"
                  >
                    {results.sessions.map((item) => {
                      const idx = runningIndex++;
                      return (
                        <SessionRow
                          key={`session-${item.id}`}
                          item={item}
                          active={idx === activeIndex}
                          onSelect={() => navigateToResult({ kind: 'session', item })}
                          onHover={() => setActiveIndex(idx)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {results?.documents && results.documents.length > 0 && (
                  <ResultGroup
                    label="الوثائق"
                    icon={<FileText size={14} />}
                    color="#10b981"
                  >
                    {results.documents.map((item) => {
                      const idx = runningIndex++;
                      return (
                        <DocumentRow
                          key={`document-${item.id}`}
                          item={item}
                          active={idx === activeIndex}
                          onSelect={() => navigateToResult({ kind: 'document', item })}
                          onHover={() => setActiveIndex(idx)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}
              </div>
            )}

            <style>{`
              .clickup-search-modal {
                max-height: 70vh;
                display: flex;
                flex-direction: column;
              }

              .gs-spinner {
                color: var(--color-text-secondary);
                animation: gs-spin 0.8s linear infinite;
              }

              @keyframes gs-spin {
                to { transform: rotate(360deg); }
              }

              .gs-state {
                padding: 24px 16px;
                text-align: center;
                font-size: 13px;
                color: var(--color-text-secondary);
              }

              .gs-state--error {
                color: var(--clickup-red);
              }

              .gs-results {
                overflow-y: auto;
                padding: 8px 0 12px;
              }

              .gs-group {
                padding: 4px 0;
              }

              .gs-group__title {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px 4px;
                font-size: 11px;
                font-weight: 600;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }

              .gs-row {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                width: 100%;
                padding: 10px 16px;
                font-size: 13px;
                color: var(--color-text);
                text-align: right;
                cursor: pointer;
                transition: background 0.1s;
                border: none;
                background: none;
              }

              .gs-row:hover,
              .gs-row--active {
                background: var(--quiet-gray-100);
              }

              .dark .gs-row:hover,
              .dark .gs-row--active {
                background: rgba(255, 255, 255, 0.06);
              }

              .gs-row__icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                background: var(--quiet-gray-100);
                flex-shrink: 0;
                margin-top: 2px;
              }

              .gs-row__body {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .gs-row__title {
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .gs-row__meta {
                font-size: 11px;
                color: var(--color-text-secondary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface ResultGroupProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

const ResultGroup: React.FC<ResultGroupProps> = ({ label, icon, color, children }) => (
  <div className="gs-group">
    <div className="gs-group__title">
      <span style={{ color, display: 'inline-flex' }}>{icon}</span>
      <span>{label}</span>
    </div>
    {children}
  </div>
);

interface RowProps<T> {
  item: T;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

const CaseRow: React.FC<RowProps<GlobalSearchCase>> = ({ item, active, onSelect, onHover }) => (
  <button
    type="button"
    className={`gs-row ${active ? 'gs-row--active' : ''}`}
    onClick={onSelect}
    onMouseEnter={onHover}
  >
    <span className="gs-row__icon" style={{ color: '#6366f1' }}>
      <Briefcase size={14} />
    </span>
    <span className="gs-row__body">
      <span className="gs-row__title">{item.title}</span>
      <span className="gs-row__meta">
        {[item.file_number, item.client_name].filter(Boolean).join(' · ') || '—'}
      </span>
    </span>
  </button>
);

const TaskRow: React.FC<RowProps<GlobalSearchTask>> = ({ item, active, onSelect, onHover }) => (
  <button
    type="button"
    className={`gs-row ${active ? 'gs-row--active' : ''}`}
    onClick={onSelect}
    onMouseEnter={onHover}
  >
    <span className="gs-row__icon" style={{ color: '#f59e0b' }}>
      <CheckSquare size={14} />
    </span>
    <span className="gs-row__body">
      <span className="gs-row__title">{item.title}</span>
      <span className="gs-row__meta">
        {[item.status, item.priority].filter(Boolean).join(' · ') || '—'}
      </span>
    </span>
  </button>
);

const SessionRow: React.FC<RowProps<GlobalSearchSession>> = ({ item, active, onSelect, onHover }) => {
  const dateStr = item.session_date_gregorian || item.session_date || '';
  const caseTitle = item.case?.title || '';
  const caseRef = item.case?.file_number ? `#${item.case.file_number}` : '';
  return (
    <button
      type="button"
      className={`gs-row ${active ? 'gs-row--active' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span className="gs-row__icon" style={{ color: '#0ea5e9' }}>
        <Calendar size={14} />
      </span>
      <span className="gs-row__body">
        <span className="gs-row__title">{item.session_type || 'جلسة'}</span>
        <span className="gs-row__meta">
          {[dateStr, caseTitle, caseRef].filter(Boolean).join(' · ') || '—'}
        </span>
      </span>
    </button>
  );
};

const DocumentRow: React.FC<RowProps<GlobalSearchDocument>> = ({ item, active, onSelect, onHover }) => (
  <button
    type="button"
    className={`gs-row ${active ? 'gs-row--active' : ''}`}
    onClick={onSelect}
    onMouseEnter={onHover}
  >
    <span className="gs-row__icon" style={{ color: '#10b981' }}>
      <FileText size={14} />
    </span>
    <span className="gs-row__body">
      <span className="gs-row__title">{item.title || item.file_name || '—'}</span>
      <span className="gs-row__meta">
        {[item.category, item.file_name].filter(Boolean).join(' · ') || '—'}
      </span>
    </span>
  </button>
);

export default GlobalSearchModal;
