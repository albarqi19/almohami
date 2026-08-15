import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

import { fmtCount } from '../leave/leaveFormat';
import { SEC, scrollToSection } from './dossierSections';
import { URGENT_DAYS, isLawyer, remainingDays } from './dossierFormat';
import {
  useEmployeeChecklist,
  useEmployeeContracts,
  useEmployeeDocuments,
  useLeaveBalance,
} from './useDossierData';
import type { EmployeeProfile } from '../../../types/hr';

/**
 * **شريطُ «ما يستحقّ الفعل» — حقيقةٌ وفعلٌ في بندٍ واحد.**
 *
 * ══════ من أين تأتي بنودُه (وهذا هو القرارُ الحاكم) ══════
 * **من مفاتيح استعلامٍ مشتركة، لا من `withCount` في الخادم.** `EmployeeProfileController::show`
 * يحمل العلاقاتِ ولا يحمل عدّاداً واحداً، فبندا «لا عقدَ مسجَّل» و«المباشرة ٣ من ٨» لا
 * يمكن رسمُهما من حمولة الملفّ. والحلُّ ليس تعديلَ الباك بل أنّ هذا الشريطَ يستعمل
 * **الخطّافاتِ نفسَها** التي تستعملها التبويبات (`useDossierData`) — فتدمج React Query
 * النداءَ بالمفتاح ⇒ **صفرُ طلبٍ إضافيّ وصفرُ تعديلٍ في الباك**.
 *
 * ══════ قواعدُ لا تُخالَف ══════
 * · **الترتيبُ ثابتٌ لا يتبدّل** بامتلاء الملفّ — ما يبقى يبقى في موضعه، فتُبنى ذاكرةُ
 *   العضلات من اليوم الأوّل. (الملفُّ يمتلئ فيتغيّر عددُ البنود لا مواضعُها.)
 * · **لا يُرسَم بندٌ قبل وصول مصدره**: لا شريحةَ هيكلٍ ولا شرطة. والاستعلامُ المعطَّلُ
 *   بالصلاحية (`hr.manage`) يبقى `data === undefined` أبداً ⇒ بنودُه لا تُرسَم لمن لا
 *   يملكها — وهذا صوابٌ لا نقص: ما لا يُقرأ لا يُدَّعى عنه شيء.
 * · **ولا يُعلَن السلامةُ قبل أن تصل مصادرُها**: `hrl-conflict--none` لا يظهر ما دام
 *   مصدرٌ واحدٌ في الطريق، وإلّا وميضُ «لا شيءَ يستحقّ الفعل» ثمّ خمسةُ بنودٍ — أسوأُ
 *   كذبةٍ يمكن أن يقولها شريطُ تنبيه.
 * · **غيرُ قابلٍ للطيّ عمداً**: خيارُ إخفاء التنبيهات يعني أنّ رخصةً ستنتهي بلا أن
 *   يراها أحد.
 * · وحين لا شيء: **يُعلَن** السطرُ الأخضر — غيابُ التحذير غامض، وإعلانُ السلامة ليس كذلك.
 */

interface Props {
  empId: number;
  emp: EmployeeProfile;
  /** `hr.manage` — تُقرأ مرّةً في الجدار وتُمرَّر، فلا تُقرأ الصلاحيةُ ذاتُها في موضعين. */
  canManage: boolean;
  /** يفتح `EditEmployeeModal` المملوكَ للجدار (نسخةٌ واحدةٌ لا نسختان). */
  onEdit: () => void;
}

/** بندٌ واحد: حقيقةٌ **ومقصدٌ** معاً — ولا بندَ بلا مقصد. */
interface ActionChip {
  key: string;
  label: string;
  /** الشدّة: المنتهي أحمرُ · وما دون ٦٠ يوماً ذهبيّ · وما سواه محايدٌ بلا لون. */
  tone?: 'warn' | 'danger';
  /** مرساةُ قسمٍ داخل الجدار نفسِه. */
  jump?: string;
  /** رابطٌ خارج الجدار — يبقى `<Link>` لا زرّاً فيُنسَخ ويُفتح في تبويبٍ جديد. */
  to?: string;
  /** فعلٌ محليّ (مودالُ التعديل). */
  act?: () => void;
}

/** المؤنّث (الرخصة · الهوية). المذكّرُ (العقد) له صياغتُه في موضعه. */
const feminineExpiry = (subject: string, days: number): string =>
  days <= 0 ? `${subject} منتهية` : `${subject} تنتهي بعد ${fmtCount(days)} يوماً`;

/** الشدّةُ من الأيام وحدَها — قاعدةٌ واحدةٌ لكلّ التواريخ في الشريط. */
const toneOf = (days: number): ActionChip['tone'] => (days <= 0 ? 'danger' : 'warn');

export const DossierActionChips: React.FC<Props> = ({ empId, emp, canManage, onEdit }) => {
  // أربعةُ مفاتيحَ مشتركةٍ حرفياً مع `LeaveTabPanel` و`DocumentsTab` و`ContractsTab`
  // و`OnboardingTab` و`TimelineAside` ⇒ الشريطُ يقرأ ما طُلب أصلاً ولا يطلب شيئاً.
  const balanceQuery = useLeaveBalance(empId);
  const documentsQuery = useEmployeeDocuments(empId);
  const contractsQuery = useEmployeeContracts(empId);
  const checklistQuery = useEmployeeChecklist(empId);

  const chips: ActionChip[] = [];

  // ═══ ١) تاريخُ المباشرة — مرساةُ الاستحقاق كلِّه ═══
  // محروسٌ بـ`hr.manage` لأنّ مقصدَه مودالُ التعديل: بندٌ لا يُفضي إلى فعلٍ في يد قارئه
  // ليس «ما يستحقّ الفعل». والحقيقةُ نفسُها معروضةٌ في البطاقة وفي الرصيف لكلِّ قارئ.
  if (canManage && !emp.hire_date) {
    chips.push({
      key: 'hire-date',
      label: 'تاريخُ المباشرة غير مسجَّل — الاستحقاقُ لا يُحتسب',
      act: onEdit,
    });
  }

  // ═══ ٢) الرصيد غير مُهيَّأ ═══
  // مصدرُه `is_initialized` من الخادم لا تخميناً في الواجهة، ومقصدُه صفحةُ الإجازات حيث
  // تُهيَّأ المرساة — ولا يُعرض هنا رقمٌ بلا أساس (لا ٢١ ولا ٠ ولا شرطة).
  if (balanceQuery.data && !balanceQuery.data.is_initialized) {
    chips.push({ key: 'balance', label: 'الرصيد غير مُهيَّأ', to: `/hr/leave/${empId}` });
  }

  // ═══ ٣) رخصةُ الهيئة ═══
  // الحسابُ من `remainingDays` المشتركة — لا نسخةَ ثانيةً منه في هذا الملفّ.
  const licenseDays = isLawyer(emp) ? remainingDays(emp.sba_license_expiry_gregorian) : null;
  if (licenseDays != null && licenseDays < URGENT_DAYS) {
    chips.push({
      key: 'license',
      label: feminineExpiry('الرخصة', licenseDays),
      tone: toneOf(licenseDays),
      jump: SEC.identity,
    });
  }

  // ═══ ٤) الهوية الوطنية ═══
  const nationalIdDays = remainingDays(emp.national_id_expiry_gregorian);
  if (nationalIdDays != null && nationalIdDays < URGENT_DAYS) {
    chips.push({
      key: 'national-id',
      label: feminineExpiry('الهوية', nationalIdDays),
      tone: toneOf(nationalIdDays),
      jump: SEC.identity,
    });
  }

  // ═══ ٥) المستندات ═══
  const documents = documentsQuery.data;
  if (documents) {
    const expired = documents.filter((d) => {
      const days = remainingDays(d.expiry_date_gregorian);
      return days != null && days <= 0;
    }).length;

    if (documents.length === 0) {
      chips.push({ key: 'docs-none', label: 'لا مستنداتِ محفوظة', jump: SEC.docs });
    } else if (expired > 0) {
      chips.push({
        key: 'docs-expired',
        label: `مستندٌ منتهٍ (${fmtCount(expired)})`,
        tone: 'danger',
        jump: SEC.docs,
      });
    }
  }

  // ═══ ٦) العقود ═══
  const contracts = contractsQuery.data;
  if (contracts) {
    if (contracts.length === 0) {
      chips.push({ key: 'contract-none', label: 'لا عقدَ مسجَّل', jump: SEC.contracts });
    } else {
      // العقدُ الساري وحدَه هو المقصود؛ والمنتهي حالتُه في الجدول لا في التنبيه.
      const activeEnd = contracts.find((c) => c.status === 'active')?.end_date;
      const days = remainingDays(activeEnd);

      if (days != null && days < URGENT_DAYS) {
        chips.push({
          key: 'contract-end',
          label: days <= 0 ? 'العقدُ منتهٍ' : `العقد ينتهي بعد ${fmtCount(days)} يوماً`,
          tone: toneOf(days),
          jump: SEC.contracts,
        });
      }
    }
  }

  // ═══ ٧) قائمةُ المباشرة ═══
  const checklist = checklistQuery.data;
  if (checklist) {
    const onboarding = checklist.filter((i) => i.kind === 'onboarding');
    const done = onboarding.filter((i) => i.is_done).length;

    // شرطُ «لم تُهيَّأ» هو خلوُّ القائمة كلِّها — نفسُ شرطِ زرّ التهيئة في `OnboardingTab`،
    // فلا يقود بندٌ إلى زرٍّ لن يجده صاحبُه هناك.
    if (checklist.length === 0) {
      chips.push({ key: 'onboarding-none', label: 'قائمةُ المباشرة لم تُهيَّأ', jump: SEC.onboarding });
    } else if (onboarding.length > 0 && done < onboarding.length) {
      chips.push({
        key: 'onboarding-progress',
        label: `المباشرة ${fmtCount(done)} من ${fmtCount(onboarding.length)}`,
        jump: SEC.onboarding,
      });
    }
  }

  if (chips.length === 0) {
    // `isLoading` في v5 = `isPending && isFetching`، فالاستعلامُ المعطَّلُ بالصلاحية لا
    // يُعدّ منتظَراً (وإلّا انتظر الشريطُ إلى الأبد مصدراً لن يصل).
    const awaiting =
      balanceQuery.isLoading ||
      documentsQuery.isLoading ||
      contractsQuery.isLoading ||
      checklistQuery.isLoading;

    if (awaiting) return null;

    return (
      <div className="hrl-conflict hrl-conflict--none">
        <p>
          <Check size={13} /> لا شيءَ يستحقّ الفعل في هذا الملفّ اليوم.
        </p>
      </div>
    );
  }

  return (
    <div className="hrl-chips" role="group" aria-label="ما يستحقّ الفعل">
      {chips.map((chip) => {
        const className = `hrl-chip${chip.tone ? ` hrl-chip--${chip.tone}` : ''}`;

        if (chip.to) {
          return (
            <Link key={chip.key} className={className} to={chip.to}>
              {chip.label}
            </Link>
          );
        }

        const anchor = chip.jump;

        return (
          <button
            key={chip.key}
            type="button"
            className={className}
            onClick={anchor ? () => { scrollToSection(anchor); } : chip.act}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
};

export default DossierActionChips;
