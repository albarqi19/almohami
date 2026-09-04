import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, ShieldCheck, Search, LayoutDashboard, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, SearchX, UserPlus, X,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { AddEmployeeModal } from '../../components/hr/AddEmployeeModal';
import HolidaysModal from './HolidaysModal';
import HrOfficeBoard from './board/HrOfficeBoard';
import HrDossierWall from './dossier/HrDossierWall';
import { empName, isLawyer } from './dossier/dossierFormat';
import { EMPTY_MARK, errorText } from './leave/leaveFormat';
import type { EmployeeProfile, EmployeeFilters } from '../../types/hr';

// ───────────────────────── أدوات مساعدة ─────────────────────────

const STATUS_DOT: Record<string, string> = {
  active: 'var(--status-green)',
  on_leave: 'var(--status-blue)',
  suspended: 'var(--color-text-secondary)',
  terminated: 'var(--status-red)',
};

/** لونُ درعِ التوثيق — خريطةٌ بدل سلسلةِ شروطٍ ثلاثيةٍ داخل `style` (وقيمُها متغيّرات). */
const SBA_COLOR: Record<string, string> = {
  verified_same_firm: 'var(--status-green)',
  verified_other_firm: 'var(--law-gold)',
  expired: 'var(--status-red)',
};

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ وحدة الإجازات. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

/** تسميات الأدوار بالعربية (للعرض في القائمة الجانبية). */
const ROLE_LABELS: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  partner: 'شريك',
  lawyer: 'محامٍ',
  senior_lawyer: 'محامٍ أول',
  legal_assistant: 'مساعد قانوني',
  accountant: 'محاسب',
  secretary: 'سكرتير',
  client: 'عميل',
};
const roleLabel = (r?: string | null): string => (r ? (ROLE_LABELS[r] || r) : '');

/** حرفٌ أوّلُ في أفاتار 26px — **بلا لونٍ مشتقٍّ من هاش الاسم** (عرفُ `LeaveRoster`). */
function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? '؟' : trimmed.charAt(0);
}

// ───────────────────────── الصفحة الرئيسية (قسمان) ─────────────────────────

const ROSTER_PER_PAGE = 25;

const HrModule: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = usePermission('hr.manage');

  const selectedId = id ? Number(id) : null;

  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState<'all' | 'active' | 'terminated'>('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);

  const filters: EmployeeFilters = useMemo(() => ({
    search: search.trim() || undefined,
    status: statusChip === 'all' ? undefined : statusChip,
    page,
    per_page: ROSTER_PER_PAGE,
  }), [search, statusChip, page]);

  // `['hr','stats']` انتقل إلى `board/useBoardData` مع اللوحة — والقائمةُ هنا لا تقرؤه.
  const listQuery = useQuery({
    queryKey: ['hr', 'employees', filters],
    queryFn: () => hrService.getEmployees(filters),
  });
  const list = listQuery.data;

  /**
   * ⏳ **دَينٌ معلَنٌ**: الترتيبُ يُعاد حسابه في الفرونت على **صفحةٍ واحدةٍ من ٢٥** فيبدو
   * ترتيباً عالمياً وهو صفحيّ — موثَّقٌ من عهد `hr-roster` ولا يُصلَح هنا: إصلاحُه ترتيبٌ
   * بالخادم (`GET /hr/employees` بلا مُعامل ترتيب)، وهو تغييرُ باكٍ خارج هذه المرحلة.
   */
  const employees = useMemo(() => {
    const data = list?.data ?? [];
    const isVerified = (e: EmployeeProfile) =>
      e.sba_verification_status === 'verified_same_firm' || e.sba_verification_status === 'verified_other_firm';
    return [...data].sort((a, b) => Number(isVerified(b)) - Number(isVerified(a)));
  }, [list]);
  const total = list?.total ?? 0;
  const lastPage = list?.last_page ?? 1;

  /**
   * تبديلُ الموظف **يحمل المرساةَ معه**: من يرفع الهويةَ لعشرة منسوبين يقفز قفزةً
   * واحدةً لكلٍّ بدل عشر تمريراتٍ إلى الأسفل — وهو المكسبُ العمليُّ الوحيدُ الذي كان
   * للتبويب على الجدار، ويُستعاد بلا إعادةِ إخفاء.
   *
   * `window.location.hash` لا `useLocation().hash`: شريطُ القفز يكتب المرساةَ بـ
   * `history.replaceState` (كي لا يعبث بالراوتر)، والراوترُ **لا يُخطَر** بذلك فتبقى
   * نسختُه قديمة. النافذةُ وحدَها تعرف المرساةَ الحقيقية.
   */
  const select = (empId: number) => navigate(`/hr/employees/${empId}${window.location.hash}`);
  const showOverview = () => navigate('/hr');

  const setChip = (c: 'all' | 'active' | 'terminated') => { setStatusChip(c); setPage(1); };
  const clearSearch = () => { setSearch(''); setPage(1); };

  const searching = search.trim() !== '';

  /**
   * **الحالاتُ الأربعُ للقائمة، متمايزةً**: هياكلُ التحميل · مثلثٌ أحمرُ بنصِّ الخادم
   * وزرُّ إعادة · وفراغان **مختلفان**: مكتبٌ بلا منسوبين (فعلُه «إضافة منسوب») وبحثٌ بلا
   * نتيجة (فعلُه «امسح البحث»). خلطُهما يجعل المكتبَ الجديدَ يظنّ بحثَه معطوباً.
   * (لا حالةَ «محميّ» هنا: شجرةُ `/hr` كلُّها محروسةٌ بـ`hr.view` في الراوتر.)
   */
  const rosterBody = (() => {
    if (listQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الموظفين">
          {Array.from({ length: 8 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (listQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل الموظفين</p>
          <p className="hrl-state__d">{errorText(listQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void listQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    if (employees.length === 0) {
      return searching ? (
        <div className="hrl-state hrl-state--empty">
          <SearchX size={22} />
          <p className="hrl-state__t">لا نتيجة لهذا البحث</p>
          <p className="hrl-state__d">لا يوجد موظف يطابق «{search.trim()}».</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={clearSearch}>
            <X size={13} /> امسح البحث
          </button>
        </div>
      ) : (
        <div className="hrl-state hrl-state--empty">
          <Users size={22} />
          <p className="hrl-state__t">لا موظفين في هذا المكتب بعد</p>
          <p className="hrl-state__d">يبدأ الملف بأول موظف، ثم تبنى عليه العقود والمستندات والإجازات.</p>
          {canManage && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowAdd(true)}>
              <UserPlus size={13} /> إضافة موظف
            </button>
          )}
        </div>
      );
    }

    return (
      <ul className="hrl-emplist">
        {employees.map((emp) => {
          const name = empName(emp, emp.id);
          const meta = emp.job_title || emp.department || roleLabel(emp.user?.role);
          const selected = selectedId === emp.id;

          return (
            <li className={`hrl-emprow${selected ? ' is-selected' : ''}`} key={emp.id}>
              <button
                type="button"
                className="hrl-emprow__hit"
                onClick={() => select(emp.id)}
                aria-current={selected ? 'true' : undefined}
              >
                <span className="hrl-emprow__av" aria-hidden="true">{initial(name)}</span>
                <span className="hrl-emprow__main">
                  <span className="hrl-emprow__n">{name}</span>
                  <span className="hrl-emprow__m">{meta || EMPTY_MARK}</span>
                </span>
                <span className="hrl-emprow__end">
                  {isLawyer(emp) && (
                    <ShieldCheck
                      size={14}
                      aria-hidden="true"
                      style={{ color: SBA_COLOR[emp.sba_verification_status] || 'var(--color-text-secondary)' }}
                    />
                  )}
                  <span
                    className="hr-dot"
                    aria-hidden="true"
                    style={{ background: STATUS_DOT[emp.status] || 'var(--color-text-secondary)' }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    // `hrl-page--wall` مُعدِّلٌ يقصر إصلاحَ قصِّ الأعمدة (§١٣-ك) على هذه الصفحة وحدَها،
    // فلا تُلمَس `/hr/leave` المنشورةُ والمُعايَنةُ بالعين. والجذرُ على بدائيّات `hrl-*`
    // فتَسري عليه كتلةُ الجوّال (hr-leave.css §١٢-أ) التي تُكدّس العمودين: **المسرحُ
    // أوّلاً ثمّ القائمة**، فيبدأ الجوّالُ من حيث يبدأ سطحُ المكتب — بالترويسة.
    <div className="hrl-page hrl-page--wall">
      <div className="hrl-layout">
        {/* العمود اليمين: قائمة المنسوبين */}
        <nav className="hrl-side" aria-label="الموظفون">
          {/* العدسةُ **عنصرٌ شقيقٌ** لا خلفيةٌ مطلقة: يموت هنا العطبُ الفيزيائيُّ الوحيدُ
              في الوحدة (`inset-inline-start` منطقيّ مقابل حشوٍ فيزيائيّ ⇒ الأيقونةُ تركب
              النصَّ يميناً و٣٤px تُهدَر يساراً). والحشوُ كلُّه منطقيٌّ في `.hrl-search`. */}
          <div className="hrl-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="ابحث باسم، رقم وظيفي، أو جوال…"
              aria-label="بحث في الموظفين"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {searching && (
              <button type="button" className="hrl-searchclear" aria-label="مسح البحث" onClick={clearSearch}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* شريطٌ واحدٌ ملتصق: اللوحةُ أوّلاً ثمّ التصفية — و`aria-pressed` تحمل الحالةَ
              بدل صنفِ `--active`، فلا يعرف المحرِّكُ الصوتيُّ المختارَ من الشكل وحدَه. */}
          <div className="hrl-chips" role="group" aria-label="عرض اللوحة وتصفية الموظفين">
            <button type="button" className="hrl-chip" aria-pressed={selectedId == null} onClick={showOverview}>
              <LayoutDashboard size={13} /> لوحة المكتب
            </button>
            <button type="button" className="hrl-chip" aria-pressed={statusChip === 'all'} onClick={() => setChip('all')}>الكل</button>
            <button type="button" className="hrl-chip" aria-pressed={statusChip === 'active'} onClick={() => setChip('active')}>على رأس العمل</button>
            <button type="button" className="hrl-chip" aria-pressed={statusChip === 'terminated'} onClick={() => setChip('terminated')}>انتهت خدمتهم</button>
          </div>

          {rosterBody}

          {lastPage > 1 && (
            <div className="hrl-pager">
              <button
                type="button"
                className="hr-icon-btn hr-icon-btn--sm"
                aria-label="الصفحة السابقة"
                disabled={page <= 1 || listQuery.isPending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight size={14} />
              </button>
              <span dir="ltr">{page} / {lastPage} · {total}</span>
              <button
                type="button"
                className="hr-icon-btn hr-icon-btn--sm"
                aria-label="الصفحة التالية"
                disabled={page >= lastPage || listQuery.isPending}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </nav>

        {/* العمود اليسار: المسرح */}
        <main className="hrl-stage">
          {selectedId != null ? (
            // `key` يفرض تركيباً نظيفاً لكلّ موظف — وبه تُقرأ المرساةُ من جديدٍ لكلّ ملفّ.
            <HrDossierWall empId={selectedId} key={selectedId} />
          ) : (
            // اللوحةُ تملك رأسَها بـ`<h1>` وأفعالِه — فسقطت ترويسةُ المسرح المنفصلةُ التي
            // كانت تشغل صفّاً كاملاً بعنوانٍ بلا عنصرٍ دلاليّ وبلا فعل.
            <HrOfficeBoard
              canManage={canManage}
              onAdd={() => setShowAdd(true)}
              onHolidays={() => setShowHolidays(true)}
            />
          )}
        </main>
      </div>

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['hr'] })}
        />
      )}
      {showHolidays && <HolidaysModal onClose={() => setShowHolidays(false)} />}
    </div>
  );
};

export default HrModule;
