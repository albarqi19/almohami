// [EXP-REBILL] نثريات العميل القابلة للتحصيل — تُضاف بنوداً على مسودة الفاتورة.
// الباك كان يملك المسار (POST /case-invoices/{id}/rebill-expenses) بلا أي واجهة تناديه.
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Receipt } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { formatSAR, toNumber } from '../../utils/money';
import { invalidateFinance } from '../../utils/financeCache';

export interface BillableExpense {
  id: number;
  expense_number: string;
  description: string | null;
  expense_date: string;
  rebillable_amount: number | string;
  has_tax_invoice?: boolean;
  category?: { id: number; name: string } | null;
  case_model?: { id: number; file_number: string; title: string } | null;
}

interface Props {
  invoiceId: number;
  clientId: number;
  canManage: boolean;
}

const RebillableExpenses: React.FC<Props> = ({ invoiceId, clientId, canManage }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isError } = useQuery({
    queryKey: ['finance', 'billable-expenses', clientId],
    queryFn: () => apiClient.get<{ success: boolean; data: BillableExpense[] }>(`/expenses/billable?client_id=${clientId}`),
    enabled: !!clientId,
    retry: false, // وحدة المحاسبة غير مفعلة ⇒ 403 — لا إعادة محاولة ولا إزعاج
  });
  const expenses = useMemo(() => data?.data ?? [], [data]);

  const rebill = useMutation({
    mutationFn: () => apiClient.post<{ success: boolean; message?: string }>(`/case-invoices/${invoiceId}/rebill-expenses`, { expense_ids: selected }),
    onSuccess: (res) => {
      toast.success(res.message || 'أُضيفت النثريات إلى الفاتورة');
      setSelected([]);
      invalidateFinance(queryClient);
      queryClient.invalidateQueries({ queryKey: ['finance', 'billable-expenses', clientId] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoice', String(invoiceId)] });
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّرت إضافة النثريات'),
  });

  if (isError || expenses.length === 0) return null;

  const total = expenses.filter((e) => selected.includes(e.id)).reduce((s, e) => s + toNumber(e.rebillable_amount), 0);
  const toggle = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = selected.length === expenses.length;

  return (
    <div className="fin-section">
      <div className="fin-section__head">
        <span className="fin-section__title"><Receipt size={15} /> نثريات قابلة للتحصيل من العميل ({expenses.length})</span>
        {canManage && (
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setSelected(allSelected ? [] : expenses.map((e) => e.id))}>
            {allSelected ? 'إلغاء التحديد' : 'تحديد الكل'}
          </button>
        )}
      </div>
      <div className="fin-section__body">
        <div className="fin-cell-muted" style={{ marginBottom: 8 }}>
          مصروفات دُفعت عن هذا العميل ولم تُفوتر بعد. المحدد منها يُضاف بنوداً على هذه المسودة بمبلغه القابل للتحصيل.
        </div>
        {expenses.map((e) => (
          <label key={e.id} className="fin-line" style={{ cursor: canManage ? 'pointer' : 'default' }}>
            <div className="fin-line__main" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {canManage && <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />}
              <div>
                <span className="fin-docnum">{e.expense_number}</span>
                <span className="fin-line__sub"> · {e.expense_date?.split('T')[0]}{e.category?.name ? ` · ${e.category.name}` : ''}</span>
                {e.description && <div className="fin-cell-muted">{e.description}</div>}
              </div>
            </div>
            <span className="fin-line__amount">{formatSAR(e.rebillable_amount)}</span>
          </label>
        ))}
        {canManage && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={selected.length === 0 || rebill.isPending} onClick={() => rebill.mutate()}>
              {rebill.isPending ? 'جارٍ الإضافة...' : `إضافة المحدد إلى الفاتورة${selected.length ? ` (${formatSAR(total)})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RebillableExpenses;
