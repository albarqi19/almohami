// ويدجت «مهل تقترب» — لوحة التحكم
// يعرض أقرب المهل النظامية المفتوحة بعدادات ملونة حسب الإلحاح،
// مع تنبيه بالمقترحات التي تنتظر تأكيد المحامي.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lightbulb } from 'lucide-react';
import deadlineService, { type DeadlineSummary } from '../../../services/deadlineService';
import { daysLabel } from '../../../pages/LegalDeadlines';

interface Props {
  /** 🎛️ خصائص ودجت اللوحة القابلة للتخصيص (اختيارية — الافتراضي سلوك اللوحة الكلاسيكية) */
  limit?: number;
  days?: number;                                   // ضمن N يوماً فقط
  mine?: boolean;                                  // مهلي فقط
  obligated?: 'client' | 'opponent' | 'all';       // طرف الالتزام
}

const UpcomingDeadlinesWidget: React.FC<Props> = ({ limit = 5, days, mine, obligated }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DeadlineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    deadlineService
      .summary(limit, { days, mine, obligated })
      .then((s) => mounted && setSummary(s))
      .catch(() => mounted && setSummary(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [limit, days, mine, obligated]);

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
              onClick={() => navigate('/deadlines')}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="deadlines-widget__item-title">{d.title}</span>
                <span className="deadlines-widget__item-meta">
                  {d.case && (
                    <button
                      className="deadlines-widget__case-number"
                      title={[d.case.title, d.case.file_number].filter(Boolean).join(' — ')}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cases/${d.case!.id}`);
                      }}
                    >
                      📂
                      <span className="deadlines-widget__case-name">{d.case.title || d.case.file_number}</span>
                      {d.case.title && d.case.file_number && (
                        <span className="deadlines-widget__case-no">· {d.case.file_number}</span>
                      )}
                    </button>
                  )}
                  {d.assignee && <span className="deadlines-widget__assignee">👤 {d.assignee.name}</span>}
                </span>
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
          <Lightbulb size={13} />
          {suggestedCount === 1 ? 'مهلة محتملة من ضبط جلسة تنتظر تأكيدك' : `${suggestedCount} مهل محتملة تنتظر تأكيدك`}
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesWidget;
