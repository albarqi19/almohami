// إعدادات «قوالب تقرير الجلسة» — عرض/إنشاء/تعديل/تعيين افتراضي/معاينة PDF.
// تُستهلك من /api/v1/session-report-templates

import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Save, Loader2, AlertCircle, FileText, CheckCircle2,
  Star, Eye, Copy, X, Pencil,
} from 'lucide-react';
import {
  sessionReportService,
  SESSION_REPORT_FIELD_LABELS,
  type SessionReportTemplate,
  type SessionReportTemplateType,
  type SessionReportDeliveryMode,
} from '../../services/sessionReportService';
import { LetterheadService } from '../../services/letterheadService';

const TYPE_LABELS: Record<SessionReportTemplateType, string> = {
  formal_summary: 'ملخص رسمي (ذكي)',
  full_dabt: 'الضبط الكامل',
  custom: 'مخصّص',
};

const MODE_LABELS: Record<SessionReportDeliveryMode, string> = {
  auto_enhanced: 'يُولَّد ويُرسل تلقائياً',
  save_only: 'يُولَّد للمراجعة ثم يُرسل يدوياً',
  raw: 'الضبط الخام كما هو',
};

type EditDraft = Partial<SessionReportTemplate> & { show_fields?: Record<string, boolean> };

const blankDraft = (): EditDraft => ({
  name: '',
  type: 'formal_summary',
  delivery_mode: 'save_only',
  show_fields: Object.keys(SESSION_REPORT_FIELD_LABELS).reduce(
    (acc, k) => ({ ...acc, [k]: true }),
    {} as Record<string, boolean>,
  ),
  intro_text: '',
  closing_text: '',
  accent_color: '#1f3a5f',
  watermark_override: '',
  redact_pii: true,
  is_active: true,
  is_default: false,
});

const SessionReportTemplatesSettings: React.FC = () => {
  const [templates, setTemplates] = useState<SessionReportTemplate[]>([]);
  const [letterheads, setLetterheads] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);

  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sessionReportService.list();
      setTemplates(res.data ?? []);
      // تحميل الكليشات (للاختيار في القالب) — لا يُفشل التحميل لو تعذّر.
      try {
        const lhRes = (await LetterheadService.getAll({ is_active: true })) as unknown as {
          data?: { id: number; name: string }[] | { data?: { id: number; name: string }[] };
        };
        const raw = lhRes?.data;
        const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setLetterheads(list.map((l) => ({ id: l.id, name: l.name })));
      } catch {
        setLetterheads([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل القوالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setEditing(blankDraft());
  };

  const openEdit = (t: SessionReportTemplate) => {
    setEditingId(t.id);
    setEditing({
      ...t,
      show_fields: { ...Object.keys(SESSION_REPORT_FIELD_LABELS).reduce(
        (acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>,
      ), ...(t.show_fields ?? {}) },
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditingId(null);
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      setError('اسم القالب مطلوب');
      return;
    }
    try {
      setBusyId(editingId ?? 'new');
      setError(null);
      if (editingId) {
        await sessionReportService.update(editingId, editing);
        flash('تم تحديث القالب');
      } else {
        await sessionReportService.create(editing);
        flash('تم إنشاء القالب');
      }
      closeEdit();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setBusyId(null);
    }
  };

  const setDefault = async (t: SessionReportTemplate) => {
    try {
      setBusyId(t.id);
      await sessionReportService.setDefault(t.id);
      flash(`«${t.name}» أصبح القالب الافتراضي`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذّر التعيين');
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (t: SessionReportTemplate) => {
    try {
      setBusyId(t.id);
      await sessionReportService.duplicate(t.id);
      flash('تم نسخ القالب');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذّر النسخ');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: SessionReportTemplate) => {
    if (t.is_default) {
      setError('لا يمكن حذف القالب الافتراضي. عيّن قالباً آخر افتراضياً أولاً.');
      return;
    }
    if (!window.confirm(`حذف القالب «${t.name}»؟`)) return;
    try {
      setBusyId(t.id);
      await sessionReportService.remove(t.id);
      flash('تم حذف القالب');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذّر الحذف');
    } finally {
      setBusyId(null);
    }
  };

  const preview = async (t: SessionReportTemplate) => {
    try {
      setBusyId(t.id);
      await sessionReportService.openPreview(t.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'تعذّر فتح المعاينة');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="srt">
      <div className="srt__head">
        <div>
          <h3 className="srt__title"><FileText size={18} /> قوالب تقرير الجلسة</h3>
          <p className="srt__sub">
            القوالب التي تُرسَل للعميل كـ PDF بكليشة المكتب وعلامة مائية. القالب الافتراضي
            يُستخدم تلقائياً عند الإرسال ما لم تختر غيره.
          </p>
        </div>
        <button className="srt__btn srt__btn--primary" onClick={openCreate}>
          <Plus size={16} /> قالب جديد
        </button>
      </div>

      {error && (
        <div className="srt__alert srt__alert--error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="srt__alert srt__alert--ok">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {loading ? (
        <div className="srt__loading"><Loader2 className="srt__spin" size={22} /> جارٍ التحميل…</div>
      ) : (
        <div className="srt__grid">
          {templates.map((t) => (
            <div key={t.id} className={`srt__card ${t.is_default ? 'srt__card--default' : ''}`}>
              <div className="srt__card-top">
                <span className="srt__name">{t.name}</span>
                {t.is_default && <span className="srt__badge srt__badge--default"><Star size={12} /> افتراضي</span>}
                {!t.is_active && <span className="srt__badge srt__badge--muted">غير مفعّل</span>}
              </div>
              <div className="srt__meta">
                <span className="srt__chip">{TYPE_LABELS[t.type]}</span>
                <span className="srt__chip srt__chip--mode">{MODE_LABELS[t.delivery_mode]}</span>
              </div>
              {t.description && <p className="srt__desc">{t.description}</p>}
              <div className="srt__actions">
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => preview(t)} title="معاينة PDF">
                  <Eye size={15} /> معاينة
                </button>
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => openEdit(t)} title="تعديل">
                  <Pencil size={15} /> تعديل
                </button>
                {!t.is_default && (
                  <button className="srt__btn" disabled={busyId === t.id} onClick={() => setDefault(t)} title="تعيين افتراضي">
                    <Star size={15} /> افتراضي
                  </button>
                )}
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => duplicate(t)} title="نسخ">
                  <Copy size={15} /> نسخ
                </button>
                {!t.is_default && (
                  <button className="srt__btn srt__btn--danger" disabled={busyId === t.id} onClick={() => remove(t)} title="حذف">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="srt__empty">لا توجد قوالب بعد — أنشئ أول قالب.</div>
          )}
        </div>
      )}

      {editing && (
        <div className="srt__modal-overlay" onClick={closeEdit}>
          <div className="srt__modal" onClick={(e) => e.stopPropagation()}>
            <div className="srt__modal-head">
              <h4>{editingId ? 'تعديل قالب' : 'قالب جديد'}</h4>
              <button className="srt__icon-btn" onClick={closeEdit}><X size={18} /></button>
            </div>

            <div className="srt__modal-body">
              <label className="srt__field">
                <span>اسم القالب *</span>
                <input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: تقرير جلسة رسمي"
                />
              </label>

              <div className="srt__field-row">
                <label className="srt__field">
                  <span>النوع</span>
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as SessionReportTemplateType })}
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="srt__field">
                  <span>طريقة الإرسال</span>
                  <select
                    value={editing.delivery_mode}
                    onChange={(e) => setEditing({ ...editing, delivery_mode: e.target.value as SessionReportDeliveryMode })}
                  >
                    {Object.entries(MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>

              <label className="srt__field">
                <span>الكليشة (الترويسة والتذييل والعلامة المائية)</span>
                <select
                  value={editing.letterhead_id ?? ''}
                  onChange={(e) => setEditing({
                    ...editing,
                    letterhead_id: e.target.value ? Number(e.target.value) : null,
                  })}
                >
                  <option value="">الكليشة الافتراضية للمكتب</option>
                  {letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>

              <div className="srt__field">
                <span>الخانات المعروضة</span>
                <div className="srt__toggles">
                  {Object.entries(SESSION_REPORT_FIELD_LABELS).map(([key, label]) => (
                    <label key={key} className="srt__toggle">
                      <input
                        type="checkbox"
                        checked={editing.show_fields?.[key] ?? true}
                        onChange={(e) => setEditing({
                          ...editing,
                          show_fields: { ...(editing.show_fields ?? {}), [key]: e.target.checked },
                        })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="srt__field">
                <span>تمهيد (اختياري)</span>
                <textarea
                  rows={2}
                  value={editing.intro_text ?? ''}
                  onChange={(e) => setEditing({ ...editing, intro_text: e.target.value })}
                />
              </label>

              <label className="srt__field">
                <span>خاتمة (اختياري)</span>
                <textarea
                  rows={2}
                  value={editing.closing_text ?? ''}
                  onChange={(e) => setEditing({ ...editing, closing_text: e.target.value })}
                />
              </label>

              <div className="srt__field-row">
                <label className="srt__field srt__field--sm">
                  <span>لون جدول التقرير</span>
                  <input
                    type="color"
                    value={editing.accent_color ?? '#1f3a5f'}
                    onChange={(e) => setEditing({ ...editing, accent_color: e.target.value })}
                    title="لون شريط العنوان وخلايا عناوين الجدول"
                  />
                </label>
                <label className="srt__field">
                  <span>علامة مائية بديلة (نص)</span>
                  <input
                    value={editing.watermark_override ?? ''}
                    onChange={(e) => setEditing({ ...editing, watermark_override: e.target.value })}
                    placeholder="افتراضياً: شعار المكتب"
                  />
                </label>
              </div>

              <div className="srt__checks">
                <label className="srt__toggle">
                  <input
                    type="checkbox"
                    checked={editing.redact_pii ?? true}
                    onChange={(e) => setEditing({ ...editing, redact_pii: e.target.checked })}
                  />
                  حجب أرقام الهوية في الضبط الخام (يُنصح به)
                </label>
                <label className="srt__toggle">
                  <input
                    type="checkbox"
                    checked={editing.is_default ?? false}
                    onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                  />
                  تعيينه القالب الافتراضي
                </label>
                <label className="srt__toggle">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  مفعّل
                </label>
              </div>
            </div>

            <div className="srt__modal-foot">
              <button className="srt__btn" onClick={closeEdit}>إلغاء</button>
              <button className="srt__btn srt__btn--primary" disabled={busyId !== null} onClick={save}>
                {busyId !== null ? <Loader2 className="srt__spin" size={16} /> : <Save size={16} />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionReportTemplatesSettings;
