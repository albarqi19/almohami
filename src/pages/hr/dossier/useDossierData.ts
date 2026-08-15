import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { hrService } from '../../../services/hrService';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { hrLetterService } from '../../../services/hrLetterService';
import { usePermission } from '../../../hooks/usePermission';
import type {
  EmployeeDocument,
  EmployeeProfile,
  EmploymentContract,
  HrChecklistItem,
  HrLetter,
  LeaveBalanceSnapshot,
} from '../../../types/hr';

/**
 * **المصدرُ الوحيد لمفاتيح استعلامات ملفّ الموظف ودوالِّها وحرّاسِها.**
 *
 * ══════ لماذا وُجد هذا الملفّ (عطلٌ حيّ لا ترتيب) ══════
 * مسارا العقود والمباشرة محروسان في الخادم بـ`hr.manage` (`routes/api.php:1776, :1792`)
 * بينما الملفّ كلُّه يُفتح بـ`hr.view` (`:1767`). وكانت التبويبات تُطلق استعلاماتِها بلا
 * حارسٍ في الواجهة، فمن يملك `hr.view` وحدَها يتلقّى **403** فيُعرض له «تعذّر جلب العقود»
 * — **رسالةُ عطلٍ لحالةِ صلاحية**. الحارسُ الصحيحُ الوحيدُ في الوحدة كان في
 * `DocumentsTab` (`enabled: canView`)، وهذا الملفّ ينسخه إلى الثلاثة ويجمع المفاتيحَ
 * في موضعٍ واحد.
 *
 * ══════ العقدُ الحاكم ══════
 * كلُّ مستهلكٍ يستعمل هذه الخطّافات، و**لا يكتب `useQuery` بمفتاحٍ من مفاتيحها مباشرةً**.
 * فالمفتاحُ والدالّةُ والحارسُ في موضعٍ واحد، ولا ينفصل حارسان لمفتاحٍ واحدٍ كما انفصلا.
 * وReact Query تدمج النداءَ بالمفتاح ⇒ تركيبُ أكثرَ من مستهلكٍ لمفتاحٍ واحد = **طلبٌ واحد**.
 *
 * ══════ الإبطالُ يبقى دقيقاً ══════
 * `useDossierInvalidate` يُرجع دوالَّ إبطالٍ **لكلِّ مفتاحٍ على حدة**. والإبطالُ الشاملُ
 * `['hr']` يبقى مقصوراً على إنشاء منسوبٍ جديد في `HrModule` (يغيّر الإحصاءَ والقائمةَ معاً).
 */

/** المفاتيحُ — تُكتب هنا وحدَها، فلا تتكرّر سلسلةُ مفتاحٍ في مكوّن. */
export const dossierKeys = {
  employee: (empId: number) => ['hr', 'employee', empId] as const,
  contracts: (empId: number) => ['hr', 'contracts', empId] as const,
  documents: (empId: number) => ['hr', 'documents', empId] as const,
  letters: (empId: number) => ['hr', 'letters', empId] as const,
  checklist: (empId: number) => ['hr', 'checklist', empId] as const,
  leaveBalance: (empId: number) => ['hr', 'leave', 'balance', empId] as const,
};

/**
 * معرّفٌ صالح — نسخةُ الحارس القائم في `HrModule` حرفياً (`Number(id)` قد يُنتج `NaN`
 * حين يكون جزءُ المسار غيرَ رقميّ، والمسارُ في الراوتر بلا قيدٍ عدديّ).
 */
const isValidEmpId = (empId: number): boolean => !Number.isNaN(empId);

/** ملفُّ الموظف — `GET /hr/employees/{id}` (`api.php:1767`, `permission:hr.view`). */
export function useEmployee(empId: number): UseQueryResult<EmployeeProfile> {
  return useQuery({
    queryKey: dossierKeys.employee(empId),
    queryFn: () => hrService.getEmployee(empId),
    enabled: isValidEmpId(empId),
  });
}

/**
 * عقودُ العمل — `GET /hr/employees/{id}/contracts` محروسٌ بـ**`hr.manage`**
 * (`api.php:1776`)، فالحارسُ هنا يمنع 403 مضموناً.
 */
export function useEmployeeContracts(empId: number): UseQueryResult<EmploymentContract[]> {
  const canManage = usePermission('hr.manage');

  return useQuery({
    queryKey: dossierKeys.contracts(empId),
    queryFn: () => hrService.getContracts(empId),
    enabled: canManage && isValidEmpId(empId),
  });
}

/**
 * قائمةُ المباشرة/المغادرة — `GET /hr/employees/{id}/checklist` محروسٌ بـ**`hr.manage`**
 * (`api.php:1792`).
 */
export function useEmployeeChecklist(empId: number): UseQueryResult<HrChecklistItem[]> {
  const canManage = usePermission('hr.manage');

  return useQuery({
    queryKey: dossierKeys.checklist(empId),
    queryFn: () => hrService.getChecklist(empId),
    enabled: canManage && isValidEmpId(empId),
  });
}

/**
 * مستنداتُ الموظف — `GET /hr/employees/{id}/documents` محروسٌ بـ**`hr.documents.view`**
 * (`api.php:1785`). وهذا هو الحارسُ الصحيحُ القائمُ سلفاً، نُقل إلى موضعه الواحد.
 */
export function useEmployeeDocuments(empId: number): UseQueryResult<EmployeeDocument[]> {
  const canView = usePermission('hr.documents.view');

  return useQuery({
    queryKey: dossierKeys.documents(empId),
    queryFn: () => hrService.getDocuments(empId),
    enabled: canView && isValidEmpId(empId),
  });
}

/**
 * خطاباتُ المنسوب — `GET /hr/employees/{id}/letters` محروسٌ بـ**`hr.view`**
 * (`api.php:1799`)، أي بالحارس الذي يُفتح به الملفُّ كلُّه — فلا حارسَ إضافيّ هنا
 * (خلافاً للعقود والمباشرة والمستندات).
 *
 * والمفتاحُ نفسُه يستعمله بلوكُ الخطابات وعدّادُ شريط القفز معاً ⇒ **صفرُ طلبٍ إضافيّ**.
 */
export function useEmployeeLetters(empId: number): UseQueryResult<HrLetter[]> {
  return useQuery({
    queryKey: dossierKeys.letters(empId),
    queryFn: () => hrLetterService.list(empId),
    enabled: isValidEmpId(empId),
  });
}

/**
 * رصيدُ الإجازات — `GET /hr/employees/{id}/leave-balance` (`api.php:1820`,
 * `permission:hr.view`). المفتاحُ و`staleTime` **مطابقان لما كان في `LeaveTabPanel`**
 * فيُدمج النداءُ مع أيّ مستهلكٍ آخرَ للمفتاح نفسِه.
 */
export function useLeaveBalance(empId: number): UseQueryResult<LeaveBalanceSnapshot> {
  return useQuery({
    queryKey: dossierKeys.leaveBalance(empId),
    queryFn: () => hrLeaveService.getBalance(empId),
    enabled: isValidEmpId(empId),
    staleTime: 30_000,
  });
}

export interface DossierInvalidate {
  employee: () => void;
  contracts: () => void;
  checklist: () => void;
  documents: () => void;
  letters: () => void;
  leaveBalance: () => void;
}

/**
 * إبطالٌ **دقيق** لكلِّ مفتاحٍ على حدة — لا إبطالَ شاملاً بـ`['hr']` من داخل الملفّ.
 */
export function useDossierInvalidate(empId: number): DossierInvalidate {
  const qc = useQueryClient();

  return useMemo<DossierInvalidate>(
    () => ({
      employee: () => { void qc.invalidateQueries({ queryKey: dossierKeys.employee(empId) }); },
      contracts: () => { void qc.invalidateQueries({ queryKey: dossierKeys.contracts(empId) }); },
      checklist: () => { void qc.invalidateQueries({ queryKey: dossierKeys.checklist(empId) }); },
      documents: () => { void qc.invalidateQueries({ queryKey: dossierKeys.documents(empId) }); },
      letters: () => { void qc.invalidateQueries({ queryKey: dossierKeys.letters(empId) }); },
      leaveBalance: () => { void qc.invalidateQueries({ queryKey: dossierKeys.leaveBalance(empId) }); },
    }),
    [qc, empId]
  );
}
