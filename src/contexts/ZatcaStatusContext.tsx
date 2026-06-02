// === ZatcaStatusProvider ===
// يُغلّف الـ Layout (أعلى الشجرة)، يستدعي useZatcaStatus() مرة واحدة،
// ويوزّع الحالة عبر useZatcaFeature(). مصدر الحقيقة الوحيد للقائمة + route guard + الصفحات
// (يمنع تكرار طلب /zatca/status ويمنع وضع الـ hook في sidebarConfig.ts).

import React, { createContext, useContext, useMemo } from 'react';
import { useZatcaStatus } from '../hooks/useZatcaStatus';
import type { ZatcaCertificate, ZatcaEnvironment } from '../types/zatca';

export interface ZatcaFeatureValue {
  available: boolean;
  enabled: boolean;
  environment: ZatcaEnvironment | string | null;
  onboardedAt: string | null;
  certificate: ZatcaCertificate | null;
  isLoading: boolean;
  isError: boolean;
}

const DEFAULT_VALUE: ZatcaFeatureValue = {
  available: false,
  enabled: false,
  environment: null,
  onboardedAt: null,
  certificate: null,
  isLoading: false,
  isError: false,
};

const ZatcaStatusContext = createContext<ZatcaFeatureValue | undefined>(undefined);

export const ZatcaStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, isError } = useZatcaStatus();

  const value = useMemo<ZatcaFeatureValue>(
    () => ({
      available: !!data?.available,
      enabled: !!data?.enabled,
      environment: data?.environment ?? null,
      onboardedAt: data?.onboarded_at ?? null,
      certificate: data?.certificate ?? null,
      isLoading,
      isError,
    }),
    [data, isLoading, isError]
  );

  return <ZatcaStatusContext.Provider value={value}>{children}</ZatcaStatusContext.Provider>;
};

/**
 * يُرجع حالة ميزة ZATCA من الـ context. خارج المزوّد (نادر) يُرجع قيمًا محايدة
 * (available=false) بدل رمي خطأ — سلوك آمن يخفي الميزة بدل كسر الشجرة.
 */
export function useZatcaFeature(): ZatcaFeatureValue {
  return useContext(ZatcaStatusContext) ?? DEFAULT_VALUE;
}
