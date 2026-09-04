import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  FileSignature, Plus, Pencil, Trash2, FilePlus2, FileDown, X,
  AlertTriangle, Lock, RefreshCw,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import { API_BASE_URL } from '../../utils/api';
import { usePermission } from '../../hooks/usePermission';
import { useDossierInvalidate, useEmployeeContracts } from './dossier/useDossierData';
import EmptyLine from './dossier/EmptyLine';
import { errorText, fmtCount } from './leave/leaveFormat';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS,
} from '../../types/hr';
import type { EmploymentContract, EmploymentContractType, EmploymentContractStatus } from '../../types/hr';

/**
 * **الاقتطاع**: مكتبٌ ناضجٌ يبلغ ستّةَ عقودٍ لمنسوبٍ واحد، والجدارُ يُقرأ بالتمرير —
 * فتُعرض ثمانيةٌ ثمّ سطرٌ واحدٌ يفتح الباقي. لا ترقيمَ داخل بلوكٍ داخل جدار.
 */
const VISIBLE_LIMIT = 8;

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

/** التسميةُ **حرفيةٌ** من `app/Enums/Permission.php:388` — لا صياغةَ فرونتيةً للصلاحية. */
const MANAGE_LABEL = 'إدارة ملفات الموظفين';

const STATUS_BADGE: Record<EmploymentContractStatus, string> = {
  active: 'hr-badge--green',
  draft: 'hr-badge--gray',
  expired: 'hr-badge--gold',
  terminated: 'hr-badge--red',
  superseded: 'hr-badge--gray',
};

const fmtDate = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * **سطرُ تفاصيل العقد** — كلُّ ما كان في `dl.hr-kv` (سبعةُ حدودٍ) مضغوطاً في سطرِ
 * `hrl-row__meta` واحدٍ بفواصل « · ». لا حقلَ يسقط: ما لا يتّسع للعرض يبقى في `title`.
 *
 * السببُ ليس اختصاراً: الجدارُ يُقرأ بالتمرير، وقائمةُ مفتاح/قيمةٍ **داخل** كلِّ صفٍّ من
 * قائمةٍ تُطيل البلوكَ الواحدَ إلى شاشةٍ كاملةٍ لستّة عقود — وهي عينُ الكثافة التي يقوم
 * عليها النمط (صفٌّ واحدٌ لكلّ سجلّ).
 */
const contractMeta = (c: EmploymentContract, showSalary: boolean): string => {
  const parts: string[] = [
    `${fmtDate(c.start_date)} ← ${c.end_date ? fmtDate(c.end_date) : 'غير محدد'}`,
  ];

  if (c.probation_end_date) parts.push(`التجربة حتى ${fmtDate(c.probation_end_date)}`);
  if (c.job_title_snapshot) parts.push(c.job_title_snapshot);

  parts.push(
    c.renewal_mode === 'auto'
      ? `تجديد تلقائي${c.auto_renew_notice_days ? ` (${fmtCount(c.auto_renew_notice_days)} يوم)` : ''}`
      : 'تجديد يدوي'
  );

  // الراتبُ لا يُعرض إلا بصلاحيته — الشرطُ نفسُه الذي كان على صفّ `dl` (لا يُرخى بالنقل).
  if (showSalary && c.total_salary_snapshot != null) parts.push(`إجمالي الراتب ${c.total_salary_snapshot}`);
  if (typeof c.addendums_count === 'number' && c.addendums_count > 0) parts.push(`الملاحق ${fmtCount(c.addendums_count)}`);
  if (c.notes) parts.push(c.notes);

  return parts.join(' · ');
};

// ───────────── نموذج عقد (إضافة/تعديل) ─────────────

const ContractForm: React.FC<{
  empId: number;
  editing: EmploymentContract | null;
  canSalary: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ empId, editing, canSalary, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contract_type: (editing?.contract_type || 'permanent') as EmploymentContractType,
    start_date: editing?.start_date || '',
    end_date: editing?.end_date || '',
    probation_end_date: editing?.probation_end_date || '',
    job_title_snapshot: editing?.job_title_snapshot || '',
    renewal_mode: (editing?.renewal_mode || 'manual') as 'manual' | 'auto',
    auto_renew_notice_days: editing?.auto_renew_notice_days?.toString() || '',
    status: (editing?.status || 'draft') as EmploymentContractStatus,
    basic_salary_snapshot: editing?.basic_salary_snapshot?.toString() || '',
    total_salary_snapshot: editing?.total_salary_snapshot?.toString() || '',
    contract_number: editing?.contract_number || '',
    notes: editing?.notes || '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.start_date) { toast.error('تاريخ البداية مطلوب'); return; }
    setSaving(true);
    try {
      const payload: Partial<EmploymentContract> = {
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        probation_end_date: form.probation_end_date || null,
        job_title_snapshot: form.job_title_snapshot || null,
        renewal_mode: form.renewal_mode,
        auto_renew_notice_days: form.auto_renew_notice_days ? Number(form.auto_renew_notice_days) : null,
        status: form.status,
        contract_number: form.contract_number || null,
        notes: form.notes || null,
      };
      if (canSalary) {
        payload.basic_salary_snapshot = form.basic_salary_snapshot ? Number(form.basic_salary_snapshot) : null;
        payload.total_salary_snapshot = form.total_salary_snapshot ? Number(form.total_salary_snapshot) : null;
      }
      if (editing) await hrService.updateContract(empId, editing.id, payload);
      else await hrService.createContract(empId, payload);
      toast.success(editing ? 'تم تحديث العقد' : 'تم إنشاء العقد');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل حفظ العقد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>{editing ? 'تعديل عقد' : 'عقد عمل جديد'}</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-field--row">
            <div className="hr-field">
              <label>نوع العقد *</label>
              <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="hr-field">
              <label>الحالة</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>تاريخ البداية *</label>
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="hr-field">
              <label>تاريخ النهاية</label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>نهاية التجربة</label>
              <input type="date" value={form.probation_end_date} onChange={(e) => set('probation_end_date', e.target.value)} />
            </div>
            <div className="hr-field">
              <label>المسمى الوظيفي</label>
              <input value={form.job_title_snapshot} onChange={(e) => set('job_title_snapshot', e.target.value)} placeholder="مثال: محامٍ أول" />
            </div>
          </div>
          <div className="hr-field--row">
            <div className="hr-field">
              <label>وضع التجديد</label>
              <select value={form.renewal_mode} onChange={(e) => set('renewal_mode', e.target.value)}>
                <option value="manual">يدوي</option>
                <option value="auto">تلقائي</option>
              </select>
            </div>
            <div className="hr-field">
              <label>إشعار التجديد (يوم)</label>
              <input type="number" min={0} value={form.auto_renew_notice_days} onChange={(e) => set('auto_renew_notice_days', e.target.value)} />
            </div>
          </div>
          {canSalary && (
            <div className="hr-field--row">
              <div className="hr-field">
                <label>الراتب الأساسي وقت التوقيع</label>
                <input type="number" min={0} value={form.basic_salary_snapshot} onChange={(e) => set('basic_salary_snapshot', e.target.value)} />
              </div>
              <div className="hr-field">
                <label>إجمالي الراتب وقت التوقيع</label>
                <input type="number" min={0} value={form.total_salary_snapshot} onChange={(e) => set('total_salary_snapshot', e.target.value)} />
              </div>
            </div>
          )}
          <div className="hr-field">
            <label>رقم العقد (اختياري)</label>
            <input value={form.contract_number} onChange={(e) => set('contract_number', e.target.value)} />
          </div>
          <div className="hr-field">
            <label>ملاحظات</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : (editing ? 'حفظ' : 'إنشاء العقد')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ───────────── نموذج ملحق ─────────────

const AddendumForm: React.FC<{
  empId: number;
  contract: EmploymentContract;
  onClose: () => void;
  onSaved: () => void;
}> = ({ empId, contract, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', change_summary: '', effective_date: '', content: '' });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await hrService.addAddendum(empId, contract.id, {
        title: form.title || null,
        change_summary: form.change_summary || null,
        effective_date: form.effective_date || null,
        content: form.content || null,
      });
      toast.success('تمت إضافة الملحق');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل إضافة الملحق');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>إضافة ملحق للعقد</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-field">
            <label>العنوان</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="مثال: تعديل الراتب" />
          </div>
          <div className="hr-field">
            <label>ملخص التغيير</label>
            <input value={form.change_summary} onChange={(e) => set('change_summary', e.target.value)} />
          </div>
          <div className="hr-field">
            <label>تاريخ السريان</label>
            <input type="date" value={form.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
          </div>
          <div className="hr-field">
            <label>التفاصيل</label>
            <textarea rows={3} value={form.content} onChange={(e) => set('content', e.target.value)} />
          </div>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'إضافة'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ───────────── مودال توليد PDF ─────────────

const GeneratePdfModal: React.FC<{
  empId: number;
  contract: EmploymentContract;
  onClose: () => void;
}> = ({ empId, contract, onClose }) => {
  const [busy, setBusy] = useState(false);
  const [letterhead, setLetterhead] = useState<'default' | 'none'>('default');
  const [draft, setDraft] = useState(false);
  const [representative, setRepresentative] = useState('');
  const [extra, setExtra] = useState('');

  const generate = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/hr/employees/${empId}/contracts/${contract.id}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          'ngrok-skip-browser-warning': '69420',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          letterhead,
          draft,
          representative: representative || undefined,
          extra_terms: extra || undefined,
        }),
      });
      if (!res.ok) {
        let msg = 'تعذر توليد العقد';
        try { const b = await res.clone().json(); if (b?.message) msg = b.message; } catch { /* الرد ليس JSON */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // المتصفح منع النافذة المنبثقة → تنزيل مباشر بدلاً من فشل صامت
        const a = document.createElement('a');
        a.href = url;
        a.download = `employment-contract-${contract.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.info('تم تنزيل العقد (المتصفح منع فتح نافذة جديدة)');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'فشل توليد العقد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__h">
          <h3>توليد عقد PDF</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-field">
            <label>الكليشة</label>
            <select value={letterhead} onChange={(e) => setLetterhead(e.target.value as 'default' | 'none')}>
              <option value="default">كليشة المكتب الافتراضية</option>
              <option value="none">بلا كليشة (مستند نظيف)</option>
            </select>
          </div>
          <div className="hr-field">
            <label>ممثل المكتب (الطرف الأول)</label>
            <input value={representative} onChange={(e) => setRepresentative(e.target.value)} placeholder="افتراضياً: منشئ العقد" />
          </div>
          <div className="hr-field">
            <label>بنود إضافية (تظهر كبند مستقل)</label>
            <textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="نص يضاف قبل التوليد…" />
          </div>
          <label className="hr-check">
            <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
            <span>وضع المسودة (علامة مائية «مسودة»)</span>
          </label>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose}>إلغاء</button>
          <button className="hr-btn hr-btn--primary" onClick={generate} disabled={busy}>
            {busy ? 'جارٍ التوليد…' : 'توليد العقد'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ───────────── التبويب ─────────────

/**
 * **الغلافُ صار `hrl-block`** (الخطوة ٧): سقط `hr-dbody > hr-sec` بحدِّه واستدارته
 * وشبكتِه، ومعه سقطت القواعدُ الجسريّةُ الستُّ في `hr-leave.css §١٣` التي كانت تفكّ
 * إطارَه داخل الجدار. ورأسُ القسم `<h2>` **دلاليٌّ حقيقيّ** لا `<div class="hr-sec__t">`
 * — وبه سقط الدَّينُ المعلَنُ في الخطوة ٢ (رتبةُ العناوين).
 *
 * **ولم يُلمَس منطقٌ واحد**: توليدُ PDF بتفاصيله السبع · خياراتُ العقد الأربع · مسارُ
 * الملاحق · `STATUS_BADGE` المقيَّدةُ بالنوع · `window.confirm` قبل الحذف · الإبطالُ
 * الدقيقُ `['hr','contracts',empId]`.
 */
const ContractsTab: React.FC<{ id: string; empId: number }> = ({ id, empId }) => {
  const canManage = usePermission('hr.manage');
  const canSalaryView = usePermission('hr.compensation.view');
  const canSalaryManage = usePermission('hr.compensation.manage');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmploymentContract | null>(null);
  const [addendumFor, setAddendumFor] = useState<EmploymentContract | null>(null);
  const [pdfFor, setPdfFor] = useState<EmploymentContract | null>(null);
  const [expanded, setExpanded] = useState(false);

  // المسارُ محروسٌ بـ`hr.manage` (`api.php:1776`)، والحارسُ في `useDossierData` يمنع
  // النداءَ الذي يردّ 403 — فلا تُعرض «تعذّر جلب العقود» لحالةِ صلاحية.
  const contractsQuery = useEmployeeContracts(empId);
  const contracts = contractsQuery.data;

  const { contracts: invalidate } = useDossierInvalidate(empId);

  const remove = async (c: EmploymentContract) => {
    if (!window.confirm('حذف هذا العقد؟')) return;
    try {
      await hrService.deleteContract(empId, c.id);
      toast.success('تم حذف العقد');
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || 'فشل حذف العقد');
    }
  };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c: EmploymentContract) => { setEditing(c); setShowForm(true); };

  // الفرعُ المحميّ — نسخةُ `DocumentsTab` التي هي العرفُ الصحيحُ في الوحدة: الصلاحيةُ
  // الناقصةُ حالةٌ تُسمّى **بقفل** ويُسمّى فيها المطلوبُ حرفياً، لا خطأٌ يُعرض ولا «لا توجد
  // عقود» (نفيُ وجودٍ لا دليلَ عليه: الاستعلامُ لم يُطلَق أصلاً).
  if (!canManage) {
    return (
      <section className="hrl-block" id={id}>
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2"><FileSignature size={14} /> عقود العمل</h2>
        </div>
        <div className="hrl-block__b">
          <div className="hrl-state hrl-state--locked">
            <Lock size={20} />
            <p className="hrl-state__t">العقود محمية</p>
            <p className="hrl-state__d">عرضها يتطلب صلاحية «{MANAGE_LABEL}».</p>
          </div>
        </div>
      </section>
    );
  }

  const rows = contracts ?? [];
  const shown = expanded ? rows : rows.slice(0, VISIBLE_LIMIT);
  // الفراغُ **بعد وصول الردّ** وحدَه؛ وفيه ينتقل الفعلُ إلى السطر فلا يتكرّر زرّان بنصٍّ واحد.
  const isEmpty = !contractsQuery.isPending && !contractsQuery.isError && rows.length === 0;

  /**
   * **الحالاتُ الأربعُ متمايزةٌ شكلاً ونصّاً** (لا أيقونةَ ذهبيةٌ واحدةٌ للأربع):
   * تحميلٌ = هياكلُ بارتفاع الصفّ · خطأٌ = مثلثٌ أحمرُ بنصِّ الخادم و«إعادة المحاولة» ·
   * فارغٌ = **سطرٌ** بفعله (قاعدةُ «البلوكُ الفارغُ سطر») · محميٌّ = قفلٌ أعلاه.
   */
  const body = (() => {
    if (contractsQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل العقود">
          {Array.from({ length: 3 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (contractsQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذر تحميل العقود</p>
          <p className="hrl-state__d">{errorText(contractsQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void contractsQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyLine
          text="لا يوجد عقد مسجل"
          action={canManage && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={openNew}>
              <Plus size={14} /> عقد جديد
            </button>
          )}
        />
      );
    }

    return (
      <>
        {shown.map((c) => {
          const meta = contractMeta(c, canSalaryView);

          return (
            <div className="hrl-row" key={c.id}>
              <span className="hrl-row__main">
                <span className="hrl-row__name">
                  {CONTRACT_TYPE_LABELS[c.contract_type]}
                  {c.contract_number ? ` · ${c.contract_number}` : ''}
                </span>
                <span className="hrl-row__meta" title={meta}>{meta}</span>
              </span>
              <span className={`hr-badge ${STATUS_BADGE[c.status]}`}>{CONTRACT_STATUS_LABELS[c.status]}</span>
              {/* أدواتٌ تُكشَف بالتحويم **وبالتركيز** (§١٣-هـ)، ودائماً على اللمس — فلا
                  يختفي فعلٌ عن لوحة المفاتيح ولا عن الجوّال. */}
              {canManage && (
                <span className="hrl-tools">
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="توليد PDF" onClick={() => setPdfFor(c)}><FileDown size={14} /></button>
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="ملحق" onClick={() => setAddendumFor(c)}><FilePlus2 size={14} /></button>
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="تعديل" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(c)}><Trash2 size={14} /></button>
                </span>
              )}
            </div>
          );
        })}

        {!expanded && rows.length > VISIBLE_LIMIT && (
          <EmptyLine
            text={`تعرض ${fmtCount(VISIBLE_LIMIT)} من ${fmtCount(rows.length)}`}
            action={(
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => setExpanded(true)}>
                اعرض الكل ({fmtCount(rows.length)})
              </button>
            )}
          />
        )}
      </>
    );
  })();

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2"><FileSignature size={14} /> عقود العمل</h2>
        {/* فعلُ الإنشاء يعيش في رأس بلوكه لا في شريط الرأس — القاعدةُ المكتوبةُ في
            `DossierHead`: شريطُ الرأس لما يخصّ الموظفَ كلَّه، والإنشاءُ حيث السجلّ. */}
        {canManage && !isEmpty && (
          <div className="hrl-block__a">
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={openNew}><Plus size={14} /> عقد جديد</button>
          </div>
        )}
      </div>
      <div className="hrl-block__b hrl-block__b--flush">{body}</div>

      {showForm && (
        <ContractForm
          empId={empId}
          editing={editing}
          canSalary={canSalaryManage}
          onClose={() => setShowForm(false)}
          onSaved={invalidate}
        />
      )}
      {addendumFor && (
        <AddendumForm
          empId={empId}
          contract={addendumFor}
          onClose={() => setAddendumFor(null)}
          onSaved={invalidate}
        />
      )}
      {pdfFor && (
        <GeneratePdfModal
          empId={empId}
          contract={pdfFor}
          onClose={() => setPdfFor(null)}
        />
      )}
    </section>
  );
};

export default ContractsTab;
