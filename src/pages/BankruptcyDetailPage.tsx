import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Building,
  Users,
  Video,
  ExternalLink,
  ChevronLeft,
  PenTool,
  CheckSquare,
  MessageSquare,
  Landmark,
  Scale,
  Hash,
  User as UserIcon,
  AlertCircle,
  GitBranch,
  Gavel,
  X as XIcon,
} from 'lucide-react';
import LegalMemoWorkspace from '../components/LegalMemoWorkspace';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import CaseMessagesModal from '../components/CaseMessagesModal';
import ShareCaseModal from '../components/ShareCaseModal';
import { CaseService } from '../services/caseService';
import { BankruptcyService } from '../services/bankruptcyService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import { toHijri } from '../utils/hijriDate';
import type { Case, BankruptcyDetail, BankruptcySession, BankruptcyJudgement, BankruptcyParty, BankruptcySubRequest } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (case-detail-page.css + bankruptcy-detail.css)

const partyRoleLabel: Record<string, string> = {
  applicant: 'مقدّم الطلب',
  debtor: 'المدين',
  creditor: 'الدائن',
  trustee: 'أمين الإفلاس',
};

// أدوار الأطراف → أنماط case-party-tag الموجودة (فلات، بلا كلاسات جديدة)
const partyTagVariant: Record<string, { cls: string; icon: string }> = {
  applicant: { cls: 'case-party-tag--agent', icon: 'ق' },
  debtor: { cls: 'case-party-tag--defendant', icon: 'د' },
  creditor: { cls: 'case-party-tag--plaintiff', icon: 'ن' },
  trustee: { cls: 'case-party-tag--lawyer', icon: 'أ' },
};

const statusBadgeClass = (statusName?: string | null): string => {
  const s = statusName || '';
  if (/(مرفوض|منتهي|كأن لم تكن|ملغ)/.test(s)) return 'case-badge--closed';
  if (/(مسودة|جديد|قيد التدقيق|غير مكتمل|معاد)/.test(s)) return 'case-badge--pending';
  return 'case-badge--active'; // مفتتح / قيد النظر / محال...
};

const parseSessionDate = (dateStr?: string | null) => {
  if (!dateStr) return { day: '--', month: '--' };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { day: '--', month: '--' };
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return { day: date.getDate().toString(), month: months[date.getMonth()] };
};

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('ar-SA');
};

const isSessionUpcoming = (s: BankruptcySession): boolean => {
  const raw = (s.session_status || '').trim();
  if (/(منته|مكتمل|ملغ)/.test(raw)) return false;
  if (!s.session_date) return false;
  const d = new Date(s.session_date);
  return !isNaN(d.getTime()) && d.getTime() >= Date.now();
};

/** بطاقة جلسة إفلاس بنفس markup جلسات القضية (case-session-item). */
function BankruptcySessionItem({
  session,
  onShowDabt,
  compact,
}: {
  session: BankruptcySession;
  onShowDabt: (s: BankruptcySession) => void;
  compact?: boolean;
}) {
  const upcoming = isSessionUpcoming(session);
  const { day, month } = parseSessionDate(session.session_date);
  return (
    <div className={`case-session-item ${upcoming ? 'case-session-item--upcoming' : ''}`}>
      <div className="case-session-item__date-box">
        <span className="case-session-item__day">{day}</span>
        <span className="case-session-item__month">{month}</span>
      </div>
      <div className="case-session-item__content">
        <div className="case-session-item__header">
          {session.session_number != null && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--quiet-gray-100, #f1f5f9)', color: 'var(--color-text-secondary, #64748b)', fontWeight: 600 }}>
              الجلسة {session.session_number}
            </span>
          )}
          <span className="case-session-item__title">{session.session_type || 'جلسة'}</span>
          <span className={`case-session-item__status ${upcoming ? 'case-session-item__status--upcoming' : 'case-session-item__status--completed'}`}>
            {upcoming ? 'قادمة' : (session.session_status || 'منتهية')}
          </span>
        </div>
        <div className="case-session-item__meta">
          {toHijri(session.session_date || '') && (
            <span title="التاريخ الهجري (أم القرى)">
              <Calendar size={12} />
              {toHijri(session.session_date || '')}
            </span>
          )}
          {session.session_time && (
            <span>
              <Clock size={12} />
              {session.session_time}
            </span>
          )}
          {!compact && session.court_name && (
            <span>
              <Building size={12} />
              {session.court_name}
            </span>
          )}
          {session.is_video_conference && (
            <span className="case-session-item__method case-session-item__method--remote">
              <Video size={12} />
              عن بعد
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          {session.video_conference_url && upcoming && (
            <a
              href={session.video_conference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="case-session-item__join-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <Video size={14} />
              الدخول للجلسة
              <ExternalLink size={12} />
            </a>
          )}
          {!upcoming && session.session_text && (
            <button className="case-session-item__join-btn" onClick={(e) => { e.stopPropagation(); onShowDabt(session); }}>
              <FileText size={14} />
              ضبط الجلسة
            </button>
          )}
          {session.session_judgement && (
            <button
              className="case-session-item__join-btn"
              style={{ background: 'rgba(180, 140, 60, 0.12)', color: '#8a6620' }}
              onClick={(e) => { e.stopPropagation(); onShowDabt({ ...session, session_text: session.session_judgement }); }}
              title="عرض منطوق الجلسة"
            >
              <FileText size={14} />
              منطوق الحكم
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** بطاقة حكم إفلاس بنفس markup أحكام القضية (case-judgement-item). */
function BankruptcyJudgementItem({
  judgement,
  onShow,
}: {
  judgement: BankruptcyJudgement;
  onShow: (j: BankruptcyJudgement) => void;
}) {
  const isFinal = judgement.judgement_type === 'نهائي';
  return (
    <div className="case-judgement-item">
      <div className="case-judgement-item__header">
        <span className="case-judgement-item__title">
          حكم إفلاس
          {judgement.code && <span className="case-judgement-item__code"> — صك رقم {judgement.code}</span>}
        </span>
        <span className={`case-judgement-item__type ${isFinal ? 'case-judgement-item__type--final' : 'case-judgement-item__type--pending'}`}>
          {judgement.judgement_type || judgement.judgement_status || 'غير محدد'}
        </span>
      </div>
      <div className="case-judgement-item__meta">
        {judgement.court_name && <span><Building size={12} /> {judgement.court_name}</span>}
        {judgement.delivery_date && <span><Calendar size={12} /> {fmtDate(judgement.delivery_date)}</span>}
        {judgement.available_for_objection && (
          <span className="case-judgement-item__objection">
            <Clock size={12} /> متاح للاعتراض{judgement.objection_due_date ? ` حتى ${judgement.objection_due_date}` : ''}
          </span>
        )}
      </div>
      {(judgement.text || judgement.reasons || judgement.subject) && (
        <button
          className="case-session-item__join-btn"
          style={{ background: 'rgba(180, 140, 60, 0.12)', color: '#8a6620', marginTop: '6px' }}
          onClick={() => onShow(judgement)}
          title="عرض تفاصيل الحكم الكاملة"
        >
          <FileText size={14} />
          عرض الحكم كاملاً
        </button>
      )}
    </div>
  );
}

/** عقدة طلب فرعي (accordion) — جلساته وأحكامه بنفس بطاقات القضية. */
function SubRequestNode({
  sub,
  childrenMap,
  expanded,
  toggle,
  depth,
  onShowDabt,
  onShowJudgement,
}: {
  sub: BankruptcySubRequest;
  childrenMap: Map<number, BankruptcySubRequest[]>;
  expanded: Set<number>;
  toggle: (id: number) => void;
  depth: number;
  onShowDabt: (s: BankruptcySession) => void;
  onShowJudgement: (j: BankruptcyJudgement) => void;
}) {
  const isOpen = expanded.has(sub.id);
  const kids = childrenMap.get(sub.id) || [];
  const sessionsCount = sub.sessions?.length || 0;
  const judgementsCount = sub.judgements?.length || 0;

  return (
    <div className={`bk-sub${depth > 0 ? ' bk-sub--child' : ''}`}>
      <div className="bk-sub__head" onClick={() => toggle(sub.id)}>
        <ChevronLeft size={16} className={`bk-sub__chev${isOpen ? ' bk-sub__chev--open' : ''}`} />
        <span className="bk-sub__title">{sub.request_type_name || 'طلب فرعي'}</span>
        {sub.status_name && <span className="bk-pill bk-pill--muted">{sub.status_name}</span>}
        {sub.applicant_user && (
          <span className="bk-pill bk-pill--navy" title="محامي الطلب (مطابقة تلقائية)">
            <Scale size={11} style={{ verticalAlign: '-2px' }} /> {sub.applicant_user.name}
          </span>
        )}
        {sessionsCount > 0 && <span className="bk-tab__count">{sessionsCount} جلسة</span>}
        {judgementsCount > 0 && <span className="bk-tab__count">{judgementsCount} حكم</span>}
        {sub.sub_request_code && <span className="bk-sub__code">{sub.sub_request_code}</span>}
      </div>
      {isOpen && (
        <div className="bk-sub__body">
          <div className="bk-grid">
            <div className="bk-field"><span className="bk-field__label">الحالة</span><span className="bk-field__value">{sub.status_name || '—'}</span></div>
            <div className="bk-field"><span className="bk-field__label">المحكمة</span><span className="bk-field__value">{sub.court_name || '—'}</span></div>
            <div className="bk-field"><span className="bk-field__label">الدائرة</span><span className="bk-field__value">{sub.sub_circle_name || '—'}</span></div>
            <div className="bk-field"><span className="bk-field__label">الدرجة</span><span className="bk-field__value">{sub.degree_name || '—'}</span></div>
            <div className="bk-field"><span className="bk-field__label">مقدّم الطلب</span><span className="bk-field__value">{sub.applicant_name || '—'}</span></div>
            <div className="bk-field"><span className="bk-field__label">تاريخ الطلب</span><span className="bk-field__value">{fmtDate(sub.request_date)}</span></div>
          </div>
          {sub.request_data && <div className="bk-longtext">{sub.request_data}</div>}

          {sessionsCount > 0 && (
            <>
              <div className="bk-sub__section-title"><Calendar size={13} /> جلسات الطلب ({sessionsCount})</div>
              <div className="case-sessions-list">
                {sub.sessions!.map((s) => (
                  <BankruptcySessionItem key={s.id} session={s} onShowDabt={onShowDabt} compact />
                ))}
              </div>
            </>
          )}

          {judgementsCount > 0 && (
            <>
              <div className="bk-sub__section-title"><Gavel size={13} /> أحكام الطلب ({judgementsCount})</div>
              <div className="case-judgements-list">
                {sub.judgements!.map((j) => (
                  <BankruptcyJudgementItem key={j.id} judgement={j} onShow={onShowJudgement} />
                ))}
              </div>
            </>
          )}

          {(sub.decisions?.length || 0) > 0 && (
            <>
              <div className="bk-sub__section-title"><FileText size={13} /> القرارات ({sub.decisions!.length})</div>
              <div className="bk-list">
                {sub.decisions!.map((d) => (
                  <div className="bk-item" key={d.id}>
                    <div className="bk-item__head">
                      <div className="bk-item__head-main">
                        <FileText size={14} />
                        <span>{d.decision_type_name || 'قرار'}{d.code ? ` · ${d.code}` : ''}</span>
                        {d.decision_status && <span className="bk-pill bk-pill--muted">{d.decision_status}</span>}
                      </div>
                      <div className="bk-item__meta">{d.decision_date && <span>{fmtDate(d.decision_date)}</span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {kids.length > 0 && (
            <>
              <div className="bk-sub__section-title"><GitBranch size={13} /> طلبات متفرّعة</div>
              {kids.map((k) => (
                <SubRequestNode key={k.id} sub={k} childrenMap={childrenMap} expanded={expanded} toggle={toggle} depth={depth + 1} onShowDabt={onShowDabt} onShowJudgement={onShowJudgement} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BankruptcyDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();

  const [anchorCase, setAnchorCase] = useState<Case | null>(null);
  const [detail, setDetail] = useState<BankruptcyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals — نفس منظومة صفحة القضية، تعمل على صف المرساة (case_id)
  const [showMemoWorkspace, setShowMemoWorkspace] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  // عارضا الضبط والحكم (محليان)
  const [dabtSession, setDabtSession] = useState<BankruptcySession | null>(null);
  const [judgementView, setJudgementView] = useState<BankruptcyJudgement | null>(null);
  const [judgementTab, setJudgementTab] = useState<'text' | 'reasons' | 'subject'>('text');

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!caseId) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      BankruptcyService.getBankruptcy(caseId),
      CaseService.getCase(caseId).catch(() => null),
    ])
      .then(([bk, c]) => {
        if (!active) return;
        setDetail(bk);
        setAnchorCase(c);
      })
      .catch((e) => { if (active) setError(e?.message || 'تعذّر جلب طلب الإفلاس'); })
      .finally(() => { if (active) setLoading(false); });

    // عدّادات الوثائق والمهام (تحسينية)
    DocumentService.getCaseDocuments(caseId).then((docs: any[]) => active && setDocumentsCount(docs?.length || 0)).catch(() => {});
    TaskService.getTasks({ case_id: caseId } as any).then((t: any) => active && setTasksCount(t?.data?.length ?? t?.length ?? 0)).catch(() => {});

    return () => { active = false; };
  }, [caseId]);

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // شجرة الطلبات الفرعية من القائمة المسطّحة
  const { roots, childrenMap } = useMemo(() => {
    const subs = detail?.request?.sub_requests || [];
    const ids = new Set(subs.map((s) => s.id));
    const map = new Map<number, BankruptcySubRequest[]>();
    const rootList: BankruptcySubRequest[] = [];
    for (const s of subs) {
      const pid = s.parent_sub_request_id;
      if (pid && ids.has(pid)) {
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(s);
      } else {
        rootList.push(s);
      }
    }
    return { roots: rootList, childrenMap: map };
  }, [detail]);

  const nextSession = useMemo(() => {
    const all: BankruptcySession[] = [
      ...(detail?.request?.sessions || []),
      ...(detail?.request?.sub_requests || []).flatMap((s) => s.sessions || []),
    ].filter(isSessionUpcoming);
    all.sort((a, b) => new Date(a.session_date || 0).getTime() - new Date(b.session_date || 0).getTime());
    return all[0] || null;
  }, [detail]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner"></div>
          <p className="page-loading__text">جاري تحميل طلب الإفلاس...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
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
          <div className="bk-state__title">{error || 'طلب الإفلاس غير موجود'}</div>
        </div>
      </div>
    );
  }

  const { case: anchor, request } = detail;
  const caseIdNum = Number(anchor.id);
  const title = anchorCase?.title || anchor.title || 'طلب إفلاس';
  const clientName = anchorCase?.client_name || '';
  const trustee = (request.parties || []).find((p) => p.party_role === 'trustee');
  const mainSessions = request.sessions || [];
  const mainJudgements = request.judgements || [];
  const decisions = request.decisions || [];
  const subsCount = request.sub_requests?.length || 0;
  const totalSessions = mainSessions.length + (request.sub_requests || []).reduce((n, s) => n + (s.sessions?.length || 0), 0);

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
              <Landmark size={18} color="var(--law-gold, #B8860B)" />
              {title}
            </div>
            <div className="case-detail-header__subtitle">
              رقم الطلب: {request.request_code || anchor.file_number} • {request.procedure_type_name || 'إجراء إفلاس'}
            </div>
          </div>

          <div className="case-detail-header__badges">
            <span className="case-badge" style={{ background: 'rgba(184, 134, 11, 0.15)', color: 'var(--law-gold, #B8860B)' }}>
              <span className="case-badge__dot" style={{ background: 'var(--law-gold, #B8860B)' }} />
              إفلاس
            </span>
            {request.status_name && (
              <span className={`case-badge ${statusBadgeClass(request.status_name)}`}>
                <span className="case-badge__dot"></span>
                {request.status_name}
              </span>
            )}
            {request.has_opened_procedure && request.opened_procedure_name && (
              <span className="case-badge case-badge--active">{request.opened_procedure_name}</span>
            )}
          </div>

          {/* Quick Tabs — مذكرات/وثائق/مهام/رسائل على صف المرساة */}
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
              title="مشاركة طلب الإفلاس"
            >
              <Users size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Layout بعمودين */}
      <div className="case-detail-layout">
        {/* المحتوى الرئيسي */}
        <div className="case-main-content">
          {/* سبب الطلب */}
          {request.request_reason && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <FileText size={16} />
                  سبب الطلب
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-longtext">{request.request_reason}</div>
              </div>
            </div>
          )}

          {/* أطراف الطلب */}
          {(request.parties?.length || 0) > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Users size={16} />
                  أطراف الطلب ({request.parties!.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="case-parties-inline">
                  {request.parties!.map((p: BankruptcyParty) => {
                    const v = partyTagVariant[p.party_role] || partyTagVariant.applicant;
                    return (
                      <div key={p.id} className={`case-party-tag ${v.cls}`}>
                        <span className="case-party-tag__icon">{v.icon}</span>
                        <span className="case-party-tag__name">{p.name || '—'}</span>
                        <span className="case-party-tag__role">
                          {partyRoleLabel[p.party_role] || p.party_role}
                          {p.debt_value != null && ` · دين: ${Number(p.debt_value).toLocaleString('ar-SA')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* جلسات الطلب الرئيسي */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Calendar size={16} />
                جلسات الطلب الرئيسي ({mainSessions.length})
              </div>
            </div>
            <div className="case-card__content">
              {mainSessions.length === 0 ? (
                <div className="bk-empty">لا توجد جلسات</div>
              ) : (
                <div className="case-sessions-list">
                  {mainSessions.map((s) => (
                    <BankruptcySessionItem key={s.id} session={s} onShowDabt={setDabtSession} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* الأحكام */}
          {mainJudgements.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Gavel size={16} />
                  الأحكام القضائية ({mainJudgements.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="case-judgements-list">
                  {mainJudgements.map((j) => (
                    <BankruptcyJudgementItem key={j.id} judgement={j} onShow={(x) => { setJudgementTab('text'); setJudgementView(x); }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* القرارات */}
          {decisions.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <FileText size={16} />
                  القرارات ({decisions.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-list">
                  {decisions.map((d) => (
                    <div className="bk-item" key={d.id}>
                      <div className="bk-item__head">
                        <div className="bk-item__head-main">
                          <FileText size={14} />
                          <span>{d.decision_type_name || 'قرار'}{d.code ? ` · ${d.code}` : ''}</span>
                          {d.decision_status && <span className="bk-pill bk-pill--muted">{d.decision_status}</span>}
                        </div>
                        <div className="bk-item__meta">{d.decision_date && <span>{fmtDate(d.decision_date)}</span>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* الطلبات الفرعية — لكلٍّ جلساته وأحكامه */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <GitBranch size={16} />
                الطلبات الفرعية ({subsCount})
              </div>
            </div>
            <div className="case-card__content">
              {subsCount === 0 ? (
                <div className="bk-empty">لا توجد طلبات فرعية</div>
              ) : (
                roots.map((s) => (
                  <SubRequestNode
                    key={s.id}
                    sub={s}
                    childrenMap={childrenMap}
                    expanded={expanded}
                    toggle={toggle}
                    depth={0}
                    onShowDabt={setDabtSession}
                    onShowJudgement={(x) => { setJudgementTab('text'); setJudgementView(x); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* الشريط الجانبي */}
        <div className="case-sidebar">
          {/* نظرة سريعة */}
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
                  <div className="case-info-row__value">{request.status_name || anchor.status_arabic || '—'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Scale size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">نوع الإجراء</div>
                  <div className="case-info-row__value">{request.procedure_type_name || '—'}{request.category_name ? ` · ${request.category_name}` : ''}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><UserIcon size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">صفة صاحب الطلب</div>
                  <div className="case-info-row__value">{request.request_owner_type_name || '—'}{request.legal_capacity_name ? ` · ${request.legal_capacity_name}` : ''}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Building size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">المحكمة</div>
                  <div className="case-info-row__value">{request.court_name || anchor.court || '—'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Calendar size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">تاريخ الطلب</div>
                  <div className="case-info-row__value">{fmtDate(request.request_date)}</div>
                </div>
              </div>
              {nextSession && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Clock size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">أقرب جلسة</div>
                    <div className="case-info-row__value">
                      {fmtDate(nextSession.session_date)}{nextSession.session_time ? ` · ${nextSession.session_time}` : ''}
                    </div>
                  </div>
                </div>
              )}
              <div className="case-info-row">
                <div className="case-info-row__icon"><Calendar size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">إجمالي الجلسات</div>
                  <div className="case-info-row__value">{totalSessions} (رئيسي {mainSessions.length} · فرعي {totalSessions - mainSessions.length})</div>
                </div>
              </div>
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
                  المحامون ({anchor.lawyers.length})
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                {anchor.lawyers.map((l) => (
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

          {/* أمين الإفلاس */}
          {trustee && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Landmark size={16} />
                  أمين الإفلاس
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                <div className="case-info-row">
                  <div className="case-info-row__icon"><UserIcon size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__value">{trustee.name || '—'}</div>
                    {trustee.mobile && <div className="case-info-row__label">{trustee.mobile}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* عارض ضبط الجلسة */}
      {dabtSession && (
        <div className="bk-viewer-overlay" onClick={() => setDabtSession(null)}>
          <div className="bk-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="bk-viewer__head">
              <div className="bk-viewer__title">
                <FileText size={16} />
                ضبط الجلسة{dabtSession.session_number ? ` رقم ${dabtSession.session_number}` : ''} — {fmtDate(dabtSession.session_date)}
              </div>
              <button className="bk-viewer__close" onClick={() => setDabtSession(null)}><XIcon size={16} /></button>
            </div>
            <div className="bk-viewer__body">{dabtSession.session_text || '—'}</div>
          </div>
        </div>
      )}

      {/* عارض الحكم (المنطوق/الأسباب/الوقائع) */}
      {judgementView && (
        <div className="bk-viewer-overlay" onClick={() => setJudgementView(null)}>
          <div className="bk-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="bk-viewer__head">
              <div className="bk-viewer__title">
                <Gavel size={16} />
                حكم إفلاس{judgementView.code ? ` — صك رقم ${judgementView.code}` : ''}
              </div>
              <button className="bk-viewer__close" onClick={() => setJudgementView(null)}><XIcon size={16} /></button>
            </div>
            <div className="bk-tabs" style={{ margin: '0 16px' }}>
              {([['text', 'المنطوق'], ['reasons', 'الأسباب'], ['subject', 'الوقائع']] as const).map(([k, label]) => (
                <button key={k} className={`bk-tab${judgementTab === k ? ' bk-tab--active' : ''}`} onClick={() => setJudgementTab(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="bk-viewer__body">{judgementView[judgementTab] || 'لا يوجد محتوى'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
