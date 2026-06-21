// إعدادات «قوالب الصادر الحرّ» — عرض/إنشاء/تعديل/افتراضي/نسخ/حذف/معاينة (محرّر Tiptap للجسم).
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle, Mail, CheckCircle2, Star, Copy, X, Pencil, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { outgoingLetterService, LETTER_DOC_TYPES, type OutgoingLetterTemplate } from '../../services/outgoingLetterService';
import TiptapEditor, { type TiptapEditorRef } from '../TiptapEditor';

type Draft = Partial<OutgoingLetterTemplate>;

const docLabel = (v?: string) => LETTER_DOC_TYPES.find((d) => d.value === v)?.label ?? v ?? '—';

const blank = (): Draft => ({
  name: '', document_type: 'letter', title: '', body: '', accent_color: '', is_active: true, is_default: false,
});

const CorrespondenceTemplatesSettings: React.FC = () => {
  const [templates, setTemplates] = useState<OutgoingLetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<TiptapEditorRef>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 2500); };

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await outgoingLetterService.templates.list();
      setTemplates(res.data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل التحميل'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = (t: OutgoingLetterTemplate) => { setEditingId(t.id); setEditing({ ...t }); setEditorKey((k) => k + 1); };
  const openNew = () => { setEditingId(null); setEditing(blank()); setEditorKey((k) => k + 1); };

  const save = async () => {
    if (!editing?.name?.trim()) { setError('اسم القالب مطلوب'); return; }
    const payload = { ...editing, body: editorRef.current?.getHTML?.() ?? editing.body };
    try {
      setBusyId(editingId ?? 'new'); setError(null);
      if (editingId) { await outgoingLetterService.templates.update(editingId, payload); flash('تم تحديث القالب'); }
      else { await outgoingLetterService.templates.create(payload); flash('تم إنشاء القالب'); }
      setEditing(null); setEditingId(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل الحفظ'); }
    finally { setBusyId(null); }
  };

  const act = async (fn: () => Promise<unknown>, id: number, msg: string) => {
    try { setBusyId(id); await fn(); flash(msg); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذّر التنفيذ'); }
    finally { setBusyId(null); }
  };

  const preview = async (id: number) => {
    try { await outgoingLetterService.templates.openPreview(id); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر المعاينة'); }
  };

  return (
    <div className="srt">
      <div className="srt__head">
        <div>
          <h3 className="srt__title"><Mail size={18} /> قوالب الصادر (الخطابات والإنذارات)</h3>
          <p className="srt__sub">قوالب جاهزة (عنوان + نص غنيّ) تُسرّع إنشاء الصادر؛ يُنسخ محتواها للخطاب عند الاختيار.</p>
        </div>
        <button className="srt__btn srt__btn--primary" onClick={openNew}><Plus size={16} /> قالب جديد</button>
      </div>

      {error && <div className="srt__alert srt__alert--error"><AlertCircle size={16} /> {error}</div>}
      {notice && <div className="srt__alert srt__alert--ok"><CheckCircle2 size={16} /> {notice}</div>}

      {loading ? (
        <div className="srt__loading"><Loader2 className="srt__spin" size={22} /> جارٍ التحميل…</div>
      ) : (
        <div className="srt__grid">
          {templates.map((t) => (
            <div key={t.id} className={`srt__card ${t.is_default ? 'srt__card--default' : ''}`}>
              <div className="srt__card-top">
                <span className="srt__name">{t.name}</span>
                {t.is_default && <span className="srt__badge srt__badge--default"><Star size={12} /> افتراضي</span>}
              </div>
              <div className="srt__meta"><span className="srt__chip">{docLabel(t.document_type)}</span></div>
              <div className="srt__actions">
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => openEdit(t)}><Pencil size={15} /> تعديل</button>
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => preview(t.id)}><Eye size={15} /> معاينة</button>
                {!t.is_default && <button className="srt__btn" disabled={busyId === t.id} onClick={() => act(() => outgoingLetterService.templates.setDefault(t.id), t.id, 'تم التعيين افتراضياً')}><Star size={15} /> افتراضي</button>}
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => act(() => outgoingLetterService.templates.duplicate(t.id), t.id, 'تم النسخ')}><Copy size={15} /> نسخ</button>
                {!t.is_default && <button className="srt__btn srt__btn--danger" disabled={busyId === t.id} onClick={() => { if (window.confirm(`حذف «${t.name}»؟`)) act(() => outgoingLetterService.templates.remove(t.id), t.id, 'تم الحذف'); }}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
          {templates.length === 0 && <div className="srt__empty">لا توجد قوالب بعد.</div>}
        </div>
      )}

      {editing && (
        <div className="srt__modal-overlay" onClick={() => setEditing(null)}>
          <div className="srt__modal" onClick={(e) => e.stopPropagation()}>
            <div className="srt__modal-head"><h4>{editingId ? 'تعديل قالب' : 'قالب جديد'}</h4><button className="srt__icon-btn" onClick={() => setEditing(null)}><X size={18} /></button></div>
            <div className="srt__modal-body">
              <label className="srt__field"><span>اسم القالب *</span><input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="مثال: إنذار سداد" /></label>
              <div className="srt__field-row">
                <label className="srt__field"><span>نوع المستند</span>
                  <select value={editing.document_type} onChange={(e) => setEditing({ ...editing, document_type: e.target.value })}>
                    {LETTER_DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </label>
                <label className="srt__field"><span>عنوان افتراضي</span><input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
              </div>

              <div className="srt__field">
                <span>نص القالب</span>
                <TiptapEditor
                  key={editorKey}
                  ref={editorRef}
                  content={editing.body ?? ''}
                  onChange={(v) => setEditing((d) => d ? { ...d, body: v } : d)}
                  placeholder="اكتب نص القالب… (يدعم الضبط من الجانبين والتنسيق)"
                  minHeight="220px"
                />
              </div>

              <div className="srt__checks">
                <label className="srt__toggle"><input type="checkbox" checked={editing.is_default ?? false} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> تعيينه القالب الافتراضي</label>
                <label className="srt__toggle"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> مفعّل</label>
              </div>
            </div>
            <div className="srt__modal-foot">
              <button className="srt__btn" onClick={() => setEditing(null)}>إلغاء</button>
              <button className="srt__btn srt__btn--primary" disabled={busyId !== null} onClick={save}>{busyId !== null ? <Loader2 className="srt__spin" size={16} /> : <Save size={16} />} حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondenceTemplatesSettings;
