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
   * الحصول على تنبيهات التحصيل (مصفوفة مسطّحة — N-04).
   * [P4·UX-06] دعم فلاتر اختيارية (الحالة/تذكيرات اليوم/الحدّ).
   */
  static async getReminders(filters?: {
    status?: string;
    type?: string;
    channel?: string;
    due_today?: boolean;
    per_page?: number;
  }): Promise<{ success: boolean; data: CollectionReminder[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.channel) params.set('channel', filters.channel);
    if (filters?.due_today) params.set('due_today', '1');
    if (filters?.per_page) params.set('per_page', String(filters.per_page));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ success: boolean; data: CollectionReminder[] }>(`/billing/reminders${qs}`);
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
   * إرسال تنبيه. القناة اختيارية — عند تركها يستخدم الباك قناة التذكير المُهيّأة.
   * [P4·UX-06] الباك يقبل channel في [email,whatsapp,sms,internal].
   */
  static async sendReminder(
    reminderId: number,
    channel?: 'email' | 'whatsapp' | 'sms' | 'internal'
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/billing/reminders/${reminderId}/send`,
      channel ? { channel } : {}
    );
  }

  /**
   * [P4·UX-11] تقادم الديون (Aging) + DSO من [P2·COL-04].
   */
  static async getAging(clientId?: number): Promise<{
    success: boolean;
    data: {
      aging: { current_0_30: number; days_31_60: number; days_61_90: number; days_90_plus: number; total: number };
      dso: number;
    };
  }> {
    const qs = clientId ? `?client_id=${clientId}` : '';
    return apiClient.get(`/billing/aging${qs}`);
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
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data: CollectionReport }> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      // [COL-1.5] الباك يتوقّع start_date/end_date (مصدر الحقيقة).
      if (params.start_date) searchParams.append('start_date', params.start_date);
      if (params.end_date) searchParams.append('end_date', params.end_date);
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
    }>(`/billing/yearly-stats?year=${year}`);
  }

  /**
   * الحصول على أعلى العملاء بالمستحقات
   */
  static async getTopClients(limit: number = 10): Promise<{
    success: boolean;
    // [COL-1.6] الباك يُرجِع total_paid/total_invoiced (لا total_due).
    data: {
      id: number;
      name: string;
      total_paid: number;
      total_invoiced: number;
      client_contracts_count?: number;
    }[];
  }> {
    return apiClient.get<{
      success: boolean;
      data: {
        id: number;
        name: string;
        total_paid: number;
        total_invoiced: number;
        client_contracts_count?: number;
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
  getAging: BillingService.getAging,
};
