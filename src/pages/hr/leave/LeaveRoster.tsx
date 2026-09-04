import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  SearchX,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { hrLeaveService } from '../../../services/hrLeaveService';
import { usePermission } from '../../../hooks/usePermission';
import { AddEmployeeModal } from '../../../components/hr/AddEmployeeModal';
import { EMPTY_MARK, errorText, fmtDays, toNum } from './leaveFormat';
import type { LeaveRosterFilter, LeaveRosterRow } from '../../../types/hr';

/**
 * عمودُ المنسوبين — بحثٌ + شرائحُ تصفيةٍ ملتصقة + صفوفٌ من سطرين + ترقيم.
 *
 * · **بلا فجوةٍ ولا استدارة**: الصفوفُ تلتصق ويفصلها `border-block-end` وحده،
 *   والفاصلُ بين العمود والمسرح خطٌّ منطقيٌّ **واحد** يرسمه `.hrl-stage`.
 * · **بلا لونٍ مشتقٍّ من هاش الاسم** (فخُّ `AdminRequests:173-190`): الأفاتار حرفٌ
 *   أوّلُ على خلفيةٍ من متغيّرات الثيم.
 * · شريحةُ «غير مُهيَّأ» **مربوطةٌ بشاشة التهيئة الجماعية** لا شريحةٌ صمّاء:
 *   حين تُفعَّل يظهر زرُّ «تهيئة أرصدة هؤلاء» (محروسٌ بـ`hr.leave.manage`).
 * · التسجيلُ السريع يفتح المودالَ معبّأً ولا يكتب شيئاً بنقرة: المدّةُ والأثرُ
 *   لا يُحسبان إلّا بالمعاينة، ولا إعدادَ «نوعٍ افتراضيّ» في المنظومة.
 *
 * **العدُّ والترشيحُ في الخادم** (`GET /hr/leaves/roster`): كانا هنا على `rows` — أي على
 * الصفحة المعروضة وحدَها — فكانت الشريحةُ تقول «الكل ٠» طوال ثوانٍ قبل وصول القائمة (وهو
 * ما صُوِّر)، و«الكل ٢٥» في مكتبٍ فيه مئتان، و«غائبٌ الآن ٠» والغائبُ في الصفحة الثانية.
 * ثلاثةُ أكاذيبَ من جذرٍ واحد: مَن لا يملك المجموعةَ لا يعدّها. وحين لا يصل العدّادُ
 * **لا يُخترع صفر**: تُعرض الشريحةُ بلا رقم.
 */

/** عرفُ `ROSTER_PER_PAGE` في `HrModule` — لا يُخترع رقمٌ ثانٍ للصفحة. */
const PER_PAGE = 25;

/**
 * عتبةُ «رصيدٌ منخفض» — **قرارُ عرضٍ لا قاعدةُ نظام**: لا عتبةَ في النظام، فتُرسَل مع الطلب
 * ويعيدها الردُّ صريحاً، وتُسمّى في وسم الشريحة (`title`) كي لا تُقرأ حكماً نظامياً.
 */
const LOW_BALANCE_DAYS = 5;

/** مفاتيحُ الشرائح **هي مفاتيحُ الردّ نفسُها** (`LeaveRosterCounts`) — صفرُ ترجمةٍ بينهما. */
const CHIPS: Array<{ key: LeaveRosterFilter; label: string; title: string }> = [
  { key: 'all', label: 'الكل', title: 'كل موظفي المكتب ضمن هذا البحث' },
  { key: 'on_leave', label: 'غائب الآن', title: 'من له إجازة معتمَدة تشمل اليوم' },
  { key: 'low', label: 'رصيد منخفض', title: `رصيد متاح أقل من ${LOW_BALANCE_DAYS} أيام` },
  { key: 'uninitialized', label: 'غير جاهز', title: 'من لم يسجل له رصيد افتتاحي بعد' },
];

interface Props {
  /** ملفُّ الموظف المعروض في المسرح؛ `null` قبل الاختيار. */
  selectedId: number | null;
  onSelect: (employeeId: number) => void;
  /** يفتح مودالَ التسجيل معبّأً بالموظف واليوم — ولا يحفظ شيئاً. */
  onQuickRecord: (employee: { profileId: number; name: string }) => void;
  /** يفتح شاشةَ التهيئة الجماعية (مصدرُ معنى شريحة «غير مُهيَّأ»). */
  onBulkInit: () => void;
  canManage: boolean;
}

function employeeName(row: LeaveRosterRow): string {
  return row.user?.name || `موظف #${row.id}`;
}

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? '؟' : trimmed.charAt(0);
}

export const LeaveRoster: React.FC<Props> = ({ selectedId, onSelect, onQuickRecord, onBulkInit, canManage }) => {
  const canManageEmployees = usePermission('hr.manage');

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [chip, setChip] = useState<LeaveRosterFilter>('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  // تأخيرٌ يدويّ 300ms — لا مكتبةَ debounce في المشروع.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  /**
   * الشريحةُ تُرشِّح في الخادم، فتبديلُها يُبدّل المجموعةَ كلَّها ⇒ العودةُ للصفحة الأولى.
   * وتُكتب الحالتان في **مُعالِج الحدث نفسِه** لا في `useEffect`: الأخيرُ يمرّ بتصييرٍ وسيطٍ
   * بشريحةٍ جديدةٍ وصفحةٍ قديمة، فيُطلَق نداءٌ لصفحةٍ لا تُعرض ثم يُهجَر.
   */
  const pickChip = (key: LeaveRosterFilter) => {
    setChip(key);
    setPage(1);
  };

  const rosterQuery = useQuery({
    queryKey: ['hr', 'leave', 'roster', { search: debounced, filter: chip, page, per_page: PER_PAGE }],
    queryFn: () =>
      hrLeaveService.getRoster({
        search: debounced,
        filter: chip,
        low_threshold: LOW_BALANCE_DAYS,
        page,
        per_page: PER_PAGE,
      }),
    staleTime: 30_000,
  });

  const rows = useMemo(() => rosterQuery.data?.page.data ?? [], [rosterQuery.data]);

  /** عدّاداتُ المكتب كما أرسلها الخادم — و`null` تعني «لم يصل» لا «صفر». */
  const counts = rosterQuery.data?.counts ?? null;

  const lastPage = rosterQuery.data?.page.last_page ?? 1;
  const total = rosterQuery.data?.page.total ?? 0;
  const searching = debounced !== '';

  const body = (() => {
    if (rosterQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الموظفين">
          {Array.from({ length: 8 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (rosterQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل الموظفين</p>
          <p className="hrl-state__d">{errorText(rosterQuery.error, 'انقطع الاتصال بالخادم.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void rosterQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    if (rows.length === 0) {
      // ثلاثةُ فراغاتٍ متمايزة: شريحةٌ بلا أحد · بحثٌ بلا نتيجة · مكتبٌ بلا منسوبين.
      // والشريحةُ أوّلاً لأنها آخرُ ما نقره المستخدم، وزرُّها يعيده إلى القائمة كاملةً.
      if (chip !== 'all') {
        return (
          <div className="hrl-state hrl-state--empty">
            <Users size={22} />
            <p className="hrl-state__t">لا يوجد موظف في هذا التصنيف</p>
            <p className="hrl-state__d">
              {searching ? `لا أحد يطابق «${debounced}» في هذا التصنيف.` : 'التصفية تشمل المكتب كله، لا الصفحة المعروضة فقط.'}
            </p>
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => pickChip('all')}>
              اعرض الكل
            </button>
          </div>
        );
      }

      return searching ? (
        <div className="hrl-state hrl-state--empty">
          <SearchX size={22} />
          <p className="hrl-state__t">لا نتيجة لهذا البحث</p>
          <p className="hrl-state__d">لا يوجد موظف يطابق «{debounced}».</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => setSearch('')}>
            <X size={13} /> امسح البحث
          </button>
        </div>
      ) : (
        <div className="hrl-state hrl-state--empty">
          <Users size={22} />
          <p className="hrl-state__t">لا يوجد موظفون في المكتب</p>
          <p className="hrl-state__d">أضف موظفاً ليظهر رصيده وسجل غيابه هنا.</p>
          {canManageEmployees && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowAdd(true)}>
              <UserPlus size={13} /> إضافة موظف
            </button>
          )}
        </div>
      );
    }

    return (
      <ul className="hrl-emplist">
        {rows.map((row) => {
          const name = employeeName(row);
          const balance = row.leave_balance;
          const uninitialized = balance?.is_initialized === false;
          const value = balance && balance.is_initialized ? toNum(balance.balance) : null;
          const meta = [row.job_title, row.department].filter(Boolean).join(' · ');

          return (
            <li className={`hrl-emprow${row.id === selectedId ? ' is-selected' : ''}`} key={row.id}>
              <button
                type="button"
                className="hrl-emprow__hit"
                onClick={() => onSelect(row.id)}
                aria-current={row.id === selectedId ? 'true' : undefined}
              >
                <span className="hrl-emprow__av" aria-hidden="true">
                  {initial(name)}
                </span>
                <span className="hrl-emprow__main">
                  <span className="hrl-emprow__n">{name}</span>
                  <span className="hrl-emprow__m">{meta || EMPTY_MARK}</span>
                </span>
                <span className="hrl-emprow__end">
                  {uninitialized ? (
                    <span className="hrl-uninit">غير جاهز</span>
                  ) : value !== null ? (
                    <span className={`hrl-mini${value < 0 ? ' is-neg' : ''}`} dir="ltr">
                      {fmtDays(value)}
                    </span>
                  ) : null}
                </span>
              </button>

              {canManage && (
                <button
                  type="button"
                  className="hrl-quick"
                  title={`تسجيل غياب — ${name}`}
                  aria-label={`تسجيل غياب — ${name}`}
                  onClick={() => onQuickRecord({ profileId: row.id, name })}
                >
                  <CalendarPlus size={15} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    <>
      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            void rosterQuery.refetch();
          }}
        />
      )}

      <div className="hrl-search">
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الموظف…"
          aria-label="بحث في الموظفين"
        />
        {search !== '' && (
          <button type="button" className="hrl-searchclear" aria-label="مسح البحث" onClick={() => setSearch('')}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="hrl-chips" role="group" aria-label="تصفية الموظفين">
        {CHIPS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="hrl-chip"
            title={item.title}
            aria-pressed={chip === item.key}
            onClick={() => pickChip(item.key)}
          >
            {item.label}
            {/* رقمٌ لا يعرفه الخادمُ بعدُ = **شرطة**: الصفرُ هنا ادّعاءُ عدٍّ لم يقع. */}
            <span className="hrl-chip__n">{counts === null ? EMPTY_MARK : counts[item.key]}</span>
          </button>
        ))}
      </div>

      {/* الشريحةُ الرابعة تقود إلى فعلٍ حقيقيّ: شاشةُ التهيئة الجماعية نفسُها. */}
      {chip === 'uninitialized' && counts !== null && counts.uninitialized > 0 && canManage && (
        <div className="hrl-note">
          {counts.uninitialized} من موظفي المكتب بلا رصيد افتتاحي.{' '}
          <button type="button" className="hrl-link" onClick={onBulkInit}>
            تهيئة أرصدة هؤلاء
          </button>
        </div>
      )}

      {body}

      <div className="hrl-pager">
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة السابقة"
          disabled={page <= 1 || rosterQuery.isPending}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronRight size={14} />
        </button>
        {/* مجموعٌ لم يصل بعدُ يُكتب شرطةً لا صفراً — نفسُ عهدِ الشرائح فوقه. */}
        <span dir="ltr">
          {page} / {rosterQuery.data ? lastPage : EMPTY_MARK} · {rosterQuery.data ? total : EMPTY_MARK}
        </span>
        <button
          type="button"
          className="hr-icon-btn hr-icon-btn--sm"
          aria-label="الصفحة التالية"
          disabled={page >= lastPage || rosterQuery.isPending}
          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    </>
  );
};

export default LeaveRoster;
