// «الطلبات» — اللوح المنقسم: قائمة يميناً وتفصيل يساراً في شاشة واحدة،
// بلا انتقال صفحات ولا فقدان موضع. الذكاء يقترح — والمراجع يصحّح ويعتمد/يرفض.
//
// ⚠️ شريط المراحل يعرض ما يبلغه الباك **فعلاً** اليوم (وارد ← مراجعة ← فُتح الملف).
// مرحلتا «عُرض السعر» و«مقبول» تصلان مع م١/م٢ ولا تُرسمان قبل أن تكونا حقيقيتين —
// واجهةٌ تعرض مرحلةً لا يبلغها الباك تكذب على مستعملها.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, RefreshCw, X, Paperclip, Download, CheckCircle2, Ban,
  AlertTriangle, Briefcase, MessageSquare, Scale, Zap, ChevronRight, ChevronLeft,
  Eye, Mail, ClipboardCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  intakeRequestService, INTAKE_SERVICE_TYPES, BILLING_TYPES, DEFAULT_TASK_DUE_DAYS,
  type IntakeRequest, type IntakeTarget, type IntakeStatus, type ApprovePayload,
  type IntakeAttachment, type IntakeOriginalMessage,
} from '../services/intakeRequestService';
import { UserService, type User } from '../services/UserService';
import '../styles/intake-requests.css';

type TabKey = IntakeStatus | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending_review', label: 'تحتاج تدخّلك' },
  { key: 'needs_info', label: 'غير مكتملة' },
  { key: 'extraction_failed', label: 'فشل الاستخلاص' },
  { key: 'approved', label: 'فُتحت ملفاتها' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'all', label: 'الكل' },
];

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'وارد', cls: 'rq-chip--new' },
  needs_info: { label: 'غير مكتمل', cls: 'rq-chip--info' },
  extraction_failed: { label: 'فشل الاستخلاص', cls: 'rq-chip--failed' },
  approved: { label: 'فُتح الملف', cls: 'rq-chip--open' },
  rejected: { label: 'مرفوض', cls: 'rq-chip--rejected' },
};

const TARGET_META: Record<IntakeTarget, { label: string; icon: React.ReactNode }> = {
  service: { label: 'خدمة', icon: <Briefcase size={11} /> },
  consultation: { label: 'استشارة', icon: <MessageSquare size={11} /> },
  case: { label: 'قضية', icon: <Scale size={11} /> },
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} م.ب` : `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;

/** «منذ كم» لعمر الطلب — نُرجع null بدل تاريخ مزيّف حين لا نملك القيمة. */
const sinceLabel = (iso: string | null): string | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعة`;
  return `${Math.floor(hours / 24)} يوماً`;
};

const isPending = (s: IntakeStatus) =>
  s === 'pending_review' || s === 'needs_info' || s === 'extraction_failed';

/** رسالة الخطأ من الباك إن وُجدت — وإلا نصّ بديل. لا نعرض «[object Object]» أبداً. */
const errorMessage = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
};

// ─────────────────────────── شريط المراحل ───────────────────────────
type RailNode = { key: string; label: string; kind: 'step' | 'gate'; state: 'done' | 'now' | 'todo' };

const buildRail = (r: IntakeRequest): RailNode[] => {
  const opened = r.status === 'approved';
  const closed = r.status === 'rejected';
  return [
    { key: 'in', label: 'وارد', kind: 'step', state: 'done' },
    { key: 'review', label: 'المراجعة', kind: 'step', state: opened || closed ? 'done' : 'now' },
    { key: 'ready', label: 'اكتمال البيانات', kind: 'gate', state: opened ? 'done' : 'todo' },
    { key: 'open', label: 'فُتح الملف', kind: 'step', state: opened ? 'done' : 'todo' },
  ];
};

const StageRail: React.FC<{ request: IntakeRequest }> = ({ request }) => {
  const nodes = buildRail(request);
  const age = sinceLabel(request.received_at);

  return (
    <div className="rq-rail">
      <div className="rq-rail__track">
        {nodes.map((n, i) => (
          <React.Fragment key={n.key}>
            {i > 0 && <span className={`rq-rail__link ${nodes[i - 1].state === 'done' ? 'is-done' : ''}`} />}
            <div className={`rq-rail__node ${n.state === 'now' ? 'is-current' : ''}`}>
              <span className={`rq-rail__mark rq-rail__mark--${n.kind} is-${n.state}`}>
                <b>{n.state === 'done' ? '✓' : n.kind === 'gate' ? '◇' : i + 1}</b>
              </span>
              <span className="rq-rail__label">{n.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="rq-rail__foot">
        <span className="rq-rail__exits">مخارج متاحة: <b>غير مكتمل</b> · <b>مرفوض</b></span>
        {age && <span className="rq-rail__age">عمر الطلب {age}</span>}
      </div>
    </div>
  );
};

// ─────────────────────────── الصفحة ───────────────────────────
const IntakeRequestsPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('pending_review');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [approveFor, setApproveFor] = useState<IntakeRequest | null>(null);
  const [rejectFor, setRejectFor] = useState<IntakeRequest | null>(null);
  const [previewFor, setPreviewFor] = useState<IntakeAttachment | null>(null);
  const [originalFor, setOriginalFor] = useState<IntakeRequest | null>(null);
  const [undo, setUndo] = useState<{ label: string; href: string | null } | null>(null);
  const undoTimer = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['intake-requests', tab],
    queryFn: () => intakeRequestService.list({ status: tab, per_page: 50 }),
  });

  const rows: IntakeRequest[] = useMemo(() => data?.data?.data ?? [], [data]);
  const counts = data?.counts ?? {};

  // أوّل صفّ يُفتح تلقائياً — لا تبدأ الشاشة بلوح فارغ
  useEffect(() => {
    if (rows.length === 0) { setSelectedId(null); return; }
    if (!rows.some((r) => r.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const { data: detail } = useQuery({
    queryKey: ['intake-request', selectedId],
    queryFn: () => intakeRequestService.show(selectedId as number),
    enabled: selectedId != null,
  });
  const full: IntakeRequest | null = detail?.data ?? selected;

  const showUndo = (label: string, href: string | null) => {
    setUndo({ label, href });
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 10_000);
  };
  useEffect(() => () => { if (undoTimer.current) window.clearTimeout(undoTimer.current); }, []);

  /**
   * التنزيل عبر الرابط الموقّع مباشرة — لا حاجة لجلب blob بتوكن كما في المسار
   * القديم، فالتوقيع نفسه هو التفويض. ويسقط على المسار المُصادَق إن غاب الرابط
   * (حالة نظرية: صفٌّ بلا ملف).
   */
  const downloadAttachment = (a: IntakeAttachment) => {
    if (a.download_url) {
      window.open(a.download_url, '_blank', 'noopener');
      return;
    }
    if (!full) return;
    intakeRequestService
      .downloadAttachment(full.id, a.id, a.file_name)
      .catch(() => toast.error('تعذّر تحميل الملف'));
  };

  const approveMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApprovePayload }) =>
      intakeRequestService.approve(id, payload),
    onSuccess: (res, vars) => {
      const d = res.data;
      const href = d.case_id ? `/cases/${d.case_id}` : d.service_id ? `/legal-services/${d.service_id}` : null;
      const promoted = d.attachments_promoted > 0 ? ` · نُقل ${d.attachments_promoted} مرفقاً إلى مستندات الملف` : '';
      const tasked = d.task_id ? ' · وأُنشئت مهمة التكليف' : '';
      toast.success(`${res.message}${promoted}${tasked}`);
      showUndo(`${res.message}${promoted}${tasked}`, href);
      setApproveFor(null);
      queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
      queryClient.invalidateQueries({ queryKey: ['intake-request', vars.id] });
      if (d.task_id) queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e, 'تعذّر اعتماد الطلب')),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => intakeRequestService.reject(id, note),
    onSuccess: (res) => {
      toast.success(res.message);
      setRejectFor(null);
      queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e, 'تعذّر رفض الطلب')),
  });

  const pending = counts['pending_review'] ?? 0;
  const currentIndex = full ? rows.findIndex((r) => r.id === full.id) : -1;

  return (
    <div className="rq-page">
      <header className="rq-top">
        <h1 className="rq-top__title">الطلبات</h1>
        <span className="rq-top__kpi">
          {isLoading ? '…' : `${data?.data?.total ?? 0} طلباً · ${pending} تحتاج تدخّلك`}
        </span>
        <span className="rq-top__spacer" />
        <button className="rq-btn rq-btn--ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? 'rq-spin' : ''} /> تحديث
        </button>
      </header>

      <nav className="rq-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`rq-tab ${tab === t.key ? 'is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] != null && <b className="rq-tab__count">{counts[t.key]}</b>}
          </button>
        ))}
      </nav>

      <div className="rq-split">
        {/* ── القائمة ── */}
        <section className="rq-list" aria-label="قائمة الطلبات">
          {isLoading && (
            <div className="rq-skeleton">
              {[0, 1, 2, 3].map((i) => <div key={i} className="rq-skeleton__row" />)}
            </div>
          )}

          {!isLoading && isError && (
            <div className="rq-fallback">
              <AlertTriangle size={22} strokeWidth={1.4} />
              <p>تعذّر جلب الطلبات</p>
              <button className="rq-btn rq-btn--ghost" onClick={() => refetch()}>
                <RefreshCw size={13} /> أعد المحاولة
              </button>
            </div>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <div className="rq-empty">
              <Inbox size={28} strokeWidth={1.2} />
              <p className="rq-empty__title">لا طلبات في هذا التبويب</p>
              <p className="rq-empty__hint">تصل الطلبات من بريد المكتب تلقائياً كل خمس دقائق.</p>
            </div>
          )}

          {rows.map((r) => {
            const chip = STATUS_CHIP[r.status] ?? { label: r.status, cls: '' };
            const target = r.suggested_target ? TARGET_META[r.suggested_target] : null;
            const lowConfidence = (r.confidence ?? 0) < 60;
            const ready = isPending(r.status) && !lowConfidence && !!r.matched_client_id;

            return (
              <article
                key={r.id}
                className={`rq-row ${selectedId === r.id ? 'is-open' : ''}`}
                onClick={() => setSelectedId(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(r.id); }
                }}
              >
                <div className="rq-row__head">
                  <span className="rq-row__no">#{r.id}</span>
                  <span className={`rq-chip ${chip.cls}`}>{chip.label}</span>
                  <span className="rq-top__spacer" />
                  {r.confidence != null && (
                    <span className={`rq-conf ${lowConfidence ? 'is-low' : ''}`} title="ثقة الاستخلاص">
                      <i style={{ width: `${Math.max(0, Math.min(100, r.confidence))}%` }} />
                      <b>{r.confidence}٪</b>
                    </span>
                  )}
                </div>

                <p className="rq-row__subject">
                  {r.extracted_payload?.title || r.subject || 'بلا عنوان'}
                </p>

                <div className="rq-row__meta">
                  <span>{r.matched_client?.name || r.from_name || r.from_email || 'مُرسِل غير معروف'}</span>
                  {!r.matched_client_id && <span className="rq-chip rq-chip--ghost">غير مطابق لعميل</span>}
                  {target && <span className="rq-row__target">{target.icon}{target.label}</span>}
                  {r.attachments_count ? (
                    <span className="rq-row__att"><Paperclip size={10} />{r.attachments_count}</span>
                  ) : null}
                </div>

                {isPending(r.status) && (
                  <>
                    <p className="rq-row__next">
                      <b className="rq-you">أنتَ:</b>{' '}
                      {lowConfidence ? 'راجع — ثقة الاستخلاص منخفضة'
                        : !r.matched_client_id ? 'اربط الطلب بعميل قبل الاعتماد'
                        : 'راجع واعتمد'}
                    </p>
                    <div className="rq-row__acts" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`rq-act ${ready ? 'is-primary' : 'is-blocked'}`}
                        onClick={() => setApproveFor(r)}
                      >
                        {ready ? <><Zap size={11} /> اعتماد</> : 'راجع أولاً'}
                      </button>
                      <button className="rq-act" onClick={() => setRejectFor(r)}>رفض</button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </section>

        {/* ── التفصيل ── */}
        <section className="rq-pane" aria-label="تفصيل الطلب">
          {!full && !isLoading && (
            <div className="rq-pane__blank"><p>اختر طلباً من القائمة</p></div>
          )}

          {full && (
            <>
              <header className="rq-pane__head">
                <span className="rq-pane__id">طلب #{full.id}</span>
                <span className={`rq-chip ${STATUS_CHIP[full.status]?.cls ?? ''}`}>
                  {STATUS_CHIP[full.status]?.label ?? full.status}
                </span>
                <span className="rq-top__spacer" />
                <button
                  className="rq-navbtn" disabled={currentIndex <= 0}
                  onClick={() => currentIndex > 0 && setSelectedId(rows[currentIndex - 1].id)}
                ><ChevronRight size={13} /> السابق</button>
                <button
                  className="rq-navbtn" disabled={currentIndex < 0 || currentIndex >= rows.length - 1}
                  onClick={() => currentIndex >= 0 && currentIndex < rows.length - 1 && setSelectedId(rows[currentIndex + 1].id)}
                >التالي <ChevronLeft size={13} /></button>
              </header>

              <StageRail request={full} />

              {isPending(full.status) ? (
                <div className="rq-now">
                  <h3 className="rq-now__title">الخطوة الآن — <span className="rq-you">أنتَ:</span> راجع الطلب واعتمده</h3>
                  <ul className="rq-check">
                    <li className={full.matched_client_id ? 'is-ok' : 'is-missing'}>
                      <b>{full.matched_client_id ? '✓' : '○'}</b> عميل مرتبط
                      {full.matched_client?.name ? ` — ${full.matched_client.name}` : ' — لم يُطابَق بعد'}
                    </li>
                    <li className={(full.confidence ?? 0) >= 60 ? 'is-ok' : 'is-missing'}>
                      <b>{(full.confidence ?? 0) >= 60 ? '✓' : '○'}</b> ثقة الاستخلاص {full.confidence ?? 0}٪
                    </li>
                    <li className={full.suggested_target ? 'is-ok' : 'is-missing'}>
                      <b>{full.suggested_target ? '✓' : '○'}</b> وجهة مقترحة
                      {full.suggested_target ? ` — ${TARGET_META[full.suggested_target].label}` : ''}
                    </li>
                    <li className="is-missing"><b>○</b> محامٍ مكلَّف — يُختار عند الاعتماد</li>
                  </ul>
                  <div className="rq-now__acts">
                    <button className="rq-btn" onClick={() => setApproveFor(full)}>
                      <CheckCircle2 size={13} /> اعتمد وافتح الملف
                    </button>
                    <button className="rq-btn rq-btn--ghost" onClick={() => setRejectFor(full)}>
                      <Ban size={13} /> رفض
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rq-now rq-now--done">
                  <h3 className="rq-now__title">
                    {full.status === 'approved' ? 'انتهى مساره — فُتح الملف' : 'انتهى مساره'}
                  </h3>
                  {full.case && <p className="rq-now__line">القضية <b>{full.case.file_number}</b> — {full.case.title}</p>}
                  {full.service && <p className="rq-now__line">الخدمة <b>{full.service.service_number}</b> — {full.service.title}</p>}
                  {full.review_note && <p className="rq-now__note">ملاحظة المراجع: {full.review_note}</p>}
                  {full.reviewer && <p className="rq-now__note">بواسطة {full.reviewer.name} · {fmtDate(full.reviewed_at)}</p>}
                </div>
              )}

              <div className="rq-facts">
                <div className="rq-fact"><span className="rq-fact__k">المُرسِل</span><span className="rq-fact__v">{full.from_name || '—'}</span></div>
                <div className="rq-fact"><span className="rq-fact__k">البريد</span><span className="rq-fact__v rq-ltr">{full.from_email || '—'}</span></div>
                <div className="rq-fact"><span className="rq-fact__k">الخصم</span><span className="rq-fact__v">{full.extracted_payload?.opponent_name || '—'}</span></div>
                <div className="rq-fact"><span className="rq-fact__k">وصل</span><span className="rq-fact__v">{fmtDate(full.received_at)}</span></div>
              </div>

              <div className="rq-section">
                <h4 className="rq-section__title">
                  الموضوع
                  <button
                    type="button"
                    className="rq-linkbtn"
                    onClick={() => setOriginalFor(full)}
                    title="الرسالة كما وصلت بتنسيقها — تُجلب من صندوق البريد الآن"
                  >
                    <Mail size={11} /> الرسالة الأصلية
                  </button>
                </h4>
                <p className="rq-section__body">
                  {full.extracted_payload?.description || full.raw_body || 'لا نصّ في الرسالة.'}
                </p>
              </div>

              {!!full.attachments?.length && (
                <div className="rq-section">
                  <h4 className="rq-section__title">
                    المرفقات <span className="rq-section__hint">{full.attachments.length} ملف</span>
                  </h4>
                  {/* صفٌّ لكل مرفق لا رقاقات متجاورة: الوصف سطرٌ كامل، والمعاينة
                      والتنزيل فعلان منفصلان — الضغط على الاسم يعرض لا يُنزّل. */}
                  <div className="rq-files">
                    {full.attachments.map((a) => {
                      const available = !!a.preview_url || !!a.download_url;
                      return (
                        <div className="rq-file" key={a.id}>
                          <button
                            type="button"
                            className="rq-file__main"
                            disabled={!available}
                            title={
                              !available
                                ? 'الملف غير متوفّر (تجاوز الحدود أو حُذف)'
                                : a.is_viewable ? 'معاينة' : 'هذا النوع يُنزَّل ولا يُعرض داخل الصفحة'
                            }
                            onClick={() => {
                              if (!available) return;
                              if (a.is_viewable && a.preview_url) setPreviewFor(a);
                              else downloadAttachment(a);
                            }}
                          >
                            <span className="rq-file__icon">
                              {a.is_viewable ? <Eye size={11} /> : <Download size={11} />}
                            </span>
                            <span className="rq-file__body">
                              <span className="rq-file__name">{a.file_name}</span>
                              {/* الوصف أهمّ ما في الصفّ للصور والملفات الممسوحة — لا نصّ لها أصلاً */}
                              <span className="rq-file__desc">
                                {a.ai_description
                                  || (a.extraction_status === 'skipped' ? 'ملف لم يُستخرج نصّه — افتحه لتراه' : '—')}
                              </span>
                            </span>
                            <span className="rq-file__size">{fmtSize(a.size)}</span>
                          </button>
                          {available && (
                            <button
                              type="button"
                              className="rq-file__side"
                              title="تنزيل"
                              aria-label={`تنزيل ${a.file_name}`}
                              onClick={() => downloadAttachment(a)}
                            >
                              <Download size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* التراجع بعد الفعل بدل التأكيد قبله */}
      {undo && (
        <div className="rq-undo" role="status">
          <span className="rq-undo__text">{undo.label}</span>
          {undo.href && <a href={undo.href} className="rq-undo__link">فتح</a>}
          <span className="rq-undo__bar"><i /></span>
          <button className="rq-undo__close" onClick={() => setUndo(null)} aria-label="إغلاق"><X size={12} /></button>
        </div>
      )}

      {previewFor && (
        <PreviewModal
          attachment={previewFor}
          onClose={() => setPreviewFor(null)}
          onDownload={() => downloadAttachment(previewFor)}
        />
      )}

      {originalFor && (
        <OriginalMessageModal request={originalFor} onClose={() => setOriginalFor(null)} />
      )}

      {approveFor && (
        <ApproveModal
          request={approveFor}
          busy={approveMut.isPending}
          onClose={() => setApproveFor(null)}
          onSubmit={(payload) => approveMut.mutate({ id: approveFor.id, payload })}
        />
      )}

      {rejectFor && (
        <RejectModal
          request={rejectFor}
          busy={rejectMut.isPending}
          onClose={() => setRejectFor(null)}
          onSubmit={(note) => rejectMut.mutate({ id: rejectFor.id, note })}
        />
      )}
    </div>
  );
};

// ─────────────────────── معاينة المرفق ───────────────────────
// المعاينة قبل الاعتماد لا بعده: المحامي كان يعتمد ملفاً لم يره — وأشدّها الصور
// وملفات PDF الممسوحة ضوئياً، فلا نصّ يُستخرج منها أصلاً (الـOCR معطّل).
const PreviewModal: React.FC<{
  attachment: IntakeAttachment;
  onClose: () => void;
  onDownload: () => void;
}> = ({ attachment, onClose, onDownload }) => {
  const isImage = /\.(jpe?g|png)$/i.test(attachment.file_name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal rq-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="rq-modal__head">
          <span className="rq-modal__headname">{attachment.file_name}</span>
          <button className="rq-linkbtn" onClick={onDownload}><Download size={11} /> تنزيل</button>
          <button className="rq-modal__x" onClick={onClose} aria-label="إغلاق"><X size={14} /></button>
        </header>

        {attachment.ai_description && (
          <p className="rq-modal__note">{attachment.ai_description}</p>
        )}

        <div className="rq-viewer">
          {attachment.preview_url ? (
            isImage
              ? <img className="rq-viewer__img" src={attachment.preview_url} alt={attachment.file_name} />
              : <iframe className="rq-viewer__frame" src={attachment.preview_url} title={attachment.file_name} />
          ) : (
            <p className="rq-viewer__empty">هذا الملف لا يُعرض داخل الصفحة — نزّله لتفتحه.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────── الرسالة الأصلية بتنسيقها ───────────────────
// لا تُخزَّن في القاعدة: المخزَّن نصٌّ مجرَّد مقصوص، والأصل يبقى في صندوق Outlook
// ويُجلب لحظتَها — فيعمل للرسائل القديمة كما الجديدة بلا تضخيم القاعدة.
const OriginalMessageModal: React.FC<{
  request: IntakeRequest;
  onClose: () => void;
}> = ({ request, onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['intake-original', request.id],
    queryFn: () => intakeRequestService.original(request.id),
    retry: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const original: IntakeOriginalMessage | null = data?.data ?? null;

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal rq-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="rq-modal__head">
          <span className="rq-modal__headname">{request.subject || 'الرسالة الأصلية'}</span>
          <button className="rq-modal__x" onClick={onClose} aria-label="إغلاق"><X size={14} /></button>
        </header>

        {original?.content_type === 'html' && (
          <p className="rq-modal__note">
            الصور والموارد البعيدة محجوبة — كي لا يعلم المُرسِل بفتحك رسالته.
          </p>
        )}

        <div className="rq-viewer">
          {isLoading && <p className="rq-viewer__empty">جارٍ الجلب من صندوق البريد…</p>}

          {isError && (
            <div className="rq-viewer__fallback">
              <p className="rq-viewer__empty">
                {errorMessage(error, 'تعذّر جلب الرسالة الأصلية')} — هذا النصّ المخزَّن عند الالتقاط:
              </p>
              <pre className="rq-viewer__raw">{request.raw_body || 'لا نصّ محفوظ.'}</pre>
            </div>
          )}

          {original && (
            original.content_type === 'html'
              ? (original.content.trim()
                  // sandbox="" يمنع السكربتات والنماذج والتنقّل، لكنه **لا يمنع طلبات
                  // الشبكة**. فبلا CSP كانت صورة تتبّعٍ في رسالة تصيّد تُبلغ مُرسِلها
                  // بعنوان IP للمكتب ووقت القراءة لحظة يفتحها المراجع ليتحقّق منها —
                  // وهو ما يحجبه Outlook وGmail افتراضياً. default-src 'none' يقطع كل
                  // اتصالٍ خارجي، ويبقى التنسيق السطري والصور المضمّنة (data:).
                  ? <iframe
                      className="rq-viewer__frame"
                      sandbox=""
                      srcDoc={`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;"><style>body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;padding:14px;margin:0;color:#16202a}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${original.content}</body></html>`}
                      title="الرسالة الأصلية"
                    />
                  // محتوىً فارغ بردٍّ ناجح: لا نعرض نافذة بيضاء صامتة
                  : <div className="rq-viewer__fallback">
                      <p className="rq-viewer__empty">تعذّر عرض الرسالة بتنسيقها — هذا النصّ المخزَّن:</p>
                      <pre className="rq-viewer__raw">{request.raw_body || 'لا نصّ محفوظ.'}</pre>
                    </div>)
              : <pre className="rq-viewer__raw">{original.content || 'لا نصّ في الرسالة.'}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────── نافذة الاعتماد ───────────────────────────
const ApproveModal: React.FC<{
  request: IntakeRequest;
  busy: boolean;
  onClose: () => void;
  onSubmit: (p: ApprovePayload) => void;
}> = ({ request, busy, onClose, onSubmit }) => {
  const [target, setTarget] = useState<IntakeTarget>(request.suggested_target ?? 'service');
  const [serviceType, setServiceType] = useState<string>(request.suggested_service_type ?? 'other');
  const [clientId, setClientId] = useState<number | ''>(request.matched_client_id ?? '');
  const [lawyerId, setLawyerId] = useState<number | ''>('');
  const [title, setTitle] = useState(request.extracted_payload?.title || request.subject || '');
  const [description, setDescription] = useState(request.extracted_payload?.description || '');
  const [billingType, setBillingType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  // التكليف — مفعّل افتراضياً: الطلب المعتمَد بلا مكلَّف ولا موعد يبقى ساكناً
  const [createTask, setCreateTask] = useState(true);
  const [approverId, setApproverId] = useState<number | ''>('');
  const [dueDays, setDueDays] = useState<string>(String(DEFAULT_TASK_DUE_DAYS));

  const { data: clients } = useQuery<User[]>({
    queryKey: ['intake-clients'], queryFn: () => UserService.getClients(),
  });
  const { data: lawyers } = useQuery<User[]>({
    queryKey: ['intake-lawyers'], queryFn: () => UserService.getLawyers(),
  });

  // ⚠️ البوابة تُلغي نفسها لو اعتمد المحامي مهمّة نفسه (سياسة المهام تُجيز
  // للمنشئ الاعتماد دائماً). فنمنعه هنا ويمنعه الباك أيضاً — لا نتّكل على الواجهة.
  const selfApproval = createTask && !!approverId && Number(approverId) === Number(lawyerId);
  const missingApprover = createTask && !approverId;

  // ⚠️ min/max على <input> زينةٌ هنا: لا <form> ولا submit، فقيود المتصفح لا تُطبَّق.
  // بلا هذا القصر تمرّ «٩٠» إلى الباك فيردّ 422 برسالة عامّة لا تدلّ على الحقل.
  const DUE_MIN = 1;
  const DUE_MAX = 60;
  const dueDaysNum = (() => {
    const n = Math.trunc(Number(dueDays));
    if (!Number.isFinite(n) || n < DUE_MIN) return DUE_MIN;
    return Math.min(n, DUE_MAX);
  })();
  const dueOutOfRange = createTask && dueDays.trim() !== '' && Number(dueDays) !== dueDaysNum;

  const canSubmit =
    !!clientId && !!lawyerId && title.trim().length > 0 && !busy && !selfApproval && !missingApprover;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      target,
      service_type: target === 'service' ? serviceType : null,
      client_id: Number(clientId),
      assigned_lawyer_id: Number(lawyerId),
      title: title.trim(),
      description: description.trim() || null,
      send_confirmation: sendConfirmation,
      billing_type: billingType ? (billingType as ApprovePayload['billing_type']) : null,
      agreed_amount: amount ? Number(amount) : null,
      create_task: createTask,
      task_approver_id: createTask ? Number(approverId) : null,
      task_due_days: createTask ? dueDaysNum : null,
    });
  };

  const dueLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + dueDaysNum);
    return d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="rq-modal__head">
          <span>اعتماد الطلب #{request.id}</span>
          <button className="rq-modal__x" onClick={onClose} aria-label="إغلاق"><X size={14} /></button>
        </header>

        <div className="rq-modal__row">
          <label className="rq-field">
            <span>الوجهة *</span>
            <select value={target} onChange={(e) => setTarget(e.target.value as IntakeTarget)}>
              <option value="service">خدمة قانونية</option>
              <option value="consultation">استشارة</option>
              <option value="case">قضية</option>
            </select>
          </label>
          <label className="rq-field">
            <span>نوع الخدمة {target !== 'service' && <em>— لا ينطبق</em>}</span>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} disabled={target !== 'service'}>
              {Object.entries(INTAKE_SERVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        <div className="rq-modal__row">
          <label className="rq-field">
            <span>العميل *</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">اختر العميل…</option>
              {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="rq-field">
            <span>المحامي المكلَّف *</span>
            <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">اختر المحامي…</option>
              {(lawyers ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </div>

        <div className="rq-modal__row rq-modal__row--single">
          <label className="rq-field">
            <span>العنوان *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </label>
        </div>

        <div className="rq-modal__row rq-modal__row--single">
          <label className="rq-field">
            <span>الوصف</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={10000} />
          </label>
        </div>

        {target !== 'case' && (
          <div className="rq-modal__row">
            <label className="rq-field">
              <span>نوع الفوترة <em>— اختياري</em></span>
              <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
                <option value="">بلا تحديد</option>
                {Object.entries(BILLING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="rq-field">
              <span>الأتعاب المتّفق عليها <em>— اختياري</em></span>
              <input
                type="number" min={0} step="0.01" inputMode="decimal"
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="بالريال"
              />
            </label>
          </div>
        )}

        <label className="rq-toggle">
          <input type="checkbox" checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} />
          <span>أرسل رسالة «استلمنا طلبكم» إلى {request.from_email || 'المُرسِل'}</span>
        </label>

        {/* ── التكليف ── */}
        <label className="rq-toggle rq-toggle--head">
          <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} />
          <span><ClipboardCheck size={12} /> كلّف المحامي بمهمة لا تُغلق إلا باعتماد المدير</span>
        </label>

        {createTask && (
          <>
            <div className="rq-modal__row">
              <label className="rq-field">
                <span>يعتمدها * <em>— غير المحامي المكلَّف</em></span>
                <select
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">اختر المعتمِد…</option>
                  {(lawyers ?? [])
                    .filter((u) => Number(u.id) !== Number(lawyerId))
                    .map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
              <label className="rq-field">
                <span>مهلة التسليم <em>— من يوم إلى ٦٠</em></span>
                <input
                  type="number" min={DUE_MIN} max={DUE_MAX} inputMode="numeric"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                  onBlur={() => setDueDays(String(dueDaysNum))}
                />
              </label>
            </div>

            <p className="rq-modal__note">
              تصل المحامي رسالة فور الاعتماد، وتُسلَّم <b>{dueLabel}</b>
              {dueOutOfRange && <> — <b>ضُبطت على {dueDaysNum} يوماً</b> (المدى المسموح {DUE_MIN}–{DUE_MAX})</>}.
              وحين ينهيها تنتقل «بانتظار الاعتماد» ولا تُغلق حتى يعتمدها المعتمِد.
            </p>

            {selfApproval && (
              <p className="rq-warn">
                <AlertTriangle size={13} /> لا يصحّ أن يعتمد المحامي مهمّة نفسه — اختر معتمِداً غيره.
              </p>
            )}
          </>
        )}

        <footer className="rq-modal__foot">
          <span className="rq-modal__hint">
            {request.attachments_count
              ? `سيُنقل ${request.attachments_count} مرفقاً إلى مستندات الملف`
              : 'لا مرفقات'}
          </span>
          <span className="rq-top__spacer" />
          <button className="rq-btn rq-btn--ghost" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className="rq-btn" onClick={submit} disabled={!canSubmit}>
            {busy ? 'جارٍ…' : 'اعتمد وافتح الملف'}
          </button>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────── نافذة الرفض ───────────────────────────
const REJECT_REASONS = [
  'خارج تخصّص المكتب',
  'تعارض مصالح',
  'بريد ترويجي أو آلي',
  'مكرّر',
  'تعذّر التواصل',
  'العميل غير جادّ',
];

const RejectModal: React.FC<{
  request: IntakeRequest;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}> = ({ request, busy, onClose, onSubmit }) => {
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState('');

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal rq-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="rq-modal__head">
          <span>رفض الطلب #{request.id}</span>
          <button className="rq-modal__x" onClick={onClose} aria-label="إغلاق"><X size={14} /></button>
        </header>

        <div className="rq-modal__row rq-modal__row--single">
          <label className="rq-field">
            <span>السبب * <em>— من قائمة مغلقة كي يمكن تحليلها لاحقاً</em></span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>

        <div className="rq-modal__row rq-modal__row--single">
          <label className="rq-field">
            <span>ملاحظة داخلية <em>— لا تُرسل للمُرسِل</em></span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </label>
        </div>

        <p className="rq-warn">
          <AlertTriangle size={13} /> ستُحذف ملفات المرفقات نهائياً، ويبقى سجلّ الطلب.
        </p>

        <footer className="rq-modal__foot">
          <span className="rq-top__spacer" />
          <button className="rq-btn rq-btn--ghost" onClick={onClose} disabled={busy}>إلغاء</button>
          <button
            className="rq-btn rq-btn--danger" disabled={busy}
            onClick={() => onSubmit(note.trim() ? `${reason} — ${note.trim()}` : reason)}
          >
            {busy ? 'جارٍ…' : 'ارفض الطلب'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default IntakeRequestsPage;
