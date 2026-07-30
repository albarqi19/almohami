import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Tenant interface matching the backend response
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  text_color?: string;
  tagline: string | null;
  favicon_url: string | null;
  custom_branding_enabled: boolean;
}

/**
 * سبب الفشل — تُبنى عليه رسالة المستخدم:
 *   not_linked — النطاق لا يقابله مكتب (404): خطأ إعداد، وإعادة المحاولة عبث
 *   suspended  — الاشتراك معلّق (403): ليس عطلاً تقنياً
 *   network    — انقطاع أو مهلة أو 5xx أو رفض CORS: يُعاد المحاولة
 */
export type TenantErrorKind = 'not_linked' | 'suspended' | 'network';

interface TenantContextType {
  tenant: Tenant | null;
  isSubdomain: boolean;
  subdomain: string | null;
  isLoading: boolean;
  error: string | null;
  errorKind: TenantErrorKind | null;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = 'https://api.alraedlaw.com/api/v1';

// Reserved subdomains that should not be treated as tenant subdomains
const RESERVED_SUBDOMAINS = ['www', 'api', 'app', 'admin', 'dashboard'];

// النطاق الأم للمنصة — أي host خارجه (وخارج بيئات التطوير/المعاينة) يُعامل
// كنطاق مخصص لشركة (custom domain) ويُستبان عبر by-domain endpoint
const PLATFORM_APEX = 'alraedlaw.com';

function isPlatformHost(host: string): boolean {
  return (
    host === PLATFORM_APEX ||
    host.endsWith(`.${PLATFORM_APEX}`) ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app')
  );
}

/**
 * Extract subdomain from hostname
 * Examples:
 * - alnor.alraedlaw.com -> alnor
 * - www.alraedlaw.com -> null (reserved)
 * - alraedlaw.com -> null
 * - localhost:3000 -> null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check if it's localhost or IP
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  // Split by dots
  const parts = host.split('.');

  // If we have subdomain.domain.tld (3+ parts)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();

    // Check if it's a reserved subdomain
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return null;
    }

    return subdomain;
  }

  return null;
}

/** لون سداسي صالح فقط — العمود حرّ النص فلا يُحقن في CSS بلا تحقق */
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * هوية الشركة: الأيقونة والعنوان، و**الألوان** حين يُفعَّل التبييض.
 *
 * الألوان كانت مُلغاة: العمودان primary_color وsecondary_color يصلان من الـAPI
 * ولا يُقرآن في سطر واحد، واللوحة hex مثبّتة في auth.css. فصارت «هوية الشركة»
 * تبديلَ اسمٍ لا أكثر. الآن تُحقن كمتغيّرات CSS على <html> فتقرأها الأنماط،
 * ولا يُفعَّل ذلك إلا بعلم custom_branding_enabled — وهو العمود الموجود في
 * القاعدة منذ يناير بلا مستهلك واحد.
 */
function applyTenantTheme(tenant: Tenant) {
  if (tenant.favicon_url) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = tenant.favicon_url;
    }
  }

  if (tenant.name) {
    document.title = `${tenant.name} | نظام إدارة المحاماة`;
  }

  const root = document.documentElement;
  if (tenant.custom_branding_enabled) {
    if (tenant.primary_color && HEX_RE.test(tenant.primary_color)) {
      root.style.setProperty('--tenant-accent', tenant.primary_color);
    }
    if (tenant.secondary_color && HEX_RE.test(tenant.secondary_color)) {
      root.style.setProperty('--tenant-ink', tenant.secondary_color);
    }
    root.dataset.tenantBranded = 'true';
  } else {
    root.style.removeProperty('--tenant-accent');
    root.style.removeProperty('--tenant-ink');
    delete root.dataset.tenantBranded;
  }
}

/**
 * إعادة العنوان الافتراضي — **لا يُنادى على مضيف شركة**.
 *
 * كان يُنادى في catch وفي تنظيف الـeffect، فيكتب «الرائد» في تبويب دومين
 * العميل عند أي فشل جلب: اسم مزوّد آخر على نطاق المكتب.
 */
function resetTheme(isTenantHost: boolean) {
  const root = document.documentElement;
  root.style.removeProperty('--tenant-accent');
  root.style.removeProperty('--tenant-ink');
  delete root.dataset.tenantBranded;

  if (!isTenantHost) {
    document.title = 'الرائد | نظام إدارة المحاماة';
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<TenantErrorKind | null>(null);

  // إلغاء الجلب المعلّق + عدّاد تتابع يمنع ردّاً متأخّراً من الكتابة فوق أحدث
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  // hostname لا يحمل المنفذ؛ نطاق مخصص = أي host خارج المنصة وبيئات التطوير
  const host = window.location.hostname.toLowerCase();
  const isCustomDomain = !isPlatformHost(host);
  const subdomainFromHost = isCustomDomain ? null : extractSubdomain(host);

  // «موقع شركة» (الاسم isSubdomain تاريخي): subdomain على المنصة أو نطاق مخصص.
  // على النطاق المخصص يُستكمل الـ slug من رد الـ API (يغذي الواجهات المخصصة).
  const isSubdomain = isCustomDomain || subdomainFromHost !== null;
  const subdomain = subdomainFromHost ?? tenant?.slug ?? null;

  // مضيف شركة = ليس مضيف المنصة. يُحسب تزامنياً من الـhost وحده، فلا يتوقّف
  // على نجاح الجلب — وهذا ما يمنع ظهور هوية «الرائد» على نطاق العميل عند الفشل.
  const isTenantHost = isSubdomain;

  const fetchTenant = useCallback(async () => {
    if (!isCustomDomain && !subdomainFromHost) {
      setIsLoading(false);
      return;
    }

    // يُبطل أي جلب سابق معلّق: بلا هذا يستطيع ردٌّ فاشل متأخّر أن يكتب error
    // فوق نجاحٍ لاحق ⇒ «الشركة غير موجودة» وبياناتها محمّلة فعلاً.
    abortRef.current?.abort();
    const seq = ++seqRef.current;

    setIsLoading(true);
    setError(null);
    setErrorKind(null);

    const url = isCustomDomain
      ? `${API_BASE_URL}/public/tenant/by-domain?host=${encodeURIComponent(host)}`
      : `${API_BASE_URL}/public/tenant/${subdomainFromHost}`;

    // 250 / 750 / 2000ms — إعادة المحاولة على أخطاء النقل و5xx فقط.
    // لا يُعاد على 404 (نطاق غير مربوط) ولا 403 (معلّق) ولا 429: كلها أجوبة
    // نهائية، وإعادتها تُثقل الخدمة وتستنفد سقف المعدّل بلا فائدة.
    const BACKOFF = [250, 750, 2000];

    for (let attempt = 0; attempt <= BACKOFF.length; attempt++) {
      const controller = new AbortController();
      abortRef.current = controller;
      // مهلة قاطعة: بلا هذا يبقى دوّار «جاري التحميل...» أبد الدهر إن تعلّق الاتصال
      const timer = window.setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          // بلا Content-Type: إضافته إلى GET بلا جسم تُخرج الطلب من «الطلبات
          // البسيطة» فتُلزم المتصفّح بـOPTIONS preflight قبل كل جلب — أي رحلتان
          // ومضاعفةُ احتمال السقوط على المسار الحرج.
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        window.clearTimeout(timer);

        if (seq !== seqRef.current) return; // جلب أحدث سبقنا

        const data = await response.json().catch(() => null);

        if (response.ok && data?.success && data.data) {
          setTenant(data.data);
          setError(null);
          setErrorKind(null);
          applyTenantTheme(data.data);
          setIsLoading(false);
          return;
        }

        // 404 و403: نهائية — تُصنَّف ولا تُعاد
        if (response.status === 404 || response.status === 403) {
          const kind: TenantErrorKind = response.status === 403 ? 'suspended' : 'not_linked';
          setErrorKind(kind);
          setError(data?.message ?? (kind === 'suspended'
            ? 'حساب المكتب معلّق حالياً'
            : 'هذا النطاق غير مرتبط بأي مكتب بعد'));
          resetTheme(isTenantHost);
          setIsLoading(false);
          return;
        }

        // 5xx وما سواه: قابل لإعادة المحاولة
        if (attempt < BACKOFF.length) {
          await new Promise((r) => window.setTimeout(r, BACKOFF[attempt]));
          continue;
        }
        setErrorKind('network');
        setError('تعذّر الاتصال بالخدمة');
      } catch (err) {
        window.clearTimeout(timer);
        // إلغاءٌ من جلب أحدث سبقنا: يُترك للجلب الجديد ولا يُعدّ خطأً.
        // أما إلغاء المهلة (نفس seq) فيسقط إلى إعادة المحاولة أدناه بحقّ.
        if (seq !== seqRef.current) return;

        if (attempt < BACKOFF.length) {
          await new Promise((r) => window.setTimeout(r, BACKOFF[attempt]));
          continue;
        }
        console.error('Error fetching tenant:', err);
        setErrorKind('network');
        setError('تعذّر الاتصال بالخدمة');
      }
    }

    resetTheme(isTenantHost);
    setIsLoading(false);
  }, [isCustomDomain, subdomainFromHost, host, isTenantHost]);

  useEffect(() => {
    fetchTenant();

    return () => {
      abortRef.current?.abort();
      resetTheme(isTenantHost);
    };
  }, [fetchTenant, isTenantHost]);

  // تعافٍ تلقائي: عودة الشبكة أو رجوع الزائر إلى التبويب يعيد المحاولة —
  // فلا تبقى شاشة الخطأ ثابتة بعد زوال سببها. ولا يُعاد على الأجوبة النهائية.
  useEffect(() => {
    if (errorKind !== 'network') return;

    const retry = () => { if (navigator.onLine) fetchTenant(); };
    const onVisible = () => { if (document.visibilityState === 'visible') retry(); };

    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [errorKind, fetchTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isSubdomain,
        subdomain,
        isLoading,
        error,
        errorKind,
        refetchTenant: fetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
