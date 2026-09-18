import { useEffect, useState } from 'react';
import { ShieldCheck, PenLine, Info } from 'lucide-react';
import { eSignatureSettingsService, type ESignatureSettings as Data } from '../../services/signatureService';

/**
 * إعدادات التوقيع الإلكتروني للمكتب:
 *  - التوقيع العادي من بوابة العميل: يعمل دائماً.
 *  - التوقيع الموثّق عبر صادق (نفاذ): يظهر مفتاحه فقط إن أتاحته المنصّة للمكتب،
 *    ويستهلك رصيداً تشحنه المنصّة.
 */
export default function ESignatureSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    eSignatureSettingsService.get()
      .then((res) => setData(res.data))
      .catch((e: any) => setMsg({ kind: 'err', text: e?.message || 'تعذّر تحميل الإعدادات' }))
      .finally(() => setLoading(false));
  }, []);

  const toggleSadq = async (enabled: boolean) => {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await eSignatureSettingsService.update(enabled);
      setData(res.data);
      setMsg({ kind: 'ok', text: res.message || 'تم الحفظ' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'تعذّر الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--quiet-gray-500, #6b7280)' }}>جارٍ التحميل...</div>;
  if (!data) return <div style={{ padding: 16, color: 'var(--status-danger, #b91c1c)' }}>{msg?.text || 'تعذّر تحميل الإعدادات'}</div>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="settings-option-card">
        <div className="settings-option-card__title"><PenLine size={16} /> التوقيع الإلكتروني من بوابة العميل</div>
        <div className="settings-option-card__desc">
          عند إرسال عقد للتوقيع يصل العميل رابط لبوابته يرى فيه العقد ويوقّعه برسم توقيعه واسمه وإقراره بالموافقة. يُسجَّل وقت التوقيع وعنوان اتصاله، وتُحفظ نسخة PDF موقّعة لا تتغيّر. متاح دائماً بلا تفعيل.
        </div>
      </div>

      <div className="settings-option-card">
        <div className="settings-option-card__title"><ShieldCheck size={16} /> التوقيع الموثّق بهوية نفاذ عبر «صادق»</div>
        <div className="settings-option-card__desc">
          يتحقق من هوية العميل بتطبيق نفاذ ويعيد العقد موقّعاً مع شهادة توقيع من صادق. يُختار مع كل إرسال، ويستهلك توقيعاً واحداً من رصيد المكتب.
        </div>
        {data.sadq_available ? (
          <div className="settings-option-card__actions" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label className="settings-toggle">
              <input type="checkbox" checked={data.sadq_enabled} disabled={saving} onChange={(e) => void toggleSadq(e.target.checked)} />
              <span className="settings-toggle__slider"></span>
              <span style={{ marginRight: '12px' }}>{data.sadq_enabled ? 'مفعّل' : 'معطّل'}</span>
            </label>
            <span style={{ fontSize: 13, color: 'var(--quiet-gray-600, #4b5563)' }}>
              الرصيد المتبقي: <b>{data.sadq_credits}</b> توقيع
            </span>
            {data.sadq_enabled && !data.sadq_configured && (
              <span style={{ fontSize: 12, color: 'var(--status-warning, #b45309)' }}>خدمة صادق غير مضبوطة على المنصّة بعد</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13, color: 'var(--quiet-gray-500, #6b7280)', marginTop: 8 }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>غير متاح لمكتبكم بعد. تواصل مع المنصّة لتفعيله وشحن الرصيد.</span>
          </div>
        )}
      </div>

      {msg && (
        <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, background: msg.kind === 'ok' ? 'var(--status-success-bg, #ecfdf5)' : 'var(--status-danger-bg, #fef2f2)', color: msg.kind === 'ok' ? 'var(--status-success, #047857)' : 'var(--status-danger, #b91c1c)' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
