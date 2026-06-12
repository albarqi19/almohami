// صفحة «المهل النظامية» — عدادات تنازلية لمهل الاعتراض والمدد الإجرائية
// (ملاحظتا عميل #21 و#23)
//
// التخطيط: شريط جانبي يمين (إحصائيات + فلاتر العرض) + عمود رئيسي للبطاقات.
// العروض: نظرة عامة (مقترحة + فائتة + مفتوحة) أو شريحة واحدة من الشريط الجانبي.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  LayoutGrid,
  Loader2,
  Plus,
  Quote,
  ScrollText,
  Search,
  Lightbulb,
  Swords,
  X,
} from 'lucide-react';
import deadlineService, {
  type CreateDeadlinePayload,
  type DeadlineType,
  type LegalDeadline,
} from '../services/deadlineService';
import { CaseService } from '../services/caseService';
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

export const daysLabel = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 0) return `فاتت منذ ${Math.abs(days)} ${Math.abs(days) === 1 ? 'يوم' : 'أيام'}`;
  if (days === 0) return 'اليوم آخر يوم!';
  if (days === 1) return 'متبقي يوم واحد';
  if (days === 2) return 'متبقي يومان';
  if (days <= 10) return `متبقي ${days} أيام`;
  return `متبقي ${days} يوماً`;
};

const formatDue = (dueDate: string): string => {
  const d = new Date(dueDate);
  const greg = d.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
  const hijri = toHijri(dueDate);
  return hijri ? `${greg} (${hijri})` : greg;
};

type ViewKey = 'overview' | 'open' | 'suggested' | 'missed' | 'completed' | 'waived' | 'opponent';

// ═══════════════════════════════════════════════════════
//  بطاقة مهلة واحدة
// ═══════════════════════════════════════════════════════

interface DeadlineCardProps {
  deadline: LegalDeadline;
  busy: boolean;
  onAction: (d: LegalDeadline, action: string) => void;
  onOpenCase: (caseId: number) => void;
}

const DeadlineCard: React.FC<DeadlineCardProps> = ({ deadline: d, busy, onAction, onOpenCase }) => {
  const urgency = d.urgency ?? 'normal';
  const isSuggested = d.status === 'suggested';
  const isOpen = d.status === 'active' || d.status === 'in_progress';
  const isOpponent = d.obligated_party === 'opponent';

  return (
    <div className={`legal-deadlines__card legal-deadlines__card--${urgency} ${isSuggested ? 'legal-deadlines__card--suggested' : ''}`}>
      <div className="legal-deadlines__card-main">
        <div className="legal-deadlines__card-head">
          <span className={`legal-deadlines__dot legal-deadlines__dot--${isSuggested ? 'suggested' : urgency}`} />
          <span className={`legal-deadlines__countdown legal-deadlines__countdown--${urgency}`}>
            <AlarmClock size={14} />
            {daysLabel(d.days_remaining)}
          </span>
          <span className="legal-deadlines__source-badge">{SOURCE_LABELS[d.source] ?? d.source}</span>
          {isOpponent && <span className="legal-deadlines__opponent-badge">مهلة على الخصم</span>}
          {d.status === 'in_progress' && <span className="legal-deadlines__progress-badge">جارٍ العمل</span>}
        </div>

        <h4 className="legal-deadlines__card-title">{d.title}</h4>

        {d.description && <p className="legal-deadlines__card-desc">{d.description}</p>}

        <div className="legal-deadlines__card-meta">
          <span>📅 آخر يوم: {formatDue(d.due_date)}</span>
          {d.case && (
            <button className="legal-deadlines__case-link" onClick={() => onOpenCase(d.case!.id)}>
              📂 {d.case.file_number || d.case.title}
            </button>
          )}
          {d.assignee && <span>👤 {d.assignee.name}</span>}
        </div>

        {d.legal_reference && (
          <div className="legal-deadlines__reference">
            <ScrollText size={13} />
            {d.legal_reference}
            {d.due_date_source === 'computed' && <em> — حساب استرشادي، تحقق من تاريخ التسلّم</em>}
          </div>
        )}

        {isSuggested && d.source_quote && (
          <blockquote className="legal-deadlines__quote">
            <Quote size={13} />
            «{d.source_quote}»
          </blockquote>
        )}

        {d.status === 'waived' && d.waive_reason && (
          <div className="legal-deadlines__waive-reason">سبب التنازل: {d.waive_reason}</div>
        )}
      </div>

      <div className="legal-deadlines__card-actions">
        {isSuggested && (
          <>
            <button className="legal-deadlines__btn legal-deadlines__btn--confirm" disabled={busy} onClick={() => onAction(d, 'confirm')}>
              <Check size={15} /> تأكيد المهلة
            </button>
            <button className="legal-deadlines__btn legal-deadlines__btn--ghost" disabled={busy} onClick={() => onAction(d, 'reject')}>
              <X size={15} /> ليست مهلة
            </button>
          </>
        )}

        {isOpen && (
          <>
            <button className="legal-deadlines__btn legal-deadlines__btn--complete" disabled={busy} onClick={() => onAction(d, 'complete')}>
              <CheckCircle2 size={15} /> تم: {d.action_label || 'إنجاز الإجراء'}
            </button>
            {d.status === 'active' && (
              <button className="legal-deadlines__btn legal-deadlines__btn--ghost" disabled={busy} onClick={() => onAction(d, 'in_progress')}>
                بدء العمل
              </button>
            )}
            <button className="legal-deadlines__btn legal-deadlines__btn--waive" disabled={busy} onClick={() => onAction(d, 'waive')}>
              تنازل مدروس
            </button>
          </>
        )}

        {d.status === 'missed' && (
          <button className="legal-deadlines__btn legal-deadlines__btn--ghost" disabled={busy} onClick={() => onAction(d, 'waive')}>
            توثيق سبب الفوات
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//  الصفحة
// ═══════════════════════════════════════════════════════

const LegalDeadlines: React.FC = () => {
  const navigate = useNavigate();

  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewKey>('overview');
  const [error, setError] = useState<string | null>(null);

  // مودال التنازل (المبرر إلزامي — حماية للمكتب)
  const [waiveTarget, setWaiveTarget] = useState<LegalDeadline | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  // مودال الإضافة
  const [showAdd, setShowAdd] = useState(false);
  const [types, setTypes] = useState<DeadlineType[]>([]);
  const [cases, setCases] = useState<Array<{ id: number; title: string; file_number?: string | null }>>([]);
  const [addForm, setAddForm] = useState<CreateDeadlinePayload>({});
  const [addMode, setAddMode] = useState<'template' | 'manual'>('template');
  const [saving, setSaving] = useState(false);

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

  const groups = useMemo(() => {
    const open = deadlines
      .filter((d) => d.status === 'active' || d.status === 'in_progress')
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

    return {
      suggested: deadlines.filter((d) => d.status === 'suggested' && (d.days_remaining ?? -1) >= 0),
      missed: deadlines.filter((d) => d.status === 'missed'),
      open,
      completed: deadlines.filter((d) => d.status === 'completed'),
      waived: deadlines.filter((d) => d.status === 'waived'),
      opponent: open.filter((d) => d.obligated_party === 'opponent'),
    };
  }, [deadlines]);

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
    { key: 'overview', label: 'النظرة العامة', icon: <LayoutGrid size={15} />, count: stats.open },
    { key: 'open', label: 'المفتوحة', icon: <AlarmClock size={15} />, count: stats.open },
    { key: 'suggested', label: 'مقترحات الرائد', icon: <Lightbulb size={15} />, count: stats.suggested },
    { key: 'missed', label: 'الفائتة', icon: <AlertTriangle size={15} />, count: stats.missed },
    { key: 'completed', label: 'المنجزة', icon: <CheckCircle2 size={15} />, count: stats.completed },
    { key: 'waived', label: 'المتنازل عنها', icon: <Ban size={15} />, count: stats.waived },
    { key: 'opponent', label: 'مهل الخصوم', icon: <Swords size={15} />, count: stats.opponent },
  ];

  const handleAction = async (d: LegalDeadline, action: string) => {
    if (action === 'waive') {
      setWaiveTarget(d);
      setWaiveReason('');
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

  const renderCards = (list: LegalDeadline[], emptyText: string) =>
    list.length === 0 ? (
      <div className="legal-deadlines__empty">{emptyText}</div>
    ) : (
      list.map((d) => <DeadlineCard key={d.id} deadline={d} busy={busyId === d.id} onAction={handleAction} onOpenCase={openCase} />)
    );

  return (
    <div className="legal-deadlines">
      {/* ─── الترويسة ─── */}
      <div className="legal-deadlines__header">
        <div>
          <h1 className="legal-deadlines__title">
            <AlarmClock size={22} />
            المهل النظامية
          </h1>
          <p className="legal-deadlines__subtitle">
            عدادات تنازلية لمهل الاعتراض والمدد الإجرائية — الحساب استرشادي والعبرة بما يثبت في ناجز والمحكمة
          </p>
        </div>
        <button className="legal-deadlines__btn legal-deadlines__btn--primary" onClick={openAdd}>
          <Plus size={16} /> إضافة مهلة
        </button>
      </div>

      <div className="legal-deadlines__layout">
        {/* ─── الشريط الجانبي: إحصائيات + فلاتر ─── */}
        <aside className="legal-deadlines__sidebar">
          <div className="legal-deadlines__kpis">
            <div className="legal-deadlines__kpi legal-deadlines__kpi--navy">
              <span className="legal-deadlines__kpi-value">{stats.open}</span>
              <span className="legal-deadlines__kpi-label">مفتوحة</span>
            </div>
            <div className="legal-deadlines__kpi legal-deadlines__kpi--red">
              <span className="legal-deadlines__kpi-value">{stats.dueSoon}</span>
              <span className="legal-deadlines__kpi-label">خلال ٣ أيام</span>
            </div>
            <div className="legal-deadlines__kpi legal-deadlines__kpi--purple">
              <span className="legal-deadlines__kpi-value">{stats.suggested}</span>
              <span className="legal-deadlines__kpi-label">مقترحة</span>
            </div>
            <div className="legal-deadlines__kpi legal-deadlines__kpi--red">
              <span className="legal-deadlines__kpi-value">{stats.missed}</span>
              <span className="legal-deadlines__kpi-label">فائتة</span>
            </div>
            <div className="legal-deadlines__kpi legal-deadlines__kpi--green">
              <span className="legal-deadlines__kpi-value">{stats.completed}</span>
              <span className="legal-deadlines__kpi-label">منجزة</span>
            </div>
            <div className="legal-deadlines__kpi legal-deadlines__kpi--orange">
              <span className="legal-deadlines__kpi-value">{stats.waived}</span>
              <span className="legal-deadlines__kpi-label">متنازل عنها</span>
            </div>
          </div>

          <nav className="legal-deadlines__views">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                className={`legal-deadlines__view-btn ${view === v.key ? 'is-active' : ''}`}
                onClick={() => setView(v.key)}
              >
                {v.icon}
                <span className="legal-deadlines__view-label">{v.label}</span>
                <span className="legal-deadlines__view-count">{v.count}</span>
              </button>
            ))}
          </nav>

          <label className="legal-deadlines__mine-toggle">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            المسندة إليّ فقط
          </label>
        </aside>

        {/* ─── العمود الرئيسي ─── */}
        <main className="legal-deadlines__main">
          <div className="legal-deadlines__search">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بعنوان المهلة أو القضية..."
            />
          </div>

          {error && <div className="legal-deadlines__error">{error}</div>}

          {loading ? (
            <div className="legal-deadlines__loading">
              <Loader2 className="legal-deadlines__spinner" size={28} />
              جارٍ تحميل المهل...
            </div>
          ) : view === 'overview' ? (
            <>
              {groups.suggested.length > 0 && (
                <section className="legal-deadlines__section legal-deadlines__section--suggested">
                  <h3 className="legal-deadlines__section-title">
                    <Lightbulb size={16} />
                    مهل محتملة — تحتاج مراجعتك ({groups.suggested.length})
                  </h3>
                  <p className="legal-deadlines__section-hint">
                    التقطها الرائد من أحكام ناجز وضبوط الجلسات. لا تُرسل تنبيهات قبل تأكيدك.
                  </p>
                  {renderCards(groups.suggested, '')}
                </section>
              )}

              {groups.missed.length > 0 && (
                <section className="legal-deadlines__section legal-deadlines__section--missed">
                  <h3 className="legal-deadlines__section-title">
                    <AlertTriangle size={16} />
                    مهل فائتة ({groups.missed.length})
                  </h3>
                  {renderCards(groups.missed, '')}
                </section>
              )}

              <section className="legal-deadlines__section">
                <h3 className="legal-deadlines__section-title">
                  <AlarmClock size={16} />
                  مهل مفتوحة ({groups.open.length})
                </h3>
                {renderCards(groups.open, 'لا مهل مفتوحة حالياً — المهل تُنشأ تلقائياً من أحكام ناجز وضبوط الجلسات، أو أضفها يدوياً.')}
              </section>
            </>
          ) : (
            <section className="legal-deadlines__section">
              {view === 'suggested' && (
                <p className="legal-deadlines__section-hint">
                  التقطها الرائد من أحكام ناجز وضبوط الجلسات. لا تُرسل تنبيهات قبل تأكيدك.
                </p>
              )}
              {renderCards(
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
        </main>
      </div>

      {/* ─── مودال التنازل (مبرر إلزامي) ─── */}
      {waiveTarget && (
        <div className="legal-deadlines__modal-overlay" onClick={() => setWaiveTarget(null)}>
          <div className="legal-deadlines__modal" onClick={(e) => e.stopPropagation()}>
            <h3>تنازل مدروس عن المهلة</h3>
            <p className="legal-deadlines__modal-hint">
              «{waiveTarget.title}» — يُسجَّل القرار باسمك وتاريخه. المبرر إلزامي حمايةً للمكتب وإخلاءً للمسؤولية.
            </p>
            <textarea
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="مثال: بعد دراسة الحكم تقرر عدم جدوى الاعتراض لقوة الأسباب، وبموافقة العميل هاتفياً بتاريخ..."
              rows={4}
              autoFocus
            />
            <div className="legal-deadlines__modal-actions">
              <button
                className="legal-deadlines__btn legal-deadlines__btn--waive"
                disabled={!waiveReason.trim() || busyId === waiveTarget.id}
                onClick={submitWaive}
              >
                توثيق التنازل
              </button>
              <button className="legal-deadlines__btn legal-deadlines__btn--ghost" onClick={() => setWaiveTarget(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال الإضافة ─── */}
      {showAdd && (
        <div className="legal-deadlines__modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="legal-deadlines__modal legal-deadlines__modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3>إضافة مهلة نظامية</h3>

            <div className="legal-deadlines__mode-tabs">
              <button
                className={addMode === 'template' ? 'is-active' : ''}
                onClick={() => setAddMode('template')}
              >
                من قالب نظامي (يحسب تلقائياً)
              </button>
              <button className={addMode === 'manual' ? 'is-active' : ''} onClick={() => setAddMode('manual')}>
                يدوي حر
              </button>
            </div>

            <div className="legal-deadlines__form">
              {addMode === 'template' ? (
                <>
                  <label>
                    القالب النظامي
                    <select
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
                  </label>
                  {selectedType?.legal_reference && (
                    <div className="legal-deadlines__reference">
                      <ScrollText size={13} /> {selectedType.legal_reference}
                    </div>
                  )}
                  <label>
                    تاريخ البداية (التسلّم / التبليغ)
                    <input
                      type="date"
                      value={addForm.start_date ?? ''}
                      onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })}
                    />
                  </label>
                  {selectedType && !selectedType.period_days && (
                    <label>
                      عدد الأيام (يحددها قرار الدائرة)
                      <input
                        type="number"
                        min={1}
                        max={730}
                        value={addForm.period_days ?? ''}
                        onChange={(e) => setAddForm({ ...addForm, period_days: e.target.value ? Number(e.target.value) : null })}
                      />
                    </label>
                  )}
                  <p className="legal-deadlines__calc-note">
                    يُحسب الموعد النهائي تلقائياً: المدة تبدأ من اليوم التالي، وإن صادف آخر يوم عطلة نهاية الأسبوع امتد لأول يوم عمل.
                  </p>
                </>
              ) : (
                <>
                  <label>
                    عنوان المهلة
                    <input
                      type="text"
                      value={addForm.title ?? ''}
                      onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                      placeholder="مثال: تقديم مذكرة طلبتها الدائرة"
                    />
                  </label>
                  <label>
                    آخر يوم (الموعد النهائي)
                    <input
                      type="date"
                      value={addForm.due_date ?? ''}
                      onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                    />
                  </label>
                </>
              )}

              <label>
                القضية (اختياري)
                <select
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
              </label>

              <label>
                وصف / ملاحظات (اختياري)
                <input
                  type="text"
                  value={addForm.description ?? ''}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                />
              </label>
            </div>

            <div className="legal-deadlines__modal-actions">
              <button
                className="legal-deadlines__btn legal-deadlines__btn--primary"
                disabled={!canSubmitAdd || saving}
                onClick={submitAdd}
              >
                {saving ? <Loader2 size={15} className="legal-deadlines__spinner" /> : <Plus size={15} />}
                إنشاء المهلة
              </button>
              <button className="legal-deadlines__btn legal-deadlines__btn--ghost" onClick={() => setShowAdd(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalDeadlines;
