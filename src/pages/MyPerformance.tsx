import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import LawyerDetailContent from '../components/LawyerDetailContent';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import type { LawyerReportData } from '../utils/lawyerExportHelpers';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/**
 * "أدائي" — صفحة الأداء الشخصي للمحامي / المساعد القانوني.
 *
 * تعرض نفس محتوى Modal التفصيل الذي يراه المدير، لكن كصفحة كاملة بدون
 * بطاقة وسيطة. تستدعي endpoint `/lawyers-report/me` الذي يفرض self-view
 * (auth()->id() == lawyerId) في الباك اند.
 */
const MyPerformance: React.FC = () => {
  const { user } = useAuth();

  // Lightweight prefetch just to get presence_status for the hero — the
  // detail payload doesn't include current presence, only last_activity.
  const { data, isLoading } = useQuery<LawyerReportData | null>({
    queryKey: ['my-performance'],
    queryFn: async () => {
      const response: any = await apiClient.get('/lawyers-report/me');
      if (response.success) return response.data as LawyerReportData;
      return null;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  if (!user) {
    return <div className="loading-state">جاري التحميل...</div>;
  }

  return (
    <div className="lawyers-report-page">
      <div className="lawyers-report-header">
        <div className="header-title-area">
          <h1>
            <Users size={18} />
            أدائي
          </h1>
          <p>ملخّص قضاياك ومهامك وأدائك (تحديث تلقائي كل 30 ثانية)</p>
        </div>
      </div>

      <div className="lawyers-report-content my-performance-content">
        {isLoading && !data ? (
          <div className="loading-state">جاري التحميل...</div>
        ) : (
          /**
           * 🔴 كان `presence={undefined}` ثابتاً مكتوباً باليد — فيعرض المكوّن
           * «غير متّصل» **دائماً**، بينما تقريرُ الأداء يعرض الحقيقة. نفسُ
           * المستخدم بحالتين متناقضتين في شاشتين.
           *
           * والبياناتُ كانت تُجلَب في هذه الصفحة نفسِها كلَّ 30 ثانية
           * (`refetchInterval`) **ثمّ تُرمى**: `data` لا تُستعمَل إلا في شرط
           * التحميل. والتعليقُ فوق الاستعلام يقول الغرضَ الذي لم يُنفَّذ —
           * «prefetch just to get presence_status for the hero».
           *
           * وأُضيف الحقلُ في الباك (`LawyerReportController::show`) لأنّه لم يكن
           * في الردّ أصلاً — فالإصلاحُ طرفان لا طرف.
           */
          <LawyerDetailContent
            lawyerId={Number(user.id)}
            dateFilter={{}}
            presence={
              data?.lawyer
                ? {
                    status: data.lawyer.presence_status ?? 'offline',
                    lastActivityAgo: data.lawyer.last_activity_ago ?? null,
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
};

export default MyPerformance;
