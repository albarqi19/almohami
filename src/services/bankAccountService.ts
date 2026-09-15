import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * [INV-P3] حسابات المكتب البنكية — GET/POST/PUT /tenant/bank-accounts.
 * لا حذف: الحساب يُوقَف. والآيبان لا يُعدَّل بعد الحفظ.
 */

export interface TenantBankAccount {
  id: number;
  label: string | null;
  bank_name: string | null;
  account_holder_name: string;
  iban: string;
  iban_grouped: string;
  iban_masked: string;
  swift_code: string | null;
  is_default: boolean;
  show_on_invoices: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface BankAccountsMeta {
  max_accounts: number;
  max_printed: number;
  bank_codes: Record<string, string>;
}

export interface BankAccountInput {
  iban: string;
  account_holder_name: string;
  bank_name?: string | null;
  label?: string | null;
  swift_code?: string | null;
  is_default?: boolean;
  show_on_invoices?: boolean;
}

export const BANK_ACCOUNTS_QUERY_KEY = ['tenantBankAccounts'] as const;

export class BankAccountService {
  static async list(): Promise<{ accounts: TenantBankAccount[]; meta: BankAccountsMeta }> {
    const res = await apiClient.get<ApiResponse<TenantBankAccount[]> & { meta?: BankAccountsMeta }>('/tenant/bank-accounts');
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الحسابات البنكية');
    return {
      accounts: res.data ?? [],
      meta: res.meta ?? { max_accounts: 10, max_printed: 3, bank_codes: {} },
    };
  }

  static async create(input: BankAccountInput): Promise<TenantBankAccount> {
    const res = await apiClient.post<ApiResponse<TenantBankAccount>>('/tenant/bank-accounts', input);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر إضافة الحساب');
    return res.data;
  }

  static async update(id: number, input: Partial<Omit<BankAccountInput, 'iban' | 'is_default'>>): Promise<TenantBankAccount> {
    const res = await apiClient.put<ApiResponse<TenantBankAccount>>(`/tenant/bank-accounts/${id}`, input);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر تحديث الحساب');
    return res.data;
  }

  static async setDefault(id: number): Promise<TenantBankAccount> {
    const res = await apiClient.post<ApiResponse<TenantBankAccount>>(`/tenant/bank-accounts/${id}/set-default`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر تغيير الحساب الافتراضي');
    return res.data;
  }

  static async deactivate(id: number): Promise<TenantBankAccount> {
    const res = await apiClient.post<ApiResponse<TenantBankAccount>>(`/tenant/bank-accounts/${id}/deactivate`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر إيقاف الحساب');
    return res.data;
  }

  static async activate(id: number): Promise<TenantBankAccount> {
    const res = await apiClient.post<ApiResponse<TenantBankAccount>>(`/tenant/bank-accounts/${id}/activate`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر تفعيل الحساب');
    return res.data;
  }
}
