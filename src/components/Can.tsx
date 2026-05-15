import React from 'react';
import { useAnyPermission, useAllPermissions, usePermission } from '../hooks/usePermission';

interface BaseCanProps {
  /** يُعرض إذا تحقق الشرط */
  children: React.ReactNode;
  /** يُعرض بدلاً من children لو الشرط فشل */
  fallback?: React.ReactNode;
}

interface SingleCanProps extends BaseCanProps {
  permission: string;
  any?: never;
  all?: never;
}

interface AnyCanProps extends BaseCanProps {
  any: string[];
  permission?: never;
  all?: never;
}

interface AllCanProps extends BaseCanProps {
  all: string[];
  permission?: never;
  any?: never;
}

type CanProps = SingleCanProps | AnyCanProps | AllCanProps;

/**
 * يُعرض children إذا توفّرت الصلاحية، وإلا fallback (افتراضي: لا شيء).
 *
 * أمثلة:
 *   <Can permission="cases.delete"><button>حذف</button></Can>
 *   <Can any={['billing.view', 'billing.invoices.manage']}>...</Can>
 *   <Can all={['cases.edit', 'cases.export']}>...</Can>
 */
export const Can: React.FC<CanProps> = ({ children, fallback = null, ...rest }) => {
  // واحد فقط من permission/any/all سيكون defined
  const allowedSingle = usePermission((rest as SingleCanProps).permission ?? '__never__');
  const allowedAny = useAnyPermission((rest as AnyCanProps).any ?? []);
  const allowedAll = useAllPermissions((rest as AllCanProps).all ?? []);

  let allowed = false;
  if ('permission' in rest && rest.permission) allowed = allowedSingle;
  else if ('any' in rest && rest.any) allowed = allowedAny;
  else if ('all' in rest && rest.all) allowed = allowedAll;

  return <>{allowed ? children : fallback}</>;
};

/**
 * عكس <Can> — يُعرض children إذا فقدت الصلاحية.
 */
export const Cannot: React.FC<CanProps> = ({ children, fallback = null, ...rest }) => {
  return <Can {...(rest as CanProps)} fallback={<>{children}</>}>{fallback}</Can>;
};
