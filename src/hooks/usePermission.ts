import { usePermissionContext } from '../contexts/PermissionContext';
import type { ResourcePermissionsMeta } from '../types';

/**
 * فحص صلاحية واحدة. مثال: usePermission('cases.edit')
 */
export function usePermission(permission: string): boolean {
  const { has } = usePermissionContext();
  return has(permission);
}

/**
 * فحص أي صلاحية من قائمة (OR).
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { hasAny } = usePermissionContext();
  return hasAny(permissions);
}

/**
 * فحص كل الصلاحيات (AND).
 */
export function useAllPermissions(permissions: string[]): boolean {
  const { hasAll } = usePermissionContext();
  return hasAll(permissions);
}

/**
 * صلاحيات سجل محدد — تقرأ من resource.meta.permissions الذي يأتي من الباك.
 * أدق من usePermission لأنها تحترم record grants.
 *
 * مثال:
 *   const { canEdit, canDelete } = useResourcePermission(caseData);
 *   <button disabled={!canEdit}>تعديل</button>
 */
export function useResourcePermission(
  resource: { meta?: { permissions?: ResourcePermissionsMeta } } | null | undefined
): ResourcePermissionsMeta {
  const { isSuperAdmin } = usePermissionContext();

  // super_admin = كل شيء
  if (isSuperAdmin) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canShare: true,
      canAssign: true,
      canArchive: true,
    };
  }

  return resource?.meta?.permissions ?? {};
}
