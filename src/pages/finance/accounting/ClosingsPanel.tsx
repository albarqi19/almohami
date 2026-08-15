// [وحدة المحاسبة #141 — م4] الإقفال السنوي: قيد 31/12 يصفّر الإيرادات
// والمصروفات ويرحّل الصافي للأرباح المبقاة، ثم تُقفل السنة عن أي قيد جديد.
// وإعادةُ الفتح إجراؤه المضادّ: تعكس قيد الإقفال بقيدٍ مؤرَّخٍ بيومه وترفع القفل.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Lock, AlertTriangle, Unlock } from 'lucide-react';
import { accountingService } from '../../../services/accountingService';
import { DataTable, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import type { FiscalYearClosing } from '../../../services/accountingService';
import { formatSAR } from '../../../utils/money';
import { toDayString } from '../../../utils/dayString';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

/** أدنى طولٍ للسبب — يطابق `reason: min:10` في الباك، فيُمنع الرفضُ قبل الشبكة. */
const MIN_REASON = 10;

const ClosingsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.accountingManage);

  const lastYear = new Date().getFullYear() - 1;
  const [confirmYear, setConfirmYear] = useState<number | null>(null);
  const [yearInput, setYearInput] = useState(String(lastYear));

  // ── إعادة الفتح ──
  const [reopenTarget, setReopenTarget] = useState<FiscalYearClosing | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenConfirm, setReopenConfirm] = useState('');
  // رفضُ الباك يبقى **مكتوباً في المودال** لا في toast يزول بعد ثوان: الرفضُ هنا
  // تعليماتٌ تُنفَّذ («أعِد فتح السنة 2026 أولاً») لا خبرُ فشلٍ يُقرأ ويُنسى.
  const [reopenError, setReopenError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'closings'],
    queryFn: () => accountingService.getClosings(),
  });

  const closings = data?.data ?? [];

  const closeMutation = useMutation({
    mutationFn: (year: number) => accountingService.closeYear(year),
    onSuccess: (res) => {
      toast.success(res.message || 'أُقفلت السنة');
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      setConfirmYear(null);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الإقفال'),
  });

  const closeReopen = () => {
    setReopenTarget(null);
    setReopenReason('');
    setReopenConfirm('');
    setReopenError(null);
  };

  const reopenMutation = useMutation({
    mutationFn: (target: FiscalYearClosing) =>
      accountingService.reopenYear(target.fiscal_year, reopenReason.trim(), Number(reopenConfirm)),
    onSuccess: (res) => {
      toast.success(res.message || 'أُعيد فتح السنة');
      // الصفُّ يُحذف عند الفتح، فالسنة تختفي من هذا الجدول — والإبطالُ يشمل
      // القوائم والقيود معاً لأن قيد العكس غيّرها كلَّها.
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      if (res.data?.warning) toast.warning(res.data.warning);
      closeReopen();
    },
    onError: (e: Error) => setReopenError(e.message || 'تعذّرت إعادة الفتح'),
  });

  const reasonOk = reopenReason.trim().length >= MIN_REASON;
  // مطابقةُ نصٍّ لا عدد: `Number('2.025e3')` يساوي 2025 فيمرّ تأكيدٌ لم يُكتب،
  // والمقصود أن تُكتب السنةُ حرفاً بحرف.
  const confirmOk = !!reopenTarget && reopenConfirm === String(reopenTarget.fiscal_year);

  const columns: Column<FiscalYearClosing>[] = [
    { key: 'year', header: 'السنة المالية', render: (c) => <strong>{c.fiscal_year}</strong> },
    {
      key: 'net',
      header: 'صافي الدخل المُرحَّل',
      numeric: true,
      align: 'end',
      render: (c) => (
        <span style={{ color: Number(c.net_income) >= 0 ? 'var(--status-green)' : 'var(--status-red)' }}>
          {formatSAR(c.net_income)}
        </span>
      ),
    },
    { key: 'entry', header: 'قيد الإقفال', render: (c) => c.closing_entry?.entry_number ?? '—' },
    { key: 'by', header: 'أقفلها', render: (c) => c.closed_by?.name ?? '—' },
    {
      key: 'at',
      header: 'التاريخ',
      // `closed_at` صبُّه `datetime` فيُسلسَل UTC بلاحقة Z — والقصُّ الأعمى
      // `slice(0,10)` كان يطبع **اليوم السابق** لكلّ إقفالٍ نُفِّذ قبل الثالثة فجراً
      // بتوقيت الرياض. `toDayString` تُعيده إلى يوم الرياض وتتسامح مع الصيغتين.
      render: (c) => toDayString(c.closed_at) || '—',
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'center',
      // يظهر لكلّ سنةٍ مقفلة بلا استثناء: قاعدةُ «الفتح بالترتيب العكسي» يملكها
      // الباك وحده (يقرأ كلَّ الإقفالات)، وتكرارُها هنا يصنع مصدرَ حقيقةٍ ثانياً
      // يفترق عنه — والأسوأ أنه يُخفي الزرَّ فلا يقرأ المستخدم سببَ المنع أصلاً.
      render: (c) => (
        <button type="button" className="fin-btn fin-btn--sm fin-btn--danger" title="إعادة فتح السنة"
          onClick={(ev) => { ev.stopPropagation(); closeReopen(); setReopenTarget(c); }}>
          <Unlock size={14} /> إعادة الفتح
        </button>
      ),
    });
  }

  return (
    <div>
      {canManage && (
        <div className="acc-period">
          <span className="fin-cell-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} />
            الإقفال يمنع أي قيد بتاريخ داخل السنة المقفلة أو قبلها — نفّذه بعد اعتماد قوائم السنة.
          </span>
          <span style={{ flex: 1 }} />
          <input className="fin-input" type="number" min="2020" max={lastYear} value={yearInput}
            onChange={(e) => setYearInput(e.target.value)} style={{ maxWidth: 110 }} aria-label="السنة" />
          <button type="button" className="fin-btn fin-btn--primary"
            onClick={() => setConfirmYear(Number(yearInput))}
            disabled={!yearInput || Number(yearInput) > lastYear}>
            <Lock size={14} /> إقفال السنة
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={closings}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyIcon={Lock}
        emptyTitle="لا سنوات مقفلة"
        emptyDesc="عند إقفال أول سنة مالية سيظهر سجلّها هنا مع قيد الإقفال وصافي الدخل المرحَّل."
      />

      <Modal
        open={confirmYear !== null}
        onClose={() => setConfirmYear(null)}
        title={`إقفال السنة المالية ${confirmYear ?? ''}`}
        icon={Lock}
        size="narrow"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setConfirmYear(null)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate(confirmYear!)}>
              {closeMutation.isPending ? 'جارٍ الإقفال...' : 'تأكيد الإقفال'}
            </button>
          </>
        )}
      >
        <p>
          سيُنشأ قيد إقفال بتاريخ 31/12/{confirmYear} يصفّر الإيرادات والمصروفات ويرحّل صافي الدخل
          إلى «الأرباح المبقاة»، ثم <strong>تُقفل السنة نهائياً</strong> عن أي قيد جديد. هذا إجراء لا يُتراجع عنه من الواجهة.
        </p>
      </Modal>

      {/* ── إعادة فتح سنة مقفلة ── */}
      <Modal
        open={reopenTarget !== null}
        onClose={closeReopen}
        title={`إعادة فتح السنة المالية ${reopenTarget?.fiscal_year ?? ''}`}
        icon={Unlock}
        size="narrow"
        footerAlign="end"
        // نقرةٌ طائشةٌ على الخلفية تمحو سبباً كُتب بعناية — والإجراء يُعيد كتابة
        // تاريخٍ محاسبيّ، فإغلاقُه يكون بقصدٍ لا بمصادفة.
        closeOnOverlay={false}
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={closeReopen}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger"
              disabled={reopenMutation.isPending || !reasonOk || !confirmOk}
              onClick={() => reopenMutation.mutate(reopenTarget!)}>
              {reopenMutation.isPending ? 'جارٍ الفتح...' : 'تأكيد إعادة الفتح'}
            </button>
          </>
        )}
      >
        <p style={{ marginBottom: 10 }}>
          سيُنشأ <strong>قيد عكسيّ</strong> لقيد الإقفال {reopenTarget?.closing_entry?.entry_number
            ? <>({reopenTarget.closing_entry.entry_number}) </> : ''}
          بتاريخ 31/12/{reopenTarget?.fiscal_year} — لا يُحذف الأصل بل يُعلَّم «معكوساً»، فتعود
          أرصدةُ الإيرادات والمصروفات كما كانت قبل الإقفال وتُفتح السنة لقيودٍ جديدة.
          وتختفي السنة من هذا الجدول، ويبقى الأثر في الدفاتر وفي سجلّ التدقيق.
        </p>
        <div className="acc-warn">
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          يُسجَّل هذا الإجراء <strong>باسمك</strong> وبسببه في سجلّ التدقيق. راجِع الإقرارات الضريبية
          المقدَّمة عن هذه السنة قبل أي تعديل — قوائمُها المعتمدة ستتغيّر.
        </div>

        <div className="fin-field" style={{ marginTop: 10 }}>
          <label className="fin-field__label">سبب إعادة الفتح<span className="req">*</span></label>
          <textarea className="fin-textarea" value={reopenReason} maxLength={500}
            onChange={(e) => { setReopenReason(e.target.value); setReopenError(null); }}
            placeholder="مثال: إعادة تصنيف مصروفٍ فات قيدُه قبل اعتماد القوائم" />
          {/* إرشادٌ هادئ قبل الكتابة وخطأٌ أحمر بعدها: حقلٌ يستقبل المستخدمَ بلونٍ
              أحمر قبل أن يلمسه يُعلّمه تجاهلَ الأحمر. */}
          {!reasonOk && (
            <span className={reopenReason.length ? 'fin-field__error' : 'fin-cell-muted'} style={{ fontSize: 11.5 }}>
              اكتب سبباً لا يقلّ عن {MIN_REASON} أحرف — يُقرأ بعد سنوات ({reopenReason.trim().length}/{MIN_REASON})
            </span>
          )}
        </div>

        <div className="fin-field" style={{ marginTop: 10 }}>
          <label className="fin-field__label">
            للتأكيد اكتب السنة «{reopenTarget?.fiscal_year}»<span className="req">*</span>
          </label>
          {/* نصٌّ لا `type="number"`: أسهمُ العدّاد تبلغ السنة بنقرتين بلا قراءة،
              والغرضُ من التأكيد أن تُكتب بيدٍ واعية. */}
          <input className="fin-input" type="text" inputMode="numeric" value={reopenConfirm}
            onChange={(e) => { setReopenConfirm(e.target.value.trim()); setReopenError(null); }}
            placeholder={String(reopenTarget?.fiscal_year ?? '')} aria-label="تأكيد السنة" />
        </div>

        {reopenError && (
          <div className="acc-warn" style={{ background: 'var(--status-red-light)', color: 'var(--status-red)', marginTop: 10 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {reopenError}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClosingsPanel;
