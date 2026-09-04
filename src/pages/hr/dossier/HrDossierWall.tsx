import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  FileBadge,
  FileSignature,
  FileText,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';

import { usePermission } from '../../../hooks/usePermission';
import ContractsTab from '../ContractsTab';
import DocumentsTab from '../DocumentsTab';
import OnboardingTab from '../OnboardingTab';
import EditEmployeeModal from '../EditEmployeeModal';
import LeaveTabPanel from '../leave/LeaveTabPanel';
import { errorText } from '../leave/leaveFormat';
import CardBlock from './CardBlock';
import DangerBlock from './DangerBlock';
import DossierActionChips from './DossierActionChips';
import DossierHead from './DossierHead';
import DossierJumpBar from './DossierJumpBar';
import { SEC } from './dossierSections';
import type { JumpSection } from './dossierSections';
import IdentityBlock from './IdentityBlock';
import LettersBlock from './LettersBlock';
import PayBlock from './PayBlock';
import TimelineAside from './TimelineAside';
import {
  useDossierInvalidate,
  useEmployee,
  useEmployeeContracts,
  useEmployeeDocuments,
  useEmployeeLetters,
} from './useDossierData';

/**
 * **الجدار — شجرةُ DOM واحدةٌ تحلّ محلَّ شجرتَي الملفّ.**
 *
 * ══════ ما سقط هنا ══════
 * `useIsDesktop` · `D_TABS` · حالةُ `tab` · `hr-dossier__mobile-tabs` ·
 * `hr-dossier__desktop-grid` · سبعُ `!important` كانت كلُّها ثمرةَ الازدواج · ثلاثةُ
 * طلباتِ شبكةٍ لا يراها أحدٌ على الجوال (شبكةُ الديسكتوب كانت تُركَّب داخل
 * `display:none` فتُطلق `contracts`/`documents`/`checklist`) · ثقبُ العرض 1024px
 * (حيث كان لوحُ الإجازات يظهر **فارغاً تماماً**) · ازدواجُ العرض بين 1024 و1025 ·
 * ~٣١ نصّاً عربياً مكرَّراً · وثلاثةُ انحرافاتٍ مؤكَّدةٍ بين النسختين.
 *
 * ══════ البنيةُ ══════
 * الرأسُ وشريطُ «ما يستحقّ الفعل» وشريطُ القفز **خارج المُمرِّر** (`flex:0 0 auto` داخل
 * المسرح)، والمُمرِّرُ الوحيدُ فوق 1400px هو `.hrl-wall`؛ ودونها ينتقل التمريرُ إلى
 * `.hrl-cols` (§١٣-ك) فلا يُقصّ الرصيفُ صامتاً ولا يجتمع مُمرِّران.
 *
 * ══════ الصلاحيةُ تحذف ولا تُعطِّل ══════
 * `canComp` ⇒ بلوكُ الأجر **لا يُركَّب** بدونها ولا يظهر بندُه في شريط القفز (بلوكٌ يقول
 * «محميّ» يُفشي أنّ لصاحبه راتباً مسجَّلاً). و`canManage` ⇒ بلوكُ الإجراءات الحسّاسة
 * لا يُركَّب بدونها. وحين تسقط أزرارُ الرأس كلُّها يبقى سطرُ «عرضٌ فقط» يفسّر الغياب.
 *
 * ══════ المراسي ══════
 * `SECTIONS` مصفوفةٌ **واحدةٌ** هي مصدرُ شريط القفز ومراسي الأقسام معاً، فلا يفترق
 * عنوانٌ عن مرساته. وعند التركيب يُقرأ `location.hash` فيُقفز إليه — وبه تُحمَل المرساةُ
 * عبر تبديل الموظف (`HrModule.select`)، فرفعُ الهوية لعشرة منسوبين قفزةٌ واحدةٌ لكلٍّ
 * لا عشرُ تمريراتٍ إلى الأسفل.
 */

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطع الاتصال بالخادم.';

interface Props {
  empId: number;
}

export const HrDossierWall: React.FC<Props> = ({ empId }) => {
  // الصلاحياتُ تُقرأ **مرّةً أعلى المكوّن** ثمّ تُمرَّر — فلا تُقرأ الصلاحيةُ ذاتُها في موضعين.
  const canManage = usePermission('hr.manage');
  const canLeave = usePermission('hr.leave.manage');
  // بلا هذه الصلاحية **لا يُركَّب بلوكُ الأجر إطلاقاً** ولا يظهر بندُه في شريط القفز:
  // بلوكٌ مقفلٌ (أو بندٌ يقفز إلى قفل) يُخبر الغرفةَ أنّ لهذا الشخص راتباً مسجَّلاً.
  const canComp = usePermission('hr.compensation.view');
  // **أوّلُ استعمالٍ لـ`hr.letters.issue` في الواجهة**: تحرس الزرَّ وحدَه — والسجلُّ
  // يُقرأ بـ`hr.view` كبقية الجدار، فالبلوكُ يُركَّب للجميع.
  const canIssueLetters = usePermission('hr.letters.issue');

  const [showEdit, setShowEdit] = useState(false);
  const wallRef = useRef<HTMLDivElement | null>(null);
  const jumped = useRef(false);
  const { hash } = useLocation();

  const employeeQuery = useEmployee(empId);
  const emp = employeeQuery.data;
  const invalidateEmployee = useDossierInvalidate(empId).employee;

  // مفتاحان مشتركان مع التبويبين ⇒ **صفرُ طلبٍ إضافيّ** (React Query تدمج بالمفتاح)،
  // ومنهما عدّادا شريط القفز.
  const { data: contracts } = useEmployeeContracts(empId);
  const { data: documents } = useEmployeeDocuments(empId);
  const { data: letters } = useEmployeeLetters(empId);

  const sections = useMemo<JumpSection[]>(() => {
    const list: JumpSection[] = [
      { id: SEC.card, label: 'البطاقة', icon: User },
      { id: SEC.leave, label: 'الإجازات', icon: CalendarDays },
      { id: SEC.contracts, label: 'العقود', icon: FileSignature, count: contracts?.length },
      { id: SEC.docs, label: 'المستندات', icon: FileText, count: documents?.length },
      // **يظهر للجميع** — البلوكُ قسمُ قراءةٍ محروسٌ بـ`hr.view`، والصلاحيةُ تحرس الزرّ.
      { id: SEC.letters, label: 'الخطابات', icon: FileBadge, count: letters?.length },
      { id: SEC.onboarding, label: 'المباشرة', icon: ClipboardCheck },
      { id: SEC.identity, label: 'الهوية', icon: ShieldCheck },
    ];

    // البندُ يُضاف مع البلوك ويسقط معه — مصدرٌ واحدٌ للشريط وللمراسي، فلا يقفز بندٌ
    // إلى قسمٍ غيرِ مركَّب. (وبلوكُ «إجراءاتٌ حسّاسة» بلا بندٍ عمداً: ليس قسمَ قراءة.)
    if (canComp) list.push({ id: SEC.pay, label: 'الأجر', icon: Wallet });

    return list;
  }, [contracts?.length, documents?.length, letters?.length, canComp]);

  // القفزةُ **مرّةً واحدةً لكلّ تركيب** (`key={selectedId}` في `HrModule` يفرض تركيباً
  // جديداً لكلّ موظف). ولا تُعاد عند إبطالِ البيانات، وإلّا قفز الجدارُ بعد كلّ حفظ.
  useEffect(() => {
    if (jumped.current || !emp) return;
    jumped.current = true;

    if (!/^#hrl-sec-[a-z]+$/.test(hash)) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [emp, hash]);

  if (employeeQuery.isPending) {
    return (
      <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل الملف">
        {Array.from({ length: 4 }, (_, i) => (
          <span className="hrl-skel" key={i} />
        ))}
      </div>
    );
  }

  // لا يُصيَّر الجدارُ إطلاقاً قبل وصول `emp` — فلا رأسَ بلا اسمٍ ولا مراسٍ بلا أقسام.
  if (employeeQuery.isError || !emp) {
    return (
      <div className="hrl-state hrl-state--error">
        <AlertTriangle size={20} />
        <p className="hrl-state__t">تعذر فتح ملف الموظف</p>
        <p className="hrl-state__d">{errorText(employeeQuery.error, CONNECTION_FALLBACK)}</p>
        <button type="button" className="hr-btn hr-btn--sm" onClick={() => void employeeQuery.refetch()}>
          <RefreshCw size={13} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <>
      {showEdit && (
        <EditEmployeeModal emp={emp} onClose={() => setShowEdit(false)} onSaved={invalidateEmployee} />
      )}

      <DossierHead
        empId={empId}
        emp={emp}
        canManage={canManage}
        canLeave={canLeave}
        onEdit={() => setShowEdit(true)}
      />

      {/* «ما يستحقّ الفعل» **فوق** شريط القفز: ما يستحقّ الفعل يُقرأ قبل أن يُختار
          القسم، وموضعُه ثابتٌ فلا يزحف الشريطُ بامتلاء الملفّ. */}
      <DossierActionChips empId={empId} emp={emp} canManage={canManage} onEdit={() => setShowEdit(true)} />

      <DossierJumpBar sections={sections} scroller={wallRef} />

      <div className="hrl-cols">
        <div className="hrl-cols__main">
          <div className="hrl-wall" ref={wallRef}>
            <CardBlock id={SEC.card} emp={emp} />

            <section id={SEC.leave}>
              <LeaveTabPanel empId={empId} employeeName={emp.user?.name} />
            </section>

            {/* الثلاثةُ المهاجِرون صاروا `hrl-block` بأنفسهم (الخطوة ٧): سقط غلافُ
                `<section>` اللافُّ وسقطت معه القواعدُ الجسريّةُ الستُّ في §١٣، وصار
                كلُّ تبويبٍ يلبس مرساتَه بنفسه — **منطقُهم لم يُلمَس بحرف**. */}
            <ContractsTab id={SEC.contracts} empId={empId} />

            <DocumentsTab id={SEC.docs} empId={empId} />

            {/* **لا يُحذف بلا صلاحية** خلافاً لـ`PayBlock`: وجودُ خطاباتٍ ليس سرّاً عن
                الشخص، وحذفُ البلوك يُخفي مستنداتٍ صدرت باسمه. الصلاحيةُ تحرس الزرَّ. */}
            <LettersBlock id={SEC.letters} empId={empId} emp={emp} canIssue={canIssueLetters} />

            <OnboardingTab id={SEC.onboarding} empId={empId} />

            <IdentityBlock
              id={SEC.identity}
              empId={empId}
              emp={emp}
              canManage={canManage}
              onEdit={() => setShowEdit(true)}
            />

            {/* **يُحذف من الشجرة** لمن لا يملك الصلاحية — لا يُفرَّغ ولا يُقفل ولا يُعطَّل. */}
            {canComp && <PayBlock id={SEC.pay} emp={emp} />}

            {/* الهدمُ في الذيل لا في شريط الرأس: بعيداً عن موضعِ نقرةِ «تعديل البيانات»،
                وبلا مرساةٍ لأنّه ليس قسمَ قراءة. */}
            {canManage && <DangerBlock empId={empId} emp={emp} onEdit={() => setShowEdit(true)} />}
          </div>
        </div>

        <aside className="hrl-cols__side">
          <TimelineAside empId={empId} emp={emp} canManage={canManage} />
        </aside>
      </div>
    </>
  );
};

export default HrDossierWall;
