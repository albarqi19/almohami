import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BankAccountService, BANK_ACCOUNTS_QUERY_KEY } from '../../services/bankAccountService';

/**
 * [INV-P3] اختيار الحسابات البنكية التي تُطبع على الفاتورة (حتى ثلاثة).
 * بلا اختيار تُطبع الافتراضية. لا يظهر شيء إن لم يكن للمكتب حسابات.
 */
interface Props {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

const BankAccountPicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { data } = useQuery({ queryKey: BANK_ACCOUNTS_QUERY_KEY, queryFn: () => BankAccountService.list(), staleTime: 60_000 });
  const accounts = (data?.accounts ?? []).filter((a) => a.is_active && a.show_on_invoices);
  const maxPrinted = data?.meta.max_printed ?? 3;

  if (accounts.length === 0) return null;

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < maxPrinted) onChange([...value, id]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>
        الحسابات البنكية على الفاتورة {value.length === 0 ? '(بلا اختيار: الحساب الافتراضي)' : `(${value.length}/${maxPrinted})`}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {accounts.map((a) => {
          const checked = value.includes(a.id);
          return (
            <label
              key={a.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, fontSize: 12,
                border: '1px solid var(--color-border)', background: checked ? 'var(--color-bg-secondary)' : 'transparent', cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(a.id)} disabled={disabled || (!checked && value.length >= maxPrinted)} />
              <span>{a.bank_name || 'بنك'}{a.is_default ? ' (الافتراضي)' : ''}</span>
              <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace', color: 'var(--color-text-secondary)' }}>{a.iban_masked}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default BankAccountPicker;
