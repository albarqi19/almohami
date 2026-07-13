// صفحة «رفيق الجلسة» — مساعد التحضير والتدوين
// ثلاث مناطق متتالية: (أ) حقيبة الجلسة (ب) الجلسة الحية (ج) تقرير ما بعد الجلسة
// قاعدة صياغة صارمة: لا تُستخدم كلمات "تسجيل/تفريغ/التقاط" في أي نص واجهة.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronsLeft,
  Copy,
  Crosshair,
  FileText,
  Gavel,
  HelpCircle,
  Info,
  ListChecks,
  Lock,
  Puzzle,
  Radar,
  RefreshCw,
  ScrollText,
  Sparkles,
  Square,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSessionWorkspace } from '../hooks/useSessionPrep';
import {
  useCopilotAlerts,
  useCopilotBriefcase,
  useCopilotReport,
  useCopilotRun,
  useEndRun,
  useGenerateBriefcase,
  useUpdateAlert,
  useUpdateBriefcase,
} from '../hooks/useSessionCopilot';
import type {
  AlertSeverity,
  AlertType,
  BriefcaseClaim,
  ClaimConfidence,
  ClaimParty,
  CopilotAlertItem,
  CopilotReportData,
  ReportCommitment,
  SelfReviewBand,
  SelfReviewData,
  SelfReviewPoint,
} from '../services/sessionCopilotService';
import '../styles/session-copilot.css';

// ═══════════════════ مفردات العرض ═══════════════════

const PARTY_LABEL: Record<ClaimParty, string> = {
  opponent: 'الخصم',
  client: 'موكّلنا',
  unknown: 'غير محدد',
};

const CONFIDENCE_LABEL: Record<ClaimConfidence, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  contradiction: 'اشتباه تناقض',
  deadline: 'موعد / مهلة',
  court_order: 'أمر قضائي',
  question: 'فحص نقطة',
  watchlist_hit: 'تحقق هدف',
  info: 'معلومة',
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'حرج',
  warning: 'تنبيه',
  info: 'معلومة',
};

const DEFAULT_DISCLAIMER =
  'هذا التقرير أُعدّ بمساعدة الذكاء الاصطناعي من تدوين الجلسة، وهو مسودة داخلية لمساعدة المحامي فقط — '
  + 'لا يُعد ضبطاً رسمياً ولا يُحتج به أمام أي جهة. الرجوع إلى الضبط الرسمي واجب قبل أي تصرف نظامي.';

const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ar-SA-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const fmtTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('ar-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const alertTypeIcon = (type: AlertType): React.ReactNode => {
  switch (type) {
    case 'contradiction': return <AlertTriangle size={13} />;
    case 'deadline': return <CalendarClock size={13} />;
    case 'court_order': return <Gavel size={13} />;
    case 'question': return <HelpCircle size={13} />;
    case 'watchlist_hit': return <Target size={13} />;
    default: return <Info size={13} />;
  }
};

// ═══════════════════ الصفحة ═══════════════════

const SessionCopilot: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const id = Number(sessionId);
  const { user } = useAuth();
  const copilotEnabled = user?.tenant?.session_copilot_enabled === true;

  // بيانات الجلسة للرأس (نفس مصدر غرفة التحضير)
  const { data: workspace } = useSessionWorkspace(Number.isNaN(id) ? null : id);

  // (أ) الحقيبة
  const briefcaseQ = useCopilotBriefcase(id);
  const generateMut = useGenerateBriefcase(id);
  const updateMut = useUpdateBriefcase(id);

  // (ب) التشغيلة الحية
  const runQ = useCopilotRun(id);
  const run = runQ.data;
  const runLive = run?.status === 'live';
  const runExists = !!run && run.status !== 'none';
  const alertsState = useCopilotAlerts(run?.id, runExists, runLive);
  const updateAlertMut = useUpdateAlert(run?.id);
  const endRunMut = useEndRun(id, run?.id);

  // (ج) التقرير + الإحصاءات
  const reportQ = useCopilotReport(run?.id, runExists, runLive);

  // مسودة الادعاءات القابلة للتحرير (checkbox اعتماد لكل ادعاء)
  const briefcase = briefcaseQ.data;
  const [draftClaims, setDraftClaims] = useState<BriefcaseClaim[]>([]);
  const [claimsDirty, setClaimsDirty] = useState(false);

  useEffect(() => {
    if (briefcase?.status === 'ready') {
      setDraftClaims(briefcase.claims ?? []);
      setClaimsDirty(false);
    }
  }, [briefcase?.status, briefcase?.generated_at, briefcase?.approved_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const approvedCount = useMemo(() => draftClaims.filter((c) => c.approved).length, [draftClaims]);

  // الأحدث أولاً — قبل أي early return (قاعدة ترتيب الـ hooks)
  const feedAlerts = useMemo(
    () => [...alertsState.alerts].sort((a, b) => b.id - a.id),
    [alertsState.alerts]
  );

  if (!sessionId || Number.isNaN(id)) {
    return (
      <div className="scp-page scp-page--center">
        <AlertCircle size={32} />
        <h2>معرّف الجلسة غير صحيح</h2>
        <button type="button" className="scp-btn scp-btn--primary" onClick={() => navigate('/sessions')}>
          <ArrowRight size={14} />
          العودة لقائمة الجلسات
        </button>
      </div>
    );
  }

  if (!copilotEnabled) {
    return (
      <div className="scp-page scp-page--center">
        <Radar size={32} />
        <h2>رفيق الجلسة غير مفعّل</h2>
        <p className="scp-muted">هذه الميزة غير مفعّلة لمكتبكم بعد. تواصلوا معنا لتفعيلها.</p>
        <button type="button" className="scp-btn scp-btn--primary" onClick={() => navigate(-1)}>
          <ArrowRight size={14} />
          رجوع
        </button>
      </div>
    );
  }

  const toggleClaim = (claimId: number) => {
    setDraftClaims((prev) => prev.map((c) => (c.id === claimId ? { ...c, approved: !c.approved } : c)));
    setClaimsDirty(true);
  };

  const handleGenerate = () => {
    generateMut.mutate(undefined, {
      onSuccess: () => toast.info('بدأ إعداد الحقيبة... يستغرق نحو دقيقة'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر بدء إعداد الحقيبة'),
    });
  };

  const handleApprove = () => {
    updateMut.mutate(
      { claims: draftClaims, approve: true },
      {
        onSuccess: () => {
          setClaimsDirty(false);
          toast.success('اعتُمدت الحقيبة — صارت مرجع اللوحة الحية');
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر اعتماد الحقيبة'),
      }
    );
  };

  const handleAlertAction = (alert: CopilotAlertItem, status: 'accepted' | 'dismissed') => {
    updateAlertMut.mutate(
      { alertId: alert.id, status },
      {
        onSuccess: () => alertsState.patchAlert(alert.id, status),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر تحديث التنبيه'),
      }
    );
  };

  const handleEndRun = () => {
    if (!window.confirm('إنهاء الجلسة الحية؟ سيبدأ إعداد تقرير ما بعد الجلسة مباشرة.')) return;
    endRunMut.mutate(undefined, {
      onSuccess: () => toast.info('انتهت الجلسة — التقرير قيد الإعداد'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'تعذّر إنهاء الجلسة'),
    });
  };

  const handleCopyReport = () => {
    const report = reportQ.data?.report;
    if (!report) return;
    const text = buildReportText(report, workspace?.case?.title, workspace?.case?.file_number);
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('نُسخ التقرير'))
      .catch(() => toast.error('تعذّر النسخ'));
  };

  const briefcaseStatus = briefcase?.status ?? 'none';
  const briefcaseApproved = !!briefcase?.approved_at;
  const generating = briefcaseStatus === 'generating' || briefcaseStatus === 'pending';

  const liveWatchlist = alertsState.watchlist.length > 0
    ? alertsState.watchlist
    : run?.briefcase?.watchlist ?? [];

  const stats = reportQ.data?.stats;
  const reportStatus = reportQ.data?.report_status ?? run?.report_status ?? 'none';
  const report = reportQ.data?.report ?? null;
  // «مرآة الأداء» — يصل من الباك فقط لصاحب التشغيلة الذي فعّلها
  const selfReviewStatus = reportQ.data?.self_review_status;
  const selfReview = reportQ.data?.self_review ?? null;

  return (
    <div className="scp-page">
      {/* ═══ الرأس ═══ */}
      <header className="scp-header">
        <button
          type="button"
          className="scp-btn scp-btn--ghost"
          onClick={() => navigate(`/sessions/${id}/prep`)}
          aria-label="رجوع لغرفة التحضير"
        >
          <ArrowRight size={14} />
          <span>غرفة التحضير</span>
        </button>

        <div className="scp-header__titles">
          <h1 className="scp-header__title">
            <Radar size={16} className="scp-header__icon" />
            رفيق الجلسة
            <span className="scp-header__tagline">مساعد التحضير والتدوين</span>
          </h1>
          {workspace?.case && (
            <div className="scp-header__subtitle">
              قضية{' '}
              <Link to={`/cases/${workspace.case.id}`} className="scp-header__case-link">
                #{workspace.case.file_number || workspace.case.id}
              </Link>{' '}
              ─ {workspace.case.title}
              {workspace.session_type ? ` · ${workspace.session_type}` : ''}
              {(workspace.session_date_gregorian || workspace.session_date) ? ` · ${workspace.session_date_gregorian || workspace.session_date}` : ''}
            </div>
          )}
        </div>

        {runLive && (
          <span className="scp-live-chip">
            <span className="scp-live-dot" />
            جلسة حية الآن
          </span>
        )}
      </header>

      {/* ═══ (أ) حقيبة الجلسة ═══ */}
      <section className="scp-panel">
        <div className="scp-panel__header">
          <h2 className="scp-panel__title">
            <Briefcase size={14} />
            حقيبة الجلسة
          </h2>
          {briefcaseStatus === 'ready' && (
            <span className="scp-panel__count">{approvedCount} / {draftClaims.length} ادعاءً معتمداً</span>
          )}
          <div className="scp-panel__spacer" />
          {briefcaseStatus === 'ready' && (
            <button
              type="button"
              className="scp-btn scp-btn--ghost"
              onClick={handleGenerate}
              disabled={generateMut.isPending}
            >
              <RefreshCw size={13} />
              إعادة الإعداد
            </button>
          )}
        </div>

        {/* تحذير الحقيبة القديمة */}
        {briefcaseStatus === 'ready' && briefcase?.is_stale && (
          <div className="scp-banner scp-banner--warning">
            <AlertTriangle size={14} />
            <span>استجدت وقائع بالقضية بعد إعداد هذه الحقيبة — يُستحسن إعادة إعدادها قبل الجلسة.</span>
            <button type="button" className="scp-banner__action" onClick={handleGenerate} disabled={generateMut.isPending}>
              إعادة الإعداد الآن
            </button>
          </div>
        )}

        <div className="scp-panel__body">
          {briefcaseQ.isLoading && (
            <div className="scp-state">
              <div className="scp-spinner" />
              <p>جاري تحميل الحقيبة...</p>
            </div>
          )}

          {!briefcaseQ.isLoading && briefcaseStatus === 'none' && (
            <div className="scp-state">
              <Briefcase size={26} className="scp-state__icon" />
              <p className="scp-state__lead">
                الحقيبة تستخلص من ضبوط الجلسات السابقة: ادعاءات الخصم باقتباساتها المصدرية،
                أسئلة مقترحة للمرافعة، وأهداف مراقبة للجلسة الحية.
              </p>
              <button
                type="button"
                className="scp-btn scp-btn--primary"
                onClick={handleGenerate}
                disabled={generateMut.isPending}
              >
                <Briefcase size={14} />
                إعداد حقيبة الجلسة
              </button>
            </div>
          )}

          {!briefcaseQ.isLoading && generating && (
            <div className="scp-state">
              <div className="scp-spinner" />
              <p>جاري إعداد الحقيبة من ضبوط الجلسات السابقة... يستغرق نحو دقيقة</p>
            </div>
          )}

          {!briefcaseQ.isLoading && briefcaseStatus === 'failed' && (
            <div className="scp-state scp-state--error">
              <AlertCircle size={24} />
              <p>{briefcase?.error_message || 'تعذّر إعداد الحقيبة'}</p>
              <button type="button" className="scp-btn scp-btn--primary" onClick={handleGenerate} disabled={generateMut.isPending}>
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
            </div>
          )}

          {briefcaseStatus === 'ready' && (
            <>
              {/* جدول الادعاءات */}
              <h3 className="scp-subtitle">
                <ScrollText size={13} />
                ادعاءات مرصودة من الضبوط
              </h3>
              {draftClaims.length === 0 ? (
                <p className="scp-muted scp-muted--pad">لم تُرصد ادعاءات في ضبوط الجلسات السابقة.</p>
              ) : (
                <div className="scp-table-wrap">
                  <table className="scp-table">
                    <thead>
                      <tr>
                        <th className="scp-table__check-col">اعتماد</th>
                        <th>الطرف</th>
                        <th>الادعاء</th>
                        <th>الاقتباس والمصدر</th>
                        <th>الثقة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftClaims.map((claim) => (
                        <tr key={claim.id} className={claim.approved ? '' : 'scp-table__row--off'}>
                          <td className="scp-table__check-col">
                            <button
                              type="button"
                              className={`scp-check ${claim.approved ? 'scp-check--on' : ''}`}
                              onClick={() => toggleClaim(claim.id)}
                              aria-label={claim.approved ? 'إلغاء اعتماد الادعاء' : 'اعتماد الادعاء'}
                            >
                              {claim.approved && <Check size={11} strokeWidth={3} />}
                            </button>
                          </td>
                          <td>
                            <span className={`scp-party scp-party--${claim.party}`}>{PARTY_LABEL[claim.party] ?? claim.party}</span>
                          </td>
                          <td className="scp-table__claim">{claim.claim}</td>
                          <td className="scp-table__quote-cell">
                            <span className="scp-quote">«{claim.quote}»</span>
                            <span className="scp-source">
                              {claim.source_label}
                              {!claim.quote_verified && (
                                <span className="scp-unverified" title="لم يتحقق النظام من مطابقة هذا الاقتباس للضبط حرفياً">
                                  <AlertTriangle size={11} />
                                  اقتباس غير موثّق
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className="scp-confidence">
                              <span className={`scp-confidence__dot scp-confidence__dot--${claim.confidence}`} />
                              {CONFIDENCE_LABEL[claim.confidence] ?? claim.confidence}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* الأسئلة المقترحة */}
              <h3 className="scp-subtitle">
                <HelpCircle size={13} />
                أسئلة مقترحة للمرافعة
              </h3>
              {(briefcase?.questions?.length ?? 0) === 0 ? (
                <p className="scp-muted scp-muted--pad">لا أسئلة مقترحة.</p>
              ) : (
                <ol className="scp-qlist">
                  {briefcase?.questions?.map((q, i) => (
                    <li key={i} className="scp-qlist__item">
                      <div className="scp-qlist__question">{q.question}</div>
                      {q.rationale && <div className="scp-qlist__rationale">{q.rationale}</div>}
                      {q.source_label && <span className="scp-source">{q.source_label}</span>}
                    </li>
                  ))}
                </ol>
              )}

              {/* أهداف المراقبة */}
              <h3 className="scp-subtitle">
                <Crosshair size={13} />
                أهداف المراقبة أثناء الجلسة
              </h3>
              {(briefcase?.watchlist?.length ?? 0) === 0 ? (
                <p className="scp-muted scp-muted--pad">لا أهداف مراقبة.</p>
              ) : (
                <ul className="scp-watchlist">
                  {briefcase?.watchlist?.map((w) => (
                    <li key={w.id} className="scp-watchlist__item">
                      <Target size={12} className="scp-watchlist__icon" />
                      <span className="scp-watchlist__label">{w.label}</span>
                      {w.source_label && <span className="scp-source">{w.source_label}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* شريط الاعتماد اللاصق */}
        {briefcaseStatus === 'ready' && (
          <div className="scp-approve-bar">
            <span className="scp-approve-bar__hint">
              <ListChecks size={13} />
              اعتماد المحامي شرط تشغيل مراقبة الحقيبة في الجلسة الحية
            </span>
            {briefcaseApproved && !claimsDirty ? (
              <span className="scp-approve-bar__done">
                <CheckCircle2 size={14} />
                معتمدة — {fmtDateTime(briefcase?.approved_at)}
              </span>
            ) : (
              <button
                type="button"
                className="scp-btn scp-btn--gold"
                onClick={handleApprove}
                disabled={updateMut.isPending}
              >
                <CheckCircle2 size={14} />
                {updateMut.isPending ? 'جاري الاعتماد...' : briefcaseApproved ? 'حفظ وإعادة الاعتماد' : 'اعتماد الحقيبة'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══ (ب) الجلسة الحية ═══ */}
      <section className="scp-panel">
        <div className="scp-panel__header">
          <h2 className="scp-panel__title">
            <Radar size={14} />
            الجلسة الحية
          </h2>
          {runLive && run?.started_at && (
            <span className="scp-panel__count">بدأت {fmtTime(run.started_at)}</span>
          )}
          <div className="scp-panel__spacer" />
          {runLive && (
            <button
              type="button"
              className="scp-btn scp-btn--danger"
              onClick={handleEndRun}
              disabled={endRunMut.isPending}
            >
              <Square size={12} />
              {endRunMut.isPending ? 'جاري الإنهاء...' : 'إنهاء الجلسة'}
            </button>
          )}
        </div>

        <div className="scp-panel__body">
          {runQ.isLoading && (
            <div className="scp-state">
              <div className="scp-spinner" />
              <p>جاري فحص حالة الجلسة...</p>
            </div>
          )}

          {/* لا تشغيلة بعد — بطاقة الإرشاد */}
          {!runQ.isLoading && (!run || run.status === 'none') && (
            <div className="scp-guide">
              <div className="scp-guide__head">
                <Puzzle size={18} />
                <span>المرآة الحية تظهر هنا فور بدء المساعد من إضافة المتصفح</span>
              </div>
              <ol className="scp-guide__steps">
                <li>
                  <span className="scp-guide__num">1</span>
                  ثبّت إضافة «رفيق الجلسة» في متصفح كروم وادخل بحسابك فيها
                </li>
                <li>
                  <span className="scp-guide__num">2</span>
                  افتح جلسة التقاضي الإلكتروني عبر Teams من بوابة ناجز
                </li>
                <li>
                  <span className="scp-guide__num">3</span>
                  ابدأ المساعد من لوحة الإضافة — وستنعكس التنبيهات هنا لحظياً
                </li>
              </ol>
              <button
                type="button"
                className="scp-btn scp-btn--ghost"
                onClick={() => runQ.refetch()}
                disabled={runQ.isFetching}
              >
                <RefreshCw size={13} className={runQ.isFetching ? 'scp-spin' : undefined} />
                تحديث الحالة
              </button>
            </div>
          )}

          {/* تشغيلة فاشلة */}
          {run?.status === 'failed' && (
            <div className="scp-banner scp-banner--danger">
              <AlertCircle size={14} />
              <span>تعطّلت آخر تشغيلة لهذه الجلسة. يمكن بدء تشغيلة جديدة من الإضافة.</span>
            </div>
          )}

          {/* تشغيلة منتهية */}
          {run?.status === 'ended' && (
            <div className="scp-banner scp-banner--muted">
              <CheckCircle2 size={14} />
              <span>انتهت الجلسة الحية{run.started_at ? ` — بدأت ${fmtDateTime(run.started_at)}` : ''}. التقرير البعدي في القسم التالي.</span>
            </div>
          )}

          {/* المرآة الحية */}
          {runExists && run?.status !== 'failed' && (
            <div className="scp-live">
              {/* شريط الإحصاءات */}
              <div className="scp-stats">
                <span className="scp-stat">
                  <FileText size={12} />
                  <span className="scp-stat__label">مقاطع التدوين</span>
                  <span className="scp-stat__value">{stats?.segments_count ?? 0}</span>
                </span>
                <span className="scp-stat">
                  <AlertTriangle size={12} />
                  <span className="scp-stat__label">التنبيهات</span>
                  <span className="scp-stat__value">{Math.max(stats?.alerts_count ?? 0, alertsState.alerts.length)}</span>
                </span>
                <span className="scp-stat">
                  <Crosshair size={12} />
                  <span className="scp-stat__label">فحوص عميقة</span>
                  <span className="scp-stat__value">{stats?.deep_checks_count ?? 0}</span>
                </span>
                {run?.source && (
                  <span className="scp-stat">
                    <Radar size={12} />
                    <span className="scp-stat__label">المصدر</span>
                    <span className="scp-stat__value">
                      {run.source === 'captions' ? 'كابشن Teams' : run.source === 'audio' ? 'المسار الصوتي' : 'يدوي'}
                    </span>
                  </span>
                )}
              </div>

              <div className="scp-live__grid">
                {/* عمود التنبيهات */}
                <div className="scp-live__feed">
                  <h3 className="scp-subtitle">
                    <AlertTriangle size={13} />
                    التنبيهات — الأحدث أولاً
                  </h3>
                  {feedAlerts.length === 0 ? (
                    <p className="scp-muted scp-muted--pad">
                      {runLive ? 'لا تنبيهات بعد — المساعد يتابع مجريات الجلسة بصمت.' : 'لم تصدر تنبيهات في هذه الجلسة.'}
                    </p>
                  ) : (
                    <div className="scp-alerts">
                      {feedAlerts.map((alert) => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          busy={updateAlertMut.isPending}
                          onAccept={() => handleAlertAction(alert, 'accepted')}
                          onDismiss={() => handleAlertAction(alert, 'dismissed')}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* عمود أهداف المراقبة */}
                <div className="scp-live__side">
                  <h3 className="scp-subtitle">
                    <Crosshair size={13} />
                    أهداف المراقبة
                  </h3>
                  {liveWatchlist.length === 0 ? (
                    <p className="scp-muted scp-muted--pad">لا أهداف مراقبة معتمدة لهذه الجلسة.</p>
                  ) : (
                    <ul className="scp-watchlist">
                      {liveWatchlist.map((w) => (
                        <li key={w.id} className={`scp-watchlist__item ${w.done ? 'scp-watchlist__item--done' : ''}`}>
                          <span className={`scp-check scp-check--sm ${w.done ? 'scp-check--on' : ''}`}>
                            {w.done && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="scp-watchlist__label">{w.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ (ج) تقرير ما بعد الجلسة ═══ */}
      <section className="scp-panel">
        <div className="scp-panel__header">
          <h2 className="scp-panel__title">
            <FileText size={14} />
            تقرير ما بعد الجلسة
          </h2>
          <div className="scp-panel__spacer" />
          {reportStatus === 'ready' && report && (
            <button type="button" className="scp-btn scp-btn--ghost" onClick={handleCopyReport}>
              <Copy size={13} />
              نسخ التقرير
            </button>
          )}
        </div>

        {/* إخلاء المسؤولية — دائم الظهور أعلى القسم */}
        <div className="scp-disclaimer">
          <Info size={13} />
          <span>{report?.disclaimer || DEFAULT_DISCLAIMER}</span>
        </div>

        <div className="scp-panel__body">
          {(!runExists || reportStatus === 'none') && (
            <p className="scp-muted scp-muted--pad">
              يظهر التقرير هنا تلقائياً بعد إنهاء الجلسة الحية: خلاصة، أهم ما قيل باقتباساته،
              التزامات الأطراف، نقاط للمذكرة، ومواعيد وردت في الجلسة.
            </p>
          )}

          {reportStatus === 'generating' && (
            <div className="scp-state">
              <div className="scp-spinner" />
              <p>جاري إعداد التقرير من تدوين الجلسة...</p>
            </div>
          )}

          {reportStatus === 'failed' && (
            <div className="scp-state scp-state--error">
              <AlertCircle size={24} />
              <p>تعذّر إعداد التقرير لهذه الجلسة.</p>
            </div>
          )}

          {reportStatus === 'ready' && report && <ReportView report={report} />}
        </div>
      </section>

      {/* ═══ (د) «مرآة الأداء» — لا تصل من الباك إلا لصاحب التشغيلة الذي فعّلها ═══ */}
      {selfReviewStatus && (
        <section className="scp-panel scp-mirror">
          <div className="scp-panel__header">
            <h2 className="scp-panel__title">
              <Sparkles size={14} />
              مرآة الأداء
            </h2>
            <div className="scp-panel__spacer" />
            <span className="scp-mirror__private">
              <Lock size={11} />
              خاصة بك وحدك
            </span>
          </div>

          <div className="scp-panel__body">
            {selfReviewStatus === 'generating' && (
              <div className="scp-state">
                <div className="scp-spinner" />
                <p>الخبير يراجع مرافعتك...</p>
              </div>
            )}

            {selfReviewStatus === 'failed' && (
              <div className="scp-state scp-state--error">
                <AlertCircle size={24} />
                <p>تعذّر إعداد المرآة لهذه الجلسة — قد تكون مادة كلامك المدوّنة قليلة.</p>
              </div>
            )}

            {selfReviewStatus === 'ready' && selfReview && <SelfReviewView review={selfReview} />}
          </div>
        </section>
      )}
    </div>
  );
};

// ═══════════════════ بطاقة التنبيه ═══════════════════

const AlertCard: React.FC<{
  alert: CopilotAlertItem;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}> = ({ alert, busy, onAccept, onDismiss }) => {
  const dueDate = alert.type === 'deadline' ? (alert.payload_json?.due_date as string | undefined) : undefined;
  const evidenceQuote = alert.evidence_json?.quote;
  const evidenceSource = alert.evidence_json?.source_label || alert.evidence_json?.source;
  const resolved = alert.status !== 'pending';

  return (
    <article className={`scp-alert scp-alert--${alert.severity} ${resolved ? 'scp-alert--resolved' : ''}`}>
      <div className="scp-alert__head">
        <span className={`scp-alert__type scp-alert__type--${alert.severity}`}>
          {alertTypeIcon(alert.type)}
          {ALERT_TYPE_LABEL[alert.type] ?? alert.type}
        </span>
        <span className="scp-alert__severity">{SEVERITY_LABEL[alert.severity] ?? alert.severity}</span>
        {alert.deep_checked && (
          <span className="scp-alert__deep" title="خضع لفحص عميق ضد اقتباسات الحقيبة">فحص عميق</span>
        )}
        <span className="scp-alert__time">{fmtTime(alert.created_at)}</span>
      </div>

      <div className="scp-alert__title">{alert.title}</div>
      <div className="scp-alert__message">{alert.message}</div>

      {(alert.quote_now || evidenceQuote) && (
        <div className="scp-alert__quotes">
          {alert.quote_now && (
            <div className="scp-alert__quote-box">
              <span className="scp-alert__quote-label">قيل الآن</span>
              <span className="scp-quote">«{alert.quote_now}»</span>
            </div>
          )}
          {evidenceQuote && (
            <div className="scp-alert__quote-box scp-alert__quote-box--evidence">
              <span className="scp-alert__quote-label">الضبط المصدر{evidenceSource ? ` — ${evidenceSource}` : ''}</span>
              <span className="scp-quote">«{evidenceQuote}»</span>
            </div>
          )}
        </div>
      )}

      {alert.type === 'deadline' && (
        <div className="scp-alert__deadline">
          <CalendarClock size={12} />
          {dueDate ? <span>الموعد المرصود: <b>{dueDate}</b></span> : <span>موعد مرصود في مجريات الجلسة</span>}
          <Link to="/deadlines" className="scp-alert__deadline-link">
            الاعتماد من صفحة المهل
            <ChevronsLeft size={12} />
          </Link>
        </div>
      )}

      <div className="scp-alert__actions">
        {resolved ? (
          <span className={`scp-alert__state scp-alert__state--${alert.status}`}>
            {alert.status === 'accepted' ? <Check size={12} /> : <X size={12} />}
            {alert.status === 'accepted' ? 'معتمد' : 'متجاهَل'}
          </span>
        ) : (
          <>
            <button type="button" className="scp-btn scp-btn--ok" onClick={onAccept} disabled={busy}>
              <Check size={12} />
              اعتماد
            </button>
            <button type="button" className="scp-btn scp-btn--ghost" onClick={onDismiss} disabled={busy}>
              <X size={12} />
              تجاهل
            </button>
          </>
        )}
      </div>
    </article>
  );
};

// ═══════════════════ عرض التقرير ═══════════════════

const ReportView: React.FC<{ report: CopilotReportData }> = ({ report }) => {
  const commitmentsByParty = useMemo(() => {
    const groups = new Map<string, ReportCommitment[]>();
    (report.commitments ?? []).forEach((c) => {
      const key = c.party || 'غير محدد';
      const list = groups.get(key) ?? [];
      list.push(c);
      groups.set(key, list);
    });
    return groups;
  }, [report.commitments]);

  return (
    <div className="scp-report">
      {report.summary && (
        <>
          <h3 className="scp-subtitle"><ScrollText size={13} />الخلاصة</h3>
          <p className="scp-report__summary">{report.summary}</p>
        </>
      )}

      {(report.key_points?.length ?? 0) > 0 && (
        <>
          <h3 className="scp-subtitle"><ListChecks size={13} />أهم ما قيل</h3>
          <ul className="scp-report__list">
            {report.key_points?.map((kp, i) => (
              <li key={i} className="scp-report__item">
                <div className="scp-report__point">
                  {kp.point}
                  {kp.speaker && <span className="scp-report__speaker">{kp.speaker}</span>}
                </div>
                {kp.quote && <span className="scp-quote scp-quote--block">«{kp.quote}»</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {commitmentsByParty.size > 0 && (
        <>
          <h3 className="scp-subtitle"><Gavel size={13} />التزامات الأطراف</h3>
          <div className="scp-report__groups">
            {Array.from(commitmentsByParty.entries()).map(([party, items]) => (
              <div key={party} className="scp-report__group">
                <div className="scp-report__group-title">{party}</div>
                <ul className="scp-report__list">
                  {items.map((c, i) => (
                    <li key={i} className="scp-report__item">
                      <div className="scp-report__point">{c.commitment}</div>
                      {c.quote && <span className="scp-quote scp-quote--block">«{c.quote}»</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {(report.memo_points?.length ?? 0) > 0 && (
        <>
          <h3 className="scp-subtitle"><FileText size={13} />نقاط تحتاج رداً بالمذكرة</h3>
          <ul className="scp-report__list">
            {report.memo_points?.map((mp, i) => (
              <li key={i} className="scp-report__item">
                <div className="scp-report__point">{mp.point}</div>
                {mp.why && <div className="scp-report__why">{mp.why}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {(report.suggested_deadlines?.length ?? 0) > 0 && (
        <>
          <h3 className="scp-subtitle"><CalendarClock size={13} />مواعيد وردت في الجلسة</h3>
          <ul className="scp-report__list">
            {report.suggested_deadlines?.map((d, i) => (
              <li key={i} className="scp-report__item scp-report__item--deadline">
                <div className="scp-report__point">{d.requirement}</div>
                <div className="scp-report__deadline-meta">
                  {d.spoken_date && <span>الموعد كما ذُكر: <b>{d.spoken_date}</b></span>}
                  {d.obligated_party && <span>على: <b>{d.obligated_party}</b></span>}
                </div>
              </li>
            ))}
          </ul>
          <div className="scp-alert__deadline scp-report__deadline-note">
            <CalendarClock size={12} />
            <span>هذه المواعيد مقترحة وتحتاج اعتماد المحامي</span>
            <Link to="/deadlines" className="scp-alert__deadline-link">
              الاعتماد من صفحة المهل
              <ChevronsLeft size={12} />
            </Link>
          </div>
        </>
      )}

      {(report.limitations?.length ?? 0) > 0 && (
        <>
          <h3 className="scp-subtitle"><AlertTriangle size={13} />حدود التقرير</h3>
          <ul className="scp-report__limitations">
            {report.limitations?.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

// ═══════════════════ نسخ التقرير كنص عربي منسّق ═══════════════════

// ═══════════════════ «مرآة الأداء» ═══════════════════

const BAND_CLASS: Record<SelfReviewBand, string> = {
  'ممتاز': 'excellent',
  'قوي': 'strong',
  'جيد': 'good',
  'يحتاج تطوير': 'develop',
};

const MIRROR_METRICS: Array<{ key: string; label: string }> = [
  { key: 'slips_count', label: 'زلّات مرصودة' },
  { key: 'whispers_count', label: 'همسات ردّ' },
  { key: 'contradictions_count', label: 'تناقضات الخصم' },
  { key: 'deadlines_count', label: 'مواعيد التُقطت' },
];

const MirrorBand: React.FC<{ band: SelfReviewBand; small?: boolean }> = ({ band, small }) => (
  <span className={`scp-mirror__band scp-mirror__band--${BAND_CLASS[band] ?? 'good'}${small ? ' scp-mirror__band--sm' : ''}`}>
    {band}
  </span>
);

const MirrorPoints: React.FC<{
  title: string;
  items: SelfReviewPoint[];
  tone: 'strength' | 'improve';
}> = ({ title, items, tone }) => (
  <div className={`scp-mirror__block scp-mirror__block--${tone}`}>
    <div className="scp-mirror__block-title">
      {tone === 'strength' ? <CheckCircle2 size={13} /> : <Target size={13} />}
      {title}
    </div>
    <ul className="scp-mirror__list">
      {items.map((it, i) => (
        <li key={i} className="scp-mirror__item">
          <div className="scp-mirror__point">{it.point}</div>
          {it.quote && <blockquote className="scp-mirror__quote">«{it.quote}»</blockquote>}
          {tone === 'strength' && it.why && <p className="scp-mirror__note">{it.why}</p>}
          {tone === 'improve' && it.suggestion && (
            <p className="scp-mirror__suggestion">{it.suggestion}</p>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const SelfReviewView: React.FC<{ review: SelfReviewData }> = ({ review }) => {
  const objectivesTotal = Number(review.metrics?.objectives_total ?? 0);
  const objectivesCovered = Number(review.metrics?.objectives_covered ?? 0);

  return (
    <div className="scp-mirror__body">
      {/* التقدير العام + الخلاصة */}
      <div className="scp-mirror__head">
        <MirrorBand band={review.overall_band} />
        {review.summary && <p className="scp-mirror__summary">{review.summary}</p>}
      </div>

      {/* مقاييس حتمية — أرقام محسوبة لا رأي ذكاء */}
      <div className="scp-mirror__metrics">
        {objectivesTotal > 0 && (
          <span className="scp-mirror__metric">
            <b>{objectivesCovered} من {objectivesTotal}</b> أهداف غُطيت
          </span>
        )}
        {MIRROR_METRICS.map(({ key, label }) => {
          const value = Number(review.metrics?.[key] ?? 0);
          if (!value) return null;
          return (
            <span key={key} className="scp-mirror__metric">
              <b>{value}</b> {label}
            </span>
          );
        })}
      </div>

      {/* المحاور الأربعة */}
      {(review.axes?.length ?? 0) > 0 && (
        <div className="scp-mirror__axes">
          {review.axes!.map((ax, i) => (
            <div key={i} className="scp-mirror__axis">
              <div className="scp-mirror__axis-top">
                <span className="scp-mirror__axis-name">{ax.axis}</span>
                <MirrorBand band={ax.band} small />
              </div>
              {ax.note && <p className="scp-mirror__note">{ax.note}</p>}
              {ax.quote && <blockquote className="scp-mirror__quote">«{ax.quote}»</blockquote>}
            </div>
          ))}
        </div>
      )}

      {/* أقوى لحظة */}
      {review.best_moment?.quote && (
        <div className="scp-mirror__block scp-mirror__block--moment">
          <div className="scp-mirror__block-title">
            <Sparkles size={13} />
            أقوى لحظة في مرافعتك
          </div>
          <blockquote className="scp-mirror__quote scp-mirror__quote--gold">«{review.best_moment.quote}»</blockquote>
          {review.best_moment.why && <p className="scp-mirror__note">{review.best_moment.why}</p>}
        </div>
      )}

      {(review.strengths?.length ?? 0) > 0 && (
        <MirrorPoints title="مواطن قوتك" items={review.strengths!} tone="strength" />
      )}

      {(review.improvements?.length ?? 0) > 0 && (
        <MirrorPoints title="فرص تقويتك في المرات القادمة" items={review.improvements!} tone="improve" />
      )}

      {/* فرصة فاتت */}
      {review.missed_opportunity?.quote && (
        <div className="scp-mirror__block scp-mirror__block--missed">
          <div className="scp-mirror__block-title">
            <Crosshair size={13} />
            فرصة كانت سانحة
          </div>
          <blockquote className="scp-mirror__quote">«{review.missed_opportunity.quote}»</blockquote>
          {review.missed_opportunity.what && <p className="scp-mirror__note">{review.missed_opportunity.what}</p>}
        </div>
      )}

      {(review.limitations?.length ?? 0) > 0 && (
        <p className="scp-mirror__limitations">{review.limitations!.join(' · ')}</p>
      )}

      <div className="scp-disclaimer scp-mirror__disclaimer">
        <Lock size={13} />
        <span>{review.disclaimer || 'مرآة الأداء — تقييم تطويري خاص بك وحدك، لا يراه أحد غيرك في المكتب.'}</span>
      </div>
    </div>
  );
};

function buildReportText(report: CopilotReportData, caseTitle?: string | null, fileNumber?: string | null): string {
  const lines: string[] = [];
  lines.push('تقرير ما بعد الجلسة — رفيق الجلسة (مساعد التحضير والتدوين)');
  if (caseTitle) lines.push(`القضية: ${caseTitle}${fileNumber ? ` (#${fileNumber})` : ''}`);
  lines.push('');

  if (report.summary) {
    lines.push('الخلاصة:');
    lines.push(report.summary);
    lines.push('');
  }

  if (report.key_points?.length) {
    lines.push('أهم ما قيل:');
    report.key_points.forEach((kp, i) => {
      lines.push(`${i + 1}. ${kp.point}${kp.speaker ? ` (${kp.speaker})` : ''}`);
      if (kp.quote) lines.push(`   «${kp.quote}»`);
    });
    lines.push('');
  }

  if (report.commitments?.length) {
    lines.push('التزامات الأطراف:');
    const groups = new Map<string, ReportCommitment[]>();
    report.commitments.forEach((c) => {
      const key = c.party || 'غير محدد';
      const list = groups.get(key) ?? [];
      list.push(c);
      groups.set(key, list);
    });
    groups.forEach((items, party) => {
      lines.push(`■ ${party}:`);
      items.forEach((c) => {
        lines.push(`- ${c.commitment}${c.quote ? ` — «${c.quote}»` : ''}`);
      });
    });
    lines.push('');
  }

  if (report.memo_points?.length) {
    lines.push('نقاط تحتاج رداً بالمذكرة:');
    report.memo_points.forEach((mp) => {
      lines.push(`- ${mp.point}${mp.why ? ` — ${mp.why}` : ''}`);
    });
    lines.push('');
  }

  if (report.suggested_deadlines?.length) {
    lines.push('مواعيد وردت في الجلسة (تحتاج اعتماد المحامي):');
    report.suggested_deadlines.forEach((d) => {
      const parts = [d.requirement];
      if (d.spoken_date) parts.push(`الموعد: ${d.spoken_date}`);
      if (d.obligated_party) parts.push(`على: ${d.obligated_party}`);
      lines.push(`- ${parts.join(' — ')}`);
    });
    lines.push('');
  }

  if (report.limitations?.length) {
    lines.push('حدود التقرير:');
    report.limitations.forEach((l) => lines.push(`- ${l}`));
    lines.push('');
  }

  lines.push(report.disclaimer || DEFAULT_DISCLAIMER);

  return lines.join('\n');
}

export default SessionCopilot;
