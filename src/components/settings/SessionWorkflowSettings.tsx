// إعدادات سير عمل الجلسات (كشف + تذكير ما بعد الجلسة)
// يحفظ في tenant_settings عبر /api/v1/settings/session-workflow

import React, { useEffect, useMemo, useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2, Bell, FileSearch, Info } from 'lucide-react';
import { SessionPrepService, type SessionWorkflowSettings as Settings } from '../../services/sessionPrepService';

const DEFAULT_TEMPLATE_PLACEHOLDER = `تذكير من نظام "الرائد":
مرّ {hours} ساعة على انتهاء جلسة "{session_type}" في القضية #{case_id}، ولم يتم تحديث القضية بعد.
الرجاء إضافة ملاحظات أو تقرير ما حدث في الجلسة.`;

const SessionWorkflowSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty = useMemo(
    () => settings && JSON.stringify(settings) !== originalSnapshot,
    [settings, originalSnapshot]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await SessionPrepService.getWorkflowSettings();
        setSettings(data);
        setOriginalSnapshot(JSON.stringify(data));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'فشل تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await SessionPrepService.updateWorkflowSettings(settings);
      setSettings(updated);
      setOriginalSnapshot(JSON.stringify(updated));
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="sws-loading">
        <Loader2 size={16} className="sws-spin" />
        <span>جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="sws">
      <header className="sws__header">
        <div className="sws__header-text">
          <h2>سير عمل الجلسات</h2>
          <p>إعدادات التذكيرات والتوليد التلقائي لكشف الجلسة.</p>
        </div>
        <div className="sws__header-actions">
          {savedAt && (
            <span className="sws-saved-msg">
              <CheckCircle2 size={13} /> تم الحفظ
            </span>
          )}
          <button
            type="button"
            className="sws-btn sws-btn--primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? <Loader2 size={13} className="sws-spin" /> : <Save size={13} />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="sws-error">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* قسم: كشف الجلسة */}
      <section className="sws-section">
        <header className="sws-section__head">
          <FileSearch size={13} />
          <h3>كشف الجلسة (التوليد التلقائي)</h3>
        </header>
        <div className="sws-section__body">
          <label className="sws-toggle">
            <input
              type="checkbox"
              checked={settings.ai_pre_session_brief_enabled}
              onChange={(e) =>
                setSettings({ ...settings, ai_pre_session_brief_enabled: e.target.checked })
              }
            />
            <span className="sws-toggle__slider" />
            <div className="sws-toggle__text">
              <span className="sws-toggle__title">تفعيل التوليد التلقائي</span>
              <span className="sws-toggle__desc">
                يقوم النظام بتوليد كشف الجلسة تلقائياً قبل 48 ساعة من موعد كل جلسة قادمة (نافذة 36-60 ساعة).
              </span>
            </div>
          </label>
          <div className="sws-info">
            <Info size={11} />
            <span>
              لا يُلمس الجلسات المنتهية. يمكن دائماً التوليد اليدوي بالضغط على "توليد كشف الجلسة" داخل غرفة التحضير.
            </span>
          </div>
        </div>
      </section>

      {/* قسم: تذكير ما بعد الجلسة */}
      <section className="sws-section">
        <header className="sws-section__head">
          <Bell size={13} />
          <h3>تذكير المحامي بعد انتهاء الجلسة</h3>
        </header>
        <div className="sws-section__body">
          <label className="sws-toggle">
            <input
              type="checkbox"
              checked={settings.post_session_reminder_enabled}
              onChange={(e) =>
                setSettings({ ...settings, post_session_reminder_enabled: e.target.checked })
              }
            />
            <span className="sws-toggle__slider" />
            <div className="sws-toggle__text">
              <span className="sws-toggle__title">تفعيل التذكير</span>
              <span className="sws-toggle__desc">
                يُرسل النظام تذكيراً للمحامي عبر واتساب إذا لم يقم بتحديث القضية بعد انتهاء الجلسة بـ X ساعة.
              </span>
            </div>
          </label>

          <div
            className={`sws-field-row ${!settings.post_session_reminder_enabled ? 'sws-field-row--disabled' : ''}`}
          >
            <label className="sws-field">
              <span className="sws-field__label">عدد الساعات بعد انتهاء الجلسة</span>
              <div className="sws-field__input-wrap">
                <input
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  className="sws-input"
                  value={settings.post_session_reminder_hours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      post_session_reminder_hours: Math.max(1, Math.min(168, Number(e.target.value) || 24)),
                    })
                  }
                  disabled={!settings.post_session_reminder_enabled}
                />
                <span className="sws-field__suffix">ساعة</span>
              </div>
              <span className="sws-field__hint">
                مقترح: 24 ساعة. يُسمح من 1 إلى 168 ساعة (أسبوع).
              </span>
            </label>
          </div>

          <div className={`sws-field ${!settings.post_session_reminder_enabled ? 'sws-field-row--disabled' : ''}`}>
            <span className="sws-field__label">قالب رسالة التذكير (اختياري)</span>
            <textarea
              className="sws-textarea"
              rows={4}
              placeholder={DEFAULT_TEMPLATE_PLACEHOLDER}
              value={settings.post_session_reminder_message || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  post_session_reminder_message: e.target.value || null,
                })
              }
              disabled={!settings.post_session_reminder_enabled}
            />
            <span className="sws-field__hint">
              المتغيرات المتاحة:{' '}
              <code>{'{hours}'}</code>, <code>{'{session_type}'}</code>, <code>{'{session_date}'}</code>,{' '}
              <code>{'{court}'}</code>, <code>{'{case_id}'}</code>, <code>{'{case_title}'}</code>
            </span>
          </div>

          <div className="sws-info">
            <Info size={11} />
            <span>
              "تحديث القضية" = أي إضافة لملاحظة، مهمة، مستند، أو تعديل بيانات القضية بعد تاريخ الجلسة.
              نافذة التذكير: 7 أيام من انتهاء الجلسة، ولا يُرسل التذكير مرتين.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SessionWorkflowSettingsComponent;
