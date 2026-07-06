import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Calendar,
  Clock,
  Users,
  Video,
  PenTool,
  CheckSquare,
  MessageSquare,
  Landmark,
  Scale,
  Hash,
  User as UserIcon,
  AlertCircle,
  ScrollText,
  Gavel,
  BookOpen,
  Paperclip,
  MapPin,
  X,
  Eye,
} from 'lucide-react';
import LegalMemoWorkspace from '../components/LegalMemoWorkspace';
import CaseDocumentsModal from '../components/CaseDocumentsModal';
import CaseTasksModal from '../components/CaseTasksModal';
import CaseMessagesModal from '../components/CaseMessagesModal';
import ShareCaseModal from '../components/ShareCaseModal';
import { CaseService } from '../services/caseService';
import { GrievanceService } from '../services/grievanceService';
import { DocumentService } from '../services/documentService';
import { TaskService } from '../services/taskService';
import type { Case, GrievanceDetail, GrievanceParty, GrievanceSession, GrievanceMinute, GrievanceMemo } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (case-detail-page.css + bankruptcy-detail.css)

const partyRoleLabel: Record<string, string> = {
  plaintiff: 'مدعٍ',
  plaintiff_agent: 'وكيل المدعي',
  defendant: 'مدعى عليه',
  defendant_agent: 'وكيل المدعى عليه',
};

const partyTagVariant: Record<string, { cls: string; icon: string }> = {
  plaintiff: { cls: 'case-party-tag--plaintiff', icon: 'م' },
  plaintiff_agent: { cls: 'case-party-tag--lawyer', icon: 'و' },
  defendant: { cls: 'case-party-tag--defendant', icon: 'ض' },
  defendant_agent: { cls: 'case-party-tag--agent', icon: 'و' },
};

const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

// «1448/02/13» → { day: '13', month: 'صفر' } (تواريخ معين هجرية نصاً)
const parseHijri = (dateStr?: string | null) => {
  const m = String(dateStr || '').match(/(\d{3,4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return { day: '--', month: '--' };
  const monthIdx = Math.min(Math.max(parseInt(m[2], 10), 1), 12) - 1;
  return { day: String(parseInt(m[3], 10)), month: HIJRI_MONTHS[monthIdx] };
};

const isSessionUpcoming = (s: GrievanceSession): boolean => {
  if (!s.session_date_gregorian) return false;
  const d = new Date(s.session_date_gregorian);
  if (isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() >= Date.now();
};

export default function GrievanceDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();

  const [anchorCase, setAnchorCase] = useState<Case | null>(null);
  const [data, setData] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // عارض نص (محضر/مذكرة) — نفس bk-viewer الفلات
  const [viewer, setViewer] = useState<{ title: string; text: string } | null>(null);

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
      GrievanceService.getGrievance(caseId),
      CaseService.getCase(caseId).catch(() => null),
    ])
      .then(([grv, c]) => {
        if (!active) return;
        setData(grv);
        setAnchorCase(c);
      })
      .catch((e) => { if (active) setError(e?.message || 'تعذّر جلب تفاصيل الدعوى الإدارية'); })
      .finally(() => { if (active) setLoading(false); });

    DocumentService.getCaseDocuments(caseId).then((docs: any[]) => active && setDocumentsCount(docs?.length || 0)).catch(() => {});
    TaskService.getTasks({ case_id: caseId } as any).then((t: any) => active && setTasksCount(t?.data?.length ?? t?.length ?? 0)).catch(() => {});

    return () => { active = false; };
  }, [caseId]);

  const nextSession = useMemo(() => {
    const upcoming = (data?.request?.sessions || []).filter(isSessionUpcoming);
    upcoming.sort((a, b) => new Date(a.session_date_gregorian || 0).getTime() - new Date(b.session_date_gregorian || 0).getTime());
    return upcoming[0] || null;
  }, [data]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner"></div>
          <p className="page-loading__text">جاري تحميل تفاصيل الدعوى الإدارية...</p>
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
          <div className="bk-state__title">{error || 'الدعوى الإدارية غير موجودة'}</div>
        </div>
      </div>
    );
  }

  const { case: anchor, request } = data;
  const caseIdNum = Number(anchor.id);
  const title = anchorCase?.title || anchor.title || 'دعوى إدارية';
  const clientName = anchor.client_name || anchorCase?.client_name || '';
  const parties = request.parties || [];
  const sessions = request.sessions || [];
  const rulings = request.rulings || [];
  const minutes = request.minutes || [];
  const memos = request.memos || [];
  const attachments = request.attachments || [];
  const isDecided = /مفصول/.test(request.case_status || '');

  const basicFields: { label: string; value?: string | null }[] = [
    { label: 'رقم قيد الدعوى', value: request.register_no },
    { label: 'تاريخ قيد الدعوى', value: request.register_date_hijri },
    { label: 'نوع الدعوى', value: request.case_type },
    { label: 'رقم الدعوى', value: request.case_no },
    { label: 'تاريخ الدعوى', value: request.case_date_hijri },
    { label: 'اسم المحكمة', value: request.court },
    { label: 'رقم الطلب', value: request.request_no },
    { label: 'عام الطلب', value: request.request_year || request.case_year },
    { label: 'الدائرة المحال لها', value: request.circuit },
    { label: 'نوع المحكمة', value: request.court_level },
    { label: 'حالة القضية', value: request.case_status },
  ];

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
              <Landmark size={18} color="#1E3A5F" />
              {title}
            </div>
            <div className="case-detail-header__subtitle">
              رقم الدعوى: {request.case_no || '—'}{request.case_year ? `/${request.case_year}` : ''} • {request.court || 'ديوان المظالم'} — بوابة معين
            </div>
          </div>

          <div className="case-detail-header__badges">
            <span className="case-badge" style={{ background: 'var(--law-navy-light, #eef2f7)', color: 'var(--law-navy, #1E3A5F)' }}>
              <span className="case-badge__dot" style={{ background: 'var(--law-navy, #1E3A5F)' }} />
              ديوان المظالم
            </span>
            {request.case_status && (
              <span className={`case-badge ${isDecided ? 'case-badge--closed' : 'case-badge--active'}`}>
                <span className="case-badge__dot"></span>
                {request.case_status}
              </span>
            )}
            {request.court_level && (
              <span className="case-badge case-badge--pending">{request.court_level}</span>
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
              title="مشاركة الدعوى"
            >
              <Users size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Layout بعمودين */}
      <div className="case-detail-layout">
        <div className="case-main-content">
          {/* بيانات الدعوى الأساسية */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Landmark size={16} />
                بيانات الدعوى الأساسية
              </div>
            </div>
            <div className="case-card__content">
              <div className="bk-grid">
                {basicFields.filter(f => f.value).map((f) => (
                  <div className="bk-field" key={f.label}>
                    <div className="bk-field__label">{f.label}</div>
                    <div className="bk-field__value">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* موضوع الدعوى / ملخص الحكم + الأسانيد */}
          {(request.subject || request.ruling_summary || request.transmission || request.requests_text) && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <ScrollText size={16} />
                  {request.ruling_summary ? 'ملخص الحكم وموضوع الدعوى' : 'موضوع الدعوى'}
                </div>
              </div>
              <div className="case-card__content">
                {request.ruling_summary && (
                  <>
                    <div className="bk-field__label" style={{ marginBottom: 4 }}>ملخص الحكم</div>
                    <div className="bk-longtext">{request.ruling_summary}</div>
                  </>
                )}
                {request.subject && (
                  <>
                    <div className="bk-field__label" style={{ margin: request.ruling_summary ? '10px 0 4px' : '0 0 4px' }}>موضوع الدعوى</div>
                    <div className="bk-longtext">{request.subject}</div>
                  </>
                )}
                {request.transmission && (
                  <>
                    <div className="bk-field__label" style={{ margin: '10px 0 4px' }}>الأسانيد / أسباب الاعتراض</div>
                    <div className="bk-longtext">{request.transmission}</div>
                  </>
                )}
                {request.requests_text && (
                  <>
                    <div className="bk-field__label" style={{ margin: '10px 0 4px' }}>الطلبات المقدمة</div>
                    <div className="bk-longtext">{request.requests_text}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* الأطراف والوكلاء */}
          {parties.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Users size={16} />
                  الأطراف والوكلاء ({parties.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="case-parties-inline">
                  {parties.map((p: GrievanceParty) => {
                    const v = partyTagVariant[p.party_role] || partyTagVariant.plaintiff;
                    return (
                      <div key={p.id} className={`case-party-tag ${v.cls}`}>
                        <span className="case-party-tag__icon">{v.icon}</span>
                        <span className="case-party-tag__name">{p.name || '—'}</span>
                        <span className="case-party-tag__role">
                          {partyRoleLabel[p.party_role] || p.party_role}
                          {p.party_type && ` · ${p.party_type}`}
                          {p.capacity && ` · ${p.capacity}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* الجلسات */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Calendar size={16} />
                الجلسات ({sessions.length})
              </div>
            </div>
            <div className="case-card__content">
              {sessions.length === 0 ? (
                <div className="bk-empty">لا توجد جلسات{request.court_level === 'عليا' ? ' — المحكمة العليا تدقيق بلا جلسات' : ''}</div>
              ) : (
                <div className="case-sessions-list">
                  {sessions.map((s) => {
                    const upcoming = isSessionUpcoming(s);
                    const { day, month } = parseHijri(s.session_date_hijri);
                    return (
                      <div key={s.id} className={`case-session-item ${upcoming ? 'case-session-item--upcoming' : ''}`}>
                        <div className="case-session-item__date-box">
                          <span className="case-session-item__day">{day}</span>
                          <span className="case-session-item__month">{month}</span>
                        </div>
                        <div className="case-session-item__content">
                          <div className="case-session-item__header">
                            <span className="case-session-item__title">{s.session_type || 'جلسة'}</span>
                            <span className={`case-session-item__status ${upcoming ? 'case-session-item__status--upcoming' : 'case-session-item__status--completed'}`}>
                              {upcoming ? 'قادمة' : 'منتهية'}
                            </span>
                          </div>
                          <div className="case-session-item__meta">
                            {s.session_date_hijri && (
                              <span title="التاريخ الهجري">
                                <Calendar size={12} />
                                {s.session_date_hijri}هـ
                              </span>
                            )}
                            {s.session_time && (
                              <span>
                                <Clock size={12} />
                                {s.session_time}
                              </span>
                            )}
                            {s.is_remote ? (
                              <span
                                className="case-session-item__method case-session-item__method--remote"
                                title="رابط الدخول لا يظهر في معين — يصل عبر رسائل الديوان أو صفحة «الجلسات الإلكترونية» يوم الجلسة"
                              >
                                <Video size={12} />
                                مرئية عن بعد
                              </span>
                            ) : (
                              <span className="case-session-item__method">
                                <MapPin size={12} />
                                حضورية
                              </span>
                            )}
                            {s.notes && <span>{s.notes}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* أحكام القضية — تظهر في المفصول فيها */}
          {rulings.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Gavel size={16} />
                  أحكام القضية ({rulings.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-list">
                  {rulings.map((r) => (
                    <div key={r.id} className="bk-item">
                      <div className="bk-item__head">
                        <div className="bk-item__head-main">
                          <Gavel size={14} color="var(--law-gold, #B8860B)" />
                          {r.ruling_type || 'حكم'}
                        </div>
                        {r.ruling_date_hijri && <span className="bk-pill bk-pill--navy">{r.ruling_date_hijri}هـ</span>}
                      </div>
                      <div className="bk-item__meta">
                        {r.delivery_date_hijri && <span>موعد تسليم الحكم: {r.delivery_date_hijri}هـ</span>}
                        {r.deadline_to_hijri && <span>أجل التسليم إلى: {r.deadline_to_hijri}هـ</span>}
                      </div>
                      {r.verdict_summary && <div className="bk-longtext">{r.verdict_summary}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* محاضر الدعوى المصادق عليها */}
          {minutes.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <BookOpen size={16} />
                  محاضر الدعوى المصادق عليها ({minutes.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-list">
                  {minutes.map((m: GrievanceMinute) => (
                    <div key={m.id} className="bk-item">
                      <div className="bk-item__head">
                        <div className="bk-item__head-main">
                          <BookOpen size={14} color="var(--law-navy, #1E3A5F)" />
                          {m.minute_type || 'محضر'}
                          {m.minute_no && <span className="bk-sub__code">رقم {m.minute_no}</span>}
                        </div>
                        {m.decision_text && (
                          <button
                            className="case-header-tab"
                            style={{ padding: '4px 10px' }}
                            onClick={() => setViewer({ title: `${m.minute_type || 'محضر'}${m.minute_no ? ` — رقم ${m.minute_no}` : ''}`, text: m.decision_text! })}
                          >
                            <Eye size={13} />
                            نص القرار
                          </button>
                        )}
                      </div>
                      <div className="bk-item__meta">
                        {m.minute_date_hijri && <span><Calendar size={12} /> {m.minute_date_hijri}هـ</span>}
                        {m.circuit && <span>{m.circuit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* مذكرات الدعوى */}
          {memos.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <FileText size={16} />
                  مذكرات الدعوى ({memos.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-list">
                  {memos.map((m: GrievanceMemo) => (
                    <div key={m.id} className="bk-item">
                      <div className="bk-item__head">
                        <div className="bk-item__head-main">
                          <FileText size={14} />
                          {m.subject || 'مذكرة'}
                          {m.memo_no && <span className="bk-sub__code">رقم {m.memo_no}</span>}
                        </div>
                        {m.memo_text && (
                          <button
                            className="case-header-tab"
                            style={{ padding: '4px 10px' }}
                            onClick={() => setViewer({ title: m.subject || `مذكرة ${m.memo_no || ''}`, text: m.memo_text! })}
                          >
                            <Eye size={13} />
                            نص المذكرة
                          </button>
                        )}
                      </div>
                      <div className="bk-item__meta">
                        {m.memo_date_hijri && <span><Calendar size={12} /> {m.memo_date_hijri}هـ</span>}
                        {m.session_date_hijri && <span>جلسة: {m.session_date_hijri}هـ</span>}
                        {m.submitted_by && <span><UserIcon size={12} /> {m.submitted_by}</span>}
                        {m.has_attachment && <span><Paperclip size={12} /> بمرفق (يُحمَّل من معين)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* المرفقات (ميتاداتا — التحميل يتطلب جلسة معين) */}
          {attachments.length > 0 && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <Paperclip size={16} />
                  مرفقات معين ({attachments.length})
                </div>
              </div>
              <div className="case-card__content">
                <div className="bk-list">
                  {attachments.map((a, i) => (
                    <div key={i} className="bk-item">
                      <div className="bk-item__head">
                        <div className="bk-item__head-main">
                          <Paperclip size={14} />
                          {a.desc || a.type || 'مرفق'}
                        </div>
                        {a.size && <span className="bk-pill bk-pill--muted">{a.size}</span>}
                      </div>
                      <div className="bk-item__meta">
                        {a.type && <span>{a.type}</span>}
                        <span>التحميل من بوابة معين مباشرة</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                  <div className="case-info-row__label">حالة القضية</div>
                  <div className="case-info-row__value">{request.case_status || anchor.status_arabic || '—'}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Landmark size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">المحكمة</div>
                  <div className="case-info-row__value">{request.court || '—'}{request.court_level ? ` (${request.court_level})` : ''}</div>
                </div>
              </div>
              <div className="case-info-row">
                <div className="case-info-row__icon"><Scale size={14} /></div>
                <div className="case-info-row__content">
                  <div className="case-info-row__label">الدائرة</div>
                  <div className="case-info-row__value">{request.circuit || '—'}</div>
                </div>
              </div>
              {(nextSession || request.next_session_date_hijri) && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Clock size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">الجلسة القادمة</div>
                    <div className="case-info-row__value">
                      {(nextSession?.session_date_hijri || request.next_session_date_hijri) + 'هـ'}
                      {nextSession?.session_time ? ` · ${nextSession.session_time}` : ''}
                    </div>
                  </div>
                </div>
              )}
              {request.file_location && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><MapPin size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">مكان وجود الملف</div>
                    <div className="case-info-row__value">{request.file_location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* العميل والخصم */}
          {(clientName || anchor.opponent_name) && (
            <div className="case-card">
              <div className="case-card__header">
                <div className="case-card__title">
                  <UserIcon size={16} />
                  العميل والخصم
                </div>
              </div>
              <div className="case-card__content case-card__content--compact">
                {clientName && (
                  <div className="case-info-row">
                    <div className="case-info-row__icon"><UserIcon size={14} /></div>
                    <div className="case-info-row__content">
                      <div className="case-info-row__label">
                        العميل{anchor.client_role === 'plaintiff' ? ' (مدعٍ)' : anchor.client_role === 'defendant' ? ' (مدعى عليه)' : ''}
                      </div>
                      <div className="case-info-row__value">{clientName}</div>
                    </div>
                  </div>
                )}
                {anchor.client_phone && (
                  <div className="case-info-row">
                    <div className="case-info-row__icon"><MessageSquare size={14} /></div>
                    <div className="case-info-row__content">
                      <div className="case-info-row__label">الجوال</div>
                      <div className="case-info-row__value">{anchor.client_phone}</div>
                    </div>
                  </div>
                )}
                {anchor.opponent_name && (
                  <div className="case-info-row">
                    <div className="case-info-row__icon"><Users size={14} /></div>
                    <div className="case-info-row__content">
                      <div className="case-info-row__label">الخصم</div>
                      <div className="case-info-row__value">{anchor.opponent_name}</div>
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

          {/* المرجع */}
          <div className="case-card">
            <div className="case-card__header">
              <div className="case-card__title">
                <Hash size={16} />
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
              {request.case_no && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Hash size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">رقم الدعوى في الديوان</div>
                    <div className="case-info-row__value">{request.case_no}{request.case_year ? ` / ${request.case_year}` : ''}</div>
                  </div>
                </div>
              )}
              {request.register_no && (
                <div className="case-info-row">
                  <div className="case-info-row__icon"><Hash size={14} /></div>
                  <div className="case-info-row__content">
                    <div className="case-info-row__label">رقم قيد الدعوى</div>
                    <div className="case-info-row__value">{request.register_no}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* عارض نص المحضر/المذكرة (فلات) */}
      {viewer && (
        <div className="bk-viewer-overlay" onClick={() => setViewer(null)}>
          <div className="bk-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="bk-viewer__head">
              <div className="bk-viewer__title">
                <BookOpen size={15} />
                {viewer.title}
              </div>
              <button className="bk-viewer__close" onClick={() => setViewer(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="bk-viewer__body">{viewer.text}</div>
          </div>
        </div>
      )}

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
