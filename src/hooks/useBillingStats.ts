import { useState, useEffect, useCallback } from 'react';
import { BillingService } from '../services/billingService';
import type {
  BillingStats,
  BillingDashboard,
  MonthlyStats,
  CollectionReminder,
} from '../types/billing';

interface UseBillingStatsReturn {
  stats: BillingStats | null;
  dashboard: BillingDashboard | null;
  monthlyStats: MonthlyStats[];
  reminders: CollectionReminder[];
  loading: boolean;
  error: string | null;
  refetchStats: () => Promise<void>;
  refetchDashboard: () => Promise<void>;
  refetchMonthlyStats: (year?: number) => Promise<void>;
  refetchReminders: () => Promise<void>;
}

export function useBillingStats(): UseBillingStatsReturn {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [reminders, setReminders] = useState<CollectionReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching billing stats:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.getDashboard();
      if (response.success) {
        setDashboard(response.data);
        // استخراج البيانات الفرعية
        if (response.data.stats) {
          setStats(response.data.stats);
        }
        if (response.data.reminders) {
          setReminders(response.data.reminders);
        }
        if (response.data.monthly_chart) {
          setMonthlyStats(response.data.monthly_chart);
        }
      }
    } catch (err: any) {
      console.error('Error fetching billing dashboard:', err);
      setError(err.message || 'حدث خطأ أثناء جلب لوحة التحصيل');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthlyStats = useCallback(async (year?: number) => {
    try {
      const response = await BillingService.getMonthlyStats(year);
      if (response.success) {
        setMonthlyStats(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching monthly stats:', err);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const response = await BillingService.getReminders();
      if (response.success) {
        setReminders(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching reminders:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    dashboard,
    monthlyStats,
    reminders,
    loading,
    error,
    refetchStats: fetchStats,
    refetchDashboard: fetchDashboard,
    refetchMonthlyStats: fetchMonthlyStats,
    refetchReminders: fetchReminders,
  };
}

// Hook لجلب ملخص عميل
export function useClientBillingSummary(clientId: number | null) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.getClientSummary(clientId);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching client summary:', err);
      setError(err.message || 'حدث خطأ أثناء جلب ملخص العميل');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

// Hook لجلب ملخص قضية
export function useCaseBillingSummary(caseId: number | null) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.getCaseSummary(caseId);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching case summary:', err);
      setError(err.message || 'حدث خطأ أثناء جلب ملخص القضية');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

// Hook لجلب إحصائيات سريعة
export function useQuickBillingStats() {
  const [stats, setStats] = useState<{
    total_receivables: number;
    collected_this_month: number;
    overdue_count: number;
    overdue_amount: number;
    collection_rate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await BillingService.getQuickStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching quick stats:', err);
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

export default useBillingStats;
