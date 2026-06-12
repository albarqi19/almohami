// ويدجت «مهل تقترب» — لوحة التحكم
// يعرض أقرب المهل النظامية المفتوحة بعدادات ملونة حسب الإلحاح،
// مع تنبيه بالمقترحات التي تنتظر تأكيد المحامي.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import deadlineService, { type DeadlineSummary } from '../../../services/deadlineService';
import { daysLabel } from '../../../pages/LegalDeadlines';

const UpcomingDeadlinesWidget: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DeadlineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    deadlineService
      .summary(5)
      .then((s) => mounted && setSummary(s))
      .catch(() => mounted && setSummary(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="deadlines-widget__empty">
        <Loader2 size={18} className="legal-deadlines__spinner" />
      </div>
    );
  }

  const upcoming = summary?.upcoming ?? [];
  const suggestedCount = summary?.counts.suggested ?? 0;

  return (
    <div className="deadlines-widget__list">
      {upcoming.length === 0 ? (
        <div className="deadlines-widget__empty">
          لا مهل مفتوحة — تُنشأ تلقائياً من أحكام ناجز وضبوط الجلسات ✅
        </div>
      ) : (
        upcoming.map((d) => {
          const urgency = d.urgency ?? 'normal';
          return (
            <div
              key={d.id}
              className={`deadlines-widget__item deadlines-widget__item--${urgency}`}
              onClick={() => navigate(d.case_id ? `/cases/${d.case_id}` : '/deadlines')}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="deadlines-widget__item-title">{d.title}</span>
                {d.case && (
                  <span className="deadlines-widget__item-case">
                    {d.case.file_number || d.case.title}
                  </span>
                )}
              </div>
              <span className={`deadlines-widget__days deadlines-widget__days--${urgency}`}>
                {daysLabel(d.days_remaining)}
              </span>
            </div>
          );
        })
      )}

      {suggestedCount > 0 && (
        <div className="deadlines-widget__suggested-note" onClick={() => navigate('/deadlines')}>
          <Sparkles size={13} />
          {suggestedCount === 1 ? 'مهلة محتملة من ضبط جلسة تنتظر تأكيدك' : `${suggestedCount} مهل محتملة تنتظر تأكيدك`}
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesWidget;
