import React, { useState } from 'react';
import { ArrowLeft, BookMarked, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLawSmartSearch } from '../../hooks/useLaws';

interface Props {
  onOpenArticle: (serial: string, articleId: number | null) => void;
}

const SUGGESTIONS = [
  'شروط بطلان حكم التحكيم',
  'مدة الاعتراض على الحكم بالاستئناف',
  'التزامات المستأجر في العقود التجارية',
  'إجراءات الحجز التنفيذي على الأموال',
];

const LawSmartSearch: React.FC<Props> = ({ onOpenArticle }) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const search = useLawSmartSearch();

  const submit = (q?: string) => {
    const value = (q ?? query).trim();
    if (value.length < 3 || search.isPending) return;
    if (q) setQuery(q);
    setExpanded(new Set());
    search.mutate(value);
  };

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="law-search">
      <div className="law-search__box-wrap">
        <div className="law-search__box">
          <Sparkles size={18} className="law-search__box-icon" />
          <input
            type="text"
            placeholder="صف المسألة النظامية بلغتك... مثال: متى يسقط حق المطالبة بأجرة العامل؟"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button
            className="law-search__btn"
            onClick={() => submit()}
            disabled={query.trim().length < 3 || search.isPending}
          >
            <Search size={16} />
            بحث ذكي
          </button>
        </div>
        <p className="law-search__hint">
          بحث دلالي بالمعنى لا بالكلمات — يفهم وصفك ويعيد أقرب المواد النظامية من 75 نظاماً
        </p>
      </div>

      {/* حالة البداية: اقتراحات */}
      {!search.isPending && !search.data && !search.isError && (
        <div className="laws-empty laws-empty--search">
          <Search size={40} strokeWidth={1.2} />
          <h3>ابحث في الأنظمة بالمعنى</h3>
          <div className="law-search__chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="law-search__chip" onClick={() => submit(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* هيكل تحميل متحرك */}
      {search.isPending && (
        <div className="law-search__results">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="law-skeleton" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="law-skeleton__bar law-skeleton__bar--w40" />
              <div className="law-skeleton__bar" />
              <div className="law-skeleton__bar law-skeleton__bar--w70" />
            </div>
          ))}
        </div>
      )}

      {search.isError && (
        <div className="laws-error">{(search.error as Error)?.message || 'تعذّر البحث حالياً'}</div>
      )}

      {/* النتائج */}
      <AnimatePresence>
        {search.data && !search.isPending && (
          <div className="law-search__results">
            {search.data.length === 0 && (
              <div className="laws-empty-min">لا توجد مواد قريبة من استعلامك — جرّب صياغة أخرى</div>
            )}
            {search.data.map((r, i) => {
              const isOpen = expanded.has(i);
              const long = r.text.length > 380;
              return (
                <motion.div
                  key={`${r.statute_serial}-${r.article_number}-${i}`}
                  className="law-result"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                >
                  <div className="law-result__head">
                    <div className="law-result__title">
                      <BookMarked size={15} />
                      <strong>{r.statute_name}</strong>
                      {r.article_number && <span className="law-result__article-no">{r.article_number}</span>}
                    </div>
                    <span className="law-result__score" title="درجة الصلة بعد إعادة الترتيب">
                      {(r.score * 100).toFixed(0)}٪
                    </span>
                  </div>
                  {r.chapter && <div className="law-result__chapter">{r.chapter}</div>}
                  <p className={`law-result__text ${!isOpen && long ? 'law-result__text--clamped' : ''}`}>
                    {r.text}
                  </p>
                  <div className="law-result__actions">
                    {long && (
                      <button className="laws-link-btn" onClick={() => toggleExpand(i)}>
                        {isOpen ? 'إخفاء' : 'عرض النص كاملاً'}
                      </button>
                    )}
                    <button
                      className="laws-link-btn laws-link-btn--primary"
                      onClick={() => onOpenArticle(r.statute_serial, r.article_id)}
                    >
                      فتح في النظام
                      <ArrowLeft size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LawSmartSearch;
