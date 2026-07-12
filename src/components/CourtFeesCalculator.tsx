import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, ChevronDown, Info, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import {
  CLAIM_KINDS,
  FEE_EXEMPTIONS,
  JUDICIAL_REQUESTS,
  LAWSUIT_TYPES,
  calcLawsuitFee,
  calcRequestFee,
  formatSAR,
  type LawsuitClaimKind,
} from '../utils/courtFees';
import { useAiProgressSteps } from '../hooks/useAiProgressSteps';
import type { AiClassificationStatus, CaseFeeEstimate } from '../types';

/* رسائل التقدم المتتابعة لتقدير التكاليف — تقف عند الأخيرة حتى وصول النتيجة */
const FEE_STEPS = [
  'جاري استخراج قيمة المطالبة من عنوان القضية ووصفها...',
  'يتم الآن تحديد نوع المطالبة: مالية، تعاقدية، أم غير مالية...',
  'جاري تطبيق معادلات التكاليف القضائية لوزارة العدل...',
  'يتم الآن احتساب الشرائح والحدود النظامية...',
];

/**
 * بطاقة «التكاليف القضائية» في غرفة تجهيز القضية.
 *
 * التقدير الذكي هو الواجهة: يعمل بالخلفية (استخراج قيمة المطالبة من نص
 * القضية — لا من خانة العقد التي تخص أتعاب المكتب — ثم تحديد نوع المطالبة
 * والحساب بمعادلات الوزارة في الباك) ويظهر مباشرة. الحاسبة اليدوية أداة
 * ثانوية مطوية لسيناريوهات «ماذا لو» — وتنفتح وحدها فقط حين يحتاج التقدير
 * مبلغاً لم يُذكر في النص، مهيأةً بنوع المطالبة المكتشف.
 */
const CourtFeesCalculator: React.FC<{
  aiStatus?: AiClassificationStatus | null;
  aiEstimate?: CaseFeeEstimate | null;
}> = ({ aiStatus, aiEstimate }) => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'lawsuit' | 'request'>('lawsuit');

  // تبويب الدعاوى
  const [lawsuitType, setLawsuitType] = useState<string>(LAWSUIT_TYPES[0]);
  const [claimKind, setClaimKind] = useState<LawsuitClaimKind>('non_financial');
  const [amount, setAmount] = useState<string>('');

  // تبويب الطلبات
  const [requestKey, setRequestKey] = useState<string>(JUDICIAL_REQUESTS[0].key);
  const [requestBase, setRequestBase] = useState<string>('');

  const aiInFlight = aiStatus === 'pending' || aiStatus === 'processing';
  /* لا تقدير ذكي متوقع (قديمة/متخطاة/فاشلة) → الحاسبة اليدوية هي الأداة */
  const aiAbsent = !aiInFlight && !aiEstimate;

  /* الحاسبة اليدوية مطوية افتراضياً — تنفتح وحدها إن غاب الذكاء أو احتاج مبلغاً */
  const [manualOpen, setManualOpen] = useState(false);
  useEffect(() => {
    if (aiAbsent || aiEstimate?.needs_amount) setManualOpen(true);
  }, [aiAbsent, aiEstimate?.needs_amount]);

  /* رسائل «جاري...» المتتابعة أثناء الحساب الذكي — أبطأ قليلاً من التصنيف */
  const feeProgress = useAiProgressSteps(aiInFlight, FEE_STEPS, 2800);

  /* «ملكية عقار» تظهر فقط مع «محكمة عامة» — كما في الحاسبة الرسمية */
  const availableKinds = useMemo(
    () => CLAIM_KINDS.filter((k) => k.key !== 'real_estate' || lawsuitType === 'محكمة عامة'),
    [lawsuitType]
  );

  /* تهيئة الحاسبة مرة واحدة من تقدير الذكاء فور وصوله — بلا دهس تعديلات المستخدم */
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !aiEstimate) return;
    prefilled.current = true;
    if (aiEstimate.claim_kind === 'real_estate') setLawsuitType('محكمة عامة');
    setClaimKind(aiEstimate.claim_kind);
    if (aiEstimate.amount_used) setAmount(String(aiEstimate.amount_used));
  }, [aiEstimate]);

  const selectedRequest = JUDICIAL_REQUESTS.find((r) => r.key === requestKey);
  const requestNeedsAmount = selectedRequest?.fee === null;

  const result = tab === 'lawsuit'
    ? calcLawsuitFee(claimKind, amount === '' ? null : Number(amount))
    : calcRequestFee(requestKey, requestBase === '' ? null : Number(requestBase));

  const changeLawsuitType = (t: string) => {
    setLawsuitType(t);
    if (t !== 'محكمة عامة' && claimKind === 'real_estate') setClaimKind('non_financial');
  };

  return (
    <div className="prep-fees-card">
      <button className="prep-fees-head" onClick={() => setOpen((v) => !v)}>
        <span className="prep-fees-title"><Calculator size={14} /> التكاليف القضائية</span>
        <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>

      {open && (
        <div className="prep-fees-body">

          {/* ═══ التقدير الذكي — الواجهة الرئيسية: يعمل بالخلفية ثم يظهر ═══ */}
          {aiInFlight ? (
            <div className="prep-fees-ai prep-fees-ai--loading">
              <Loader2 size={13} className="ssp2-spin" />
              <span className="prep-fees-ai__text">
                <span key={feeProgress.step} className="prep-ai-step">{feeProgress.label}</span>
                <span className="prep-ai-stepdots" aria-hidden="true">
                  {FEE_STEPS.map((_, i) => (
                    <span key={i} className={`prep-ai-stepdot${i <= feeProgress.step ? ' is-on' : ''}`} />
                  ))}
                </span>
              </span>
            </div>
          ) : aiEstimate ? (
            aiEstimate.fee !== null ? (
              <div className="prep-fees-ai prep-fees-ai--done">
                <Sparkles size={14} />
                <div className="prep-fees-ai__text">
                  <span className="prep-fees-ai__amount">{formatSAR(aiEstimate.fee)}</span>
                  <span>مطالبة {aiEstimate.claim_kind_label} — {aiEstimate.note}</span>
                  {aiEstimate.amount_used ? (
                    <span className="prep-fees-ai__src">
                      قيمة المطالبة {formatSAR(aiEstimate.amount_used)} — استُخرجت من نص القضية
                    </span>
                  ) : null}
                  {aiEstimate.exemption_note && (
                    <span className="prep-fees-ai__exemption">{aiEstimate.exemption_note}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="prep-fees-ai prep-fees-ai--partial">
                <TriangleAlert size={13} />
                <div className="prep-fees-ai__text">
                  <strong>المطالبة {aiEstimate.claim_kind_label} — والتقدير يحتاج قيمتها</strong>
                  <span>{aiEstimate.note}</span>
                  {aiEstimate.exemption_note && (
                    <span className="prep-fees-ai__exemption">{aiEstimate.exemption_note}</span>
                  )}
                </div>
              </div>
            )
          ) : null}

          {/* ═══ الحاسبة اليدوية — أداة «ماذا لو» مطوية افتراضياً ═══ */}
          <button className="prep-fees-manualtoggle" onClick={() => setManualOpen((v) => !v)}>
            <ChevronDown size={13} style={{ transform: manualOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
            الحاسبة اليدوية {aiEstimate?.fee != null ? '— لتجربة سيناريوهات أخرى' : ''}
          </button>

          {manualOpen && (
            <>
              <div className="prep-fees-tabs">
                <button
                  className={`prep-fees-tab${tab === 'lawsuit' ? ' prep-fees-tab--active' : ''}`}
                  onClick={() => setTab('lawsuit')}
                >
                  حاسبة الدعاوى
                </button>
                <button
                  className={`prep-fees-tab${tab === 'request' ? ' prep-fees-tab--active' : ''}`}
                  onClick={() => setTab('request')}
                >
                  حاسبة الطلبات
                </button>
              </div>

              {tab === 'lawsuit' ? (
                <div className="prep-fees-form">
                  <label className="prep-fees-field">
                    <span>نوع الدعوى</span>
                    <select value={lawsuitType} onChange={(e) => changeLawsuitType(e.target.value)}>
                      {LAWSUIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="prep-fees-field">
                    <span>نوع المطالبة</span>
                    <select value={claimKind} onChange={(e) => setClaimKind(e.target.value as LawsuitClaimKind)}>
                      {availableKinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                    </select>
                  </label>
                  {CLAIM_KINDS.find((k) => k.key === claimKind)?.needsAmount && (
                    <label className="prep-fees-field">
                      <span>مقدار المطالبة محل الدعوى (ريال)</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="prep-fees-form">
                  <label className="prep-fees-field">
                    <span>الإجراء القضائي</span>
                    <select value={requestKey} onChange={(e) => setRequestKey(e.target.value)}>
                      {JUDICIAL_REQUESTS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </label>
                  {requestNeedsAmount && (
                    <label className="prep-fees-field">
                      <span>{selectedRequest?.rateBaseLabel} (ريال)</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={requestBase}
                        onChange={(e) => setRequestBase(e.target.value)}
                      />
                    </label>
                  )}
                </div>
              )}

              <div className={`prep-fees-result${result.fee !== null ? ' prep-fees-result--ok' : ''}`}>
                {result.fee !== null ? (
                  <>
                    <span className="prep-fees-result__amount">{formatSAR(result.fee)}</span>
                    <span className="prep-fees-result__note">{result.note}</span>
                  </>
                ) : (
                  <span className="prep-fees-result__hint">{result.note}</span>
                )}
              </div>

              <details className="prep-fees-exemptions">
                <summary><Info size={12} /> الفئات المستثناة من التكاليف القضائية</summary>
                <ul>
                  {FEE_EXEMPTIONS.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CourtFeesCalculator;
