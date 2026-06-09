import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, FileText, Loader2, Search, ScrollText } from 'lucide-react';
import { useLawStatute, useLawStatutes } from '../../hooks/useLaws';
import type { LawArticle } from '../../services/lawsService';
import type { BrowseTarget } from '../../pages/laws/LawsPage';

interface Props {
  /** فتح نظام/مادة قادمة من البحث أو المحادثة */
  target: BrowseTarget | null;
}

/** تجميع مواد النظام حسب الباب مع الحفاظ على الترتيب */
function groupByChapter(articles: LawArticle[]): { chapter: string; articles: LawArticle[] }[] {
  const groups: { chapter: string; articles: LawArticle[] }[] = [];
  for (const a of articles) {
    const chapter = a.chapter || 'مواد النظام';
    const last = groups[groups.length - 1];
    if (last && last.chapter === chapter) {
      last.articles.push(a);
    } else {
      groups.push({ chapter, articles: [a] });
    }
  }
  return groups;
}

const LawBrowse: React.FC<Props> = ({ target }) => {
  const { data: statutes = [], isLoading: statutesLoading } = useLawStatutes();
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const articlesRef = useRef<HTMLDivElement>(null);
  const { data: detail, isLoading: detailLoading } = useLawStatute(selectedSerial);

  // فتح هدف قادم من تبويب آخر (بحث/محادثة)
  useEffect(() => {
    if (target) {
      setSelectedSerial(target.serial);
      setCollapsedChapters(new Set());
    }
  }, [target]);

  // التمرير إلى المادة المستهدفة بعد تحميل النظام + وميض تمييز
  useEffect(() => {
    if (!target?.articleId || !detail || detail.statute.serial !== target.serial) return;
    const el = articlesRef.current?.querySelector(`[data-article-id="${target.articleId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('law-article--flash');
      void (el as HTMLElement).offsetWidth; // إعادة تشغيل الأنيميشن
      el.classList.add('law-article--flash');
    }
  }, [target, detail]);

  const filteredStatutes = useMemo(() => {
    const q = filter.trim();
    if (!q) return statutes;
    return statutes.filter((s) => s.name.includes(q));
  }, [statutes, filter]);

  const groups = useMemo(() => (detail ? groupByChapter(detail.articles) : []), [detail]);

  const toggleChapter = (chapter: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapter)) next.delete(chapter);
      else next.add(chapter);
      return next;
    });
  };

  return (
    <div className="law-browse">
      {/* قائمة الأنظمة */}
      <aside className="law-browse__sidebar">
        <div className="law-browse__filter">
          <Search size={15} />
          <input
            type="text"
            placeholder="تصفية الأنظمة..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="law-browse__list">
          {statutesLoading && (
            <div className="laws-loading"><Loader2 className="laws-spin" size={20} /> جاري تحميل الأنظمة...</div>
          )}
          {filteredStatutes.map((s) => (
            <button
              key={s.serial}
              className={`law-browse__item ${selectedSerial === s.serial ? 'law-browse__item--active' : ''}`}
              onClick={() => { setSelectedSerial(s.serial); setCollapsedChapters(new Set()); }}
            >
              <FileText size={15} className="law-browse__item-icon" />
              <span className="law-browse__item-name">{s.name}</span>
              <span className="law-browse__item-count">{s.articles_count}</span>
            </button>
          ))}
          {!statutesLoading && filteredStatutes.length === 0 && (
            <div className="laws-empty-min">لا يوجد نظام مطابق</div>
          )}
        </div>
      </aside>

      {/* محتوى النظام */}
      <section className="law-browse__content" ref={articlesRef}>
        {!selectedSerial && (
          <div className="laws-empty">
            <BookOpen size={42} strokeWidth={1.2} />
            <h3>اختر نظاماً من القائمة</h3>
            <p>يظهر النظام كاملاً بأبوابه ومواده، ويمكن طيّ الأبواب وفتحها</p>
          </div>
        )}

        {selectedSerial && detailLoading && (
          <div className="laws-loading laws-loading--center">
            <Loader2 className="laws-spin" size={26} />
            جاري تحميل مواد النظام...
          </div>
        )}

        {detail && !detailLoading && (
          <>
            <div className="law-browse__statute-head">
              <div className="law-browse__statute-icon"><ScrollText size={20} /></div>
              <div>
                <h2>{detail.statute.name}</h2>
                <div className="law-browse__statute-meta">
                  {detail.statute.legal_type && <span>{detail.statute.legal_type}</span>}
                  {detail.statute.status && <span>{detail.statute.status}</span>}
                  <span>{detail.statute.articles_count} مادة</span>
                </div>
              </div>
            </div>

            {groups.map((g, gi) => {
              const collapsed = collapsedChapters.has(`${gi}-${g.chapter}`);
              return (
                <div key={`${gi}-${g.chapter}`} className="law-chapter">
                  <button className="law-chapter__head" onClick={() => toggleChapter(`${gi}-${g.chapter}`)}>
                    <ChevronDown size={16} className={`law-chapter__chev ${collapsed ? 'law-chapter__chev--closed' : ''}`} />
                    <span>{g.chapter}</span>
                    <span className="law-chapter__count">{g.articles.length} مادة</span>
                  </button>
                  {!collapsed && (
                    <div className="law-chapter__articles">
                      {g.articles.map((a) => (
                        <article key={a.id} className="law-article" data-article-id={a.id}>
                          <div className="law-article__head">
                            <span className="law-article__number">{a.article_number || 'مادة'}</span>
                            {a.article_name && <span className="law-article__name">{a.article_name}</span>}
                            {a.legal_status && <span className="law-article__status">{a.legal_status}</span>}
                          </div>
                          <p className="law-article__text">{a.text}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
};

export default LawBrowse;
