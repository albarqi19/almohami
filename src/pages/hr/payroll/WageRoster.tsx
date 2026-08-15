import React from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Search, SearchX, Users, X } from 'lucide-react';

import { EMPTY_MARK, FILTER_HINTS, FILTER_LABELS, gapCode, money } from './payrollFormat';
import type { WageRegisterCounts, WageRegisterFilter, WageRegisterRow } from '../../../types/hrPayroll';

/**
 * عمودُ المنسوبين في سجلّ الأجور — بحثٌ + شرائحُ ملتصقة + صفوفٌ من سطرين + ترقيم.
 *
 * **العدُّ من الخادم لا من الصفحة**: عدّادٌ يُحسب على `rows` يقول «بلا أجر ٠» في مكتبٍ فيه
 * ثمانيةَ عشرَ بلا أجر لأنّهم في الصفحة الثانية — وهي ثلاثةُ أكاذيبَ من جذرٍ واحد سُجِّلت في
 * عمود الإجازات قبل أن يُنقَل العدُّ إلى الخادم. ورقمٌ لم يصل بعدُ **يُكتب شرطةً لا صفراً**:
 * الصفرُ هنا ادّعاءُ عدٍّ لم يقع.
 *
 * وصفُّ المنسوب يحمل **رمزَ النقص الحاكم** لا كلَّ نواقصه: من لا أجرَ له لا يُقال له «أضف
 * آيباناً» — يُقال له ما يبدأ به. والمبلغُ يظهر لحاملِ `hr.compensation.view` وحدَه، ومكانُه
 * لا يُملأ بصفرٍ لغيره.
 */

interface Props {
  rows: WageRegisterRow[];
  counts?: WageRegisterCounts;
  filter: WageRegisterFilter;
  search: string;
  page: number;
  lastPage: number;
  total: number;
  selectedId: number | null;
  loading: boolean;
  error: unknown;
  canViewAmounts: boolean;
  onSearch: (value: string) => void;
  onFilter: (value: WageRegisterFilter) => void;
  onPage: (page: number) => void;
  onSelect: (profileId: number) => void;
  onRetry: () => void;
}

const CHIPS: WageRegisterFilter[] = ['all', 'missing_wage', 'missing_scheme', 'missing_iban', 'ready'];

/** الحرفُ الأوّل للأفاتار — بلا لونٍ مشتقٍّ من هاش الاسم (فخٌّ مسجَّل في `AdminRequests`). */
function initial(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  return trimmed === '' ? '؟' : Array.from(trimmed)[0];
}

export const WageRoster: React.FC<Props> = ({
  rows,
  counts,
  filter,
  search,
  page,
  lastPage,
  total,
  selectedId,
  loading,
  error,
  canViewAmounts,
  onSearch,
  onFilter,
  onPage,
  onSelect,
  onRetry,
}) => (
  <aside className="hrl-side" aria-label="منسوبو المكتب">
    <div className="hrl-search">
      <Search size={14} aria-hidden="true" />
      <input
        type="search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="ابحث باسم المنسوب…"
        aria-label="ابحث باسم المنسوب"
      />
      {search !== '' && (
        <button type="button" className="hrl-searchclear" aria-label="مسح البحث" onClick={() => onSearch('')}>
          <X size={13} />
        </button>
      )}
    </div>

    <div className="hrl-chips" role="group" aria-label="تصفية المنسوبين">
      {CHIPS.map((key) => (
        <button
          key={key}
          type="button"
          className="hrl-chip"
          title={FILTER_HINTS[key]}
          aria-pressed={filter === key}
          onClick={() => onFilter(key)}
        >
          {FILTER_LABELS[key]}
          <span className="hrl-chip__n">{counts ? counts[key] : EMPTY_MARK}</span>
        </button>
      ))}
    </div>

    {loading && (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل المنسوبين">
        <span className="hrl-skel" />
        <span className="hrl-skel" />
        <span className="hrl-skel" />
        <span className="hrl-skel" />
        <span className="hrl-skel" />
      </div>
    )}

    {!loading && Boolean(error) && (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={20} />
        <p className="hrl-state__t">تعذّر جلب المنسوبين</p>
        <button type="button" className="hr-btn hr-btn--sm" onClick={onRetry}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    )}

    {!loading && !error && rows.length === 0 && (
      <div className="hrl-state hrl-state--empty">
        {search === '' && filter === 'all' ? <Users size={20} /> : <SearchX size={20} />}
        <p className="hrl-state__t">
          {search === '' && filter === 'all' ? 'لا منسوبين بعد' : 'لا منسوبَ في هذه الشريحة'}
        </p>
        <p className="hrl-state__d">
          {search === '' && filter === 'all'
            ? 'سجلُّ الأجور يبدأ من ملفّات الموظفين — أضِف منسوباً أوّلاً.'
            : 'جرّب شريحةً أخرى أو امسح البحث.'}
        </p>
      </div>
    )}

    {!loading && !error && rows.length > 0 && (
      <ul className="hrl-emplist">
        {rows.map((row) => {
          const gap = gapCode(row);
          const amount = canViewAmounts ? money(row.total_salary) : null;
          const meta = [row.job_title, row.department].filter(Boolean).join(' · ');

          return (
            <li className={`hrl-emprow${row.profile_id === selectedId ? ' is-selected' : ''}`} key={row.profile_id}>
              <button
                type="button"
                className="hrl-emprow__hit"
                onClick={() => onSelect(row.profile_id)}
                aria-current={row.profile_id === selectedId ? 'true' : undefined}
              >
                <span className="hrl-emprow__av" aria-hidden="true">
                  {initial(row.name)}
                </span>
                <span className="hrl-emprow__main">
                  <span className="hrl-emprow__n">{row.name ?? EMPTY_MARK}</span>
                  <span className="hrl-emprow__m">{meta === '' ? EMPTY_MARK : meta}</span>
                </span>
                <span className="hrl-emprow__end">
                  {gap !== null ? (
                    <span className="hrl-uninit">{FILTER_LABELS[gap]}</span>
                  ) : amount !== null ? (
                    <span className="hrl-mini" dir="ltr">
                      {amount}
                    </span>
                  ) : (
                    // جاهزٌ ولا صلاحيةَ للمبلغ: الحالةُ تُقال، والرقمُ لا يُخترع ولا يُنجَّم.
                    <span className="hrl-mini">جاهز</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    )}

    {!loading && !error && total > 0 && (
      <div className="hrl-pager">
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة السابقة"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          <ChevronRight size={14} />
        </button>
        <span dir="ltr">
          {page} / {lastPage}
        </span>
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة التالية"
          disabled={page >= lastPage}
          onClick={() => onPage(Math.min(lastPage, page + 1))}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    )}
  </aside>
);

export default WageRoster;
