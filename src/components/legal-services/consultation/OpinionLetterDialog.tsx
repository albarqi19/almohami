import React, { useEffect, useState } from 'react';
import { FileCheck, Loader2, RotateCcw, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { OpinionLetterOptions } from '../../../types/legalServices';

/**
 * «خطاب الرأي القانوني» — ما يظهر في الملف يقرّره المكتب لا القالب.
 *
 * كان القالب ثابتاً: كل الأقسام تُطبع دائماً وفي ذيله «إخلاء مسؤولية» بنصٍّ واحد مفروض على الجميع.
 * هنا يختار المحامي ما يظهر ويحرّر نص الإخلاء (أو يحذفه) وخاتمة الخطاب — لهذا الخطاب وحده،
 * أو يحفظه افتراضاً لكل استشارات المكتب.
 */

interface OpinionLetterDialogProps {
  serviceId: number;
  /** الرأي غير معتمد بعد — التوليد يعتمده أولاً */
  needsFinalize: boolean;
  busy: boolean;
  canSaveOfficeDefault: boolean;
  onClose: () => void;
  onGenerate: (options: OpinionLetterOptions) => void;
}

const SECTIONS: { key: keyof OpinionLetterOptions; label: string }[] = [
  { key: 'show_question', label: 'سؤال العميل' },
  { key: 'show_scope', label: 'نطاق الاستشارة والوقائع' },
  { key: 'show_references', label: 'الأسانيد والمراجع' },
  { key: 'show_classification', label: 'التصنيف والأهمية' },
  { key: 'show_finalized_date', label: 'تاريخ اعتماد الرأي' },
];

const OpinionLetterDialog: React.FC<OpinionLetterDialogProps> = ({
  serviceId,
  needsFinalize,
  busy,
  canSaveOfficeDefault,
  onClose,
  onGenerate,
}) => {
  const [options, setOptions] = useState<OpinionLetterOptions | null>(null);
  const [builtin, setBuiltin] = useState<OpinionLetterOptions | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    LegalServiceService.getOpinionLetterSettings(serviceId)
      .then((res) => {
        if (!alive) return;
        setOptions(res.data.effective);
        setBuiltin(res.data.builtin);
      })
      .catch((err) => alive && setError(getApiErrorMessage(err, 'تعذّر تحميل خيارات الخطاب')));
    return () => {
      alive = false;
    };
  }, [serviceId]);

  const set = <K extends keyof OpinionLetterOptions>(key: K, value: OpinionLetterOptions[K]) =>
    setOptions((prev) => (prev ? { ...prev, [key]: value } : prev));

  const submit = async () => {
    if (!options) return;
    if (saveAsDefault) {
      setSavingDefault(true);
      try {
        await LegalServiceService.updateOpinionLetterSettings(options);
        toast.success('حُفظ هذا الشكل افتراضاً لكل استشارات المكتب');
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'تعذّر حفظ الافتراض — سيُولَّد الخطاب بهذه الخيارات على أي حال'));
      } finally {
        setSavingDefault(false);
      }
    }
    onGenerate(options);
  };

  const working = busy || savingDefault;

  return (
    <div className="lsd-modal-overlay" onClick={working ? undefined : onClose}>
      <div className="lsd-modal cdw-letter" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="خطاب الرأي القانوني">
        <div className="lsd-modal__header">
          <div className="lsd-modal__title">
            <FileCheck size={16} />
            خطاب الرأي القانوني
          </div>
          <button className="lsd-modal__close" onClick={onClose} disabled={working} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>

        <div className="lsd-modal__body">
          {error ? (
            <p className="cdw-muted">{error}</p>
          ) : !options ? (
            <p className="cdw-muted"><Loader2 size={13} className="cdw-spin" /> جارٍ تحميل خيارات الخطاب…</p>
          ) : (
            <>
              <label className="cdw-letter__field">
                <span>عنوان الخطاب</span>
                <input value={options.heading} onChange={(e) => set('heading', e.target.value)} maxLength={150} />
              </label>

              <fieldset className="cdw-letter__group">
                <legend>ما يظهر في الخطاب مع الرأي</legend>
                <div className="cdw-letter__checks">
                  {SECTIONS.map(({ key, label }) => (
                    <label key={key}>
                      <input type="checkbox" checked={!!options[key]} onChange={(e) => set(key, e.target.checked as never)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="cdw-letter__group">
                <legend>
                  <label>
                    <input type="checkbox" checked={options.show_disclaimer} onChange={(e) => set('show_disclaimer', e.target.checked)} />
                    فقرة إخلاء المسؤولية
                  </label>
                </legend>
                {options.show_disclaimer ? (
                  <>
                    <label className="cdw-letter__field">
                      <span>عنوان الفقرة</span>
                      <input value={options.disclaimer_title} onChange={(e) => set('disclaimer_title', e.target.value)} maxLength={100} />
                    </label>
                    <label className="cdw-letter__field">
                      <span>
                        نص الفقرة
                        {builtin && options.disclaimer_text !== builtin.disclaimer_text && (
                          <button type="button" className="cdw-link" onClick={() => set('disclaimer_text', builtin.disclaimer_text)}>
                            <RotateCcw size={11} /> أعد النص الأصلي
                          </button>
                        )}
                      </span>
                      <textarea value={options.disclaimer_text} onChange={(e) => set('disclaimer_text', e.target.value)} rows={5} maxLength={3000} />
                    </label>
                  </>
                ) : (
                  <p className="cdw-muted">لن تظهر فقرة إخلاء المسؤولية في الخطاب.</p>
                )}
              </fieldset>

              <label className="cdw-letter__field">
                <span>خاتمة قبل التوقيع <em>(اختياري)</em></span>
                <textarea
                  value={options.closing_text}
                  onChange={(e) => set('closing_text', e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="مثال: وتفضلوا بقبول فائق الاحترام والتقدير."
                />
              </label>

              {canSaveOfficeDefault && (
                <label className="cdw-letter__default">
                  <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} />
                  احفظ هذا الشكل افتراضاً لكل استشارات المكتب
                </label>
              )}

              {needsFinalize && (
                <p className="cdw-audit__warn">
                  الخطاب يُولَّد من رأيٍ معتمد: سيُعتمد الرأي أولاً فيُقفل ضد التعديل — ويمكنك إعادة فتحه من أعلى الورقة ما دام لم يُسلَّم.
                </p>
              )}
            </>
          )}
        </div>

        <div className="lsd-modal__footer">
          <button className="lsd-header-btn" onClick={onClose} disabled={working}>إلغاء</button>
          <button className="lsd-header-btn lsd-header-btn--primary" onClick={submit} disabled={!options || working}>
            {working ? <Loader2 size={14} className="cdw-spin" /> : <FileCheck size={14} />}
            {needsFinalize ? 'اعتمد الرأي وولّد الخطاب' : 'ولّد الخطاب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpinionLetterDialog;
