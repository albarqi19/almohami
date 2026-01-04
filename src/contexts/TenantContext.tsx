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

// Main domain (without subdomain)
const MAIN_DOMAINS = ['alraedlaw.com', 'localhost', '127.0.0.1'];

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
 * Apply tenant theme colors to CSS variables
 */
function applyTenantTheme(tenant: Tenant) {
  const root = document.documentElement;

  // Apply primary color
  if (tenant.primary_color) {
    root.style.setProperty('--tenant-primary', tenant.primary_color);
    root.style.setProperty('--color-accent', tenant.primary_color);
  }

  // Apply secondary color
  if (tenant.secondary_color) {
    root.style.setProperty('--tenant-secondary', tenant.secondary_color);
  }

  // Update favicon if provided
  if (tenant.favicon_url) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = tenant.favicon_url;
    }
  }

  // Update page title with company name
  if (tenant.name) {
    document.title = `${tenant.name} | نظام إدارة المحاماة`;
  }
}

/**
 * Reset theme to default values
 */
function resetTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--tenant-primary');
  root.style.removeProperty('--tenant-secondary');
  root.style.removeProperty('--color-accent');
  document.title = 'الرائد | نظام إدارة المحاماة';
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract subdomain from current hostname
  const subdomain = extractSubdomain(window.location.hostname);
  const isSubdomain = subdomain !== null;

  const fetchTenant = useCallback(async () => {
    if (!subdomain) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/public/tenant/${subdomain}`, {
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
  }, [subdomain]);

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
