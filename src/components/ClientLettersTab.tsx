// تبويب «الخطابات والمراسلات الصادرة» داخل صفحة العميل — عرض الصادر الحرّ
// (خطابات/إنذارات/إشعارات) الموجّه للعميل مباشرةً، مع تمييز المتعلق بقضية عن العام.
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import ClientManagementService from '../services/clientManagementService';
import { LETTER_STATUS_LABELS, type LetterStatus } from '../services/outgoingLetterService';

interface Props {
  clientId: number;
}

const ClientLettersTab: React.FC<Props> = ({ clientId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['client-letters', clientId],
    queryFn: () => ClientManagementService.getClientLetters(clientId, { per_page: 100 }),
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });

  const letters: any[] = useMemo(() => {
    const raw: any = data?.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [data]);

  if (isLoading) return <div className="client-loading">جاري التحميل...</div>;
  if (letters.length === 0) {
    return (
      <div className="client-empty">
        <Send size={28} />
        <p>لا توجد خطابات أو مراسلات صادرة لهذا العميل</p>
      </div>
    );
  }

  return (
    <div className="client-table-wrap">
      <table className="client-table">
        <thead>
          <tr>
            <th>#</th><th>النوع</th><th>العنوان</th><th>رقم الصادر</th>
            <th>القضية</th><th>الحالة</th><th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {letters.map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>{l.type_label || l.document_type}</td>
              <td className="client-table__title">{l.title || '—'}</td>
              <td className="client-table__mono">{l.outgoing_number || '—'}</td>
              <td>
                {l.case_id
                  ? (l.case?.file_number || 'قضية')
                  : <span className="client-task-badge">عام</span>}
              </td>
              <td><span className="notion-badge badge-blue">{LETTER_STATUS_LABELS[l.status as LetterStatus] || l.status}</span></td>
              <td className="client-table__date">{formatDate(l.sent_at || l.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default ClientLettersTab;
