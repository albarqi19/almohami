import React, { useCallback, useEffect, useState } from 'react';
import { Percent, Loader2, AlertTriangle, CheckCircle2, Save, ShieldAlert } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import {
  VatRegistrationService,
  isValidTaxNumber,
  isSandboxTaxNumber,
  normalizeTaxNumber,
} from '../../services/vatRegistrationService';
import type { VatRegistrationState } from '../../services/vatRegistrationService';

/**
 * [TAX-01] التسجيل في ضريبة القيمة المضافة.
 *
 * ‏المفتاح `is_vat_registered` يحكم نسبة الضريبة في كل فاتورة وعقد يصدر بعده،
 * ‏وظلّ بلا شاشةٍ تكتبه: فبقي كلّ مكتب على الافتراضي «غير مسجَّل» ولو كان
 * ‏مسجَّلاً فعلاً، وخرجت فواتيره بنسبة صفر. هذه الشاشة هي السطح المفقود.
 *
 * ‏وثلاثة قيود تحكم تصميمها:
 *  ١ · لا تبديل صامت: التغيير يمسّ ما يدفعه عملاء المكتب، فيسبقه تأكيد صريح
 *      يذكر الأثر بنصّه.
 *  ٢ · لا تفعيل بلا رقم ضريبي نظامي: التفعيل بالخطأ يُنتج فواتير بـ١٥٪ لا
 *      يستحقّها المكتب ولا تُصحَّح بعد إرسالها إلا بإشعار دائن. أمّا الإيقاف
 *      فلا يُمنع أبداً — منعه يحبس مكتباً شُطب تسجيله.
 *  ٣ · لا اشتقاق من الرقم الضريبي: وجوده شرطٌ ضروري لا كافٍ. الرقم يُدخَل
 *      للعرض في الترويسة أحياناً، ويُستورَد آلياً أحياناً، وقد يكون رقم بيئة
 *      الاختبار التجريبي. فالجواب يبقى إقراراً من المكتب لا استنتاجاً.
 */
const VatRegistrationSettings: React.FC = () => {
  const canEdit = usePermission('tenant.settings.manage') || usePermission('system.manage');

  const [state, setState] = useState<VatRegistrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTaxNumber, setSavingTaxNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // مسوّدات الحقول — منفصلة عن الحالة المحفوظة كي يظهر «غير محفوظ» بوضوح
  const [taxNumberDraft, setTaxNumberDraft] = useState('');
  const [rateDraft, setRateDraft] = useState('15');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await VatRegistrationService.load();
      setState(s);
      setTaxNumberDraft(s.taxNumber);
      setRateDraft(s.defaultVatRate);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'تعذّر جلب الحالة الضريبية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4000);
  };

  const savedTaxNumber = state?.taxNumber ?? '';
  const taxNumberDirty = normalizeTaxNumber(taxNumberDraft) !== normalizeTaxNumber(savedTaxNumber);
  const rateDirty = rateDraft !== (state?.defaultVatRate ?? '15');

  // الحكم يقع على الرقم **المحفوظ** لا على المسوّدة: الخادم يقرأ المحفوظ،
  // ورقمٌ صحيح في الصندوق ولم يُحفظ بعدُ لا يعني شيئاً.
  const taxNumberValid = isValidTaxNumber(savedTaxNumber);
  const taxNumberIsSandbox = isSandboxTaxNumber(savedTaxNumber);
  const draftValid = isValidTaxNumber(taxNumberDraft);

  const isRegistered = !!state?.isVatRegistered;

  // سبب منع التفعيل — يُعرض نصّاً بدل زرٍّ مطفأ بلا تفسير
  let blockReason: string | null = null;
  if (!isRegistered) {
    if (!savedTaxNumber.trim()) {
      blockReason = 'أدخل الرقم الضريبي للمكتب واحفظه أولاً، ثم فعّل التسجيل.';
    } else if (!taxNumberValid) {
      blockReason =
        'الرقم الضريبي المحفوظ لا يطابق الصيغة النظامية (١٥ رقماً تبدأ بـ3 وتنتهي بـ3). صحّحه قبل التفعيل.';
    } else if (taxNumberIsSandbox) {
      blockReason =
        'الرقم الضريبي المحفوظ هو الرقم التجريبي المنشور لبيئة اختبار هيئة الزكاة والضريبة والجمارك، وليس رقم تسجيل. أدخل رقم المكتب الفعلي.';
    }
  }

  const saveTaxNumber = async () => {
    setSavingTaxNumber(true);
    setError(null);
    try {
      const saved = await VatRegistrationService.saveTaxNumber(taxNumberDraft);
      setState((prev) => (prev ? { ...prev, taxNumber: saved } : prev));
      setTaxNumberDraft(saved);
      flash('تم حفظ الرقم الضريبي');
    } catch (e: any) {
      setError(e?.message || 'تعذّر حفظ الرقم الضريبي');
    } finally {
      setSavingTaxNumber(false);
    }
  };

  const saveRate = async () => {
    if (!state) return;
    const numeric = Number(rateDraft);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      setError('نسبة الضريبة يجب أن تكون رقماً بين 0 و 100');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await VatRegistrationService.save({
        isVatRegistered: state.isVatRegistered,
        defaultVatRate: rateDraft,
      });
      setState({ ...state, defaultVatRate: rateDraft });
      flash('تم حفظ النسبة الافتراضية');
    } catch (e: any) {
      setError(e?.message || 'تعذّر حفظ النسبة');
    } finally {
      setSaving(false);
    }
  };

  const applyToggle = async () => {
    if (!state) return;
    const next = !state.isVatRegistered;
    setSaving(true);
    setError(null);
    try {
      await VatRegistrationService.save({
        isVatRegistered: next,
        defaultVatRate: rateDraft,
      });
      setState({ ...state, isVatRegistered: next, defaultVatRate: rateDraft });
      setConfirming(false);
      flash(
        next
          ? 'تم تفعيل التسجيل الضريبي — الفواتير والعقود الجديدة ستحمل الضريبة'
          : 'تم إيقاف التسجيل الضريبي — الفواتير والعقود الجديدة ستصدر بنسبة صفر',
      );
    } catch (e: any) {
      setError(e?.message || 'تعذّر حفظ الحالة الضريبية');
    } finally {
      setSaving(false);
    }
  };

  const noticeBox = (tone: 'warn' | 'info' | 'ok'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.8,
    border: '1px solid var(--color-border)',
    background:
      tone === 'warn'
        ? 'var(--status-orange-light, rgba(217,119,6,.1))'
        : tone === 'ok'
          ? 'var(--status-green-light, rgba(5,150,105,.1))'
          : 'var(--color-bg-secondary)',
    color:
      tone === 'warn'
        ? 'var(--status-orange, #D97706)'
        : tone === 'ok'
          ? 'var(--status-green, #059669)'
          : 'var(--color-text)',
  });

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon">
          <Percent size={14} />
        </div>
        <span className="settings-section__title">التسجيل في ضريبة القيمة المضافة</span>
      </div>

      <div className="settings-section__content">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
            <Loader2 className="animate-spin" size={20} />
            <span>جاري تحميل الحالة الضريبية...</span>
          </div>
        ) : !state ? (
          <div style={noticeBox('warn')}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error || 'تعذّر تحميل الحالة الضريبية'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* الحالة الحالية */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                padding: '12px 14px',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  الحالة الحالية
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isRegistered ? 'var(--status-green, #059669)' : 'var(--color-text)',
                  }}
                >
                  {isRegistered ? 'المكتب مسجَّل في ضريبة القيمة المضافة' : 'المكتب غير مسجَّل'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                نسبة الفواتير الجديدة:{' '}
                <strong style={{ color: 'var(--law-navy)' }}>
                  {isRegistered ? `${state.defaultVatRate}%` : '0%'}
                </strong>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.9 }}>
              هذا الإعداد يحدّد نسبة الضريبة في كل فاتورة وكل عقد يصدر بعده. المكتب المسجَّل تخرج
              فواتيره بنسبة {state.defaultVatRate}% وتُسمّى «فاتورة ضريبية» في المستند المطبوع، وغير
              المسجَّل تخرج فواتيره بنسبة صفر. التغيير{' '}
              <strong style={{ color: 'var(--color-text)' }}>لا يمسّ فاتورة أو عقداً صدر قبله</strong> —
              المستند الذي سُلّم للعميل يبقى كما هو.
            </p>

            {/* الرقم الضريبي */}
            <div className="settings-field">
              <span className="settings-field__label">الرقم الضريبي للمكتب</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="settings-field__input"
                  style={{ flex: 1, minWidth: 220, direction: 'ltr', textAlign: 'left' }}
                  placeholder="300000000000003"
                  value={taxNumberDraft}
                  onChange={(e) => setTaxNumberDraft(e.target.value)}
                  disabled={!canEdit || savingTaxNumber}
                />
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={saveTaxNumber}
                  disabled={!canEdit || savingTaxNumber || !taxNumberDirty}
                >
                  {savingTaxNumber ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  حفظ الرقم
                </button>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: taxNumberDraft && !draftValid ? 'var(--status-orange, #D97706)' : 'var(--color-text-secondary)',
                }}
              >
                {taxNumberDraft && !draftValid
                  ? 'الصيغة النظامية: ١٥ رقماً تبدأ بـ3 وتنتهي بـ3'
                  : 'يظهر في الفواتير الضريبية وفي ترويسة العقود. ١٥ رقماً تبدأ بـ3 وتنتهي بـ3.'}
              </span>
            </div>

            {/* النسبة الافتراضية — لا معنى لها لغير المسجَّل */}
            {isRegistered && (
              <div className="settings-field">
                <span className="settings-field__label">النسبة الافتراضية %</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className="settings-field__input"
                    style={{ width: 140 }}
                    value={rateDraft}
                    onChange={(e) => setRateDraft(e.target.value)}
                    disabled={!canEdit || saving}
                  />
                  <button
                    className="settings-btn settings-btn--primary"
                    onClick={saveRate}
                    disabled={!canEdit || saving || !rateDirty}
                  >
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    حفظ النسبة
                  </button>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  النسبة النظامية في المملكة 15%. لا تغيّرها إلا لسبب تعرفه.
                </span>
              </div>
            )}

            {/* تناقض ZATCA — هو بعينه ما يُعطّل إرسال الفواتير */}
            {state.zatcaEnabled && !isRegistered && (
              <div style={noticeBox('warn')}>
                <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  الفوترة الإلكترونية (ZATCA
                  {state.zatcaEnvironment ? ` — بيئة ${state.zatcaEnvironment}` : ''}) مفعّلة للمكتب
                  بينما حالته «غير مسجَّل ضريبياً». في هذا الوضع تخرج كل فاتورة بنسبة صفر بلا سبب
                  إعفاء، فيرفضها الفحص قبل الإرسال إلى الهيئة وتبقى عالقة. إن كان المكتب مسجَّلاً
                  فعلاً ففعّل التسجيل هنا، وإن لم يكن مسجَّلاً فالفوترة الإلكترونية لا تلزمه.
                </span>
              </div>
            )}

            {/* تحذير الرقم التجريبي */}
            {taxNumberIsSandbox && (
              <div style={noticeBox('warn')}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  الرقم الضريبي المحفوظ هو الرقم التجريبي المنشور لبيئة اختبار الهيئة، وغالباً أُدخل
                  أثناء تجربة الربط. استبدله برقم المكتب الفعلي.
                </span>
              </div>
            )}

            {/* التبديل — بتأكيد صريح لا بمفتاح صامت */}
            <div
              style={{
                padding: '14px',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {confirming ? (
                <>
                  <div style={noticeBox('warn')}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {isRegistered ? (
                        <>
                          إيقاف التسجيل يجعل كل فاتورة وكل عقد جديد يصدر{' '}
                          <strong>بنسبة صفر بلا ضريبة</strong>. إن كان المكتب مسجَّلاً فعلاً فسيحصّل
                          أقلّ ممّا يستحق، ويتحمّل الفرق أمام الهيئة. لا تفعل ذلك إلا إن شُطب تسجيل
                          المكتب.
                        </>
                      ) : (
                        <>
                          التفعيل يجعل كل فاتورة وكل عقد جديد يحمل{' '}
                          <strong>ضريبة {rateDraft}% تُضاف على العميل</strong>، ويُسمّى المستند
                          المطبوع «فاتورة ضريبية». وتحصيل الضريبة دون تسجيل فعلي في الهيئة مخالفة
                          نظامية، فلا تفعّله إلا إن كان المكتب مسجَّلاً بالفعل.
                        </>
                      )}
                      <br />
                      الفواتير والعقود الصادرة قبل الآن لا تتغيّر.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className={`settings-btn ${isRegistered ? 'settings-btn--danger' : 'settings-btn--primary'}`}
                      onClick={applyToggle}
                      disabled={saving}
                    >
                      {saving && <Loader2 className="animate-spin" size={14} />}
                      {isRegistered ? 'تأكيد الإيقاف' : 'تأكيد التفعيل'}
                    </button>
                    <button
                      className="settings-btn settings-btn--secondary"
                      onClick={() => setConfirming(false)}
                      disabled={saving}
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    className={`settings-btn ${isRegistered ? 'settings-btn--danger' : 'settings-btn--primary'}`}
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setConfirming(true)}
                    disabled={!canEdit || !!blockReason}
                  >
                    {isRegistered ? 'إيقاف التسجيل الضريبي' : 'تفعيل التسجيل الضريبي'}
                  </button>

                  {!canEdit && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      لا تملك صلاحية تعديل إعدادات المكتب — العرض للاطلاع فقط.
                    </span>
                  )}

                  {canEdit && blockReason && (
                    <span style={{ fontSize: 12, color: 'var(--status-orange, #D97706)', lineHeight: 1.8 }}>
                      {blockReason}
                    </span>
                  )}
                </>
              )}
            </div>

            {error && (
              <div style={noticeBox('warn')}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div style={noticeBox('ok')}>
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VatRegistrationSettings;
