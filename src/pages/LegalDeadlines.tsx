// صفحة «المهل النظامية» — عدادات تنازلية لمهل الاعتراض والمدد الإجرائية
// (ملاحظتا عميل #21 و#23 + قرارات المالك 2026-07-11)
//
// «النمط الملتصق» (ssp2): ترويسة بحقائق + شرائح تصنيف، عمود فلاتر يمين قابل
// للطي لشريط 46px، ووسط بصفوف كثيفة تتمرر داخلياً — لا تمرير خارجي.
//
// قرارات المالك:
//  - تعديل بيانات المهلة وحذفها للمدير فقط (أزرار الحالة تبقى للمحامي)
//  - زر «تم الإنجاز» يبقى بعد الانقضاء: إنجاز بأثر رجعي بتاريخ فعلي
//    ومرجع توثيق إلزاميين (بلا إشعار للمديرين — قرار 2026-07-12)
//  - تصنيف المهل: اعتراض على حكم / ضبط الجلسة / أخرى
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Hourglass,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Quote,
  ScrollText,
  Search,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import deadlineService, {
  type CreateDeadlinePayload,
  type DeadlineCategory,
  type DeadlineType,
  type LegalDeadline,
} from '../services/deadlineService';
import { CaseService } from '../services/caseService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissionContext } from '../contexts/PermissionContext';
import { toHijri } from '../utils/hijriDate';

// ═══════════════════════════════════════════════════════
//  مساعدات العرض
// ═══════════════════════════════════════════════════════

const SOURCE_LABELS: Record<string, string> = {
  najiz_auto: 'من ناجز',
  dabt_ai: 'من ضبط الجلسة',
  template: 'قالب نظامي',
  manual: 'يدوي',
};

const CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  objection: 'اعتراض على حكم',
  dabt: 'ضبط الجلسة',
  other: 'أخرى',
};

export const daysLabel = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 0) return `فاتت منذ ${Math.abs(days)} ${Math.abs(days) === 1 ? 'يوم' : 'أيام'}`;
  if (days === 0) return 'اليوم آخر يوم!';
  if (days === 1) return 'متبقي يوم واحد';
  if (days === 2) return 'متبقي يومان';
  if (days <= 10) return `متبقي ${days} أيام`;
  return `متبقي ${days} يوماً`;
};

// عدّاد مهلة الخصم — يُؤطَّر كملاحظة لا كإنذار («أمام الخصم» لا «متبقي لك»)
export const opponentDaysLabel = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 0) return 'انقضت مهلة الخصم';
  if (days === 0) return 'آخر يوم أمام الخصم';
  if (days === 1) return 'أمام الخصم يوم واحد';
  if (days === 2) return 'أمام الخصم يومان';
  if (days <= 10) return `أمام الخصم ${days} أيام`;
  return `أمام الخصم ${days} يوماً`;
};

const formatDue = (dueDate: string): string => {
  const d = new Date(dueDate);
  const greg = d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
  const hijri = toHijri(dueDate);
  return hijri ? `${greg} (${hijri})` : greg;
};

/** تاريخ اليوم المحلي بصيغة YYYY-MM-DD (لحقول التاريخ) */
const todayISO = (): string => new Date().toLocaleDateString('en-CA');

type ViewKey = 'overview' | 'open' | 'suggested' | 'missed' | 'completed' | 'waived' | 'opponent';
type CategoryFilter = 'all' | DeadlineCategory;

interface EditForm {
  title: string;
  description: string;
  due_date: string;
  category: DeadlineCategory;
  action_label: string;
}

// ═══════════════════════════════════════════════════════
//  صف مهلة واحد (كثيف — سطران + تفاصيل قابلة للفرد)
// ═══════════════════════════════════════════════════════

interface RowProps {
  deadline: LegalDeadline;
  busy: boolean;
  isManager: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAction: (d: LegalDeadline, action: string) => void;
  onOpenCase: (caseId: number) => void;
  onEdit: (d: LegalDeadline) => void;
  onDelete: (d: LegalDeadline) => void;
}

const DeadlineRow: React.FC<RowProps> = ({ deadline: d, busy, isManager, expanded, onToggle, onAction, onOpenCase, onEdit, onDelete }) => {
  const urgency = d.urgency ?? 'normal';
  const isSuggested = d.status === 'suggested';
  const isOpen = d.status === 'active' || d.status === 'in_progress';
  const isOpponent = d.obligated_party === 'opponent';
  const overdue = (d.days_remaining ?? 0) < 0;
  // مهلة الخصم: معلومة تكتيكية للمتابعة فقط — تُحيّد بصرياً ولا تُعرض كإنذار إلحاح
  const displayUrgency = isOpponent ? 'opponent' : urgency;

  const hasDetails = Boolean(
    d.description || d.legal_reference || d.source_quote || d.waive_reason || d.completion_note || d.case || d.assignee
  );

  return (
    <div className={`ldx-row ldx-row--${displayUrgency} ${isSuggested ? 'ldx-row--suggested' : ''}`}>
      <div className="ldx-row__line" onClick={hasDetails ? onToggle : undefined} role={hasDetails ? 'button' : undefined}>
        <span className={`ldx-dot ldx-dot--${isSuggested ? 'suggested' : displayUrgency}`} />
        <span className={`ldx-count ldx-count--${displayUrgency}`}>
          {isOpponent ? <Hourglass size={12} /> : <AlarmClock size={12} />}
          {isOpponent ? opponentDaysLabel(d.days_remaining) : daysLabel(d.days_remaining)}
        </span>
        <span className={`ldx-cat ldx-cat--${d.category}`}>{CATEGORY_LABELS[d.category] ?? d.category}</span>
        <span className="ldx-row__title" title={d.title}>{d.title}</span>

        {isOpponent && <span className="ldx-badge ldx-badge--opponent">على الخصم</span>}
        {d.status === 'in_progress' && <span className="ldx-badge ldx-badge--progress">جارٍ العمل</span>}
        {d.status === 'completed' && d.completed_after_due === false && d.completion_note && (
          <span className="ldx-badge ldx-badge--ontime">أُنجزت في وقتها — وُثّقت متأخراً</span>
        )}
        {d.status === 'completed' && d.completed_after_due === true && (
          <span className="ldx-badge ldx-badge--late">أُنجزت بعد الموعد</span>
        )}

        <span className="ldx-row__spacer" />

        <div className="ldx-row__actions" onClick={(e) => e.stopPropagation()}>
          {isSuggested && (
            <>
              <button className="ldx-btn ldx-btn--confirm" disabled={busy} onClick={() => onAction(d, 'confirm')}>
                <Check size={13} /> تأكيد
              </button>
              <button className="ldx-btn ldx-btn--ghost" disabled={busy} onClick={() => onAction(d, 'reject')}>
                <X size={13} /> ليست مهلة
              </button>
            </>
          )}

          {isOpen && !isOpponent && (
            <>
              <button className="ldx-btn ldx-btn--complete" disabled={busy} onClick={() => onAction(d, 'complete')}>
                <CheckCircle2 size={13} /> {overdue ? 'تم الإنجاز (وثّقه)' : `تم: ${d.action_label || 'الإنجاز'}`}
              </button>
              {d.status === 'active' && !overdue && (
                <button className="ldx-btn ldx-btn--ghost" disabled={busy} onClick={() => onAction(d, 'in_progress')}>
                  بدء العمل
                </button>
              )}
              <button className="ldx-btn ldx-btn--waive" disabled={busy} onClick={() => onAction(d, 'waive')}>
                تنازل
              </button>
            </>
          )}

          {d.status === 'missed' && (
            <>
              <button className="ldx-btn ldx-btn--complete" disabled={busy} onClick={() => onAction(d, 'complete')}>
                <CheckCircle2 size={13} /> تم الإنجاز (وثّقه)
              </button>
              <button className="ldx-btn ldx-btn--waive" disabled={busy} onClick={() => onAction(d, 'waive')}>
                سبب الفوات
              </button>
            </>
          )}

          {isManager && (
            <>
              <button className="ssp2-icon-btn ldx-iconbtn" title="تعديل المهلة (مدير)" disabled={busy} onClick={() => onEdit(d)}>
                <Pencil size={13} />
              </button>
              <button className="ssp2-icon-btn ssp2-icon-btn--danger ldx-iconbtn" title="حذف المهلة (مدير)" disabled={busy} onClick={() => onDelete(d)}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>

        {hasDetails && <ChevronDown size={14} className={`ldx-row__chev ${expanded ? 'is-open' : ''}`} />}
      </div>

      <div className="ldx-row__meta">
        <span>📅 آخر يوم: {formatDue(d.due_date)}</span>
        {d.case && (
          <button className="ldx-caselink" onClick={() => onOpenCase(d.case!.id)}>
            📂 {d.case.file_number || d.case.title}
          </button>
        )}
        {d.assignee && <span>👤 {d.assignee.name}</span>}
        <span className="ldx-source">{SOURCE_LABELS[d.source] ?? d.source}</span>
      </div>

      {expanded && (
        <div className="ldx-row__details">
          {d.description && <p className="ldx-desc">{d.description}</p>}

          {isOpponent && (
            <p className="ldx-note">تُغلق تلقائياً عند انقضائها — للمتابعة والاستعداد فقط، لا إجراء مطلوب منك.</p>
          )}

          {d.legal_reference && (
            <div className="ldx-reference">
              <ScrollText size={12} />
              {d.legal_reference}
              {d.due_date_source === 'computed' && <em> — حساب استرشادي، تحقق من تاريخ التسلّم</em>}
            </div>
          )}

          {isSuggested && d.source_quote && (
            <blockquote className="ldx-quote">
              <Quote size={12} />
              «{d.source_quote}»
            </blockquote>
          )}

          {d.status === 'waived' && d.waive_reason && (
            <div className="ldx-waive-reason">سبب التنازل: {d.waive_reason}</div>
          )}
          {d.status === 'missed' && d.waive_reason && (
            <div className="ldx-waive-reason">سبب الفوات الموثق: {d.waive_reason}</div>
          )}

          {d.completion_note && (
            <div className="ldx-completion">
              <CheckCircle2 size={12} />
              مرجع الإنجاز: {d.completion_note}
              {d.completed_at && <span> — بتاريخ {formatDue(d.completed_at.slice(0, 10))}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//  الصفحة
// ═══════════════════════════════════════════════════════

const SIDE_MIN_KEY = 'ldx-side-min';

const LegalDeadlines: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has } = usePermissionContext();

  // المدير: تعديل المهل وحذفها له وحده (نفس حارس الباك)
  const isManager = user?.role === 'admin' || user?.role === 'owner' || has('system.manage');

  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewKey>('overview');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sideMin, setSideMin] = useState<boolean>(() => localStorage.getItem(SIDE_MIN_KEY) === '1');

  // مودال التنازل / توثيق سبب الفوات (المبرر إلزامي — حماية للمكتب)
  const [waiveTarget, setWaiveTarget] = useState<LegalDeadline | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  // مودال الإنجاز بأثر رجعي (مهلة منقضية): التاريخ الفعلي + المرجع إلزاميان
  const [retroTarget, setRetroTarget] = useState<LegalDeadline | null>(null);
  const [retroDate, setRetroDate] = useState(todayISO());
  const [retroNote, setRetroNote] = useState('');

  // مودالا التعديل والحذف (المدير فقط)
  const [editTarget, setEditTarget] = useState<LegalDeadline | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', due_date: '', category: 'other', action_label: '' });
  const [deleteTarget, setDeleteTarget] = useState<LegalDeadline | null>(null);

  // مودال الإضافة
  const [showAdd, setShowAdd] = useState(false);
  const [types, setTypes] = useState<DeadlineType[]>([]);
  const [cases, setCases] = useState<Array<{ id: number; title: string; file_number?: string | null }>>([]);
  const [addForm, setAddForm] = useState<CreateDeadlinePayload>({});
  const [addMode, setAddMode] = useState<'template' | 'manual'>('template');
  const [saving, setSaving] = useState(false);

  const toggleSide = (min: boolean) => {
    setSideMin(min);
    localStorage.setItem(SIDE_MIN_KEY, min ? '1' : '0');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deadlineService.list({
        status: 'suggested,active,in_progress,completed,waived,missed',
        mine: mineOnly,
        q: search || undefined,
        per_page: 200,
      });
      setDeadlines(data);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل المهل');
    } finally {
      setLoading(false);
    }
  }, [mineOnly, search]);

  useEffect(() => {
    load();
  }, [load]);

  // فلتر التصنيف يطبق محلياً — فوري وبلا إعادة جلب
  const filtered = useMemo(
    () => (category === 'all' ? deadlines : deadlines.filter((d) => d.category === category)),
    [deadlines, category]
  );

  const groups = useMemo(() => {
    const open = filtered
      .filter((d) => d.status === 'active' || d.status === 'in_progress')
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

    return {
      suggested: filtered.filter((d) => d.status === 'suggested' && (d.days_remaining ?? -1) >= 0),
      missed: filtered.filter((d) => d.status === 'missed'),
      open,
      completed: filtered.filter((d) => d.status === 'completed'),
      waived: filtered.filter((d) => d.status === 'waived'),
      opponent: open.filter((d) => d.obligated_party === 'opponent'),
    };
  }, [filtered]);

  const stats = useMemo(
    () => ({
      open: groups.open.length,
      dueSoon: groups.open.filter((d) => d.days_remaining !== null && d.days_remaining >= 0 && d.days_remaining <= 3).length,
      suggested: groups.suggested.length,
      missed: groups.missed.length,
      completed: groups.completed.length,
      waived: groups.waived.length,
      opponent: groups.opponent.length,
    }),
    [groups]
  );

  const VIEWS: Array<{ key: ViewKey; label: string; icon: React.ReactNode; count: number }> = [
    { key: 'overview', label: 'النظرة العامة', icon: <LayoutGrid size={14} />, count: stats.open },
    { key: 'open', label: 'المفتوحة', icon: <AlarmClock size={14} />, count: stats.open },
    { key: 'suggested', label: 'مقترحات الرائد', icon: <Lightbulb size={14} />, count: stats.suggested },
    { key: 'missed', label: 'الفائتة', icon: <AlertTriangle size={14} />, count: stats.missed },
    { key: 'completed', label: 'المنجزة', icon: <CheckCircle2 size={14} />, count: stats.completed },
    { key: 'waived', label: 'المتنازل عنها', icon: <Ban size={14} />, count: stats.waived },
    { key: 'opponent', label: 'مهل الخصوم', icon: <Swords size={14} />, count: stats.opponent },
  ];

  const CATEGORY_TABS: Array<{ key: CategoryFilter; label: string }> = [
    { key: 'all', label: 'كل التصنيفات' },
    { key: 'objection', label: 'اعتراض على حكم' },
    { key: 'dabt', label: 'ضبط الجلسة' },
    { key: 'other', label: 'أخرى' },
  ];

  const handleAction = async (d: LegalDeadline, action: string) => {
    if (action === 'waive') {
      setWaiveTarget(d);
      setWaiveReason('');
      return;
    }

    // «تم الإنجاز» على مهلة منقضية → توثيق بأثر رجعي (تاريخ + مرجع إلزاميان)
    if (action === 'complete' && (d.days_remaining ?? 0) < 0) {
      setRetroTarget(d);
      setRetroDate(todayISO());
      setRetroNote('');
      return;
    }

    setBusyId(d.id);
    try {
      await deadlineService.changeStatus(d.id, action as any);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر تنفيذ الإجراء');
    } finally {
      setBusyId(null);
    }
  };

  const submitWaive = async () => {
    if (!waiveTarget || !waiveReason.trim()) return;
    setBusyId(waiveTarget.id);
    try {
      await deadlineService.changeStatus(waiveTarget.id, 'waive', { reason: waiveReason.trim() });
      setWaiveTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر حفظ التنازل');
    } finally {
      setBusyId(null);
    }
  };

  const submitRetro = async () => {
    if (!retroTarget || !retroDate || !retroNote.trim()) return;
    setBusyId(retroTarget.id);
    try {
      await deadlineService.changeStatus(retroTarget.id, 'complete', {
        completed_on: retroDate,
        completion_note: retroNote.trim(),
      });
      setRetroTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر توثيق الإنجاز');
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (d: LegalDeadline) => {
    setEditTarget(d);
    setEditForm({
      title: d.title,
      description: d.description ?? '',
      due_date: d.due_date?.slice(0, 10) ?? '',
      category: d.category ?? 'other',
      action_label: d.action_label ?? '',
    });
  };

  const submitEdit = async () => {
    if (!editTarget || !editForm.title.trim() || !editForm.due_date) return;
    setBusyId(editTarget.id);
    try {
      await deadlineService.update(editTarget.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        due_date: editForm.due_date,
        category: editForm.category,
        action_label: editForm.action_label.trim() || null,
      } as any);
      setEditTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر تعديل المهلة');
    } finally {
      setBusyId(null);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deadlineService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر حذف المهلة');
    } finally {
      setBusyId(null);
    }
  };

  const openAdd = async () => {
    setShowAdd(true);
    setAddForm({});
    setAddMode('template');
    try {
      const [t, c] = await Promise.all([
        types.length ? Promise.resolve(types) : deadlineService.types(),
        cases.length
          ? Promise.resolve(cases)
          : CaseService.getCases({ per_page: 200 } as any).then((r: any) => {
              const list = Array.isArray(r) ? r : r?.data ?? [];
              return list.map((x: any) => ({ id: Number(x.id), title: x.title, file_number: x.file_number ?? x.fileNumber }));
            }),
      ]);
      setTypes(t);
      setCases(c);
    } catch {
      /* القوائم اختيارية — النموذج يعمل بدونها */
    }
  };

  const submitAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateDeadlinePayload = { ...addForm };
      if (addMode === 'manual') payload.deadline_type_id = null;
      await deadlineService.create(payload);
      setShowAdd(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر إنشاء المهلة');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = types.find((t) => t.id === addForm.deadline_type_id);
  const canSubmitAdd =
    addMode === 'template'
      ? !!addForm.deadline_type_id && !!addForm.start_date && !!(selectedType?.period_days || addForm.period_days)
      : !!addForm.title && !!addForm.due_date;

  const openCase = (id: number) => navigate(`/cases/${id}`);

  const renderRows = (list: LegalDeadline[], emptyText: string) =>
    list.length === 0 ? (
      <div className="ldx-empty">{emptyText}</div>
    ) : (
      list.map((d) => (
        <DeadlineRow
          key={d.id}
          deadline={d}
          busy={busyId === d.id}
          isManager={isManager}
          expanded={expandedId === d.id}
          onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
          onAction={handleAction}
          onOpenCase={openCase}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      ))
    );

  return (
    <div className="ssp2-page ldx" dir="rtl">
      {/* ─── الترويسة: عنوان + إضافة، ثم حقائق + شرائح التصنيف ─── */}
      <header className="ssp2-header">
        <div className="ssp2-header__top">
          <div className="ssp2-header__info">
            <span className="ssp2-header__badge">
              <AlarmClock size={13} /> المهل النظامية
            </span>
            <h1 className="ssp2-header__title">عدادات المهل والمدد الإجرائية</h1>
            <span className="ldx-disclaimer">الحساب استرشادي — العبرة بما يثبت في ناجز والمحكمة</span>
          </div>
          <div className="ssp2-header__actions">
            <button className="ssp2-btn ssp2-btn--primary" onClick={openAdd}>
              <Plus size={15} /> إضافة مهلة
            </button>
          </div>
        </div>

        <div className="ssp2-header__facts">
          <span className="ssp2-fact"><AlarmClock size={13} /><span className="ssp2-fact__label">مفتوحة</span><b>{stats.open}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><AlertTriangle size={13} /><span className="ssp2-fact__label">خلال ٣ أيام</span><b>{stats.dueSoon}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><Lightbulb size={13} /><span className="ssp2-fact__label">مقترحة</span><b>{stats.suggested}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><Ban size={13} /><span className="ssp2-fact__label">فائتة</span><b>{stats.missed}</b></span>
          <span className="ssp2-fact__sep" />
          <span className="ssp2-fact"><CheckCircle2 size={13} /><span className="ssp2-fact__label">منجزة</span><b>{stats.completed}</b></span>

          <div className="ldx-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بعنوان المهلة أو القضية..."
            />
          </div>

          <div className="ldx-seg ldx-catseg">
            {CATEGORY_TABS.map((c) => (
              <button
                key={c.key}
                className={`ldx-seg__btn ${category === c.key ? 'is-current' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── الأعمدة: فلاتر يمين (قابلة للطي) + قائمة كثيفة ─── */}
      <div className="ssp2-layout">
        {sideMin ? (
          <aside className="ssp2-chatcol ldx-side ssp2-chatcol--min">
            <button className="ssp2-chatcol__reopen" onClick={() => toggleSide(false)} title="فتح العروض">
              <ChevronsLeft size={15} />
              <span>العروض والفلاتر</span>
            </button>
          </aside>
        ) : (
          <aside className="ssp2-chatcol ldx-side">
            <div className="ssp2-card">
              <div className="ssp2-card__head">
                <span className="ssp2-card__title">
                  <LayoutGrid size={14} /> العروض
                </span>
                <button className="ssp2-icon-btn" onClick={() => toggleSide(true)} title="طي العمود">
                  <ChevronsRight size={14} />
                </button>
              </div>

              <nav className="ldx-views">
                {VIEWS.map((v) => (
                  <button
                    key={v.key}
                    className={`ldx-view-btn ${view === v.key ? 'is-active' : ''}`}
                    onClick={() => setView(v.key)}
                  >
                    {v.icon}
                    <span className="ldx-view-btn__label">{v.label}</span>
                    <span className="ldx-view-btn__count">{v.count}</span>
                  </button>
                ))}
              </nav>

              <label className="ldx-mine">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                المسندة إليّ فقط
              </label>
            </div>
          </aside>
        )}

        <main className="ssp2-work">
          {error && <div className="ldx-error">{error}</div>}

          <div className="ldx-list">
            {loading ? (
              <div className="ldx-loading">
                <Loader2 className="legal-deadlines__spinner" size={26} />
                جارٍ تحميل المهل...
              </div>
            ) : view === 'overview' ? (
              <>
                {groups.suggested.length > 0 && (
                  <section className="ldx-section">
                    <h3 className="ldx-section__head ldx-section__head--suggested">
                      <Lightbulb size={14} />
                      مهل محتملة — تحتاج مراجعتك ({groups.suggested.length})
                      <span className="ldx-section__hint">التقطها الرائد من أحكام ناجز وضبوط الجلسات — لا تنبيهات قبل تأكيدك</span>
                    </h3>
                    {renderRows(groups.suggested, '')}
                  </section>
                )}

                {groups.missed.length > 0 && (
                  <section className="ldx-section">
                    <h3 className="ldx-section__head ldx-section__head--missed">
                      <AlertTriangle size={14} />
                      مهل فائتة ({groups.missed.length})
                      <span className="ldx-section__hint">أنجزتَ الإجراء ونسيت التوثيق؟ زر «تم الإنجاز» ما زال متاحاً</span>
                    </h3>
                    {renderRows(groups.missed, '')}
                  </section>
                )}

                <section className="ldx-section">
                  <h3 className="ldx-section__head">
                    <AlarmClock size={14} />
                    مهل مفتوحة ({groups.open.length})
                  </h3>
                  {renderRows(groups.open, 'لا مهل مفتوحة حالياً — المهل تُنشأ تلقائياً من أحكام ناجز وضبوط الجلسات، أو أضفها يدوياً.')}
                </section>
              </>
            ) : (
              <section className="ldx-section">
                {view === 'suggested' && (
                  <p className="ldx-hint">التقطها الرائد من أحكام ناجز وضبوط الجلسات. لا تُرسل تنبيهات قبل تأكيدك.</p>
                )}
                {renderRows(
                  (groups as Record<string, LegalDeadline[]>)[view] ?? [],
                  view === 'open' ? 'لا مهل مفتوحة حالياً.'
                  : view === 'suggested' ? 'لا مقترحات بانتظار المراجعة.'
                  : view === 'missed' ? 'لا مهل فائتة — ممتاز 👏'
                  : view === 'completed' ? 'لا مهل منجزة بعد.'
                  : view === 'waived' ? 'لا مهل متنازل عنها.'
                  : 'لا مهل مفتوحة على الخصوم.'
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {/* ─── مودال التنازل / توثيق سبب الفوات (مبرر إلزامي) ─── */}
      {waiveTarget && (
        <div className="ssp2-overlay" onClick={() => setWaiveTarget(null)}>
          <div className="ssp2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              {waiveTarget.status === 'missed' ? 'توثيق سبب الفوات' : 'تنازل مدروس عن المهلة'}
              <button className="ssp2-icon-btn" onClick={() => setWaiveTarget(null)}><X size={14} /></button>
            </div>
            <div className="ssp2-modal__body">
              <p className="ssp2-hint">
                «{waiveTarget.title}» — يُسجَّل القرار باسمك وتاريخه. المبرر إلزامي حمايةً للمكتب وإخلاءً للمسؤولية.
              </p>
              <textarea
                className="ssp2-input"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="مثال: بعد دراسة الحكم تقرر عدم جدوى الاعتراض لقوة الأسباب، وبموافقة العميل هاتفياً بتاريخ..."
                rows={4}
                autoFocus
              />
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setWaiveTarget(null)}>إلغاء</button>
                <button
                  className="ssp2-btn ssp2-btn--primary"
                  disabled={!waiveReason.trim() || busyId === waiveTarget.id}
                  onClick={submitWaive}
                >
                  توثيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال الإنجاز بأثر رجعي (مهلة منقضية) ─── */}
      {retroTarget && (
        <div className="ssp2-overlay" onClick={() => setRetroTarget(null)}>
          <div className="ssp2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              توثيق إنجاز مهلة منقضية
              <button className="ssp2-icon-btn" onClick={() => setRetroTarget(null)}><X size={14} /></button>
            </div>
            <div className="ssp2-modal__body">
              <p className="ssp2-hint">
                «{retroTarget.title}» — انقضى موعدها يوم {formatDue(retroTarget.due_date)}.
                إن كان الإجراء أُنجز في وقته وفاتك التوثيق فقط، أدخل تاريخه الفعلي وسيوسم «أُنجزت في وقتها».
              </p>
              <label className="ssp2-label">متى أُنجز الإجراء فعلاً؟</label>
              <input
                type="date"
                className="ssp2-input"
                value={retroDate}
                max={todayISO()}
                onChange={(e) => setRetroDate(e.target.value)}
              />
              <label className="ssp2-label">مرجع التوثيق (إلزامي)</label>
              <textarea
                className="ssp2-input"
                value={retroNote}
                onChange={(e) => setRetroNote(e.target.value)}
                placeholder="مثال: قُدّم الاعتراض في ناجز برقم القيد 45678 بتاريخ..."
                rows={3}
                autoFocus
              />
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setRetroTarget(null)}>إلغاء</button>
                <button
                  className="ssp2-btn ssp2-btn--success"
                  disabled={!retroDate || !retroNote.trim() || busyId === retroTarget.id}
                  onClick={submitRetro}
                >
                  <CheckCircle2 size={14} /> توثيق الإنجاز
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال التعديل (المدير فقط) ─── */}
      {editTarget && (
        <div className="ssp2-overlay" onClick={() => setEditTarget(null)}>
          <div className="ssp2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              تعديل المهلة (مدير)
              <button className="ssp2-icon-btn" onClick={() => setEditTarget(null)}><X size={14} /></button>
            </div>
            <div className="ssp2-modal__body">
              <label className="ssp2-label">عنوان المهلة</label>
              <input
                className="ssp2-input"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <label className="ssp2-label">آخر يوم (الموعد النهائي)</label>
              <input
                type="date"
                className="ssp2-input"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              />
              <label className="ssp2-label">التصنيف</label>
              <select
                className="ssp2-input"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value as DeadlineCategory })}
              >
                <option value="objection">اعتراض على حكم</option>
                <option value="dabt">ضبط الجلسة</option>
                <option value="other">أخرى</option>
              </select>
              <label className="ssp2-label">نص الإجراء (زر «تم») — اختياري</label>
              <input
                className="ssp2-input"
                value={editForm.action_label}
                onChange={(e) => setEditForm({ ...editForm, action_label: e.target.value })}
                placeholder="مثال: تقديم الاعتراض على الحكم"
              />
              <label className="ssp2-label">وصف / ملاحظات</label>
              <textarea
                className="ssp2-input"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setEditTarget(null)}>إلغاء</button>
                <button
                  className="ssp2-btn ssp2-btn--primary"
                  disabled={!editForm.title.trim() || !editForm.due_date || busyId === editTarget.id}
                  onClick={submitEdit}
                >
                  حفظ التعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال تأكيد الحذف (المدير فقط) ─── */}
      {deleteTarget && (
        <div className="ssp2-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ssp2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              حذف المهلة
              <button className="ssp2-icon-btn" onClick={() => setDeleteTarget(null)}><X size={14} /></button>
            </div>
            <div className="ssp2-modal__body">
              <p className="ssp2-hint">
                ستُحذف «{deleteTarget.title}» من كل القوائم والتنبيهات. هذا الإجراء للمدير فقط ويُسجَّل باسمك.
              </p>
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setDeleteTarget(null)}>إلغاء</button>
                <button
                  className="ssp2-btn ldx-btn--danger"
                  disabled={busyId === deleteTarget.id}
                  onClick={submitDelete}
                >
                  <Trash2 size={14} /> حذف المهلة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال الإضافة ─── */}
      {showAdd && (
        <div className="ssp2-overlay" onClick={() => setShowAdd(false)}>
          <div className="ssp2-modal ldx-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="ssp2-modal__head">
              إضافة مهلة نظامية
              <button className="ssp2-icon-btn" onClick={() => setShowAdd(false)}><X size={14} /></button>
            </div>
            <div className="ssp2-modal__body">
              <div className="ldx-seg ldx-modeseg">
                <button
                  className={`ldx-seg__btn ${addMode === 'template' ? 'is-current' : ''}`}
                  onClick={() => setAddMode('template')}
                >
                  من قالب نظامي (يحسب تلقائياً)
                </button>
                <button
                  className={`ldx-seg__btn ${addMode === 'manual' ? 'is-current' : ''}`}
                  onClick={() => setAddMode('manual')}
                >
                  يدوي حر
                </button>
              </div>

              {addMode === 'template' ? (
                <>
                  <label className="ssp2-label">القالب النظامي</label>
                  <select
                    className="ssp2-input"
                    value={addForm.deadline_type_id ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, deadline_type_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">— اختر —</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.period_days ? ` — ${t.period_days} يوماً` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedType?.legal_reference && (
                    <div className="ldx-reference">
                      <ScrollText size={12} /> {selectedType.legal_reference}
                    </div>
                  )}
                  <label className="ssp2-label">تاريخ البداية (التسلّم / التبليغ)</label>
                  <input
                    type="date"
                    className="ssp2-input"
                    value={addForm.start_date ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                  />
                  {selectedType && !selectedType.period_days && (
                    <>
                      <label className="ssp2-label">عدد الأيام (يحددها قرار الدائرة)</label>
                      <input
                        type="number"
                        className="ssp2-input"
                        min={1}
                        max={730}
                        value={addForm.period_days ?? ''}
                        onChange={(e) => setAddForm({ ...addForm, period_days: e.target.value ? Number(e.target.value) : null })}
                      />
                    </>
                  )}
                  <p className="ssp2-hint">
                    يُحسب الموعد النهائي تلقائياً: المدة تبدأ من اليوم التالي، وإن صادف آخر يوم عطلة نهاية الأسبوع امتد لأول يوم عمل.
                  </p>
                </>
              ) : (
                <>
                  <label className="ssp2-label">عنوان المهلة</label>
                  <input
                    className="ssp2-input"
                    value={addForm.title ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                    placeholder="مثال: تقديم مذكرة طلبتها الدائرة"
                  />
                  <label className="ssp2-label">آخر يوم (الموعد النهائي)</label>
                  <input
                    type="date"
                    className="ssp2-input"
                    value={addForm.due_date ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                  />
                  <label className="ssp2-label">التصنيف</label>
                  <select
                    className="ssp2-input"
                    value={addForm.category ?? ''}
                    onChange={(e) => setAddForm({ ...addForm, category: (e.target.value || null) as DeadlineCategory | null })}
                  >
                    <option value="">تلقائي من العنوان</option>
                    <option value="objection">اعتراض على حكم</option>
                    <option value="dabt">ضبط الجلسة</option>
                    <option value="other">أخرى</option>
                  </select>
                </>
              )}

              <label className="ssp2-label">القضية (اختياري)</label>
              <select
                className="ssp2-input"
                value={addForm.case_id ?? ''}
                onChange={(e) => setAddForm({ ...addForm, case_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— بدون قضية —</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.file_number ? `${c.file_number} — ` : ''}{c.title}
                  </option>
                ))}
              </select>

              <label className="ssp2-label">وصف / ملاحظات (اختياري)</label>
              <input
                className="ssp2-input"
                value={addForm.description ?? ''}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />

              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setShowAdd(false)}>إلغاء</button>
                <button
                  className="ssp2-btn ssp2-btn--primary"
                  disabled={!canSubmitAdd || saving}
                  onClick={submitAdd}
                >
                  {saving ? <Loader2 size={14} className="legal-deadlines__spinner" /> : <Plus size={14} />}
                  إنشاء المهلة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalDeadlines;
