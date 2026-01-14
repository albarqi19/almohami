import { apiClient } from '../utils/api';
import type {
  BillingStats,
  BillingDashboard,
  BillingStatsResponse,
  BillingDashboardResponse,
  ClientBillingSummary,
  CaseBillingSummary,
  CollectionReport,
  MonthlyStats,
  CollectionReminder,
} from '../types/billing';

export class BillingService {
  /**
   * الحصول على إحصائيات الفوترة
   */
  static async getStats(): Promise<BillingStatsResponse> {
    return apiClient.get<BillingStatsResponse>('/billing/stats');
  }

  /**
   * الحصول على لوحة التحصيل
   */
  static async getDashboard(): Promise<BillingDashboardResponse> {
    return apiClient.get<BillingDashboardResponse>('/billing/dashboard');
  }

  /**
   * الحصول على إحصائيات سريعة
   */
  static async getQuickStats(): Promise<{
    success: boolean;
    data: {
      total_receivables: number;
      collected_this_month: number;
      overdue_count: number;
      overdue_amount: number;
      collection_rate: number;
    };
  }> {
    return apiClient.get<{
      success: boolean;
      data: {
        total_receivables: number;
        collected_this_month: number;
        overdue_count: number;
        overdue_amount: number;
        collection_rate: number;
      };
    }>('/billing/quick-stats');
  }

  /**
   * الحصول على تنبيهات التحصيل
   */
  static async getReminders(): Promise<{ success: boolean; data: CollectionReminder[] }> {
    return apiClient.get<{ success: boolean; data: CollectionReminder[] }>('/billing/reminders');
  }

  /**
   * توليد تنبيهات للفواتير المتأخرة
   */
  static async generateReminders(): Promise<{
    success: boolean;
    message: string;
    data: { count: number };
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: { count: number };
    }>('/billing/reminders/generate');
  }

  /**
   * إرسال تنبيه
   */
  static async sendReminder(
    reminderId: number,
    channel: 'email' | 'whatsapp' | 'sms'
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/billing/reminders/${reminderId}/send`,
      { channel }
    );
  }

  /**
   * الحصول على ملخص فوترة عميل
   */
  static async getClientSummary(clientId: number): Promise<{
    success: boolean;
    data: ClientBillingSummary;
  }> {
    return apiClient.get<{ success: boolean; data: ClientBillingSummary }>(
      `/billing/client/${clientId}/summary`
    );
  }

  /**
   * الحصول على ملخص فوترة قضية
   */
  static async getCaseSummary(caseId: number): Promise<{
    success: boolean;
    data: CaseBillingSummary;
  }> {
    return apiClient.get<{ success: boolean; data: CaseBillingSummary }>(
      `/billing/case/${caseId}/summary`
    );
  }

  /**
   * الحصول على تقرير التحصيل
   */
  static async getCollectionReport(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<{ success: boolean; data: CollectionReport }> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.from_date) searchParams.append('from_date', params.from_date);
      if (params.to_date) searchParams.append('to_date', params.to_date);
      query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    }
    return apiClient.get<{ success: boolean; data: CollectionReport }>(`/billing/report${query}`);
  }

  /**
   * الحصول على إحصائيات شهرية
   */
  static async getMonthlyStats(year?: number): Promise<{
    success: boolean;
    data: MonthlyStats[];
  }> {
    const query = year ? `?year=${year}` : '';
    return apiClient.get<{ success: boolean; data: MonthlyStats[] }>(`/billing/monthly-stats${query}`);
  }

  /**
   * الحصول على إحصائيات سنوية بالتفصيل
   */
  static async getYearlyStats(year: number): Promise<{
    success: boolean;
    data: {
      year: number;
      monthly: Record<number, MonthlyStats>;
      totals: {
        total_invoiced: number;
        total_collected: number;
        invoices_count: number;
        payments_count: number;
        new_contracts: number;
      };
    };
  }> {
    return apiClient.get<{
      success: boolean;
      data: {
        year: number;
        monthly: Record<number, MonthlyStats>;
        totals: {
          total_invoiced: number;
          total_collected: number;
          invoices_count: number;
          payments_count: number;
          new_contracts: number;
        };
      };
    }>(`/billing/yearly-stats/${year}`);
  }

  /**
   * الحصول على أعلى العملاء بالمستحقات
   */
  static async getTopClients(limit: number = 10): Promise<{
    success: boolean;
    data: {
      client: { id: number; name: string };
      total_due: number;
      invoices_count: number;
    }[];
  }> {
    return apiClient.get<{
      success: boolean;
      data: {
        client: { id: number; name: string };
        total_due: number;
        invoices_count: number;
      }[];
    }>(`/billing/top-clients?limit=${limit}`);
  }

  /**
   * تحديث حالات الفواتير المتأخرة
   */
  static async updateOverdueStatuses(): Promise<{
    success: boolean;
    message: string;
    data: { updated_count: number };
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: { updated_count: number };
    }>('/billing/update-overdue');
  }
}

// تصدير instance للاستخدام المباشر
export const billingService = {
  getStats: BillingService.getStats,
  getDashboard: BillingService.getDashboard,
  getQuickStats: BillingService.getQuickStats,
  getReminders: BillingService.getReminders,
  generateReminders: BillingService.generateReminders,
  sendReminder: BillingService.sendReminder,
  getClientSummary: BillingService.getClientSummary,
  getCaseSummary: BillingService.getCaseSummary,
  getCollectionReport: BillingService.getCollectionReport,
  getMonthlyStats: BillingService.getMonthlyStats,
  getYearlyStats: BillingService.getYearlyStats,
  getTopClients: BillingService.getTopClients,
  updateOverdueStatuses: BillingService.updateOverdueStatuses,
};
