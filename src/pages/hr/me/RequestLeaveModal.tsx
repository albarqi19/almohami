import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, CalendarDays, Info, Paperclip, Scale, X } from 'lucide-react';

import type {
  MyLeaveDocumentOption,
  MyLeavePreviewPayload,
  MyLeaveTypeOption,
} from '../../../services/hrMeLeaveService';
import { hrMeLeaveService } from '../../../services/hrMeLeaveService';
import {
  errorText,
  excludedLabel,
  fmtCalendarSpan,
  fmtDays,
  fmtDurationUnit,
  fmtLeaveRange,
  makeClientKey,
  toNum,
} from '../leave/leaveFormat';
import { useMyLeavePreview, useRequestLeave } from './useMyLeaveRequest';

/**
 * **«اطلب إجازة»** — نموذجُ الموظف في «ملفّي الوظيفيّ».
 *
 * ══════ لماذا معاينةٌ حيّةٌ قبل الإرسال ══════
 * الموظفُ يطلب «من الأحد إلى السبت» ويظنّها سبعةَ أيامٍ من رصيده، وهي خمسةٌ لأن الجمعةَ
 * والسبتَ ليسا يومَي عمل. والفارقُ لا يُكتشف إلا بعد الاعتماد حين ينقص الرصيدُ رقماً غيرَ
 * الذي في رأسه — فيصير النظامُ متّهماً. ولذلك يُعرض **قبل الإرسال**: كم يومَ عملٍ من كم
 * تقويميّاً، وما استُثني **بالاسم** (الجمعة والسبت · اسمُ العطلة الرسمية)، وكم يبقى بعدها.
 *
 * والمصدرُ واحد: `POST /hr/me/leaves/preview` ينادي `LeaveRecorder::evaluate()` — بعينها ما
 * سيحكم تحت القفل عند الحفظ. فلا رقمَ في الشاشة يخالف رقمَ الدفتر.
 *
 * ══════ الحواجزُ تُعطِّل الزرَّ ولا تُفاجئ بـ٤٢٢ ══════
 * قيودُ النوع (مرفقٌ · تاريخُ واقعةٍ · سببٌ · مدّةُ خدمةٍ · سقفُ أيام) تصل **٢٠٠ داخل
 * `blockers`** فتُكتب سطراً ويُعطَّل الإرسال. والخادمُ يعيد فرضَها على أيّ حال — الواجهةُ
 * تشرح، والخادمُ يحكم.
 *
 * 🩸 ونوعٌ يستلزم مرفقاً ولا مستندَ في ملفّ الموظف: **لا يُترك حقلٌ فارغٌ يُنقر بلا جدوى** —
 * يُكتب صراحةً أن المستند يُسلَّم لإدارة المكتب (لا مسارَ رفعٍ ذاتيٍّ في المنصّة: الرفعُ
 * محروسٌ بـ`hr.documents.manage`).
 *
 * `client_key` يُولَّد **مرّةً واحدةً لكلّ فتحةِ نموذج** ويبقى كما هو عند إعادة المحاولة —
 * فالنقرةُ المكرّرة تُرجع الصفَّ القائم بـ٢٠٠ ولا تُنشئ طلباً ثانياً.
 *
 * ══════ 🔴 الافتتاحُ نظيفٌ لا صفريّ (رُصد بلقطةٍ من المالك) ══════
 * كان الحقلان يُملآن بـ`todayISO()` معاً، فتُفتح النافذةُ على مدىً من يومٍ إلى نفسِه؛ وإن
 * صادف اليومُ نهايةَ أسبوعٍ قرأ المستخدمُ **أوّلَ ما يقرأ**: «٠٫٠ يوم عمل · لا يوم عمل داخل
 * المدى» — رسالةُ عدمٍ عن مدىً لم يختره أحد، وزرُّ إرسالٍ مفعَّلٌ فوقها.
 *
 * فصار الحقلان **فارغين**، واللوحُ يقول «اختر المدى». ولم يُختَر «أوّلُ يوم عملٍ قادم»
 * افتراضاً لسببين: (١) نهايةُ الأسبوع وعطلُ المكتب تُقرأ من الخادم (`weekend_days` في
 * المعاينة) ولا يملكها العميلُ قبل أوّل نداء، فأيُّ تخمينٍ محليٍّ يُخطئ في مكتبٍ عطلتُه
 * الخميسُ والجمعة؛ (٢) تاريخٌ يُملأ عن المستخدم يُرسَل كما هو حين لا ينتبه — والطلبُ يخصم
 * من رصيده. الفراغُ يجبر قراراً صريحاً، وهو أرخصُ من طلبٍ صامتٍ في اليوم الخطأ.
 *
 * ولمّا اختار البدايةَ تُملأ النهايةُ بها (يومٌ واحد) — إكمالُ ما بدأه لا اختيارٌ عنه.
 */

interface Props {
  types: MyLeaveTypeOption[];
  documents: MyLeaveDocumentOption[];
  onClose: () => void;
}

/** وسمُ نوع المستند في المنتقي — خريطةٌ واحدة، ولا نصَّ نوعٍ يُكتب في الشجرة. */
const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: 'هوية وطنية',
  iqama: 'إقامة',
  employment_contract: 'عقد عمل',
  qualification: 'مؤهّل',
  bar_license: 'رخصة محاماة',
  cv: 'سيرة ذاتية',
  other: 'مستند آخر',
};

/** قيدُ الجنس **يُعرَض ولا يُفرَض** — لا عمودَ جنسٍ على ملفّ الموظف، فهو إرشادٌ لا حجب. */
const GENDER_HINTS: Record<string, string> = {
  male: 'مقرَّر للرجال',
  female: 'مقرَّر للنساء',
};

const docLabel = (doc: MyLeaveDocumentOption): string => {
  const kind = DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type;
  const name = doc.title ?? doc.file_name;
  return name ? `${kind} — ${name}` : kind;
};

export const RequestLeaveModal: React.FC<Props> = ({ types, documents, onClose }) => {
  const [typeId, setTypeId] = useState<number>(types[0]?.id ?? 0);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [documentId, setDocumentId] = useState<number | null>(null);
  // المستنداتُ المرفوعةُ في هذه الجلسة تُضاف إلى القائمة فوراً — فلا يُغلق النموذجُ
  // ويُعاد فتحُه لتظهر. والخادمُ هو مصدرُ الحقيقة عند إعادة التحميل.
  const [uploaded, setUploaded] = useState<MyLeaveDocumentOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allDocuments = useMemo(() => [...uploaded, ...documents], [uploaded, documents]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await hrMeLeaveService.uploadDocument(file);
      setUploaded((prev) => [doc, ...prev]);
      setDocumentId(doc.id); // يُختار فوراً — الرفعُ نيّةُ الإرفاق
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'تعذّر رفع المستند');
    } finally {
      setUploading(false);
    }
  };
  const [reason, setReason] = useState('');

  // مفتاحٌ واحدٌ لكلّ فتحةِ نموذج — لا يُجدَّد عند إعادة المحاولة (وإلّا طلبٌ ثانٍ).
  const clientKey = useMemo(() => makeClientKey(), []);

  const type = types.find((t) => t.id === typeId) ?? null;
  const send = useRequestLeave();

  // مدىً ناقصٌ ⇒ **لا حمولةَ أصلاً**: لا نداءَ معاينةٍ، ولا زرَّ إرسالٍ مفعَّل، ولا رقمَ
  // يُحتسب عن مدىً لم يختره أحد.
  const previewInput = useMemo<MyLeavePreviewPayload | null>(() => {
    if (type === null || start === '' || end === '') return null;

    return {
      leave_type_id: type.id,
      start_date: start,
      end_date: end,
      event_date: eventDate === '' ? null : eventDate,
      reason: reason.trim() === '' ? null : reason.trim(),
      employee_document_id: documentId,
    };
  }, [type, start, end, eventDate, reason, documentId]);

  const preview = useMyLeavePreview(previewInput);
  const duration = preview.isStale ? undefined : preview.data?.duration;
  const balance = preview.isStale ? undefined : preview.data?.balance;

  const blocked = preview.blockers.length > 0;
  const isCalendarBasis = type?.duration_basis === 'calendar_days';
  const needsDocument = type?.requires_attachment === true;
  const noDocuments = needsDocument && documents.length === 0;

  const days = duration === undefined ? null : toNum(duration.duration_days);
  const zeroDays = days !== null && days <= 0;

  /**
   * سببُ تعطيل الإرسال — **يُكتب تحت الزرّ**، فلا زرٌّ ميّتٌ بلا سبب.
   *
   * الترتيبُ ترتيبُ ما يُصلحه المستخدمُ أوّلاً. والحواجزُ تُترك للوح الأحمر أعلاه (نصُّها
   * من الخادم كاملاً) ويُكتفى هنا بإحالةٍ إليها — لا يُكرَّر نصٌّ في موضعين.
   */
  const disabledWhy: string | null =
    type === null ? 'اختر نوعَ الإجازة.'
      : previewInput === null ? 'حدّد تاريخَي المدى.'
        : preview.isFetching && duration === undefined ? 'جارٍ احتسابُ المدّة…'
          : zeroDays ? 'لا يومَ عملٍ داخل المدى — بدِّل التاريخين.'
            : blocked ? 'راجِع ما هو مذكورٌ أعلاه بالأحمر.'
              : null;

  const cannotSend = send.isPending || disabledWhy !== null;

  const submit = async () => {
    if (previewInput === null) return;

    try {
      const result = await send.mutateAsync({ ...previewInput, client_key: clientKey });

      toast.success(
        result.pending
          ? 'أُرسل طلبُك — سيظهر لمن يعتمده في المكتب.'
          : 'سُجّلت إجازتُك واعتُمدت — لا معتمِدَ آخر في مكتبك.'
      );
      onClose();
    } catch (e) {
      toast.error(errorText(e, 'تعذّر إرسال الطلب'));
    }
  };

  return (
    <div className="hr-modal-overlay hrl-modal-overlay" onClick={onClose}>
      <div className="hr-modal hrl-modal myhrq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>طلبُ إجازة</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="hr-modal__b">
          <div className="hr-field">
            <label htmlFor="myhrq-type">نوعُ الإجازة *</label>
            <select
              id="myhrq-type"
              value={typeId}
              onChange={(e) => {
                setTypeId(Number(e.target.value));
                setDocumentId(null);
              }}
            >
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            {/* 🩸 حُذفت رقاقةُ اسم النوع (`hrl-type`) ومعها `hrl-dot`: الأخيرةُ **مربّعُ أيقونةٍ**
                لا نقطةُ لون (٢٠px بإطار)، وتُترك فارغةً هنا فتُرسم مربّعاً أبيضَ يسبق الرقاقات
                يُقرأ عنصرَ تحكّمٍ مكسوراً — رصده المالكُ في لقطة. وكان اسمُ النوع فيها تكراراً
                لِما اختاره المستخدمُ في المنتقي فوقها مباشرة، فذهب الاثنان وبقيت **الحقائق**. */}
            {type !== null && (
              <p className="myhrq-typeline">
                <span className="myhrq-typeline__f">
                  {type.has_ledger_chain ? 'تُخصم من رصيدك' : 'لا تُخصم من رصيدك'}
                </span>
                {type.legal_reference !== null && (
                  <span className="myhrq-typeline__f" dir="ltr">{type.legal_reference}</span>
                )}
                {type.max_days_per_event !== null && (
                  <span className="myhrq-typeline__f">
                    حدُّها <span dir="ltr">{type.max_days_per_event}</span> يوماً
                  </span>
                )}
                {type.gender_restriction !== null && (
                  <span className="myhrq-typeline__f">{GENDER_HINTS[type.gender_restriction]}</span>
                )}
              </p>
            )}
          </div>

          {/* 🩸 أرقامُ هذين الحقلين يرسمها زِيُّ المتصفّح بلغة واجهته لا الصفحةُ — قِيس بستِّ
              صيغِ `lang`/`-webkit-locale` وسياقَي لغة (التفصيل في `leaveFormat`). ولذلك
              **لا `lang` هنا**، ويُعاد المدى بخطّ الوحدة في رأس لوح المعاينة أدناه. */}
          <div className="hr-field hr-field--row">
            <div className="hr-field">
              <label htmlFor="myhrq-start">من *</label>
              <input
                id="myhrq-start"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  // النهايةُ تُكمِل ما بدأه المستخدم: فارغةٌ ⇒ يومٌ واحد، وسابقةٌ ⇒ تُقوَّم.
                  if (end === '' || end < e.target.value) setEnd(e.target.value);
                }}
              />
            </div>
            <div className="hr-field">
              <label htmlFor="myhrq-end">إلى *</label>
              <input
                id="myhrq-end"
                type="date"
                min={start === '' ? undefined : start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {type?.requires_event_date === true && (
            <div className="hr-field">
              <label htmlFor="myhrq-event">تاريخُ الواقعة *</label>
              <input
                id="myhrq-event"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <span className="myhrq-fieldnote">
                تاريخُ الواقعة نفسِها (الزواج · الولادة · الوفاة) — به يُحسم الحدُّ النظاميّ.
              </span>
            </div>
          )}

          {needsDocument && (
            <div className="hr-field">
              <label htmlFor="myhrq-doc">المستندُ المرفق *</label>
              {/* 🔴 كان هنا نصٌّ يقول «سلّمه لإدارة المكتب» — لأن الرفعَ كان محصوراً
                  في OneDrive ومحروساً بصلاحيةٍ لا يملكها الموظف، فكان نوعٌ يستلزم
                  مرفقاً بابًا مقفلاً. الآن يرفعه بنفسه ويُخزَّن على خادمنا. */}
              {allDocuments.length > 0 && (
                <select
                  id="myhrq-doc"
                  value={documentId ?? ''}
                  onChange={(e) => setDocumentId(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">اختر مستنداً من ملفّك…</option>
                  {allDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {docLabel(doc)}
                    </option>
                  ))}
                </select>
              )}

              <label className="myhrq-upload">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = ''; // كي يقبل الملفَّ نفسَه ثانيةً بعد فشل
                    if (f) void handleUpload(f);
                  }}
                />
                <Paperclip size={13} aria-hidden="true" />
                <span>{uploading ? 'جارٍ الرفع…' : 'ارفع مستنداً جديداً'}</span>
              </label>

              {uploadError && <p className="myhrq-note myhrq-note--stop">{uploadError}</p>}

              {allDocuments.length === 0 && !uploading && (
                <p className="myhrq-note">
                  هذا النوع يستلزم مستنداً — ارفع صورةَ التقرير أو ملفَّ PDF (حتى ١٠ ميجابايت).
                </p>
              )}
            </div>
          )}

          <div className="hr-field">
            <label htmlFor="myhrq-reason">
              السبب {type?.requires_reason === true ? '*' : '(اختياريّ)'}
            </label>
            <textarea
              id="myhrq-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سطرٌ واحدٌ يكفي — يقرؤه من يعتمد الطلب"
            />
          </div>

          {/* ══ المعاينةُ الحيّة — أربعُ حالاتٍ متمايزة ══ */}
          <div className="myhrq-preview">
            <h4 className="myhrq-preview__t">
              <CalendarDays size={13} aria-hidden="true" /> ما سيُحتسب
              {/* المدى بخطّ الوحدة وأرقامها — القراءةُ المرجعية لِما التقطه المنتقي الأصليّ،
                  إذ أرقامُ ذاك يرسمها المتصفّحُ لا الصفحة. */}
              {previewInput !== null && (
                <span className="myhrq-preview__r">{fmtLeaveRange(start, end)}</span>
              )}
            </h4>

            {previewInput === null || (preview.isStale && preview.data === undefined) ? (
              <p className="myhrq-preview__idle">
                اختر المدى (من · إلى) ليُحتسب ما سيُخصم قبل أن ترسل.
              </p>
            ) : preview.isFetching && duration === undefined ? (
              <p className="myhrq-preview__idle" aria-busy="true">جارٍ الاحتساب…</p>
            ) : duration === undefined ? (
              <p className="myhrq-preview__idle">{preview.notice ?? 'تعذّر الاحتساب.'}</p>
            ) : zeroDays ? (
              /* 🔴 الصفرُ يُسمّى ولا يُرسم رقماً: «0.0 يوم عمل» رقمٌ يُقرأ نتيجةً، وهي ليست
                 نتيجةً بل عدمُها. والسطرُ يقول ما استُبعد بالاسم فيعرف المستخدمُ لماذا. */
              <>
                <p className="myhrq-preview__zero">لا أيّامَ عملٍ داخل هذا المدى.</p>
                <p className="myhrq-preview__d">
                  {excludedLabel(duration) || 'المدى كلُّه خارجَ أيام العمل.'} — بدِّل التاريخين
                  ليقعَ فيهما يومُ عملٍ واحدٌ على الأقل.
                </p>
              </>
            ) : (
              <>
                <p className="myhrq-preview__n">
                  <span className="myhrq-preview__v">{fmtDays(duration.duration_days)}</span>
                  <span className="myhrq-preview__u">
                    {fmtDurationUnit(duration.duration_days, isCalendarBasis)}
                    {!isCalendarBasis && <> {fmtCalendarSpan(duration.calendar_days)}</>}
                  </span>
                </p>

                <p className="myhrq-preview__d">
                  {isCalendarBasis
                    ? 'هذا النوع يجري بأيام التقويم — لا تُستثنى منه نهايةُ أسبوعٍ ولا عطلة.'
                    : excludedLabel(duration) || 'لا يومَ مستثنىً داخل المدى.'}
                </p>

                {balance !== undefined && balance.available && balance.after !== null ? (
                  <p className="myhrq-preview__b">
                    رصيدُك بعد اعتمادها:{' '}
                    <span className="myhrq-preview__bv">{fmtDays(balance.after)}</span>
                    {balance.before !== null && (
                      <span className="myhrq-preview__bd">{' '}(الآن {fmtDays(balance.before)})</span>
                    )}
                  </p>
                ) : (
                  <p className="myhrq-preview__b myhrq-preview__b--none">
                    هذا النوع لا سلسلةَ رصيدٍ له — لا يُخصم من رصيدك.
                  </p>
                )}

                {preview.notice !== null && <p className="myhrq-preview__idle">{preview.notice}</p>}
              </>
            )}
          </div>

          {preview.blockers.length > 0 && (
            <ul className="myhrq-flags">
              {preview.blockers.map((flag) => (
                <li className="myhrq-flag myhrq-flag--block" key={`b-${flag.code}`}>
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>{flag.message}</span>
                </li>
              ))}
            </ul>
          )}

          {preview.warnings.length > 0 && (
            <ul className="myhrq-flags">
              {preview.warnings.map((flag) => (
                <li className="myhrq-flag myhrq-flag--warn" key={`w-${flag.code}`}>
                  <Info size={13} aria-hidden="true" />
                  <span>{flag.message}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="myhrq-note">
            <Scale size={13} aria-hidden="true" />
            <span>
              الطلبُ يبقى <strong>معلَّقاً</strong> حتى يعتمده من يملك ذلك في مكتبك،
              و<strong>لا يُخصم من رصيدك قبل الاعتماد</strong>.
            </span>
          </p>
        </div>

        {/* 🔴 الزرُّ المعطَّلُ يقول سببَه تحته: زرٌّ ميّتٌ بلا سطرٍ يفسّره يُقرأ عطلاً في
            البرنامج. و`aria-describedby` يصل السببَ بالزرّ فيقرؤه قارئُ الشاشة معه. */}
        <div className="hr-modal__f myhrq-foot">
          <div className="myhrq-foot__btns">
            <button type="button" className="hr-btn" onClick={onClose}>إلغاء</button>
            <button
              type="button"
              className="hr-btn hr-btn--primary"
              onClick={() => { void submit(); }}
              disabled={cannotSend}
              aria-describedby={disabledWhy === null ? undefined : 'myhrq-why'}
            >
              {send.isPending ? 'جارٍ الإرسال…' : 'أرسِل الطلب'}
            </button>
          </div>
          {disabledWhy !== null && (
            <p className="myhrq-foot__why" id="myhrq-why">{disabledWhy}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestLeaveModal;
