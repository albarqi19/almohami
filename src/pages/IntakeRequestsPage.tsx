// «صندوق الطلبات الذكي» — طلبات واردة من بريد Outlook حوّلها الذكاء لاقتراحات
// (خدمة/استشارة/قضية). الذكاء يقترح فقط — المراجع يصحّح ويعتمد/يرفض من هنا.
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, RefreshCw, X, Mail, Paperclip, Download, CheckCircle2, Ban,
  Clock, AlertTriangle, Briefcase, MessageSquare, Scale, Sparkles, UserCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  intakeRequestService, INTAKE_SERVICE_TYPES,
  type IntakeRequest, type IntakeTarget, type IntakeStatus,
} from '../services/intakeRequestService';
import { UserService, type User } from '../services/UserService';
import '../styles/intake-requests.css';

const STATUS_TABS: { key: IntakeStatus | 'all'; label: string; icon: React.ReactNode }[] = [
  { key: 'pending_review', label: 'قيد المراجعة', icon: <Clock size={13} /> },
  { key: 'approved', label: 'معتمَدة', icon: <CheckCircle2 size={13} /> },
  { key: 'rejected', label: 'مرفوضة', icon: <Ban size={13} /> },
  { key: 'extraction_failed', label: 'فشل الاستخلاص', icon: <AlertTriangle size={13} /> },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'قيد المراجعة', cls: 'intake-status--pending' },
  approved: { label: 'معتمَد', cls: 'intake-status--approved' },
  rejected: { label: 'مرفوض', cls: 'intake-status--rejected' },
  needs_info: { label: 'يحتاج توضيحاً', cls: 'intake-status--pending' },
  extraction_failed: { label: 'فشل الاستخلاص', cls: 'intake-status--failed' },
};

const TARGET_META: Record<IntakeTarget, { label: string; icon: React.ReactNode }> = {
  service: { label: 'خدمة قانونية', icon: <Briefcase size={13} /> },
  consultation: { label: 'استشارة', icon: <MessageSquare size={13} /> },
  case: { label: 'قضية', icon: <Scale size={13} /> },
};

const confidenceCls = (c: number) => (c >= 80 ? 'intake-conf--high' : c >= 40 ? 'intake-conf--mid' : 'intake-conf--low');

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

const IntakeRequestsPage: React.FC = () => {
  const [tab, setTab] = useState<IntakeStatus | 'all'>('pending_review');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['intake-requests', tab],
    queryFn: () => intakeRequestService.list({ status: tab, per_page: 50 }),
  });

  const rows: IntakeRequest[] = data?.data?.data ?? [];
  const counts = data?.counts ?? {};
  const pendingCount = counts['pending_review'] ?? 0;

  return (
    <div className="intake-page">
      <header className="intake-topbar">
        <div className="intake-topbar__title">
          <Inbox size={20} />
          <span>صندوق الطلبات الذكي</span>
          {pendingCount > 0 && <span className="intake-topbar__badge">{pendingCount} بانتظارك</span>}
        </div>
        <button className="intake-btn" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'intake-spin' : ''} /> تحديث
        </button>
      </header>

      <div className="intake-tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            className={`intake-tab ${tab === t.key ? 'intake-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
            <span className="intake-tab__count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="intake-table-wrap">
        {isLoading ? (
          <div className="intake-empty"><RefreshCw size={28} className="intake-spin" /><span>جاري التحميل…</span></div>
        ) : rows.length === 0 ? (
          <div className="intake-empty">
            <Mail size={40} />
            <strong>لا طلبات في هذا التبويب</strong>
            <span>الرسائل الجديدة على بريد المكتب تظهر هنا تلقائياً خلال دقائق</span>
          </div>
        ) : (
          <table className="intake-table">
            <thead>
              <tr>
                <th>المُرسِل</th>
                <th>الموضوع</th>
                <th>الاقتراح</th>
                <th>الثقة</th>
                <th>العميل المطابَق</th>
                <th>الحالة</th>
                <th>وصلت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setSelectedId(r.id)}>
                  <td>
                    <div className="intake-sender">
                      <span className="intake-sender__name">{r.from_name || '—'}</span>
                      <span className="intake-sender__email">{r.from_email}</span>
                    </div>
                  </td>
                  <td>
                    <div className="intake-subject" title={r.subject ?? ''}>
                      {r.has_attachments && <Paperclip size={12} style={{ marginInlineEnd: 5, verticalAlign: 'middle' }} />}
                      {r.extracted_payload?.title || r.subject || '(بلا موضوع)'}
                    </div>
                  </td>
                  <td>
                    {r.suggested_target ? (
                      <span className="intake-target-badge">
                        {TARGET_META[r.suggested_target].icon} {TARGET_META[r.suggested_target].label}
                        {r.suggested_service_type && INTAKE_SERVICE_TYPES[r.suggested_service_type]
                          ? ` — ${INTAKE_SERVICE_TYPES[r.suggested_service_type]}` : ''}
                      </span>
                    ) : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
                  </td>
                  <td>
                    <span className={`intake-conf ${confidenceCls(r.confidence)}`}>
                      <Sparkles size={11} /> {r.confidence}%
                    </span>
                  </td>
                  <td>
                    {r.matched_client ? (
                      <span className="intake-match-hint"><UserCheck size={13} /> {r.matched_client.name}</span>
                    ) : <span style={{ color: 'var(--color-text-secondary)' }}>غير مطابَق</span>}
                  </td>
                  <td>
                    <span className={`intake-status ${STATUS_BADGE[r.status]?.cls ?? ''}`}>
                      {STATUS_BADGE[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {fmtDate(r.received_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId !== null && (
        <ReviewModal
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
          onDone={() => {
            setSelectedId(null);
            queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// مودال المراجعة الكثيف: يمين نص الإيميل الأصلي + المرفقات، يسار الحقول
// المستخرَجة قابلة للتحرير + محددات الوجهة/العميل/المحامي + اعتماد/رفض.
// ─────────────────────────────────────────────────────────────────────

const ReviewModal: React.FC<{ requestId: number; onClose: () => void; onDone: () => void }> = ({ requestId, onClose, onDone }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['intake-request', requestId],
    queryFn: () => intakeRequestService.show(requestId),
  });
  const req = data?.data;

  const [target, setTarget] = useState<IntakeTarget>('service');
  const [serviceType, setServiceType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [lawyerId, setLawyerId] = useState<number | ''>('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [rejectMode, setRejectMode] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  // تعبئة أولية من اقتراحات الذكاء (المراجع يصحّح فوقها)
  useEffect(() => {
    if (!req) return;
    setTarget(req.suggested_target ?? 'service');
    if (req.suggested_service_type && INTAKE_SERVICE_TYPES[req.suggested_service_type]) {
      setServiceType(req.suggested_service_type);
    }
    setTitle(req.extracted_payload?.title || req.subject || '');
    setDescription(req.extracted_payload?.description || '');
    if (req.matched_client_id) setClientId(req.matched_client_id);
  }, [req]);

  const { data: clients } = useQuery<User[]>({ queryKey: ['intake-clients'], queryFn: () => UserService.getClients() });
  const { data: lawyers } = useQuery<User[]>({ queryKey: ['intake-lawyers'], queryFn: () => UserService.getLawyers() });

  const approveMutation = useMutation({
    mutationFn: () => intakeRequestService.approve(requestId, {
      target,
      service_type: target === 'service' ? serviceType : null,
      client_id: clientId as number,
      assigned_lawyer_id: lawyerId as number,
      title: title.trim(),
      description: description.trim() || null,
      send_confirmation: sendConfirmation,
      review_note: reviewNote.trim() || null,
    }),
    onSuccess: (res) => { toast.success(res.message || 'اعتُمد الطلب'); onDone(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الاعتماد'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => intakeRequestService.reject(requestId, reviewNote.trim() || undefined),
    onSuccess: () => { toast.success('رُفض الطلب'); onDone(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الرفض'),
  });

  const isPending = req && ['pending_review', 'needs_info', 'extraction_failed'].includes(req.status);
  const canApprove = isPending && clientId !== '' && lawyerId !== '' && title.trim() !== ''
    && !approveMutation.isPending && !rejectMutation.isPending;

  const download = async (attachmentId: number, fileName: string) => {
    try { await intakeRequestService.downloadAttachment(requestId, attachmentId, fileName); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر التحميل'); }
  };

  const clientOptions = useMemo(() => clients ?? [], [clients]);
  const lawyerOptions = useMemo(() => lawyers ?? [], [lawyers]);

  return (
    <div className="intake-modal-overlay" onClick={onClose}>
      <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
        <div className="intake-modal__header">
          <div className="intake-modal__title"><Mail size={17} /> مراجعة الطلب الوارد #{requestId}</div>
          <button className="intake-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        {isLoading || !req ? (
          <div className="intake-empty"><RefreshCw size={26} className="intake-spin" /><span>جاري التحميل…</span></div>
        ) : (
          <>
            <div className="intake-modal__body">
              {/* ── نص الإيميل الأصلي ── */}
              <div className="intake-modal__email">
                <div className="intake-modal__email-head">
                  <div className="intake-modal__email-subject">{req.subject || '(بلا موضوع)'}</div>
                  <div className="intake-modal__email-meta">
                    <span>{req.from_name || 'مُرسِل غير معروف'}</span>
                    <bdo>{req.from_email}</bdo>
                    <span>{fmtDate(req.received_at)}</span>
                  </div>
                </div>
                <div className="intake-modal__email-body">{req.raw_body || '(بلا محتوى نصي)'}</div>

                {(req.attachments?.length ?? 0) > 0 && (
                  <div className="intake-attachments">
                    <div className="intake-attachments__title">المرفقات ({req.attachments!.length})</div>
                    {req.attachments!.map((a) => (
                      <div key={a.id} className="intake-attachment">
                        <Paperclip size={12} />
                        <span>{a.file_name}</span>
                        <span className="intake-attachment__meta">
                          {fmtSize(a.size)}
                          {a.extraction_status === 'done' && ' · حُلّل نصياً'}
                          {a.extraction_status === 'skipped' && ' · لم يُحلَّل'}
                          {a.extraction_status === 'failed' && ' · فشل التحليل'}
                        </span>
                        {a.storage_path && (
                          <button onClick={() => download(a.id, a.file_name)}><Download size={12} /> تنزيل</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── الحقول القابلة للتحرير ── */}
              <div className="intake-modal__form">
                {req.status === 'extraction_failed' ? (
                  <div className="intake-ai-strip">
                    <AlertTriangle size={14} />
                    تعذّر الاستخلاص الآلي — راجع النص يدوياً وعبّئ الحقول بنفسك.
                  </div>
                ) : (
                  <div className="intake-ai-strip">
                    <Sparkles size={14} />
                    اقتراح الذكاء بثقة <strong>{req.confidence}%</strong>
                    {req.extracted_payload?.client_name && <span>· صاحب الطلب: {req.extracted_payload.client_name}</span>}
                    {req.extracted_payload?.opponent_name && <span>· الخصم: {req.extracted_payload.opponent_name}</span>}
                    {req.extracted_payload?.attachments_summary && <span>· المرفقات: {req.extracted_payload.attachments_summary}</span>}
                  </div>
                )}

                {!isPending && (
                  <div className="intake-ai-strip">
                    <CheckCircle2 size={14} />
                    عولج هذا الطلب — الحالة: {STATUS_BADGE[req.status]?.label}
                    {req.reviewer && ` بواسطة ${req.reviewer.name}`}
                    {req.service && ` · ${req.service.service_number}`}
                    {req.case && ` · ${req.case.file_number}`}
                    {req.review_note && ` · ملاحظة: ${req.review_note}`}
                  </div>
                )}

                {isPending && !rejectMode && (
                  <>
                    <div className="intake-field">
                      <label>وجهة الطلب</label>
                      <div className="intake-target-picker">
                        {(Object.keys(TARGET_META) as IntakeTarget[]).map((t) => (
                          <button key={t} className={target === t ? 'active' : ''} onClick={() => setTarget(t)}>
                            {TARGET_META[t].icon} {TARGET_META[t].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {target === 'service' && (
                      <div className="intake-field">
                        <label>نوع الخدمة</label>
                        <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                          {Object.entries(INTAKE_SERVICE_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="intake-field">
                      <label>العنوان</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الخدمة/القضية" />
                    </div>

                    <div className="intake-field">
                      <label>الوصف</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف الطلب (يُعبأ من الإيميل تلقائياً)" />
                    </div>

                    <div className="intake-grid-2">
                      <div className="intake-field">
                        <label>العميل {req.matched_client && <span className="intake-match-hint" style={{ display: 'inline-flex' }}><UserCheck size={11} /> مطابَق آلياً</span>}</label>
                        <select value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}>
                          <option value="">— اختر العميل —</option>
                          {clientOptions.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="intake-field">
                        <label>المحامي المكلّف</label>
                        <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value ? Number(e.target.value) : '')}>
                          <option value="">— اختر المحامي —</option>
                          {lawyerOptions.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {clientId === '' && (
                      <div className="intake-ai-strip" style={{ borderStyle: 'solid' }}>
                        <AlertTriangle size={13} />
                        لا عميل مطابَق — إن كان المُرسِل عميلاً جديداً أنشئه أولاً من صفحة «العملاء» ثم اعتمد.
                      </div>
                    )}

                    <label className="intake-check">
                      <input
                        type="checkbox"
                        checked={sendConfirmation}
                        onChange={(e) => setSendConfirmation(e.target.checked)}
                      />
                      إرسال إيميل «استلمنا طلبكم وبدأنا العمل» للمُرسِل بعد الاعتماد
                    </label>
                  </>
                )}

                {isPending && rejectMode && (
                  <div className="intake-field">
                    <label>سبب الرفض (اختياري)</label>
                    <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="سبام / ليست طلباً / مكررة…" />
                  </div>
                )}
              </div>
            </div>

            {isPending && (
              <div className="intake-modal__footer">
                {rejectMode ? (
                  <>
                    <button className="intake-btn" onClick={() => setRejectMode(false)}>رجوع</button>
                    <button
                      className="intake-btn intake-btn--danger"
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                    >
                      <Ban size={14} /> تأكيد الرفض
                    </button>
                  </>
                ) : (
                  <>
                    <button className="intake-btn intake-btn--danger" onClick={() => setRejectMode(true)}>
                      <Ban size={14} /> رفض
                    </button>
                    <button
                      className="intake-btn intake-btn--approve"
                      onClick={() => approveMutation.mutate()}
                      disabled={!canApprove}
                      title={clientId === '' ? 'اختر العميل أولاً' : lawyerId === '' ? 'اختر المحامي أولاً' : ''}
                    >
                      {approveMutation.isPending
                        ? <RefreshCw size={14} className="intake-spin" />
                        : <CheckCircle2 size={14} />} اعتماد وإنشاء
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default IntakeRequestsPage;
