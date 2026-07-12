import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, ChevronDown, Info, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { CaseService } from '../services/caseService';
import { getApiErrorMessage } from '../utils/apiError';
import { useAiProgressSteps } from '../hooks/useAiProgressSteps';
import type { AiClassificationStatus, CaseAiClassification } from '../types';

/**
 * بطاقة «تصنيف ناجز الذكي» في غرفة تجهيز القضية.
 *
 * التصنيف يعمل بالخلفية منذ لحظة إنشاء القضية — البطاقة تستطلع الحالة كل
 * بضع ثوانٍ ما دامت pending/processing فتظهر النتيجة مباشرة بلا تحديث للصفحة:
 * «جاري إظهار التصنيف الصحيح من ناجز...» ← التصنيف الرئيسي/الفرعي/نوع الدعوى
 * مع الطلبات المتاحة وتعريف الدعوى وثقة المصنِّف وتبريره.
 */
const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high: { label: 'ثقة عالية', cls: 'prep-clf-conf--high' },
  medium: { label: 'ثقة متوسطة', cls: 'prep-clf-conf--medium' },
  low: { label: 'ثقة منخفضة', cls: 'prep-clf-conf--low' },
};

/* رسائل التقدم المتتابعة — تحاكي مراحل التصنيف الفعلية وتقف عند الأخيرة */
const CLASSIFY_STEPS = [
  'جاري قراءة بيانات القضية ووقائعها...',
  'جاري المطابقة مع شجرة تصانيف ناجز (197 نوع دعوى)...',
  'يتم الآن ترجيح التصنيف الرئيسي الأنسب...',
  'يتم الآن تحديد التصنيف الفرعي ونوع الدعوى...',
  'يتم الآن اختيار الطلب الأنسب للرفع...',
  'يتم الآن تدقيق النتيجة وتقدير درجة الثقة...',
];

const CaseClassificationCard: React.FC<{
  caseId: number;
  initialStatus?: AiClassificationStatus | null;
  initialClassification?: CaseAiClassification | null;
  /* يُبلِّغ الأب (غرفة التجهيز) بكل تحديث حي — لتقدير التكاليف في العمود الجانبي */
  onUpdate?: (status: AiClassificationStatus | null, clf: CaseAiClassification | null) => void;
}> = ({ caseId, initialStatus, initialClassification, onUpdate }) => {
  const [status, setStatus] = useState<AiClassificationStatus | null>(initialStatus ?? null);
  const [clf, setClf] = useState<CaseAiClassification | null>(initialClassification ?? null);
  const [retrying, setRetrying] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const pollRef = useRef<number | null>(null);

  const inFlight = status === 'pending' || status === 'processing';

  /* رسائل «جاري...» المتتابعة أثناء التصنيف — تجربة انتظار حية */
  const progress = useAiProgressSteps(inFlight, CLASSIFY_STEPS, 2200);

  const publish = useCallback((s: AiClassificationStatus | null, c: CaseAiClassification | null) => {
    setStatus(s);
    setClf(c);
    onUpdate?.(s, c);
  }, [onUpdate]);

  const fetchStatus = useCallback(async () => {
    try {
      const res: any = await CaseService.getClassification(caseId);
      if (res.success && res.data) {
        publish(res.data.status ?? null, res.data.classification ?? null);
      }
    } catch {
      /* استطلاع صامت */
    }
  }, [caseId, publish]);

  /* استطلاع حي كل 3.5 ثانية ما دام التصنيف جارياً — يتوقف فور الاكتمال */
  useEffect(() => {
    if (!inFlight) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = window.setInterval(fetchStatus, 3500);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [inFlight, fetchStatus]);

  /* مزامنة مع تحديث الصفحة الأم (refreshCaseData) */
  useEffect(() => {
    setStatus(initialStatus ?? null);
    if (initialClassification) setClf(initialClassification);
  }, [initialStatus, initialClassification]);

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const res: any = await CaseService.classifyCase(caseId);
      if (res.success) {
        publish(
          ((res.data?.status as AiClassificationStatus) ?? 'pending'),
          res.data?.classification ?? null
        );
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر بدء التصنيف'));
    } finally {
      setRetrying(false);
    }
  };

  /* قضية أنشئت قبل الميزة (بلا حالة) أو خارج النطاق — بطاقة هادئة مختصرة */
  if (!status) {
    return (
      <div className="prep-clf-card prep-clf-card--idle">
        <span className="prep-clf-title"><Sparkles size={14} /> تصنيف ناجز الذكي</span>
        <button className="prep-clf-retry" onClick={retry} disabled={retrying}>
          {retrying ? <Loader2 size={12} className="ssp2-spin" /> : <RefreshCw size={12} />} صنّف القضية
        </button>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div className="prep-clf-card prep-clf-card--skipped">
        <span className="prep-clf-title"><Info size={14} /> خارج نطاق ناجز</span>
        <p className="prep-clf-skipped">{clf?.reason || 'هذه القضية خارج نطاق تصانيف ناجز.'}</p>
        <span className="prep-clf-skipped__hint">لا ينطبق تصنيف ناجز ولا حاسبة تكاليفه على هذه الجهة.</span>
      </div>
    );
  }

  if (inFlight) {
    return (
      <div className="prep-clf-card prep-clf-card--loading">
        <span className="prep-clf-title"><Sparkles size={14} /> تصنيف ناجز الذكي</span>
        <div className="prep-clf-loading">
          <Loader2 size={15} className="ssp2-spin" />
          <span key={progress.step} className="prep-ai-step">{progress.label}</span>
        </div>
        <div className="prep-ai-stepdots" aria-hidden="true">
          {CLASSIFY_STEPS.map((_, i) => (
            <span key={i} className={`prep-ai-stepdot${i <= progress.step ? ' is-on' : ''}`} />
          ))}
        </div>
        <div className="prep-clf-shimmer" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="prep-clf-card prep-clf-card--failed">
        <span className="prep-clf-title"><TriangleAlert size={14} /> تصنيف ناجز الذكي</span>
        <span className="prep-clf-failed-msg">{clf?.reason || 'تعذّر التصنيف'}</span>
        <button className="prep-clf-retry" onClick={retry} disabled={retrying}>
          {retrying ? <Loader2 size={12} className="ssp2-spin" /> : <RefreshCw size={12} />} أعد المحاولة
        </button>
      </div>
    );
  }

  // completed
  const conf = CONFIDENCE_LABELS[clf?.confidence ?? ''] ?? null;
  const suggested = clf?.suggested_request ?? null;
  /* البقية غير المقترح — تبقى مرجعية خلف طيّة */
  const otherRequests = (clf?.available_requests ?? []).filter((r) => r !== suggested);

  return (
    <div className="prep-clf-card prep-clf-card--done">
      <div className="prep-clf-head">
        <span className="prep-clf-title"><Sparkles size={14} /> تصنيف ناجز الذكي</span>
        <span className="prep-clf-headtools">
          {conf && <span className={`prep-clf-conf ${conf.cls}`}>{conf.label}</span>}
          <button className="prep-clf-retry" onClick={retry} disabled={retrying} title="أعد التصنيف">
            {retrying ? <Loader2 size={12} className="ssp2-spin" /> : <RefreshCw size={12} />}
          </button>
        </span>
      </div>

      {/* مسار التصنيف: رئيسي ← فرعي ← نوع الدعوى */}
      <div className="prep-clf-path">
        <span className="prep-clf-crumb">{clf?.main_category ?? '—'}</span>
        {clf?.sub_category && (
          <>
            <span className="prep-clf-sep">‹</span>
            <span className="prep-clf-crumb">{clf.sub_category}</span>
          </>
        )}
        <span className="prep-clf-sep">‹</span>
        <span className="prep-clf-crumb prep-clf-crumb--type"><CheckCircle2 size={13} /> {clf?.case_type ?? '—'}</span>
      </div>

      {/* الطلب المقترح للرفع — مختار آلياً من طلبات هذا النوع */}
      {suggested && (
        <div className="prep-clf-suggested">
          <span className="prep-clf-suggested__label">الطلب المقترح عند الرفع</span>
          <span className="prep-clf-suggested__value">
            <CheckCircle2 size={13} /> {suggested}
          </span>
        </div>
      )}

      {clf?.reasoning && <p className="prep-clf-reasoning">{clf.reasoning}</p>}

      {clf?.definition && <p className="prep-clf-definition">{clf.definition}</p>}

      {otherRequests.length > 0 && (
        <div className="prep-clf-requests">
          <button className="prep-clf-requests__toggle" onClick={() => setShowRequests((v) => !v)}>
            <ChevronDown size={13} style={{ transform: showRequests ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
            {suggested ? `طلبات أخرى متاحة لهذا النوع (${otherRequests.length})` : `الطلبات المتاحة لهذا النوع (${otherRequests.length})`}
          </button>
          {showRequests && (
            <div className="prep-clf-requests__chips">
              {otherRequests.map((r, i) => (
                <span key={i} className="prep-clf-request-chip">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {clf?.alternative?.case_type && (
        <p className="prep-clf-alt">
          تصنيف بديل محتمل: <strong>{clf.alternative.case_type}</strong>
          {clf.alternative.main_category ? ` (${clf.alternative.main_category})` : ''}
        </p>
      )}
    </div>
  );
};

export default CaseClassificationCard;
