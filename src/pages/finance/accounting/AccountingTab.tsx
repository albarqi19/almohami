// [وحدة المحاسبة #141 — م2/م3/م4] تبويب «المحاسبة»: الإقرار الضريبي، القيود
// اليومية، دليل الحسابات، القوائم المالية، والإقفال السنوي.
// خلف بوابة accounting_enabled + صلاحية accounting.view (الكتابة: accounting.manage).
import React, { useState } from 'react';
import { Landmark, FileSpreadsheet, BookOpenText, ListTree, BarChart3, Lock } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { EmptyState } from '../../../components/erp';
import TaxReturnPanel from './TaxReturnPanel';
import JournalPanel from './JournalPanel';
import AccountsPanel from './AccountsPanel';
import ReportsPanel from './ReportsPanel';
import ClosingsPanel from './ClosingsPanel';

type Section = 'tax' | 'journal' | 'accounts' | 'reports' | 'closings';

const SECTIONS: { key: Section; label: string; icon: typeof Landmark }[] = [
  { key: 'tax', label: 'الإقرار الضريبي', icon: FileSpreadsheet },
  { key: 'journal', label: 'القيود اليومية', icon: BookOpenText },
  { key: 'accounts', label: 'دليل الحسابات', icon: ListTree },
  { key: 'reports', label: 'القوائم المالية', icon: BarChart3 },
  { key: 'closings', label: 'الإقفال السنوي', icon: Lock },
];

const AccountingTab: React.FC = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('tax');

  if (!user?.tenant?.accounting_enabled) {
    return (
      <EmptyState
        icon={Landmark}
        title="وحدة المحاسبة غير مفعّلة"
        desc="القيود والإقرار الضريبي والقوائم المالية جزء من وحدة المحاسبة — تواصل مع إدارة النظام لتفعيلها لشركتك."
      />
    );
  }

  return (
    <div>
      <div className="fin-subtabs" role="tablist">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            className={`fin-subtab${section === key ? ' fin-subtab--active' : ''}`}
            onClick={() => setSection(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {section === 'tax' && <TaxReturnPanel />}
      {section === 'journal' && <JournalPanel />}
      {section === 'accounts' && <AccountsPanel />}
      {section === 'reports' && <ReportsPanel />}
      {section === 'closings' && <ClosingsPanel />}
    </div>
  );
};

export default AccountingTab;
