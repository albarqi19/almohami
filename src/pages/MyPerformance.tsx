import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import PerformanceView, { PerformanceSkeleton } from '../components/performance/PerformanceView';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import type { LawyerReportData } from '../utils/lawyerExportHelpers';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/**
 * «أدائي» — صفحة الأداء الشخصي للمحامي / المساعد القانوني.
 *
 * لوحة تملأ الشاشة (وضع fit): الصفحة نفسها لا تتمرر، والتمرير داخل الجدول وقائمة الجلسات فقط.
 *
 * استعلام واحد لـ`/lawyers-report/me` (يفرض الخادم فيه self-view) يغذّي الواجهة كلها ويتجدد كل 30 ثانية.
 * كانت الصفحة تجلب هذا المسار للتواجد فقط ثم يجلب المكوّن الداخلي `/lawyers-report/{id}` مرة ثانية للبيانات
 * نفسها؛ الآن جلب واحد، والتجديد يُبقي العرض السابق ظاهراً فلا وميض ولا قفزة تخطيط.
 */
const MyPerformance: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading, isFetching, isError, refetch } = useQuery<LawyerReportData | null>({
    queryKey: ['my-performance'],
    queryFn: async () => {
      const response: any = await apiClient.get('/lawyers-report/me');
      return response.success ? (response.data as LawyerReportData) : null;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="pfv-page" dir="rtl">
      {!user || (isLoading && !data) ? (
        <PerformanceSkeleton layout="fit" />
      ) : !data ? (
        <div className="pfv rc-scope pfv-page__state">
          <div className="pfv-panel pfv-empty">
            <p>{isError ? 'تعذّر تحميل بيانات الأداء.' : 'لا بيانات أداء لحسابك بعد.'}</p>
            <button type="button" className="pfv-btn" onClick={() => refetch()}>
              <RefreshCw size={14} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : (
        <PerformanceView
          data={data}
          layout="fit"
          pageTitle="أدائي"
          live={isFetching ? 'updating' : 'live'}
          presence={{
            status: data.lawyer.presence_status ?? 'offline',
            lastActivityAgo: data.lawyer.last_activity_ago ?? null,
          }}
        />
      )}
    </div>
  );
};

export default MyPerformance;
