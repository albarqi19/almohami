// [وحدة المحاسبة #141 — م4] القوائم المالية: ميزان المراجعة، قائمة الدخل،
// المركز المالي، حركة النقد — والنقر على أي حساب يفتح دفتر أستاذه.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, TrendingUp, Landmark, Banknote, BookOpen } from 'lucide-react';
import {
  accountingService,
  type TrialBalanceReport, type IncomeStatementReport, type BalanceSheetReport, type CashMovementReport,
} from '../../../services/accountingService';
import { LoadingState, ErrorState, Modal } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { formatSAR } from '../../../utils/money';

type ReportKind = 'trial' | 'income' | 'balance' | 'cash';

const REPORTS: { key: ReportKind; label: string; icon: typeof Scale }[] = [
  { key: 'trial', label: 'ميزان المراجعة', icon: Scale },
  { key: 'income', label: 'قائمة الدخل', icon: TrendingUp },
  { key: 'balance', label: 'المركز المالي', icon: Landmark },
  { key: 'cash', label: 'حركة النقد', icon: Banknote },
];

const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

const ReportsPanel: React.FC = () => {
  const [kind, setKind] = useState<ReportKind>('trial');
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const [ledgerAccount, setLedgerAccount] = useState<{ id: number; name: string } | null>(null);

  const period = { from, to };

  const trialQ = useQuery({
    queryKey: ['accounting', 'trialBalance', period],
    queryFn: () => accountingService.getTrialBalance(period),
    enabled: kind === 'trial',
  });
  const incomeQ = useQuery({
    queryKey: ['accounting', 'incomeStatement', period],
    queryFn: () => accountingService.getIncomeStatement(period),
    enabled: kind === 'income',
  });
  const balanceQ = useQuery({
    queryKey: ['accounting', 'balanceSheet', to],
    queryFn: () => accountingService.getBalanceSheet({ as_of: to }),
    enabled: kind === 'balance',
  });
  const cashQ = useQuery({
    queryKey: ['accounting', 'cashMovement', period],
    queryFn: () => accountingService.getCashMovement(period),
    enabled: kind === 'cash',
  });

  const ledgerQ = useQuery({
    queryKey: ['accounting', 'ledger', ledgerAccount?.id, period],
    queryFn: () => accountingService.getGeneralLedger(ledgerAccount!.id, period),
    enabled: !!ledgerAccount,
  });

  const active = { trial: trialQ, income: incomeQ, balance: balanceQ, cash: cashQ }[kind];

  return (
    <div>
      <div className="acc-period">
        {REPORTS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button"
            className={`fin-btn fin-btn--sm${kind === key ? ' fin-btn--primary' : ''}`}
            onClick={() => setKind(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {kind !== 'balance' && (
          <>
            <input className="fin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="من" />
            <span>إلى</span>
          </>
        )}
        <input className="fin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={kind === 'balance' ? 'حتى تاريخ' : 'إلى'} />
      </div>

      {active.isLoading && <LoadingState text="جارٍ إعداد التقرير..." />}
      {active.isError && <ErrorState onRetry={active.refetch} />}

      {/* ── ميزان المراجعة ── */}
      {kind === 'trial' && trialQ.data?.data && !trialQ.isLoading && (() => {
        const r: TrialBalanceReport = trialQ.data.data;
        return (
          <>
            <BalancedFlag ok={r.balanced} okText="الميزان متوازن" badText="⚠ الميزان غير متوازن — راجع القيود" />
            <div style={{ overflowX: 'auto' }}>
              <table className="acc-table">
                <thead>
                  <tr>
                    <th rowSpan={2}>الحساب</th>
                    <th colSpan={2}>الرصيد الافتتاحي</th>
                    <th colSpan={2}>حركة الفترة</th>
                    <th colSpan={2}>الرصيد الختامي</th>
                  </tr>
                  <tr>
                    <th>مدين</th><th>دائن</th><th>مدين</th><th>دائن</th><th>مدين</th><th>دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.account_id} className="acc-row--click" title="عرض دفتر الأستاذ"
                      onClick={() => setLedgerAccount({ id: row.account_id, name: `${row.code} · ${row.name}` })}>
                      <td><span className="fin-cell-mono">{row.code}</span> {row.name}</td>
                      <td className="num">{row.opening_debit ? formatSAR(row.opening_debit) : '—'}</td>
                      <td className="num">{row.opening_credit ? formatSAR(row.opening_credit) : '—'}</td>
                      <td className="num">{row.period_debit ? formatSAR(row.period_debit) : '—'}</td>
                      <td className="num">{row.period_credit ? formatSAR(row.period_credit) : '—'}</td>
                      <td className="num">{row.closing_debit ? formatSAR(row.closing_debit) : '—'}</td>
                      <td className="num">{row.closing_credit ? formatSAR(row.closing_credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="acc-row--total">
                    <td>الإجمالي</td>
                    <td className="num">{formatSAR(r.totals.opening_debit)}</td>
                    <td className="num">{formatSAR(r.totals.opening_credit)}</td>
                    <td className="num">{formatSAR(r.totals.period_debit)}</td>
                    <td className="num">{formatSAR(r.totals.period_credit)}</td>
                    <td className="num">{formatSAR(r.totals.closing_debit)}</td>
                    <td className="num">{formatSAR(r.totals.closing_credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="fin-cell-muted" style={{ marginTop: 6 }}>انقر أي حساب لعرض دفتر أستاذه التفصيلي.</p>
          </>
        );
      })()}

      {/* ── قائمة الدخل ── */}
      {kind === 'income' && incomeQ.data?.data && !incomeQ.isLoading && (() => {
        const r: IncomeStatementReport = incomeQ.data.data;
        return (
          <div style={{ overflowX: 'auto' }}>
            <table className="acc-table" style={{ maxWidth: 680 }}>
              <thead>
                <tr><th>البند</th><th style={{ width: 160 }}>المبلغ (ريال)</th></tr>
              </thead>
              <tbody>
                <tr className="acc-row--group"><td colSpan={2}>الإيرادات</td></tr>
                {r.revenues.lines.map((line) => (
                  <tr key={line.account_id} className="acc-row--click"
                    onClick={() => setLedgerAccount({ id: line.account_id, name: `${line.code} · ${line.name}` })}>
                    <td style={{ paddingInlineStart: 28 }}>{line.name}</td>
                    <td className="num">{formatSAR(line.amount)}</td>
                  </tr>
                ))}
                <tr className="acc-row--group">
                  <td>إجمالي الإيرادات</td>
                  <td className="num">{formatSAR(r.revenues.total)}</td>
                </tr>
                <tr className="acc-row--group"><td colSpan={2}>المصروفات</td></tr>
                {r.expenses.lines.map((line) => (
                  <tr key={line.account_id} className="acc-row--click"
                    onClick={() => setLedgerAccount({ id: line.account_id, name: `${line.code} · ${line.name}` })}>
                    <td style={{ paddingInlineStart: 28 }}>{line.name}</td>
                    <td className="num">({formatSAR(line.amount)})</td>
                  </tr>
                ))}
                <tr className="acc-row--group">
                  <td>إجمالي المصروفات</td>
                  <td className="num">({formatSAR(r.expenses.total)})</td>
                </tr>
                <tr className="acc-row--total">
                  <td>{r.net_income >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</td>
                  <td className="num" style={{ color: r.net_income >= 0 ? 'var(--status-green)' : 'var(--status-red)' }}>
                    {formatSAR(Math.abs(r.net_income))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── المركز المالي ── */}
      {kind === 'balance' && balanceQ.data?.data && !balanceQ.isLoading && (() => {
        const r: BalanceSheetReport = balanceQ.data.data;
        const section = (title: string, lines: { account_id: number; code: string; name: string; balance: number }[], total: number) => (
          <>
            <tr className="acc-row--group"><td colSpan={2}>{title}</td></tr>
            {lines.map((line) => (
              <tr key={line.account_id} className="acc-row--click"
                onClick={() => setLedgerAccount({ id: line.account_id, name: `${line.code} · ${line.name}` })}>
                <td style={{ paddingInlineStart: 28 }}>{line.name}</td>
                <td className="num">{formatSAR(line.balance)}</td>
              </tr>
            ))}
            <tr className="acc-row--group">
              <td>إجمالي {title}</td>
              <td className="num">{formatSAR(total)}</td>
            </tr>
          </>
        );
        return (
          <>
            <BalancedFlag ok={r.balanced} okText={`المركز المالي متوازن حتى ${r.as_of}`} badText="⚠ غير متوازن — راجع القيود" />
            <div style={{ overflowX: 'auto' }}>
              <table className="acc-table" style={{ maxWidth: 680 }}>
                <thead>
                  <tr><th>البند</th><th style={{ width: 160 }}>الرصيد (ريال)</th></tr>
                </thead>
                <tbody>
                  {section('الأصول', r.assets.lines, r.assets.total)}
                  {section('الخصوم', r.liabilities.lines, r.liabilities.total)}
                  <tr className="acc-row--group"><td colSpan={2}>حقوق الملكية</td></tr>
                  {r.equity.lines.map((line) => (
                    <tr key={line.account_id} className="acc-row--click"
                      onClick={() => setLedgerAccount({ id: line.account_id, name: `${line.code} · ${line.name}` })}>
                      <td style={{ paddingInlineStart: 28 }}>{line.name}</td>
                      <td className="num">{formatSAR(line.balance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ paddingInlineStart: 28 }}>صافي دخل الفترة (غير مقفل)</td>
                    <td className="num">{formatSAR(r.equity.unclosed_net_income)}</td>
                  </tr>
                  <tr className="acc-row--group">
                    <td>إجمالي حقوق الملكية</td>
                    <td className="num">{formatSAR(r.equity.total)}</td>
                  </tr>
                  <tr className="acc-row--total">
                    <td>الخصوم + حقوق الملكية</td>
                    <td className="num">{formatSAR(r.liabilities.total + r.equity.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {/* ── حركة النقد ── */}
      {kind === 'cash' && cashQ.data?.data && !cashQ.isLoading && (() => {
        const r: CashMovementReport = cashQ.data.data;
        return (
          <div style={{ overflowX: 'auto' }}>
            <table className="acc-table" style={{ maxWidth: 560 }}>
              <tbody>
                <tr><td>النقد أول الفترة (صندوق + بنك)</td><td className="num">{formatSAR(r.opening_cash)}</td></tr>
                <tr><td>المقبوضات خلال الفترة</td><td className="num" style={{ color: 'var(--status-green)' }}>{formatSAR(r.inflow)}</td></tr>
                <tr><td>المدفوعات خلال الفترة</td><td className="num" style={{ color: 'var(--status-red)' }}>({formatSAR(r.outflow)})</td></tr>
                <tr className="acc-row--group"><td>صافي التغيّر</td><td className="num">{formatSAR(r.net_change)}</td></tr>
                <tr className="acc-row--total"><td>النقد آخر الفترة</td><td className="num">{formatSAR(r.closing_cash)}</td></tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── دفتر الأستاذ (مودال) ── */}
      <Modal
        open={!!ledgerAccount}
        onClose={() => setLedgerAccount(null)}
        title={<><BookOpen size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />دفتر الأستاذ — {ledgerAccount?.name}</>}
        size="wide"
      >
        {ledgerQ.isLoading && <LoadingState />}
        {ledgerQ.isError && <ErrorState onRetry={ledgerQ.refetch} />}
        {ledgerQ.data?.data && (
          <div style={{ overflowX: 'auto' }}>
            <table className="acc-table">
              <thead>
                <tr><th>التاريخ</th><th>القيد</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>
              </thead>
              <tbody>
                <tr className="acc-row--group">
                  <td colSpan={5}>رصيد افتتاحي ({ledgerQ.data.data.period.from})</td>
                  <td className="num">{formatSAR(ledgerQ.data.data.opening_balance)}</td>
                </tr>
                {ledgerQ.data.data.movements.map((m, i) => (
                  <tr key={i}>
                    <td className="num">{m.date}</td>
                    <td className="num">{m.entry_number}</td>
                    <td>{m.description}</td>
                    <td className="num">{m.debit ? formatSAR(m.debit) : '—'}</td>
                    <td className="num">{m.credit ? formatSAR(m.credit) : '—'}</td>
                    <td className="num">{formatSAR(m.balance)}</td>
                  </tr>
                ))}
                <tr className="acc-row--total">
                  <td colSpan={5}>الرصيد الختامي</td>
                  <td className="num">{formatSAR(ledgerQ.data.data.closing_balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

const BalancedFlag: React.FC<{ ok: boolean; okText: string; badText: string }> = ({ ok, okText, badText }) => (
  <div style={{ marginBottom: 8 }}>
    <ToneBadge tone={ok ? 'success' : 'danger'} size="lg">{ok ? okText : badText}</ToneBadge>
  </div>
);

export default ReportsPanel;
