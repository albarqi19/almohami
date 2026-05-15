// إعدادات قوالب الجلسات الافتراضية (لكل نوع جلسة)
// تُستهلك من /api/v1/settings/session-defaults
// تُطبَّق عند ضغط "استيراد قالب" في غرفة تحضير الجلسة

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle, ClipboardList, FileText, CheckCircle2 } from 'lucide-react';
import { SessionPrepService, type SessionDefaultsTemplates } from '../../services/sessionPrepService';

const SESSION_TYPES = [
  'نظر',
  'مرافعة',
  'نطق بالحكم',
  'صلح',
  'خبرة',
  'تبادل مذكرات',
  'أولى',
  'استئناف',
  'أخرى',
];

const MOTION_TAGS = [
  'إجرائي',
  'مستندي',
  'شاهد',
  'خبير',
  'تأجيل',
  'رد',
  'عارض',
  'أخرى',
];

type PrepItem = { title: string; notes?: string | null };
type MotionItem = { title: string; body?: string | null; tag?: string | null };

const SessionDefaultsSettings: React.FC = () => {
  const [activeType, setActiveType] = useState<string>('مرافعة');
  const [prepsByType, setPrepsByType] = useState<Record<string, PrepItem[]>>({});
  const [motionsByType, setMotionsByType] = useState<Record<string, MotionItem[]>>({});

  // الأنواع المعروضة = الأنواع المعيارية + أي مفاتيح موجودة فعلاً في البيانات (legacy/مخصصة)
  const displayedTypes = useMemo(() => {
    const set = new Set<string>(SESSION_TYPES);
    Object.keys(prepsByType).forEach((k) => set.add(k));
    Object.keys(motionsByType).forEach((k) => set.add(k));
    return Array.from(set);
  }, [prepsByType, motionsByType]);
  const [originalSnapshot, setOriginalSnapshot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ p: prepsByType, m: motionsByType }),
    [prepsByType, motionsByType]
  );
  const isDirty = currentSnapshot !== originalSnapshot;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await SessionPrepService.getTemplates();
        const preps = (data.preparations_by_type ?? {}) as Record<string, PrepItem[]>;
        const motions = (data.motions_by_type ?? {}) as Record<string, MotionItem[]>;
        setPrepsByType(preps);
        setMotionsByType(motions);
        setOriginalSnapshot(JSON.stringify({ p: preps, m: motions }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'فشل تحميل القوالب');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      // إزالة العناصر الفارغة قبل الإرسال
      const cleanPreps = Object.fromEntries(
        Object.entries(prepsByType)
          .map(([k, list]) => [k, list.filter((p) => p.title?.trim())])
          .filter(([, list]) => (list as PrepItem[]).length > 0)
      );
      const cleanMotions = Object.fromEntries(
        Object.entries(motionsByType)
          .map(([k, list]) => [k, list.filter((m) => m.title?.trim())])
          .filter(([, list]) => (list as MotionItem[]).length > 0)
      );

      const updated = await SessionPrepService.updateTemplates({
        preparations_by_type: cleanPreps as SessionDefaultsTemplates['preparations_by_type'],
        motions_by_type: cleanMotions as SessionDefaultsTemplates['motions_by_type'],
      });
      const newPreps = (updated.preparations_by_type ?? {}) as Record<string, PrepItem[]>;
      const newMotions = (updated.motions_by_type ?? {}) as Record<string, MotionItem[]>;
      setPrepsByType(newPreps);
      setMotionsByType(newMotions);
      setOriginalSnapshot(JSON.stringify({ p: newPreps, m: newMotions }));
      setSavedAt(Date.now());
      // إخفاء رسالة "تم الحفظ" بعد 3 ثوانٍ
      setTimeout(() => setSavedAt(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const addPrep = () => {
    setPrepsByType((prev) => ({
      ...prev,
      [activeType]: [...(prev[activeType] || []), { title: '', notes: '' }],
    }));
  };

  const updatePrep = (idx: number, patch: Partial<PrepItem>) => {
    setPrepsByType((prev) => ({
      ...prev,
      [activeType]: (prev[activeType] || []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  const removePrep = (idx: number) => {
    setPrepsByType((prev) => ({
      ...prev,
      [activeType]: (prev[activeType] || []).filter((_, i) => i !== idx),
    }));
  };

  const addMotion = () => {
    setMotionsByType((prev) => ({
      ...prev,
      [activeType]: [...(prev[activeType] || []), { title: '', body: '', tag: null }],
    }));
  };

  const updateMotion = (idx: number, patch: Partial<MotionItem>) => {
    setMotionsByType((prev) => ({
      ...prev,
      [activeType]: (prev[activeType] || []).map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  };

  const removeMotion = (idx: number) => {
    setMotionsByType((prev) => ({
      ...prev,
      [activeType]: (prev[activeType] || []).filter((_, i) => i !== idx),
    }));
  };

  const prepsList = prepsByType[activeType] || [];
  const motionsList = motionsByType[activeType] || [];

  if (loading) {
    return (
      <div className="sds-loading">
        <Loader2 size={18} className="sds-spin" />
        <span>جاري تحميل القوالب...</span>
      </div>
    );
  }

  return (
    <div className="sds">
      <div className="sds__header">
        <div className="sds__header-text">
          <h2>قوالب الجلسات الافتراضية</h2>
          <p>
            هذه القوالب تُستخدم عند ضغط <strong>"استيراد قالب افتراضي"</strong> داخل غرفة تحضير الجلسة،
            وتُملأ تلقائياً حسب نوع الجلسة المختار.
          </p>
        </div>
        <div className="sds__header-actions">
          {savedAt && (
            <span className="sds-saved-msg">
              <CheckCircle2 size={13} /> تم الحفظ
            </span>
          )}
          <button
            type="button"
            className="sds-btn sds-btn--primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? <Loader2 size={13} className="sds-spin" /> : <Save size={13} />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="sds-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* أنواع الجلسات (pills) */}
      <div className="sds__types">
        {displayedTypes.map((t) => {
          const hasPreps = (prepsByType[t] || []).length > 0;
          const hasMotions = (motionsByType[t] || []).length > 0;
          const count = (prepsByType[t]?.length || 0) + (motionsByType[t]?.length || 0);
          const isActive = activeType === t;
          return (
            <button
              key={t}
              type="button"
              className={`sds-type-pill ${isActive ? 'sds-type-pill--active' : ''}`}
              onClick={() => setActiveType(t)}
            >
              <span>{t}</span>
              {(hasPreps || hasMotions) && (
                <span className="sds-type-pill__badge">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sds__hint">
        تعرض حالياً قوالب نوع: <strong>{activeType}</strong>
      </div>

      {/* العمودان */}
      <div className="sds__columns">
        {/* تحضيرات */}
        <section className="sds-panel">
          <header className="sds-panel__head">
            <ClipboardList size={13} />
            <h3>تحضيرات افتراضية</h3>
            <span className="sds-panel__count">{prepsList.length}</span>
          </header>
          <div className="sds-panel__body">
            {prepsList.length === 0 && (
              <div className="sds-empty">
                <p>لا توجد تحضيرات افتراضية لنوع "{activeType}"</p>
                <p className="sds-empty__hint">أضف بنوداً تتكرّر عادة في هذا النوع من الجلسات.</p>
              </div>
            )}
            {prepsList.map((p, idx) => (
              <div key={idx} className="sds-item">
                <div className="sds-item__row">
                  <input
                    type="text"
                    className="sds-input"
                    placeholder="عنوان التحضير (مثال: مراجعة المذكرة النهائية)"
                    value={p.title}
                    onChange={(e) => updatePrep(idx, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    className="sds-icon-btn sds-icon-btn--danger"
                    onClick={() => removePrep(idx)}
                    aria-label="حذف"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  className="sds-textarea"
                  placeholder="ملاحظات اختيارية..."
                  rows={2}
                  value={p.notes || ''}
                  onChange={(e) => updatePrep(idx, { notes: e.target.value })}
                />
              </div>
            ))}
            <button type="button" className="sds-add-btn" onClick={addPrep}>
              <Plus size={12} />
              <span>إضافة تحضير</span>
            </button>
          </div>
        </section>

        {/* طلبات */}
        <section className="sds-panel">
          <header className="sds-panel__head">
            <FileText size={13} />
            <h3>طلبات إجرائية افتراضية</h3>
            <span className="sds-panel__count">{motionsList.length}</span>
          </header>
          <div className="sds-panel__body">
            {motionsList.length === 0 && (
              <div className="sds-empty">
                <p>لا توجد طلبات افتراضية لنوع "{activeType}"</p>
                <p className="sds-empty__hint">أضف طلبات إجرائية متوقعة (طلب تأجيل، استدعاء شاهد، ...).</p>
              </div>
            )}
            {motionsList.map((m, idx) => (
              <div key={idx} className="sds-item">
                <div className="sds-item__row">
                  <input
                    type="text"
                    className="sds-input"
                    placeholder="عنوان الطلب (مثال: طلب تأجيل الجلسة)"
                    value={m.title}
                    onChange={(e) => updateMotion(idx, { title: e.target.value })}
                  />
                  <select
                    className="sds-select"
                    value={m.tag || ''}
                    onChange={(e) => updateMotion(idx, { tag: e.target.value || null })}
                  >
                    <option value="">— التصنيف —</option>
                    {MOTION_TAGS.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="sds-icon-btn sds-icon-btn--danger"
                    onClick={() => removeMotion(idx)}
                    aria-label="حذف"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  className="sds-textarea"
                  placeholder="نص الطلب الاختياري..."
                  rows={2}
                  value={m.body || ''}
                  onChange={(e) => updateMotion(idx, { body: e.target.value })}
                />
              </div>
            ))}
            <button type="button" className="sds-add-btn" onClick={addMotion}>
              <Plus size={12} />
              <span>إضافة طلب</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SessionDefaultsSettings;
