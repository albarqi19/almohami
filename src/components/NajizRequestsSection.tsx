import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  EyeOff,
  FileText,
  Info,
  Inbox,
  RotateCcw,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  caseRequestService,
  type CaseRequestItem,
  type CaseRequestsSummary,
} from '../services/caseRequestService';
import '../styles/najiz-requests.css';

/**
 * «المذكّرات المودَعة» — طلبات القضية في ناجز ومذكّراتها، بخطٍّ زمنيٍّ واحد.
 *
 * ⚠️ التسمية: «إنشاء مذكرة» في النظام تعني ما نكتبه نحن. وهذه **المودَعة** في المحكمة.
 *
 * 🩸 قاعدتان فرضتهما بياناتٌ حقيقية:
 *
 *  1) **أوصافُ المرفقات هي المحتوى.** مذكّرةُ خصمٍ مرصودة نصُّها فارغٌ تماماً وحجّتُها
 *     كلُّها في `reason_text` لمرفقاتها الخمسة. فالأوصافُ تُعرض دائماً وبارزة —
 *     إخفاؤها خلف «عرض المرفقات» يُظهر مذكّرةً فارغةً وفيها ما يهدم الدعوى.
 *
 *  2) **نُخبِر ولا نحكم.** «أودع الخصمُ مذكّرة» حقيقةٌ نقيسها من بياناتٍ صريحة. أمّا
 *     «تنتظر الرد» فحكمٌ لا نملكه: ناجز لا يعطي أيَّ حقلٍ يربط مذكّرةً بمذكّرة، وقد
 *     تكون المذكّرةُ في موضوعٍ مستقلٍّ تماماً. فحالةُ الردّ تُعرض **معلومةً سياقية**
 *     هادئة، والحكمُ للمحامي. (والصمتُ الخاطئ أخطرُ من الإزعاج: إغلاقٌ آليٌّ لمذكّرةٍ
 *     تحتاج رداً يُفوّت مهلة.)
 */

interface Props {
  caseId: number;
  /** يُرفع للأعلى ليُحدِّث عدّاد زرّ الترويسة في الصفحة الأمّ */
  onSummaryChange?: (summary: CaseRequestsSummary | null) => void;
  /** تفتحه الصفحةُ الأمّ بعد توليد المسوّدة — المذكّرات مساحةٌ لا مسار */
  onOpenMemoWorkspace?: () => void;
}

const SIDE_LABEL: Record<string, string> = {
  opponent: 'من الخصم',
  ours: 'منّا',
  co_party: 'طرف مشارك',
  unknown: 'غير مصنَّفة',
};

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-SA');
  } catch {
    return d;
  }
};

/**
 * حالةُ الردّ كمعلومةٍ سياقية — لا حكم.
 * تُصاغ بصيغة الخبر («وأودعنا مذكّرةً بعدها») لا بصيغة الأمر («تنتظر الرد»).
 */
const contextLine = (request: CaseRequestItem, all: CaseRequestItem[]): string | null => {
  if (request.side !== 'opponent') return null;

  if (request.dismissed_at) {
    return request.dismiss_reason
      ? `أُخفيت من المتابعة — ${request.dismiss_reason}`
      : 'أُخفيت من المتابعة';
  }

  if (request.replied_by_request_id) {
    const reply = all.find((r) => r.id === request.replied_by_request_id);
    return reply
      ? `وأودعنا نحن مذكّرةً بعدها في ${fmtDate(reply.request_date)}`
      : 'وأودعنا نحن مذكّرةً بعدها';
  }

  if (request.reply_status === 'unclassified') {
    return 'موقعُ موكّلنا غير محدَّد، فلم يُميَّز المودِع';
  }

  return 'ولم نُودع بعدها شيئاً حتى الآن';
};

const NajizRequestsSection: React.FC<Props> = ({ caseId, onSummaryChange, onOpenMemoWorkspace }) => {
  const [requests, setRequests] = useState<CaseRequestItem[]>([]);
  const [summary, setSummary] = useState<CaseRequestsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await caseRequestService.list(caseId);
      setRequests(data.requests);
      setSummary(data.summary);
      onSummaryChange?.(data.summary);
    } catch {
      setError('تعذّر تحميل المذكّرات المودَعة');
      onSummaryChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [caseId, onSummaryChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDismiss = async (request: CaseRequestItem) => {
    const reason = window.prompt(
      'سببُ الإخفاء (اختياري) — مثلاً: رُدَّ عليها ورقياً في الجلسة، أو لا تخصّنا'
    );
    if (reason === null) return; // ألغى

    try {
      setBusyId(request.id);
      await caseRequestService.dismiss(caseId, request.id, reason || undefined);
      await load();
    } catch {
      setError('تعذّر إخفاء المذكّرة');
    } finally {
      setBusyId(null);
    }
  };

  const handleReplyDraft = async (request: CaseRequestItem) => {
    try {
      setBusyId(request.id);
      setError(null);
      setDraftNotice(null);

      const memo = await caseRequestService.generateReplyDraft(caseId, request.id);

      // المذكّرات تُفتح في مساحةٍ داخل الصفحة لا في مسارٍ مستقل — فنُبلّغ ونفتحها
      // عبر الصفحة الأمّ بدل تنقّلٍ إلى رابطٍ لا وجود له.
      setDraftNotice(memo.title);
      onOpenMemoWorkspace?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر توليد مسوّدة الردّ');
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = async (request: CaseRequestItem) => {
    try {
      setBusyId(request.id);
      await caseRequestService.reopen(caseId, request.id);
      await load();
    } catch {
      setError('تعذّرت إعادة المذكّرة للمتابعة');
    } finally {
      setBusyId(null);
    }
  };

  /** مذكّراتُ الخصم التي لم يعقبها شيءٌ منّا — خبرٌ يُعرض، لا إنذارٌ يُطلق. */
  const unanswered = useMemo(
    () =>
      requests.filter(
        (r) => r.side === 'opponent' && !r.dismissed_at && !r.replied_by_request_id
      ),
    [requests]
  );

  const roleUnknown =
    summary && summary.client_role !== 'plaintiff' && summary.client_role !== 'defendant';

  // لا تُعرض بطاقةٌ فارغة: قضيةٌ لم يُمسح فيها شيءٌ بعد لا شأن لها بهذا القسم.
  if (!loading && !error && requests.length === 0) return null;

  return (
    <div className="case-card" data-tour="case-najiz-requests" id="najiz-requests">
      <div className="case-card__header">
        <div className="case-card__title">
          <Scale size={16} />
          المذكّرات المودَعة
          {summary ? ` (${summary.total})` : ''}
        </div>
      </div>

      <div className="case-card__content">
        {loading && <div className="najiz-req__muted">جارٍ التحميل…</div>}

        {error && <div className="najiz-req__error">{error}</div>}

        {draftNotice && (
          <div className="najiz-req__notice">
            <Sparkles size={17} />
            <div>
              <strong>أُنشئت مسوّدة: «{draftNotice}»</strong>
              <div className="najiz-req__notice-sub">
                مسوّدةٌ أوّلية تحتاج مراجعتك قبل الاعتماد — تجدها في مساحة المذكّرات.
              </div>
            </div>
          </div>
        )}

        {/* خبرٌ لا حكم: كم مذكّرةً من الخصم لم يعقبها شيءٌ منّا */}
        {!loading && unanswered.length > 0 && (
          <div className="najiz-req__notice najiz-req__notice--attention">
            <Inbox size={17} />
            <div>
              <strong>
                {unanswered.length === 1
                  ? 'مذكّرةٌ من الخصم لم نُودع بعدها شيئاً'
                  : `${unanswered.length} مذكّرات من الخصم لم نُودع بعدها شيئاً`}
              </strong>
              <div className="najiz-req__notice-sub">
                أحدثُها من «{unanswered[unanswered.length - 1].submitter_name || 'الخصم'}» بتاريخ{' '}
                {fmtDate(unanswered[unanswered.length - 1].request_date)} — راجعها لتقرّر.
              </div>
            </div>
          </div>
        )}

        {/* موقعُ الموكّل غير محدَّد ⟵ لا تمييز ولا تذكير حتى يُحدَّد */}
        {!loading && roleUnknown && (
          <div className="najiz-req__notice">
            <Info size={17} />
            <div>
              موقعُ موكّلنا في هذه القضية غير محدَّد، فلا يُميَّز مُودِعُ المذكّرة ولا يصل تذكير.
              <div className="najiz-req__notice-sub">حدِّده من بيانات القضية ليعمل التمييز.</div>
            </div>
          </div>
        )}

        <div className="najiz-req">
          {requests.map((request) => {
            const isOpen = expanded.has(request.id);
            const busy = busyId === request.id;
            const isOpponent = request.side === 'opponent';
            const context = contextLine(request, requests);

            // الحجّة: أوصافُ المرفقات. تُعرض دائماً — وهي المحتوى حين يغيب النصّ.
            const points = request.attachments.filter((a) => (a.reason_text || '').trim() !== '');
            const hasText = (request.memo_text || '').trim() !== '';

            return (
              <div
                key={request.id}
                className={`najiz-req__item${isOpponent ? ' najiz-req__item--opponent' : ''}`}
              >
                <div className="najiz-req__head">
                  <span className="najiz-req__who">
                    {request.submitter_name || request.request_type_name || 'طلب'}
                    {request.submitter_role_name && (
                      <span className="najiz-req__role"> · {request.submitter_role_name}</span>
                    )}
                  </span>

                  {request.is_memo && (
                    <span className={`najiz-req__chip najiz-req__chip--${request.side}`}>
                      {SIDE_LABEL[request.side] || request.side_arabic}
                    </span>
                  )}

                  {!request.is_memo && request.request_type_name && (
                    <span className="najiz-req__chip najiz-req__chip--unknown">
                      {request.request_type_name}
                    </span>
                  )}

                  <span className="najiz-req__spacer" />

                  <span className="najiz-req__date">
                    <Calendar size={12} />
                    {fmtDate(request.request_date)}
                  </span>
                </div>

                <div className="najiz-req__body">
                  {/* الخلاصة أولاً: أسرعُ ما يُقرأ، ومبنيّةٌ على النصّ والأوصاف معاً */}
                  {request.ai_summary && (
                    <div className="najiz-req__summary">
                      <Sparkles size={14} />
                      <div>{request.ai_summary}</div>
                    </div>
                  )}

                  {/* ثمّ ما استند إليه المودِع */}
                  {points.length > 0 && (
                    <div className="najiz-req__points">
                      {points.map((attachment) => (
                        <div key={attachment.id} className="najiz-req__point">
                          <FileText size={13} />
                          <div>
                            {attachment.reason_text}
                            {attachment.file_name && (
                              <span className="najiz-req__point-file">
                                {attachment.file_name}
                                {attachment.download_status === 'downloaded' ? '' : ' — لم يُنزَّل بعد'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* مذكّرةٌ بلا نصٍّ ولا أوصاف — نقولها صراحةً بدل أن تبدو فارغة */}
                  {!hasText && points.length === 0 && !request.ai_summary && (
                    <div className="najiz-req__muted">
                      لم يُرفق بهذه المذكّرة نصٌّ ولا وصفُ مرفقات في ناجز.
                    </div>
                  )}

                  {context && <div className="najiz-req__context">{context}</div>}

                  <div className="najiz-req__actions">
                    {hasText && (
                      <button
                        type="button"
                        className="najiz-req__btn najiz-req__btn--primary"
                        onClick={() => toggle(request.id)}
                      >
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isOpen ? 'إخفاء النص' : 'عرض نص المذكّرة'}
                      </button>
                    )}

                    {isOpponent && (hasText || points.length > 0) && (
                      <button
                        type="button"
                        className="najiz-req__btn najiz-req__btn--primary"
                        disabled={busy}
                        onClick={() => void handleReplyDraft(request)}
                        title="مسوّدةٌ أوّلية في مساحة المذكّرات — تحتاج مراجعتك"
                      >
                        <Sparkles size={13} />
                        {busy ? 'جارٍ التوليد…' : 'اكتب مسوّدة ردّ'}
                      </button>
                    )}

                    {isOpponent && !request.dismissed_at && (
                      <button
                        type="button"
                        className="najiz-req__btn"
                        disabled={busy}
                        onClick={() => void handleDismiss(request)}
                        title="أخفِها من المتابعة — رُدَّ عليها ورقياً أو لا تخصّنا"
                      >
                        <EyeOff size={13} />
                        إخفاء من المتابعة
                      </button>
                    )}

                    {request.dismissed_at && (
                      <button
                        type="button"
                        className="najiz-req__btn"
                        disabled={busy}
                        onClick={() => void handleReopen(request)}
                        title="أعِدها إلى المتابعة"
                      >
                        <RotateCcw size={13} />
                        إعادة للمتابعة
                      </button>
                    )}
                  </div>

                  {isOpen && hasText && <div className="najiz-req__text">{request.memo_text}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NajizRequestsSection;
