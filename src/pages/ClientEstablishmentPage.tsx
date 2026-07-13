import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  ClientEstablishmentService,
  DATE_CATEGORY_LABELS,
  remainingLabel,
  formatFileSize,
  type EstablishmentOverview,
  type ExpiryStatus,
  type PortalSettings,
  type UpcomingAlert,
} from '../services/establishmentService';

/**
 * «منشأتي» — بوابة المنشأة لعميل المكتب (دور client).
 * النمط الملتصق: ترويسة (بطاقة المنشأة + مؤشرات) ثم ثلاثة أقسام ملتصقة:
 *   ١) مركز التنبيهات + المواعيد + تخصيص التنبيهات (في نفس الصفحة)
 *   ٢) مستندات المنشأة (تحميل مباشر PDF)
 *   ٣) موظفو المنشأة (هوية/إقامة + تأمين طبي)
 * متجاوبة كلياً: على الجوال تتكدس الأقسام وتتحول الجداول بطاقات.
 */

const ALERT_DAY_OPTIONS = [90, 60, 30, 14, 7, 3, 1];

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB');
};

const STATUS_META: Record<ExpiryStatus, { label: string; cls: string }> = {
  valid: { label: 'ساري', cls: 'est-chip--valid' },
  soon: { label: 'يقترب', cls: 'est-chip--soon' },
  critical: { label: 'حرِج', cls: 'est-chip--critical' },
  expired: { label: 'منتهٍ', cls: 'est-chip--expired' },
  none: { label: 'بلا تاريخ', cls: 'est-chip--none' },
};

const StatusChip = ({ status }: { status: ExpiryStatus }) => (
  <span className={`est-chip ${STATUS_META[status].cls}`}>{STATUS_META[status].label}</span>
);

const alertIcon = (kind: UpcomingAlert['kind']) => {
  switch (kind) {
    case 'document':
      return <FileText size={15} />;
    case 'employee_id':
      return <CreditCard size={15} />;
    case 'employee_insurance':
      return <ShieldCheck size={15} />;
    default:
      return <CalendarClock size={15} />;
  }
};

export default function ClientEstablishmentPage() {
  const queryClient = useQueryClient();
  const [docSearch, setDocSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<EstablishmentOverview>({
    queryKey: ['client-establishment'],
    queryFn: ClientEstablishmentService.getOverview,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const savePrefs = useMutation({
    mutationFn: (prefs: Partial<PortalSettings>) => ClientEstablishmentService.updateAlertPreferences(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-establishment'] }),
  });

  const settings = data?.settings;

  const patchPrefs = (patch: Partial<PortalSettings>) => {
    if (!settings) return;
    savePrefs.mutate({
      alerts_enabled: settings.alerts_enabled,
      alert_days: settings.alert_days,
      notify_documents: settings.notify_documents,
      notify_employees: settings.notify_employees,
      ...patch,
    });
  };

  const toggleAlertDay = (day: number) => {
    if (!settings) return;
    const days = settings.alert_days.includes(day)
      ? settings.alert_days.filter((d) => d !== day)
      : [...settings.alert_days, day].slice(0, 6);
    if (days.length === 0) return; // يوم واحد على الأقل
    patchPrefs({ alert_days: days.sort((a, b) => b - a) });
  };

  const handleDownload = async (documentId: number) => {
    setDownloadingId(documentId);
    setDownloadError(null);
    try {
      const url = await ClientEstablishmentService.getDownloadUrl(documentId);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      setDownloadError(e?.message || 'تعذّر تحميل الملف — حاولوا لاحقاً');
    } finally {
      setDownloadingId(null);
    }
  };

  const documents = useMemo(() => {
    const list = data?.documents ?? [];
    const q = docSearch.trim();
    if (!q) return list;
    return list.filter(
      (d) => d.title.includes(q) || (d.document_number ?? '').includes(q) || d.file_name.includes(q)
    );
  }, [data?.documents, docSearch]);

  const employees = useMemo(() => {
    const list = data?.employees ?? [];
    const q = empSearch.trim();
    if (!q) return list;
    return list.filter(
      (e) => e.name.includes(q) || (e.national_id ?? '').includes(q) || (e.job_title ?? '').includes(q)
    );
  }, [data?.employees, empSearch]);

  if (isLoading) {
    return (
      <div className="est-page">
        <div className="est-state">
          <div className="est-state__box">
            <Loader2 size={30} className="animate-spin" />
            <b>جارٍ تحميل بوابة منشأتكم…</b>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="est-page">
        <div className="est-state">
          <div className="est-state__box">
            <Building2 size={36} />
            <b>تعذّر فتح بوابة المنشأة</b>
            <span>{(error as Error)?.message || 'حدث خطأ غير متوقع'}</span>
            <button className="est-btn" onClick={() => refetch()}>
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { establishment, stats, upcoming_alerts: alerts, dates } = data;
  const docsValid = Math.max(0, stats.documents_total - stats.documents_expiring - stats.documents_expired);

  return (
    <div className="est-page" dir="rtl">
      {/* ═══════════ الترويسة: بطاقة المنشأة + المؤشرات ═══════════ */}
      <header className="est-header">
        <div className="est-header__top">
          <div className="est-brand">
            <div className="est-brand__mark">
              <Landmark size={22} />
            </div>
            <div>
              <div className="est-brand__name">{establishment.name}</div>
              <div className="est-brand__sub">
                بوابة المنشأة
                {establishment.relationship_manager && (
                  <>
                    · يديركم: <b>{establishment.relationship_manager}</b>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="est-header__actions">
            <button className="est-btn est-btn--sm" onClick={() => refetch()} disabled={isFetching} title="تحديث">
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : undefined} /> تحديث
            </button>
            <button
              className={`est-btn est-btn--sm${settingsOpen ? ' est-btn--primary' : ''}`}
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <Settings2 size={13} /> تخصيص التنبيهات
            </button>
          </div>
        </div>

        <div className="est-facts">
          {establishment.commercial_registration && (
            <div className="est-fact">
              السجل التجاري <b className="est-num">{establishment.commercial_registration}</b>
            </div>
          )}
          {establishment.vat_number && (
            <div className="est-fact">
              الرقم الضريبي <b className="est-num">{establishment.vat_number}</b>
            </div>
          )}
          {establishment.industry && (
            <div className="est-fact">
              النشاط <b>{establishment.industry}</b>
            </div>
          )}
          {establishment.legal_representative && (
            <div className="est-fact">
              الممثل النظامي <b>{establishment.legal_representative}</b>
            </div>
          )}
          {establishment.national_address && (
            <div className="est-fact">
              العنوان الوطني <b>{establishment.national_address}</b>
            </div>
          )}
        </div>

        <div className="est-kpis">
          <div className="est-kpi est-kpi--ok">
            <b>{docsValid}</b>
            <span>مستندات سارية</span>
          </div>
          <div className="est-kpi est-kpi--warn">
            <b>{stats.documents_expiring}</b>
            <span>تنتهي خلال ٣٠ يوماً</span>
          </div>
          <div className="est-kpi est-kpi--bad">
            <b>{stats.documents_expired}</b>
            <span>مستندات منتهية</span>
          </div>
          <div className="est-kpi">
            <b>{stats.employees_total}</b>
            <span>موظفو المنشأة</span>
          </div>
          <div className="est-kpi est-kpi--gold">
            <b>
              {stats.employees_insured}/{stats.employees_total}
            </b>
            <span>مؤمَّنون طبياً</span>
          </div>
          <div className="est-kpi est-kpi--warn">
            <b>{stats.dates_upcoming + stats.dates_overdue}</b>
            <span>مواعيد تحتاج انتباهاً</span>
          </div>
        </div>
      </header>

      {/* ═══════════ الأقسام الثلاثة الملتصقة ═══════════ */}
      <div className="est-layout">
        {/* ── القسم ١: مركز التنبيهات ── */}
        <aside className="est-alerts">
          <div className="est-sec__head">
            <div className="est-sec__title">
              <Bell size={14} /> مركز التنبيهات
            </div>
            <span className="est-sec__meta">{alerts.length ? `${alerts.length} تنبيهاً قادماً` : 'لا شيء عاجل'}</span>
          </div>

          <div className="est-alerts__scroll">
            {alerts.length === 0 ? (
              <div className="est-empty">
                <CheckCircle2 size={26} />
                <b>كل شيء تحت السيطرة</b>
                <span>لا وثائق ولا مواعيد تنتهي خلال ٦٠ يوماً</span>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={`${a.kind}-${a.ref_id}-${a.date}`} className={`est-alert est-alert--${a.severity}`}>
                  <div className="est-alert__ico">{alertIcon(a.kind)}</div>
                  <div className="est-alert__body">
                    <div className="est-alert__title">{a.title}</div>
                    <div className="est-alert__sub">
                      {a.subtitle} · <span className="est-date">{fmtDate(a.date)}</span>
                    </div>
                  </div>
                  <div className="est-alert__due">{remainingLabel(a.days_remaining)}</div>
                </div>
              ))
            )}

            {/* المواعيد والاشتراكات */}
            <div className="est-sec__head">
              <div className="est-sec__title">
                <CalendarClock size={14} /> مواعيد واشتراكات
              </div>
              <span className="est-sec__meta">{dates.length || 'لا يوجد'}</span>
            </div>
            <div className="est-dates">
              {dates.length === 0 ? (
                <div className="est-empty">
                  <CalendarClock size={24} />
                  <span>لا مواعيد مسجّلة لمنشأتكم</span>
                </div>
              ) : (
                dates.map((d) => (
                  <div key={d.id} className={`est-alert est-alert--${d.status === 'expired' ? 'expired' : d.status === 'critical' ? 'danger' : d.status === 'soon' ? 'warn' : 'info'}`}>
                    <div className="est-alert__ico">
                      <CalendarClock size={15} />
                    </div>
                    <div className="est-alert__body">
                      <div className="est-alert__title">{d.title}</div>
                      <div className="est-alert__sub">
                        {DATE_CATEGORY_LABELS[d.category] ?? d.category}
                        {d.reference_number ? ` · رقم ${d.reference_number}` : ''} ·{' '}
                        <span className="est-date">{fmtDate(d.due_date)}</span>
                      </div>
                    </div>
                    <div className="est-alert__due">{remainingLabel(d.days_remaining)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── تخصيص التنبيهات (في نفس الصفحة) ── */}
          <div className="est-settings">
            <div
              className="est-sec__head"
              role="button"
              style={{ cursor: 'pointer' }}
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <div className="est-sec__title">
                {settings?.alerts_enabled ? <Bell size={14} /> : <BellOff size={14} />} تخصيص التنبيهات
              </div>
              <span className="est-sec__tools">
                {savePrefs.isPending && <Loader2 size={13} className="animate-spin" />}
                {settingsOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </span>
            </div>
            {settingsOpen && settings && (
              <div className="est-settings__body">
                <div className="est-settings__row">
                  <div>
                    <div className="est-settings__label">تفعيل التنبيهات</div>
                    <div className="est-settings__hint">تصلكم على جرس الإشعارات داخل النظام</div>
                  </div>
                  <button
                    className={`est-switch${settings.alerts_enabled ? ' est-switch--on' : ''}`}
                    onClick={() => patchPrefs({ alerts_enabled: !settings.alerts_enabled })}
                    disabled={savePrefs.isPending}
                    aria-label="تفعيل التنبيهات"
                  />
                </div>

                <div>
                  <div className="est-settings__label">التنبيه قبل الانتهاء بـ</div>
                  <div className="est-settings__hint" style={{ marginBottom: 6 }}>
                    اختاروا الأيام المناسبة (٦ كحد أقصى)
                  </div>
                  <div className="est-daychips">
                    {ALERT_DAY_OPTIONS.map((day) => (
                      <button
                        key={day}
                        className={`est-daychip${settings.alert_days.includes(day) ? ' est-daychip--on' : ''}`}
                        onClick={() => toggleAlertDay(day)}
                        disabled={savePrefs.isPending || !settings.alerts_enabled}
                      >
                        {day === 1 ? 'يوم' : day === 3 ? '٣ أيام' : day === 7 ? 'أسبوع' : day === 14 ? 'أسبوعان' : `${day} يوماً`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="est-settings__row">
                  <div className="est-settings__label">تنبيهات المستندات</div>
                  <button
                    className={`est-switch${settings.notify_documents ? ' est-switch--on' : ''}`}
                    onClick={() => patchPrefs({ notify_documents: !settings.notify_documents })}
                    disabled={savePrefs.isPending || !settings.alerts_enabled}
                    aria-label="تنبيهات المستندات"
                  />
                </div>
                <div className="est-settings__row">
                  <div className="est-settings__label">تنبيهات الموظفين (هوية/تأمين)</div>
                  <button
                    className={`est-switch${settings.notify_employees ? ' est-switch--on' : ''}`}
                    onClick={() => patchPrefs({ notify_employees: !settings.notify_employees })}
                    disabled={savePrefs.isPending || !settings.alerts_enabled}
                    aria-label="تنبيهات الموظفين"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── القسمان ٢ و٣ ── */}
        <main className="est-main">
          {/* المستندات */}
          <section className="est-sec est-sec--docs">
            <div className="est-sec__head">
              <div className="est-sec__title">
                <FileText size={14} /> مستندات المنشأة
              </div>
              <div className="est-sec__tools">
                <span className="est-sec__meta">{documents.length} مستنداً</span>
                <div className="est-search">
                  <Search size={13} />
                  <input
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="بحث بالاسم أو الرقم…"
                  />
                </div>
              </div>
            </div>

            {downloadError && (
              <div className="est-sec__head" style={{ background: 'var(--status-red-light, #FEE2E2)' }}>
                <div className="est-sec__title" style={{ color: 'var(--status-red)' }}>
                  <AlertTriangle size={14} /> {downloadError}
                </div>
              </div>
            )}

            <div className="est-sec__body">
              {documents.length === 0 ? (
                <div className="est-empty">
                  <FileText size={28} />
                  <b>{docSearch ? 'لا نتائج مطابقة' : 'لا مستندات بعد'}</b>
                  <span>{docSearch ? 'جرّبوا كلمة أخرى' : 'سيضيف المكتب مستندات منشأتكم هنا'}</span>
                </div>
              ) : (
                <>
                  {/* جدول الشاشات الكبيرة */}
                  <div className="est-tbl-wrap">
                    <table className="est-table">
                      <thead>
                        <tr>
                          <th>المستند</th>
                          <th>الرقم</th>
                          <th>الإصدار</th>
                          <th>الانتهاء</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                          <th style={{ width: 90 }}>الملف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc.id} className={doc.expiry_status === 'expired' ? 'est-row--expired' : undefined}>
                            <td>
                              <div className="est-cell-main">
                                <div className="est-cell-main__ico">
                                  <FileText size={15} />
                                </div>
                                <div className="est-cell-main__txt">
                                  <div className="est-cell-main__title">{doc.title}</div>
                                  <div className="est-cell-main__sub">{formatFileSize(doc.file_size)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="est-num">{doc.document_number || '—'}</td>
                            <td className="est-date est-muted">{fmtDate(doc.issue_date)}</td>
                            <td className="est-date">{fmtDate(doc.expiry_date)}</td>
                            <td>{remainingLabel(doc.days_remaining)}</td>
                            <td>
                              <StatusChip status={doc.expiry_status} />
                            </td>
                            <td>
                              <button
                                className="est-btn est-btn--sm"
                                onClick={() => handleDownload(doc.id)}
                                disabled={downloadingId === doc.id}
                              >
                                {downloadingId === doc.id ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                                تحميل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* بطاقات الجوال */}
                  <div className="est-cards">
                    {documents.map((doc) => (
                      <div key={doc.id} className="est-card-m">
                        <div className="est-card-m__top">
                          <div className="est-cell-main">
                            <div className="est-cell-main__ico">
                              <FileText size={15} />
                            </div>
                            <div className="est-cell-main__txt">
                              <div className="est-cell-main__title">{doc.title}</div>
                              <div className="est-cell-main__sub est-num">{doc.document_number || '—'}</div>
                            </div>
                          </div>
                          <StatusChip status={doc.expiry_status} />
                        </div>
                        <div className="est-card-m__grid">
                          <div className="est-card-m__f">
                            <b>الانتهاء</b>
                            <span className="est-date">{fmtDate(doc.expiry_date)}</span>
                          </div>
                          <div className="est-card-m__f">
                            <b>المتبقي</b>
                            <span>{remainingLabel(doc.days_remaining)}</span>
                          </div>
                        </div>
                        <div className="est-card-m__actions">
                          <button
                            className="est-btn est-btn--sm"
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            تحميل الملف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* الموظفون */}
          <section className="est-sec est-sec--emps">
            <div className="est-sec__head">
              <div className="est-sec__title">
                <Users size={14} /> موظفو المنشأة
              </div>
              <div className="est-sec__tools">
                <span className="est-sec__meta">
                  مؤمَّن طبياً {stats.employees_insured} من {stats.employees_total}
                </span>
                <div className="est-search">
                  <Search size={13} />
                  <input
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="بحث بالاسم أو الهوية…"
                  />
                </div>
              </div>
            </div>

            <div className="est-sec__body">
              {employees.length === 0 ? (
                <div className="est-empty">
                  <Users size={28} />
                  <b>{empSearch ? 'لا نتائج مطابقة' : 'لا موظفون بعد'}</b>
                  <span>{empSearch ? 'جرّبوا كلمة أخرى' : 'سيضيف المكتب موظفي منشأتكم هنا'}</span>
                </div>
              ) : (
                <>
                  <div className="est-tbl-wrap">
                    <table className="est-table">
                      <thead>
                        <tr>
                          <th>الموظف</th>
                          <th>الهوية/الإقامة</th>
                          <th>انتهاء الهوية</th>
                          <th>الحالة</th>
                          <th>التأمين الطبي</th>
                          <th>انتهاء التأمين</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr
                            key={emp.id}
                            className={
                              emp.id_status === 'expired' || emp.insurance_status === 'expired'
                                ? 'est-row--expired'
                                : undefined
                            }
                          >
                            <td>
                              <div className="est-cell-main">
                                <div className="est-cell-main__ico">
                                  <Users size={15} />
                                </div>
                                <div className="est-cell-main__txt">
                                  <div className="est-cell-main__title">{emp.name}</div>
                                  <div className="est-cell-main__sub">
                                    {[emp.job_title, emp.nationality].filter(Boolean).join(' · ') || '—'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="est-num">{emp.national_id || '—'}</td>
                            <td className="est-date">{fmtDate(emp.id_expiry_date)}</td>
                            <td>
                              <StatusChip status={emp.id_status} />
                            </td>
                            <td>
                              <span className={`est-chip ${emp.has_medical_insurance ? 'est-chip--yes' : 'est-chip--no'}`}>
                                {emp.has_medical_insurance ? 'نعم' : 'لا'}
                              </span>
                            </td>
                            <td className="est-date">
                              {emp.has_medical_insurance ? fmtDate(emp.insurance_expiry_date) : '—'}
                            </td>
                            <td>
                              {emp.has_medical_insurance ? <StatusChip status={emp.insurance_status} /> : <span className="est-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="est-cards">
                    {employees.map((emp) => (
                      <div key={emp.id} className="est-card-m">
                        <div className="est-card-m__top">
                          <div className="est-cell-main">
                            <div className="est-cell-main__ico">
                              <Users size={15} />
                            </div>
                            <div className="est-cell-main__txt">
                              <div className="est-cell-main__title">{emp.name}</div>
                              <div className="est-cell-main__sub">
                                {[emp.job_title, emp.nationality].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>
                          </div>
                          <StatusChip status={emp.id_status} />
                        </div>
                        <div className="est-card-m__grid">
                          <div className="est-card-m__f">
                            <b>الهوية/الإقامة</b>
                            <span className="est-num">{emp.national_id || '—'}</span>
                          </div>
                          <div className="est-card-m__f">
                            <b>انتهاء الهوية</b>
                            <span className="est-date">{fmtDate(emp.id_expiry_date)}</span>
                          </div>
                          <div className="est-card-m__f">
                            <b>التأمين الطبي</b>
                            <span>{emp.has_medical_insurance ? 'نعم' : 'لا'}</span>
                          </div>
                          <div className="est-card-m__f">
                            <b>انتهاء التأمين</b>
                            <span className="est-date">
                              {emp.has_medical_insurance ? fmtDate(emp.insurance_expiry_date) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
