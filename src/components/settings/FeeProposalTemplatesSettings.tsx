// إعدادات «قوالب عروض الأتعاب/الأسعار» — عرض/إنشاء/تعديل/افتراضي/نسخ/حذف.
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle, Receipt, CheckCircle2, Star, Copy, X, Pencil } from 'lucide-react';
import { feeProposalService, type FeeProposalTemplate, type FeeProposalType } from '../../services/feeProposalService';

const TYPE_LABELS: Record<FeeProposalType, string> = { fee_proposal: 'عرض أتعاب', quote: 'عرض سعر' };

type Draft = Partial<FeeProposalTemplate> & { default_items?: Array<{ description: string; quantity: number; unit_price: number }> };

const blank = (): Draft => ({
  name: '', type: 'fee_proposal', title: '', intro_text: '', scope_text: '', terms_text: '',
  payment_terms: '', default_items: [], validity_days: 30, vat_rate: '15', is_active: true, is_default: false,
});

const FeeProposalTemplatesSettings: React.FC = () => {
  const [templates, setTemplates] = useState<FeeProposalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 2500); };

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const res = await feeProposalService.templates.list();
      setTemplates(res.data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل التحميل'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = (t: FeeProposalTemplate) => {
    setEditingId(t.id);
    setEditing({ ...t, default_items: t.default_items ?? [] });
  };

  const save = async () => {
    if (!editing?.name?.trim()) { setError('اسم القالب مطلوب'); return; }
    try {
      setBusyId(editingId ?? 'new'); setError(null);
      if (editingId) { await feeProposalService.templates.update(editingId, editing); flash('تم تحديث القالب'); }
      else { await feeProposalService.templates.create(editing); flash('تم إنشاء القالب'); }
      setEditing(null); setEditingId(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل الحفظ'); }
    finally { setBusyId(null); }
  };

  const act = async (fn: () => Promise<unknown>, id: number, msg: string) => {
    try { setBusyId(id); await fn(); flash(msg); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذّر التنفيذ'); }
    finally { setBusyId(null); }
  };

  const updItem = (i: number, patch: Partial<{ description: string; quantity: number; unit_price: number }>) =>
    setEditing((d) => d ? { ...d, default_items: (d.default_items ?? []).map((it, idx) => idx === i ? { ...it, ...patch } : it) } : d);

  return (
    <div className="srt">
      <div className="srt__head">
        <div>
          <h3 className="srt__title"><Receipt size={18} /> قوالب عروض الأتعاب والأسعار</h3>
          <p className="srt__sub">قوالب جاهزة (نطاق العمل + الشروط + بنود افتراضية) تُسرّع إنشاء العروض للعملاء.</p>
        </div>
        <button className="srt__btn srt__btn--primary" onClick={() => { setEditingId(null); setEditing(blank()); }}><Plus size={16} /> قالب جديد</button>
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
              <div className="srt__meta"><span className="srt__chip">{TYPE_LABELS[t.type]}</span><span className="srt__chip">صلاحية {t.validity_days} يوم</span></div>
              <div className="srt__actions">
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => openEdit(t)}><Pencil size={15} /> تعديل</button>
                {!t.is_default && <button className="srt__btn" disabled={busyId === t.id} onClick={() => act(() => feeProposalService.templates.setDefault(t.id), t.id, 'تم التعيين افتراضياً')}><Star size={15} /> افتراضي</button>}
                <button className="srt__btn" disabled={busyId === t.id} onClick={() => act(() => feeProposalService.templates.duplicate(t.id), t.id, 'تم النسخ')}><Copy size={15} /> نسخ</button>
                {!t.is_default && <button className="srt__btn srt__btn--danger" disabled={busyId === t.id} onClick={() => { if (window.confirm(`حذف «${t.name}»؟`)) act(() => feeProposalService.templates.remove(t.id), t.id, 'تم الحذف'); }}><Trash2 size={15} /></button>}
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
              <label className="srt__field"><span>اسم القالب *</span><input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="مثال: عرض أتعاب قضية تجارية" /></label>
              <div className="srt__field-row">
                <label className="srt__field"><span>النوع</span>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as FeeProposalType })}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="srt__field"><span>الصلاحية (يوم)</span><input type="number" min={1} value={editing.validity_days ?? 30} onChange={(e) => setEditing({ ...editing, validity_days: Number(e.target.value) })} /></label>
                <label className="srt__field"><span>الضريبة %</span><input type="number" min={0} max={100} value={String(editing.vat_rate ?? '15')} onChange={(e) => setEditing({ ...editing, vat_rate: e.target.value })} /></label>
              </div>
              <label className="srt__field"><span>عنوان العرض</span><input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
              <label className="srt__field"><span>مقدّمة</span><textarea rows={2} value={editing.intro_text ?? ''} onChange={(e) => setEditing({ ...editing, intro_text: e.target.value })} /></label>
              <label className="srt__field"><span>نطاق العمل</span><textarea rows={3} value={editing.scope_text ?? ''} onChange={(e) => setEditing({ ...editing, scope_text: e.target.value })} /></label>
              <label className="srt__field"><span>الشروط والأحكام</span><textarea rows={2} value={editing.terms_text ?? ''} onChange={(e) => setEditing({ ...editing, terms_text: e.target.value })} /></label>
              <label className="srt__field"><span>شروط الدفع</span><input value={editing.payment_terms ?? ''} onChange={(e) => setEditing({ ...editing, payment_terms: e.target.value })} /></label>

              <div className="srt__field">
                <span>بنود افتراضية</span>
                {(editing.default_items ?? []).map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                    <input style={{ flex: 1 }} placeholder="وصف البند" value={it.description} onChange={(e) => updItem(i, { description: e.target.value })} />
                    <input style={{ width: 90 }} type="number" placeholder="سعر" value={it.unit_price} onChange={(e) => updItem(i, { unit_price: Number(e.target.value) })} />
                    <button className="srt__btn srt__btn--danger" onClick={() => setEditing({ ...editing, default_items: (editing.default_items ?? []).filter((_, idx) => idx !== i) })}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button className="srt__btn" onClick={() => setEditing({ ...editing, default_items: [...(editing.default_items ?? []), { description: '', quantity: 1, unit_price: 0 }] })}><Plus size={14} /> إضافة بند</button>
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

export default FeeProposalTemplatesSettings;
