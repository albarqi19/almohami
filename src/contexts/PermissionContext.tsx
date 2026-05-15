import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import permissionService from '../services/permissionService';
import { apiClient } from '../utils/api';
import { useAuth } from './AuthContext';
import type { MePermissionsResponse } from '../types';

interface PermissionContextValue {
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
  version: number;
  isLoading: boolean;
  /** فحص صلاحية واحدة */
  has: (permission: string) => boolean;
  /** فحص أي صلاحية من قائمة */
  hasAny: (permissions: string[]) => boolean;
  /** فحص كل الصلاحيات */
  hasAll: (permissions: string[]) => boolean;
  /** إعادة جلب يدويًا */
  refresh: () => Promise<void>;
  /** يستدعى من api.ts عند ملاحظة تغيير version في response header */
  notifyVersionChange: (newVersion: number) => void;
}

const empty: MePermissionsResponse = {
  permissions: [],
  roles: [],
  is_super_admin: false,
  version: 0,
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<MePermissionsResponse>(empty);
  const [isLoading, setIsLoading] = useState(false);

  // Set للبحث السريع (O(1) بدل O(n) في كل usePermission)
  const permSet = useMemo(() => new Set(data.permissions), [data.permissions]);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setData(empty);
      return;
    }
    setIsLoading(true);
    try {
      const resp = await permissionService.getMyPermissions();
      setData(resp);
    } catch (e) {
      console.error('PermissionContext: failed to fetch /me/permissions', e);
      setData(empty);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // جلب أوّل مرة + عند تغيّر المستخدم (login/logout/2FA)
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchPermissions();
    } else {
      setData(empty);
    }
  }, [user, authLoading, fetchPermissions]);

  const versionRef = useRef(data.version);
  useEffect(() => {
    versionRef.current = data.version;
  }, [data.version]);

  const notifyVersionChange = useCallback(
    (newVersion: number) => {
      if (newVersion > 0 && newVersion !== versionRef.current) {
        console.log('🔄 Permissions version changed:', versionRef.current, '→', newVersion);
        fetchPermissions();
      }
    },
    [fetchPermissions]
  );

  // ربط الـ listener في apiClient مرة واحدة عند mount
  useEffect(() => {
    apiClient.setPermissionsVersionListener(notifyVersionChange);
    return () => apiClient.setPermissionsVersionListener(null);
  }, [notifyVersionChange]);

  const has = useCallback(
    (permission: string): boolean => {
      if (data.is_super_admin) return true; // super_admin = "*"
      if (permSet.has('*')) return true;
      return permSet.has(permission);
    },
    [data.is_super_admin, permSet]
  );

  const hasAny = useCallback(
    (permissions: string[]): boolean => {
      if (data.is_super_admin) return true;
      return permissions.some((p) => permSet.has(p));
    },
    [data.is_super_admin, permSet]
  );

  const hasAll = useCallback(
    (permissions: string[]): boolean => {
      if (data.is_super_admin) return true;
      return permissions.every((p) => permSet.has(p));
    },
    [data.is_super_admin, permSet]
  );

  const value: PermissionContextValue = {
    permissions: data.permissions,
    roles: data.roles,
    isSuperAdmin: data.is_super_admin,
    version: data.version,
    isLoading,
    has,
    hasAny,
    hasAll,
    refresh: fetchPermissions,
    notifyVersionChange,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export const usePermissionContext = (): PermissionContextValue => {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissionContext must be used within a PermissionProvider');
  return ctx;
};
