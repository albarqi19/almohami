import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { hrService } from '../../../services/hrService';
import { hrLeaveService } from '../../../services/hrLeaveService';
import { todayISO } from '../leave/leaveFormat';
import type { PaginatedResponse } from '../../../utils/api';
import type { EmployeeProfile, HrStats, LeaveStats, OnLeaveNowRow } from '../../../types/hr';

/**
 * **المصدرُ الوحيد لمفاتيح استعلامات لوحة المكتب — على عرف `useDossierData`.**
 *
 * ثلاثةٌ من أربعةِ مفاتيحَ هنا **مشترَكةٌ حرفياً** مع أسطحٍ منشورة، فتدمج React Query
 * النداءَ بالمفتاح ⇒ صفرُ طلبٍ إضافيّ وصفرُ عملٍ في الباك:
 *
 * · `['hr','leave','on-leave-now']` ⇐ مطابقٌ لـ`LeaveRoster.tsx:98-101`. وهو يرمي
 *   حمولتَه كلَّها ويحتفظ بمجموعةِ معرّفاتٍ للترشيح؛ فأسماءُ غائبي اليوم وتواريخُ عودتهم
 *   **لا تُعرض في أيّ سطحٍ في المنتَج** رغم أنها مدفوعةُ الثمن. الشريطُ العلويّ يقرؤها.
 * · `['hr','leave','stats', year]` ⇐ مطابقٌ لـ`LeavePage.tsx:114-118`.
 * · `['hr','stats']` ⇐ مفتاحُ اللوحة القديم نفسُه.
 *
 * والرابعُ `['hr','employees',{per_page:100}]` **طلبٌ منقولٌ لا مُضاف**: كانت `printRoster`
 * تجلب هذه الحمولةَ بعينها عند كلّ نقرةِ طباعة. رُفعت إلى مستوى الصفحة فصارت الطباعةُ
 * فوريّةً، وتُقرأ منها قائمةُ «منسوبون بحاجة فعل» — و`index()` لا يُقيّد أعمدةَ الملفّ
 * فتصل `hire_date` و`sba_*` و`national_id_expiry_gregorian` كاملةً.
 *
 * **العقدُ الحاكم**: كلُّ مستهلكٍ يستعمل هذه الخطّافات، ولا يكتب `useQuery` بمفتاحٍ من
 * مفاتيحها مباشرةً — فلا ينفصل حارسٌ عن مفتاحه ولا يتضاعف نداءٌ بمفتاحين متقاربين.
 */

/**
 * سقفُ الفحص. الخادمُ نفسُه مسقوفٌ بـ`min(100, per_page)` ومرتَّبٌ `latest('id')`
 * (`EmployeeProfileController:51, :71`)، فالرقمُ هنا يطابق سقفَه ولا يَعِد بما لا يُعطى.
 * **ويُعلَن للمستخدم** حين يفوق `total` عددَ ما وصل — لا يُخفى.
 */
export const BOARD_SCAN_LIMIT = 100;

export const boardKeys = {
  stats: () => ['hr', 'stats'] as const,
  employees: (perPage: number) => ['hr', 'employees', { per_page: perPage }] as const,
  onLeaveNow: () => ['hr', 'leave', 'on-leave-now'] as const,
  leaveStats: (year: number) => ['hr', 'leave', 'stats', year] as const,
};

/** سنةُ حقائق الإجازات — بتقويم الجهاز عبر `todayISO` لا بـ`toISOString` (تُزيح يوماً). */
export function boardYear(): number {
  return Number(todayISO().slice(0, 4));
}

/** إحصاءُ المكتب وبطاقتُه — `GET /hr/employees/stats` (`permission:hr.view`). */
export function useOfficeStats(): UseQueryResult<HrStats> {
  return useQuery({
    queryKey: boardKeys.stats(),
    queryFn: () => hrService.getStats(),
  });
}

/** أحدثُ ١٠٠ منسوب — مصدرُ قائمة العمل وكشفِ الطباعة معاً. */
export function useBoardEmployees(): UseQueryResult<PaginatedResponse<EmployeeProfile>> {
  return useQuery({
    queryKey: boardKeys.employees(BOARD_SCAN_LIMIT),
    queryFn: () => hrService.getEmployees({ per_page: BOARD_SCAN_LIMIT }),
  });
}

/** غائبو اليوم — `GET /hr/leaves/on-leave-now` محروسٌ بـ`hr.view` (`api.php:1741`). */
export function useOnLeaveNow(): UseQueryResult<OnLeaveNowRow[]> {
  return useQuery({
    queryKey: boardKeys.onLeaveNow(),
    queryFn: () => hrLeaveService.getOnLeaveNow(),
    staleTime: 60_000,
  });
}

/** حقائقُ الإجازات — `GET /hr/leaves/stats` محروسٌ بـ`hr.view` (`api.php:1744`). */
export function useOfficeLeaveStats(year: number): UseQueryResult<LeaveStats> {
  return useQuery({
    queryKey: boardKeys.leaveStats(year),
    queryFn: () => hrLeaveService.getStats(year),
    staleTime: 60_000,
  });
}
