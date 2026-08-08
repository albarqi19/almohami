import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { AppReminderHoursService } from '../../services/appReminderHoursService';
import type { AppReminderHoursState } from '../../services/appReminderHoursService';

/**
 * أوقات إشعارات التطبيق — **مستقلّةٌ عن ساعات الواتساب**.
 *
 * ‏والفصل مقصود: الواتساب رسالةٌ مدفوعة تقطع محادثات صاحبها فساعتُها مضبوطةٌ
 * ‏بحذر؛ والإشعار مجّانيٌّ يقع في درجٍ لا يقطع شيئاً فيحتمل إيقاعاً أكثر.
 * ‏وربطُهما بمفتاحٍ واحد يفرض على أحدهما قيدَ الآخر بلا سبب.
 *
 * ‏والقراءة لكلّ موظّف — يفيده أن يعرف متى تصله تذكيراتُه — والتحرير للمدير.
 */

function hourLabel(h: number): string {
  if (h === 0) return '١٢ منتصف الليل';
  if (h === 12) return '١٢ ظهراً';

  const twelve = h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? 'مساءً' : 'صباحاً';

  return `${twelve}:٠٠ ${suffix}`;
}

const AppReminderHoursSettings: React.FC = () => {
  const canEdit = usePermission('tenant.settings.manage') || usePermission('system.manage');

  const [state, setState] = useState<AppReminderHoursState | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await AppReminderHoursService.load();
      setState(s);
      setSelected(s.hours);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'تعذّر جلب أوقات الإشعارات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxSlots = state?.max_slots ?? 3;

  const toggle = useCallback(
    (hour: number) => {
      if (!canEdit) return;

      setSaved(false);
      setError(null);

      setSelected((prev) => {
        if (prev.includes(hour)) return prev.filter((h) => h !== hour);

        // ‏السقف يُحرَس هنا أيضاً — لا لنمنع الالتفاف بل لنمنع طلباً سيُردّ
        if (prev.length >= maxSlots) {
          setError(`لا يمكن اختيار أكثر من ${maxSlots} أوقات`);
          return prev;
        }

        return [...prev, hour].sort((a, b) => a - b);
      });
    },
    [canEdit, maxSlots],
  );

  const persist = useCallback(
    async (hours: number[]) => {
      setSaving(true);
      setError(null);

      try {
        const applied = await AppReminderHoursService.save(hours);
        setSelected(applied);
        setSaved(true);
      } catch (e: any) {
        setError(e?.message || 'تعذّر الحفظ');
        // ‏نُعيد التحميل لا نحتفظ بحالةٍ محلية كاذبة — ما يُعرض يجب أن يطابق الخادم
        await load();
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><Clock size={14} /></div>
        <span className="settings-section__title">أوقات إشعارات التطبيق</span>
      </div>

      <div className="settings-section__content">
        <div className="settings-option-card">
          <div className="settings-option-card__title">متى تصل التذكيرات؟</div>
          <div className="settings-option-card__desc">
            تذكيرُ جلسات الغد واليوم، والمهام المستحقّة والمتأخّرة — يصل الجوّال وتنبيهات
            الموقع في الأوقات المختارة هنا.
          </div>
          <div className="obc-limit">
            <AlertTriangle size={13} />
            <span>
              مستقلّةٌ تماماً عن <strong>ساعة إرسال الواتساب</strong> — تغييرُ أحدهما لا يمسّ
              الآخر. والمُهَل النظامية تصل فور اقترابها بغضّ النظر عن هذه الأوقات.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="obc-loading"><Loader2 size={16} className="obc-spin" /> جارٍ التحميل…</div>
        ) : (
          <div className="settings-option-card">
            <div className="obc-field__label">
              الأوقات
              <span className="obc-counter">{selected.length} / {maxSlots}</span>
            </div>

            <div className="arh-grid">
              {(state?.selectable ?? []).map((h) => {
                const on = selected.includes(h);

                return (
                  <button
                    key={h}
                    type="button"
                    className={`arh-slot${on ? ' arh-slot--on' : ''}`}
                    disabled={!canEdit || saving}
                    aria-pressed={on}
                    onClick={() => toggle(h)}
                  >
                    {hourLabel(h)}
                  </button>
                );
              })}
            </div>

            {error && <div className="obc-error"><AlertTriangle size={13} /> {error}</div>}
            {saved && !error && (
              <div className="obc-success"><CheckCircle2 size={14} /> حُفظت الأوقات.</div>
            )}

            {canEdit && (
              <div className="arh-actions">
                <button
                  type="button"
                  className="obc-btn obc-btn--primary"
                  disabled={saving || selected.length === 0}
                  onClick={() => persist(selected)}
                >
                  {saving ? <Loader2 size={14} className="obc-spin" /> : null}
                  {saving ? 'جارٍ الحفظ…' : 'حفظ الأوقات'}
                </button>

                <button
                  type="button"
                  className="arh-reset"
                  disabled={saving}
                  onClick={() => persist([])}
                  title="يعود المكتب إلى الوقت الافتراضي"
                >
                  <RotateCcw size={13} /> إعادة الافتراضي
                </button>
              </div>
            )}

            {!canEdit && (
              <div className="obc-hint">
                هذه الأوقات يضبطها مدير المكتب.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppReminderHoursSettings;
