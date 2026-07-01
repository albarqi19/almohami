import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Users,
  Video,
  ExternalLink,
  PenTool,
  CheckSquare,
  MessageSquare,
  Handshake,
  Scale,
  Hash,
  User as UserIcon,
  AlertCircle,
  ScrollText,
  BadgeCheck,
  Scroll,
} from 'lucide-react';
import LegalMemoWorkspace from '../components/LegalMemoWorkspace';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import CaseMessagesModal from '../components/CaseMessagesModal';
import ShareCaseModal from '../components/ShareCaseModal';
import { CaseService } from '../services/caseService';
import { ReconciliationService } from '../services/reconciliationService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import { toHijri } from '../utils/hijriDate';
import type { Case, ReconciliationData, ReconciliationParty, ReconciliationSession } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (case-detail-page.css + bankruptcy-detail.css)

const partyRoleLabel: Record<string, string> = {
  claimant: 'مقدّم الطلب',
  defendant: 'مقدَّم ضدّه',
  representative: 'ممثل',
  additional: 'طرف إضافي',
};

const partyTagVariant: Record<string, { cls: string; icon: string }> = {
  claimant: { cls: 'case-party-tag--plaintiff', icon: 'م' },
  defendant: { cls: 'case-party-tag--defendant', icon: 'ض' },
  representative: { cls: 'case-party-tag--lawyer', icon: 'و' },
  additional: { cls: 'case-party-tag--agent', icon: 'ط' },
};

// حالة الطلب → لون الشارة (نفس منطق ألوان ReconciliationSection: ناجح/معتمد أخضر، متعذر أحمر)
const statusBadgeClass = (statusWork?: string | null, statusLabel?: string | null): string => {
  const w = statusWork || '';
  const l = statusLabel || '';
  if (/Successful|AgreementApproved/i.test(w) || /(ناجح|معتمد)/.test(l)) return 'case-badge--active';
  if (/Unsuccessful|Cancelled|Failed/i.test(w) || /(متعذر|ملغ|فشل)/.test(l)) return 'case-badge--closed';
  return 'case-badge--pending';
};

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('ar-SA');
};

const fmtTime = (v?: string | null): string => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
};

const parseSessionDate = (dateStr?: string | null) => {
  if (!dateStr) return { day: '--', month: '--' };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { day: '--', month: '--' };
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return { day: date.getDate().toString(), month: months[date.getMonth()] };
};

const isSessionUpcoming = (s: ReconciliationSession): boolean => {
  if (/(منته|ملغ|مكتمل)/.test(s.status_label || '') || /Completed|Cancelled/i.test(s.status_work || '')) return false;
  if (!s.session_start_time) return false;
  const d = new Date(s.session_start_time);
  return !isNaN(d.getTime()) && d.getTime() >= Date.now();
};

export default function ReconciliationDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();

  const [anchorCase, setAnchorCase] = useState<Case | null>(null);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals — نفس منظومة صفحة القضية على صف المرساة
  const [showMemoWorkspace, setShowMemoWorkspace] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  useEffect(() => {
    if (!caseId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      ReconciliationService.getReconciliation(caseId),
      CaseService.getCase(caseId).catch(() => null),
    ])
      .then(([rec, c]) => {
        if (!active) return;
        setData(rec);
        setAnchorCase(c);
      })
      .catch((e) => { if (active) setError(e?.message || 'تعذّر جلب تفاصيل الصلح'); })
      .finally(() => { if (active) setLoading(false); });

    DocumentService.getCaseDocuments(caseId).then((docs: any[]) => active && setDocumentsCount(docs?.length || 0)).catch(() => {});
    TaskService.getTasks({ case_id: caseId } as any).then((t: any) => active && setTasksCount(t?.data?.length ?? t?.length ?? 0)).catch(() => {});

    return () => { active = false; };
  }, [caseId]);

  const nextSession = useMemo(() => {
    const upcoming = (data?.request?.sessions || []).filter(isSessionUpcoming);
    upcoming.sort((a, b) => new Date(a.session_start_time || 0).getTime() - new Date(b.session_start_time || 0).getTime());
    return upcoming[0] || null;
  }, [data]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner"></div>
          <p className="page-loading__text">جاري تحميل تفاصيل الصلح...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="case-detail-page">
        <div className="case-detail-header">
          <div className="case-detail-header__top">
            <Link to="/cases" className="back-btn">
              <ArrowRight size={16} />
              القضايا
            </Link>
          </div>
        </div>
        <div className="bk-state">
          <AlertCircle size={28} color="#dc2626" />
          <div className="bk-state__title">{error || 'طلب الصلح غير موجود'}</div>
        </div>
      </div>
    );
  }

  const { case: anchor, request } = data;
  const caseIdNum = Number(anchor.id);
  const title = anchorCase?.title || anchor.title || 'طلب صلح';
  const clientName = anchorCase?.client_name || request.requester_name || '';
  const parties = request.parties || [];
  const sessions = request.sessions || [];
  const agreements = request.agreements || [];

  return (
    <div className="case-detail-page">
      {/* Sticky Header — نفس هيدر صفحة القضية */}
      <div className="case-detail-header">
        <div className="case-detail-header__top">
          <Link to="/cases" className="back-btn">
            <ArrowRight size={16} />
            القضايا
          </Link>

          <div className="case-detail-header__title-section">
            <div className="case-detail-header__title">
              <Handshake size={18} color="#D97706" />
              {title}
            </div>
            <div className="case-detail-header__subtitle">
              رقم الطلب: {request.py_id} • {request.category_value || 'صلح'} — منصة تراضي
            </div>
          </div>

          <div className="case-detail-header__badges">
            <span className="case-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
              <span className="case-badge__dot" style={{ background: '#D97706' }} />
              صلح
            </span>
            {request.status_label && (
              <span className={`case-badge ${statusBadgeClass(request.status_work, request.status_label)}`}>
                <span className="case-badge__dot"></span>
                {request.status_label}
              </span>
            )}
            {request.request_type && (
              <span className="case-badge case-badge--pending">{request.request_type}</span>
            )}
          </div>

          {/* Quick Tabs */}
          <div className="case-header-tabs">
            <button className="case-header-tab" onClick={() => setShowMemoWorkspace(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--teal">
                <PenTool size={14} />
              </span>
              إنشاء مذكرة
            </button>
            <button className="case-header-tab" onClick={() => setShowDocumentsModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--blue">
                <FileText size={14} />
              </span>
              الوثائق
              <span className="case-header-tab__count">{documentsCount}</span>
            </button>
            <button className="case-header-tab" onClick={() => setShowTasksModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--orange">
                <CheckSquare size={14} />
              </span>
              المهام
              <span className="case-header-tab__count">{tasksCount}</span>
            </button>
            <button className="case-header-tab" onClick={() => setShowMessagesModal(true)}>
              <span className="case-header-tab__icon case-header-tab__icon--purple">
                <MessageSquare size={14} />
              </span>
              الرسائل
            </button>
          </div>

          <div className="case-detail-header__actions">
            <button
              onClick={() => setShowShareModal(true)}
              className="case-header-btn case-header-btn--share"
              title="مشاركة طلب الصلح"
            >
              <Users size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Layout بعمودين */}
      <div className="case-detail-layout">
        <div className="case-main-content">
          {/* موضوع الصلح */}
          {(request.summary || request.summary_by_mediator) && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <ScrollText size={16} />
                  موضوع الصلح
                </div>
              </div>
              <div className="case-card__content">
                {request.summary && (
                  <>
                    <div className="bk-field__label" style={{ marginBottom: 4 }}>ملخص الطلب</div>
                    <div className="bk-longtext">{request.summary}</div>
                  </>
                )}
                {request.summary_by_mediator && (
                  <>
                    <div className="bk-field__label" style={{ margin: '10px 0 4px' }}>ملخص المصلح</div>
                    <div className="bk-longtext">{request.summary_by_mediator}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* أطراف الصلح — بلا هوية/جوال (خصوصية) */}
          {parties.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Users size={16} />
                  أطراف الصلح ({parties.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="case-parties-inline">
                  {parties.map((p: ReconciliationParty) => {
                    const v = partyTagVariant[p.party_role] || partyTagVariant.additional;
                    const name = p.company_name || p.full_name || '—';
                    const wakalat = (p.wakala_details || []).map((w: any) => w?.WakalNumber).filter(Boolean);
                    return (
                      <div key={p.id} className={`case-party-tag ${v.cls}`}>
                        <span className="case-party-tag__icon">{v.icon}</span>
                        <span className="case-party-tag__name">{name}</span>
                        <span className="case-party-tag__role">
                          {p.representative_type === 'Lawyer' ? 'محامٍ' : (partyRoleLabel[p.party_role] || p.party_role)}
                          {p.party_type === 'Establishment' && ' · منشأة'}
                          {wakalat.length > 0 && ` · وكالة: ${wakalat.join('، ')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* جلسات الصلح */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Calendar size={16} />
                جلسات الصلح ({sessions.length})
              </div>
            </div>
            <div className="case-card__content">
              {sessions.length === 0 ? (
                <div className="bk-empty">لا توجد جلسات</div>
              ) : (
                <div className="case-sessions-list">
                  {sessions.map((s) => {
                    const upcoming = isSessionUpcoming(s);
                    const { day, month } = parseSessionDate(s.session_start_time);
                    const timeRange = [fmtTime(s.session_start_time), fmtTime(s.session_end_time)].filter(Boolean).join(' — ');
                    return (
                      <div key={s.id} className={`case-session-item ${upcoming ? 'case-session-item--upcoming' : ''}`}>
                        <div className="case-session-item__date-box">
                          <span className="case-session-item__day">{day}</span>
                          <span className="case-session-item__month">{month}</span>
                        </div>
                        <div className="case-session-item__content">
                          <div className="case-session-item__header">
                            <span className="case-session-item__title">جلسة صلح{s.py_id ? ` · ${s.py_id}` : ''}</span>
                            <span className={`case-session-item__status ${upcoming ? 'case-session-item__status--upcoming' : 'case-session-item__status--completed'}`}>
                              {upcoming ? 'قادمة' : (s.status_label || 'منتهية')}
                            </span>
                          </div>
                          <div className="case-session-item__meta">
                            {toHijri(s.session_start_time || '') && (
                              <span title="التاريخ الهجري (أم القرى)">
                                <Calendar size={12} />
                                {toHijri(s.session_start_time || '')}
                              </span>
                            )}
                            {timeRange && (
                              <span>
                                <Clock size={12} />
                                {timeRange}
                              </span>
                            )}
                            <span className="case-session-item__method case-session-item__method--remote">
                              <Video size={12} />
                              عن بعد (Teams)
                            </span>
                          </div>
                          {s.meeting_link && upcoming && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <a
                                href={s.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="case-session-item__join-btn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Video size={14} />
                                الدخول للجلسة
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* وثائق الصلح — تحل محل الأحكام */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <BadgeCheck size={16} />
                وثيقة الصلح ({agreements.length})
              </div>
            </div>
            <div className="case-card__content">
              {agreements.length === 0 ? (
                <div className="bk-empty">لم تصدر وثيقة صلح بعد</div>
              ) : (
                <div className="case-judgements-list">
                  {agreements.map((a) => {
                    const approved = /AgreementApproved/i.test(a.status_work || '') || /معتمد/.test(a.status_label || '');
                    return (
                      <div key={a.id} className="case-judgement-item">
                        <div className="case-judgement-item__header">
                          <span className="case-judgement-item__title">
                            وثيقة صلح
                            {a.py_id && <span className="case-judgement-item__code"> — رقم {a.py_id}</span>}
                          </span>
                          <span className={`case-judgement-item__type ${approved ? 'case-judgement-item__type--final' : 'case-judgement-item__type--pending'}`}>
                            {a.status_label || a.status_work || 'غير محدد'}
                          </span>
                        </div>
                        <div className="case-judgement-item__meta">
                          {a.resolved_timestamp && <span><Calendar size={12} /> اعتُمدت: {fmtDate(a.resolved_timestamp)}</span>}
                          {a.requester_name && <span><UserIcon size={12} /> {a.requester_name}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* الشريط الجانبي */}
        <div className="case-sidebar">
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Hash size={16} />
                نظرة سريعة
              </div>
            </div>
            <div className="case-card__content case-card__content--compact">
              <div className="case-info-row">
                <div className="case-info-row__icon"><AlertCircle size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">حالة الطلب</div>
                  <div className="case-info-row__value">{request.status_label || anchor.status_arabic || '—'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Scale size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">التصنيف</div>
                  <div className="case-info-row__value">{request.category_value || '—'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><FileText size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">نوع المطالبة</div>
                  <div className="case-info-row__value">{request.request_type || '—'}</div>
                </div>
              </div>
              {(request.monetary_value || request.monetary_type) && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Hash size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">قيمة المطالبة</div>
                    <div className="case-info-row__value">
                      {request.monetary_value ? Number(request.monetary_value).toLocaleString('ar-SA') : ''}
                      {request.monetary_type ? ` (${request.monetary_type})` : ''}
                    </div>
                  </div>
                </div>
              )}
              {request.mediator_name && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Handshake size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">المصلح</div>
                    <div className="case-info-row__value">{request.mediator_name}</div>
                  </div>
                </div>
              )}
              <div className="case-info-row">
                <div className="case-info-row__icon"><Calendar size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">تاريخ تقديم الطلب</div>
                  <div className="case-info-row__value">{request.claim_hijri_date || '—'}</div>
                </div>
              </div>
              {nextSession && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Clock size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">أقرب جلسة</div>
                    <div className="case-info-row__value">
                      {fmtDate(nextSession.session_start_time)}{fmtTime(nextSession.session_start_time) ? ` · ${fmtTime(nextSession.session_start_time)}` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* العميل */}
          {clientName && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <UserIcon size={16} />
                  العميل
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                <div className="case-info-row">
                  <div className="case-info-row__icon"><UserIcon size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">الاسم</div>
                    <div className="case-info-row__value">{clientName}</div>
                  </div>
                </div>
                {anchorCase?.client_phone && (
                  <div className="case-info-row">
                    <div className="case-info-row__icon"><MessageSquare size={14} /></div>
                    <div className="case-info-row__content">
                      <div className="case-info-row__label">الجوال</div>
                      <div className="case-info-row__value">{anchorCase.client_phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* المحامون */}
          {(anchor.lawyers?.length || 0) > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Scale size={16} />
                  المحامون ({anchor.lawyers!.length})
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                {anchor.lawyers!.map((l) => (
                  <div className="case-info-row" key={l.id}>
                    <div className="case-info-row__icon"><Scale size={14} /></div>
                    <div className="case-info-row__content">
                      <div className="case-info-row__value">{l.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* رقم الملف */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Scroll size={16} />
                المرجع
              </div>
            </div>
            <div className="case-card__content case-card__content--compact">
              <div className="case-info-row">
                <div className="case-info-row__icon"><Hash size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">رقم الملف بالنظام</div>
                  <div className="case-info-row__value">{anchor.file_number}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Hash size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">رقم الطلب في تراضي</div>
                  <div className="case-info-row__value">{request.py_id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modals (على صف المرساة) ===== */}
      {showMemoWorkspace && (
        <LegalMemoWorkspace
          isOpen={showMemoWorkspace}
          onClose={() => setShowMemoWorkspace(false)}
          caseId={caseIdNum as any}
          caseTitle={title}
          onMemoCreated={() => setShowMemoWorkspace(false)}
        />
      )}

      {showDocumentsModal && (
        <CaseDocumentsModal
          isOpen={showDocumentsModal}
          onClose={() => setShowDocumentsModal(false)}
          caseId={String(anchor.id) as any}
          caseTitle={title}
          clientName={clientName}
          caseNumber={anchor.file_number}
          caseType={'other' as any}
          parties={[] as any}
        />
      )}

      {showTasksModal && (
        <CaseTasksModal
          isOpen={showTasksModal}
          onClose={() => setShowTasksModal(false)}
          caseId={String(anchor.id) as any}
          caseTitle={title}
        />
      )}

      {showMessagesModal && (
        <CaseMessagesModal
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          caseId={caseIdNum}
          caseTitle={title}
          clientName={clientName}
        />
      )}

      {showShareModal && (
        <ShareCaseModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          caseId={String(anchor.id) as any}
          caseTitle={title}
        />
      )}
    </div>
  );
}
