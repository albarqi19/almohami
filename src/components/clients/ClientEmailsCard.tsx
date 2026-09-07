import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Globe, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import ClientManagementService, { type ClientEmail, type ClientEmailKind } from '../../services/clientManagementService';

/**
 * بُرُد المراسلة الإضافية للعميل (بريد بعينه أو نطاق كامل).
 *
 * العميل يحمل بريداً واحداً، وصندوق البريد الذكي يطابق المُرسِل به فقط — فجهةٌ تراسل
 * من عشرين إدارة لا يُطابَق منها شيء. هنا يُضاف بريد كلّ إدارة، أو النطاق كلّه مرّة
 * واحدة، وتُربط الطلبات المعلّقة من هذه البُرُد بالعميل فور الإضافة.
 */
const ClientEmailsCard: React.FC<{ clientId: number; canEdit: boolean }> = ({ clientId, canEdit }) => {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ClientEmailKind>('email');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const key = ['client-emails', clientId];
  const { data: emails = [], isLoading } = useQuery<ClientEmail[]>({
    queryKey: key,
    queryFn: () => ClientManagementService.getClientEmails(clientId),
    enabled: clientId > 0,
  });

  const addMut = useMutation({
    mutationFn: () => ClientManagementService.addClientEmail(clientId, { kind, value: value.trim(), label: label.trim() || null }),
    onSuccess: (res) => {
      setValue('');
      setLabel('');
      setError(null);
      toast.success(res.message || 'أُضيف');
      queryClient.invalidateQueries({ queryKey: key });
      if (res.rematched > 0) queryClient.invalidateQueries({ queryKey: ['intake-requests'] });
    },
    onError: (e: unknown) => setError(extractMessage(e, 'تعذّرت الإضافة')),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => ClientManagementService.deleteClientEmail(clientId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: unknown) => toast.error(extractMessage(e, 'تعذّر الحذف')),
  });

  const submit = () => {
    if (!value.trim() || addMut.isPending) return;
    addMut.mutate();
  };

  return (
    <div className="client-emails">
      {isLoading ? (
        <div className="client-side__empty">جارٍ التحميل…</div>
      ) : emails.length === 0 ? (
        <div className="client-side__empty">لا بُرُد إضافية — تُطابَق رسائل هذا العميل ببريده الرئيسي فقط.</div>
      ) : (
        <ul className="client-emails__list">
          {emails.map((e) => (
            <li key={e.id} className="client-emails__row" title={e.creator?.name ? `أضافه ${e.creator.name}` : undefined}>
              <span className={`client-emails__kind client-emails__kind--${e.kind}`} title={e.kind === 'domain' ? 'نطاق — كل مُرسِل عليه' : 'بريد بعينه'}>
                {e.kind === 'domain' ? <Globe size={11} /> : <AtSign size={11} />}
              </span>
              <span className="client-emails__value" dir="ltr">{e.kind === 'domain' ? `@${e.value}` : e.value}</span>
              {e.label && <span className="client-emails__label">{e.label}</span>}
              {canEdit && (
                <button
                  type="button"
                  className="client-emails__del"
                  onClick={() => { if (window.confirm('حذف هذا البريد من العميل؟')) delMut.mutate(e.id); }}
                  disabled={delMut.isPending}
                  title="حذف"
                  aria-label="حذف"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="client-emails__form">
          <div className="client-emails__form-row">
            <select value={kind} onChange={(e) => { setKind(e.target.value as ClientEmailKind); setError(null); }} aria-label="النوع">
              <option value="email">بريد</option>
              <option value="domain">نطاق</option>
            </select>
            <input
              dir="ltr"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={kind === 'domain' ? 'university.edu.sa' : 'dept@university.edu.sa'}
              aria-label={kind === 'domain' ? 'النطاق' : 'البريد'}
            />
          </div>
          <div className="client-emails__form-row">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="الإدارة/الجهة — اختياري"
              maxLength={100}
              aria-label="التسمية"
            />
            <button type="button" className="client-emails__add" onClick={submit} disabled={!value.trim() || addMut.isPending}>
              <Plus size={11} /> {addMut.isPending ? '…' : 'إضافة'}
            </button>
          </div>
          {error && <p className="client-emails__error">{error}</p>}
          <p className="client-emails__hint">
            {kind === 'domain'
              ? 'النطاق يربط كلَّ مُرسِلٍ عليه بهذا العميل — للجهات ذات الإدارات المتعدّدة. النطاقات العامّة (gmail…) مرفوضة.'
              : 'رسائل هذا البريد في صندوق البريد الذكي تُربط بالعميل تلقائياً، والمعلّق منها يُربط الآن.'}
          </p>
        </div>
      )}
    </div>
  );
};

function extractMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string };
  const firstError = err?.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : undefined;
  return firstError || err?.response?.data?.message || err?.message || fallback;
}

export default ClientEmailsCard;
