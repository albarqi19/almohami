import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import PerformanceView, { PerformanceSkeleton } from './performance/PerformanceView';
import type { LawyerReportData } from '../utils/lawyerExportHelpers';

interface LawyerDetailContentProps {
  lawyerId: number;
  dateFilter: { period?: string; start_date?: string; end_date?: string };
  presence?: { status: string; lastActivityAgo?: string | null };
}

/**
 * تفاصيل محامٍ بعينه داخل نافذة «تقرير المحامين» — يجلب `/lawyers-report/{id}` ويعرضه بواجهة الأداء
 * نفسها التي تظهر في صفحة «أدائي» (`PerformanceView`)، فالمدير والمحامي يريان الشكل والأرقام ذاتها.
 */
const LawyerDetailContent: React.FC<LawyerDetailContentProps> = ({ lawyerId, dateFilter, presence }) => {
  const [data, setData] = useState<LawyerReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFilter.period) params.append('period', dateFilter.period);
        if (dateFilter.start_date) params.append('start_date', dateFilter.start_date);
        if (dateFilter.end_date) params.append('end_date', dateFilter.end_date);
        const qs = params.toString();
        const response: any = await apiClient.get(`/lawyers-report/${lawyerId}${qs ? `?${qs}` : ''}`);
        if (cancelled) return;
        if (response.success) setData(response.data);
      } catch (err) {
        console.error('Failed to fetch lawyer detail:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [lawyerId, dateFilter]);

  if (loading) return <PerformanceSkeleton />;
  if (!data) return <div className="error-state">فشل تحميل البيانات</div>;

  return <PerformanceView data={data} presence={presence} />;
};

export default LawyerDetailContent;
