// [وحدة المحاسبة #141 — م2/م3/م4] تبويب «المحاسبة»: الإقرار الضريبي، القيود
// اليومية، دليل الحسابات، القوائم المالية، الإقفال السنوي، وسجلّ القيود الفاشلة.
// خلف بوابة accounting_enabled + صلاحية accounting.view (الكتابة: accounting.manage).
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Landmark, FileSpreadsheet, BookOpenText, ListTree, BarChart3, Lock, FileWarning } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { EmptyState } from '../../../components/erp';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import { accountingService } from '../../../services/accountingService';
import TaxReturnPanel from './TaxReturnPanel';
import JournalPanel from './JournalPanel';
import AccountsPanel from './AccountsPanel';
import ReportsPanel from './ReportsPanel';
import ClosingsPanel from './ClosingsPanel';
import PostingFailuresPanel, { POSTING_FAILURES_SUMMARY_KEY } from './PostingFailuresPanel';

type Section = 'tax' | 'journal' | 'accounts' | 'reports' | 'closings' | 'failures';

const SECTIONS: { key: Section; label: string; icon: typeof Landmark }[] = [
  { key: 'tax', label: 'الإقرار الضريبي', icon: FileSpreadsheet },
  { key: 'journal', label: 'القيود اليومية', icon: BookOpenText },
  { key: 'accounts', label: 'دليل الحسابات', icon: ListTree },
  { key: 'reports', label: 'القوائم المالية', icon: BarChart3 },
  { key: 'closings', label: 'الإقفال السنوي', icon: Lock },
  // آخرَ القائمة عمداً: الأقسامُ الخمسةُ قبله عملٌ يوميّ رتّبته عادةُ المستخدم، وإزاحتُها
  // لقسمٍ يُفترض أن يبقى فارغاً تُربك بلا مقابل — والشارةُ الحمراء تُرى من أيّ قسمٍ كان.
  { key: 'failures', label: 'القيود الفاشلة', icon: FileWarning },
];

const AccountingTab: React.FC = () => {
  const { user } = useAuth();
  const { has } = usePermissionContext();
  const [section, setSection] = useState<Section>('tax');

  const accountingOn = !!user?.tenant?.accounting_enabled;

  /**
   * 🔑 عدّادُ الدَّين المحاسبيّ يُجلب مع فتح **التبويب** لا مع فتح شاشة الأعطال.
   *
   * شارةٌ لا تظهر إلا بعد دخول الشاشة التي تعدّها لا تُنبّه أحداً — وهي نفسُها الثغرةُ
   * التي خرجنا منها: جدولٌ يُكتب ولا يُقرأ. والنداءُ مجاميعُ SQL وحدَها (`COUNT` +
   * `MIN`) بلا جلبِ صفّ، لأنه يقع في ١٩٠+ مكتباً مع كلّ فتحة — وشارةٌ تُكلّف صفحةَ
   * صفوفٍ تُطفأ بعد أسبوعٍ فيعود العطلُ إلى الصمت.
   *
   * و`enabled` يمنع نداءً محكوماً بالرفض (٤٠٣ من بوابة الوحدة أو من الصلاحية) —
   * الخطّافاتُ تُنادى قبل الارتداد المبكّر لأن ترتيبَها لا يجوز أن يتغيّر بين رسمتين.
   */
  const { data: failuresSummary } = useQuery({
    queryKey: POSTING_FAILURES_SUMMARY_KEY,
    queryFn: () => accountingService.getPostingFailuresSummary(),
    enabled: accountingOn && has(FINANCE_PERMISSIONS.accountingView),
    // الرقمُ لا يتبدّل إلا بفشلِ توليدٍ جديدٍ أو بإغلاق دَين، وكلاهما يُبطل المفتاحَ
    // صراحةً من الشاشة — فلا داعيَ لإلحاحٍ يستهلك نداءً مع كل تنقّل.
    staleTime: 60_000,
  });

  const openFailures = failuresSummary?.data?.unresolved_count ?? 0;

  if (!accountingOn) {
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
            {/* الشارةُ تختفي تماماً عند الصفر: «0» في شارةِ إنذارٍ حمراء تُعلّم العينَ
                تجاهلَها، فحين يصير الرقمُ واحداً لا يلتفت إليه أحد. ولا نُحوّل القسمَ
                الافتراضيَّ إلى «الفاشلة» ولو كان العدّادُ عالياً — اختطافُ الشاشة التي
                فتحها المستخدمُ لغرضٍ آخر يُفقد الشارةَ ثقتَها لا يزيدها. */}
            {key === 'failures' && openFailures > 0 && (
              <span
                className="fin-badge fin-badge--danger"
                style={{ marginInlineStart: 5, padding: '0 6px', fontSize: 11, fontWeight: 700 }}
                aria-label={`${openFailures} قيداً فات الدفتر`}
              >
                {openFailures}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === 'tax' && <TaxReturnPanel />}
      {section === 'journal' && <JournalPanel />}
      {section === 'accounts' && <AccountsPanel />}
      {section === 'reports' && <ReportsPanel />}
      {section === 'closings' && <ClosingsPanel />}
      {section === 'failures' && <PostingFailuresPanel />}
    </div>
  );
};

export default AccountingTab;
