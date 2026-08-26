// إعداداتُ قوالب «تقرير القضية»: الأشكالُ الستّةُ وأقسامُها ونصوصُها الثابتة.
import React, { useEffect, useState } from 'react';
import { Eye, Loader2, Save, Star, Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  caseReportService,
  CASE_REPORT_LAYOUT_HINTS,
  type CaseReportLayout,
  type CaseReportTemplate,
} from '../../services/caseReportService';

const CaseReportTemplatesSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<CaseReportTemplate[]>([]);
  const [layouts, setLayouts] = useState<Record<string, string>>({});
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  /**
   * ⚠️ الافتراضيّاتُ ليست زينة. ما يُرسَم في المستند هو
   * `array_merge(DEFAULT_SHOW_FIELDS, show_fields)`، والقوالبُ المبذورة تُخزَّن
   * بـ`show_fields = null` أو بمفتاحٍ واحد بينما عشرةٌ من ثلاثةَ عشرَ قسماً
   * افتراضُها مشتعل. فقراءةُ العمود الخام تُظهر الأقسامَ كلَّها **مطفأةً** وهي
   * تعمل — فيظنّ المسؤولُ القالبَ فارغاً ويُخرج للعميل أقساماً لم يفعّلها.
   */
  const [defaultFields, setDefaultFields] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CaseReportTemplate>>({});

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const load = async (keepId?: number) => {
    setLoading(true);
    try {
      const res = await caseReportService.listTemplates();
      const list = res.data ?? [];
      setTemplates(list);
      setLayouts(res.meta?.layouts ?? {});
      setFieldLabels(res.meta?.field_labels ?? {});
      setDefaultFields(res.meta?.default_fields ?? {});

      const pick = list.find((t) => t.id === keepId) ?? list.find((t) => t.is_default) ?? list[0];
      if (pick) {
        setSelectedId(pick.id);
        setDraft(pick);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر تحميل القوالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pickTemplate = (t: CaseReportTemplate) => {
    setSelectedId(t.id);
    setDraft(t);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await caseReportService.updateTemplate(selected.id, {
        name: draft.name,
        layout: draft.layout,
        show_fields: draft.show_fields ?? null,
        intro_text: draft.intro_text ?? null,
        closing_text: draft.closing_text ?? null,
        accent_color: draft.accent_color ?? null,
        watermark_override: draft.watermark_override ?? null,
        sessions_limit: draft.sessions_limit ?? 0,
        activities_limit: draft.activities_limit ?? 10,
        redact_pii: draft.redact_pii ?? true,
        is_active: draft.is_active ?? true,
        description: draft.description ?? null,
      });
      toast.success('حُفظ القالب');
      await load(selected.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  /** الحالةُ المعروضة = الافتراضيُّ ثم اختيارُ القالب فوقه — كما يحلّها الخادم. */
  const fieldOn = (key: string): boolean =>
    (draft.show_fields ?? {})[key] ?? (defaultFields[key] ?? false);

  const toggleField = (key: string) => {
    // نبدأ من الدمج كي يُكتب المفتاحُ المعاكسُ صراحةً، فلا يعود القسمُ
    // للافتراضيّ بعد إطفائه بنقرة.
    const cur = { ...defaultFields, ...(draft.show_fields ?? {}) };
    cur[key] = !fieldOn(key);
    setDraft({ ...draft, show_fields: cur });
  };

  if (loading) {
    return (
      <div className="crm-empty">
        <Loader2 size={16} className="crm-spin" /> جارٍ تحميل القوالب…
      </div>
    );
  }

  return (
    <div>
      <p className="crm-hint">
        لكلِّ شكلٍ قالبٌ مستقلّ. عدِّل الأقسامَ والنصوصَ الثابتة، وعايِن النتيجةَ ببياناتٍ تجريبية
        قبل أن تعتمدها. القالبُ الافتراضيُّ هو ما يُفتح به تقريرٌ جديد.
      </p>

      <div className="crm-sec">القوالب</div>
      <div className="crm-layouts">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`crm-layout${t.id === selectedId ? ' crm-layout--on' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => pickTemplate(t)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pickTemplate(t);
              }
            }}
          >
            <div className="crm-layout__t">
              {t.name}
              {t.is_default && <Star size={11} fill="currentColor" />}
              {t.layout === 'ai_letter' && <span className="crm-layout__ai">ذكاء</span>}
            </div>
            <p className="crm-layout__d">
              {t.description || CASE_REPORT_LAYOUT_HINTS[t.layout]}
            </p>
            <button
              type="button"
              className="crm-layout__prev"
              onClick={(e) => {
                e.stopPropagation();
                caseReportService.openTemplatePreview(t.id).catch(() => toast.error('تعذّرت المعاينة'));
              }}
            >
              <Eye size={11} /> معاينة
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="crm-sec">تعديلُ «{selected.name}»</div>

          <div className="crm-field">
            <label className="crm-label">اسم القالب</label>
            <input
              className="crm-input"
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">الشكل</label>
            <select
              className="crm-input"
              value={draft.layout ?? 'tabular'}
              onChange={(e) => setDraft({ ...draft, layout: e.target.value as CaseReportLayout })}
            >
              {Object.entries(layouts).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <p className="crm-hint" style={{ marginTop: 5 }}>
              {CASE_REPORT_LAYOUT_HINTS[(draft.layout ?? 'tabular') as CaseReportLayout]}
            </p>
          </div>

          <div className="crm-sec">الأقسامُ الظاهرة</div>
          <div className="crm-fields">
            {Object.entries(fieldLabels).map(([key, label]) => (
              <label key={key} className="crm-check">
                <input
                  type="checkbox"
                  checked={fieldOn(key)}
                  onChange={() => toggleField(key)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="crm-sec">النصوصُ الثابتة</div>
          <div className="crm-field">
            <label className="crm-label">تمهيدٌ قبل الأقسام (اختياري)</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 70 }}
              value={draft.intro_text ?? ''}
              onChange={(e) => setDraft({ ...draft, intro_text: e.target.value })}
            />
          </div>
          <div className="crm-field">
            <label className="crm-label">خاتمةٌ محايدة (اختياري)</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 60 }}
              value={draft.closing_text ?? ''}
              onChange={(e) => setDraft({ ...draft, closing_text: e.target.value })}
            />
          </div>

          <div className="crm-sec">إعداداتٌ أخرى</div>
          <div className="crm-fields">
            <div className="crm-field">
              <label className="crm-label">حدُّ الجلسات المعروضة (0 = الكلّ)</label>
              <input
                className="crm-input"
                type="number"
                min={0}
                max={500}
                value={draft.sessions_limit ?? 0}
                onChange={(e) => setDraft({ ...draft, sessions_limit: Number(e.target.value) })}
              />
            </div>
            <div className="crm-field">
              <label className="crm-label">حدُّ النشاطات حين لا يُنتقى شيء</label>
              <input
                className="crm-input"
                type="number"
                min={0}
                max={100}
                value={draft.activities_limit ?? 10}
                onChange={(e) => setDraft({ ...draft, activities_limit: Number(e.target.value) })}
              />
            </div>
            <div className="crm-field">
              <label className="crm-label">لونُ الهوية (اختياري)</label>
              <input
                className="crm-input"
                placeholder="#1f3a5f"
                value={draft.accent_color ?? ''}
                onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
              />
            </div>
          </div>

          <label className="crm-check">
            <input
              type="checkbox"
              checked={draft.redact_pii ?? true}
              onChange={(e) => setDraft({ ...draft, redact_pii: e.target.checked })}
            />
            حجبُ أرقام الهوية في المستند
          </label>

          <div className="crm-footer" style={{ marginTop: 14, borderTop: 0, padding: 0, background: 'transparent' }}>
            <div className="crm-footer__l">
              <button type="button" className="crm-btn crm-btn--primary" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 size={13} className="crm-spin" /> : <Save size={13} />} حفظ
              </button>
              <button
                type="button"
                className="crm-btn"
                disabled={selected.is_default}
                onClick={async () => {
                  try {
                    await caseReportService.setTemplateDefault(selected.id);
                    toast.success('صار افتراضياً');
                    await load(selected.id);
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'تعذّر التعيين');
                  }
                }}
              >
                <Star size={13} /> تعيينه افتراضياً
              </button>
            </div>
            <div className="crm-footer__r">
              <button
                type="button"
                className="crm-btn"
                onClick={async () => {
                  try {
                    const res = await caseReportService.duplicateTemplate(selected.id);
                    toast.success('نُسخ القالب');
                    await load(res.data.id);
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'تعذّر النسخ');
                  }
                }}
              >
                <Copy size={13} /> نسخ
              </button>
              <button
                type="button"
                className="crm-btn"
                disabled={selected.is_default}
                title={selected.is_default ? 'لا يُحذف القالبُ الافتراضي' : undefined}
                onClick={async () => {
                  if (!window.confirm(`حذفُ القالب «${selected.name}»؟`)) return;
                  try {
                    await caseReportService.removeTemplate(selected.id);
                    toast.success('حُذف القالب');
                    await load();
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'تعذّر الحذف');
                  }
                }}
              >
                <Trash2 size={13} /> حذف
              </button>
            </div>
          </div>
        </>
      )}

      {templates.length === 0 && (
        <div className="crm-empty">
          <Plus size={16} /> لا قوالبَ بعد — أعِد تحميل الصفحة لبذر الأشكال الستّة.
        </div>
      )}
    </div>
  );
};

export default CaseReportTemplatesSettings;
