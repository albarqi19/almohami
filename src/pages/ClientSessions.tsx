import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gavel, AlertCircle, Loader2 } from 'lucide-react';
import ClientSessionRow from '../components/ClientSessionRow';
import {
  ClientSessionService,
  SCOPE_LABELS,
  type ClientSession,
  type SessionScope,
} from '../services/clientSessionService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-sessions.css — بدائيّات cs-*)

const SCOPES: SessionScope[] = ['today', 'upcoming', 'past'];

const EMPTY_TEXT: Record<SessionScope, { title: string; text: string }> = {
  today: { title: 'لا توجد جلسات اليوم', text: 'لا جلسة مسجّلة لقضاياك بتاريخ اليوم.' },
  upcoming: { title: 'لا توجد جلسات قادمة', text: 'لم يسجّل المكتب جلسات قادمة لقضاياك بعد. تظهر هنا فور تسجيلها.' },
  past: { title: 'لا توجد جلسات سابقة', text: 'لم تُعقد جلسات لقضاياك حتى الآن.' },
};

function isScope(v: string | null): v is SessionScope {
  return v === 'today' || v === 'upcoming' || v === 'past';
}

/**
 * «جلساتي» — جلسات قضايا العميل: اليوم / القادمة / السابقة.
 * الخادم يفرض الملكية (/client/sessions)، وهذه الصفحة تعرض ما يرسله بلا حساب تواريخ محلي.
 */
const ClientSessions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope');
  const scope: SessionScope = isScope(scopeParam) ? scopeParam : 'upcoming';

  const [rows, setRows] = useState<ClientSession[]>([]);
  const [counts, setCounts] = useState<Record<SessionScope, number> | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: SessionScope, p: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true); else { setLoading(true); setError(null); }
      const res = await ClientSessionService.list(s, p);
      setRows(prev => (append ? [...prev, ...res.rows] : res.rows));
      setCounts(res.counts);
      setPage(res.page);
      setLastPage(res.lastPage);
      setTotal(res.total);
    } catch (e) {
      if (!append) setRows([]);
      setError(e instanceof Error ? e.message : 'تعذّر جلب الجلسات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(scope, 1, false);
  }, [scope, load]);

  const selectScope = (s: SessionScope) => {
    if (s === scope) return;
    setSearchParams(s === 'upcoming' ? {} : { scope: s });
  };

  return (
    <div className="cs-page" dir="rtl">
      <div className="cs-header">
        <div className="cs-header__title">
          <div className="cs-header__icon"><Gavel size={20} /></div>
          <div>
            <h1 className="cs-header__h1">جلساتي</h1>
            <p className="cs-header__sub">مواعيد جلسات قضاياك كما سجّلها المكتب</p>
          </div>
        </div>

        <div className="cs-tabs" role="tablist" aria-label="نطاق الجلسات">
          {SCOPES.map(s => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === scope}
              className="cs-tab"
              onClick={() => selectScope(s)}
            >
              {SCOPE_LABELS[s]}
              {counts && <span className="cs-tab__count">{counts[s]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-content">
        {loading ? (
          <div className="cs-skeleton" aria-busy="true" aria-label="جارٍ التحميل">
            <div className="cs-skeleton__row" />
            <div className="cs-skeleton__row" />
            <div className="cs-skeleton__row" />
          </div>
        ) : error ? (
          <div className="cs-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="cs-btn" onClick={() => void load(scope, 1, false)} style={{ marginInlineStart: 'auto' }}>
              إعادة المحاولة
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-empty">
            <div className="cs-empty__icon"><Gavel size={24} /></div>
            <h3 className="cs-empty__title">{EMPTY_TEXT[scope].title}</h3>
            <p className="cs-empty__text">{EMPTY_TEXT[scope].text}</p>
          </div>
        ) : (
          <>
            <ul className="cs-list">
              {rows.map(s => <ClientSessionRow key={s.id} session={s} />)}
            </ul>
            {page < lastPage && (
              <div className="cs-more">
                <button type="button" className="cs-btn" disabled={loadingMore} onClick={() => void load(scope, page + 1, true)}>
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  عرض المزيد ({rows.length} من {total})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientSessions;
