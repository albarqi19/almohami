import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

interface TenantContextType {
  tenant: Tenant | null;
  isSubdomain: boolean;
  subdomain: string | null;
  isLoading: boolean;
  error: string | null;
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

/**
 * Apply tenant identity (favicon + title فقط — الألوان مُلغاة)
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
}

/**
 * Reset to default title
 */
function resetTheme() {
  document.title = 'الرائد | نظام إدارة المحاماة';
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // hostname لا يحمل المنفذ؛ نطاق مخصص = أي host خارج المنصة وبيئات التطوير
  const host = window.location.hostname.toLowerCase();
  const isCustomDomain = !isPlatformHost(host);
  const subdomainFromHost = isCustomDomain ? null : extractSubdomain(host);

  // «موقع شركة» (الاسم isSubdomain تاريخي): subdomain على المنصة أو نطاق مخصص.
  // على النطاق المخصص يُستكمل الـ slug من رد الـ API (يغذي الواجهات المخصصة).
  const isSubdomain = isCustomDomain || subdomainFromHost !== null;
  const subdomain = subdomainFromHost ?? tenant?.slug ?? null;

  const fetchTenant = useCallback(async () => {
    if (!isCustomDomain && !subdomainFromHost) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = isCustomDomain
        ? `${API_BASE_URL}/public/tenant/by-domain?host=${encodeURIComponent(host)}`
        : `${API_BASE_URL}/public/tenant/${subdomainFromHost}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tenant');
      }

      if (data.success && data.data) {
        setTenant(data.data);
        applyTenantTheme(data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching tenant:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      resetTheme();
    } finally {
      setIsLoading(false);
    }
  }, [isCustomDomain, subdomainFromHost, host]);

  useEffect(() => {
    fetchTenant();

    // Cleanup on unmount
    return () => {
      resetTheme();
    };
  }, [fetchTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isSubdomain,
        subdomain,
        isLoading,
        error,
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
