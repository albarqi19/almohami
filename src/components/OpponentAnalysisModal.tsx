import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Swords, Scale, CalendarClock, UserCheck, Briefcase, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import ClientManagementService, { type OpponentRow } from '../services/clientManagementService';

interface Props {
  opponent: OpponentRow | null; // null = مغلق
  onClose: () => void;
}

const SIDE_LABEL: Record<string, string> = {
  plaintiff: 'مدّعٍ', defendant: 'مدّعى عليه', appellant: 'مستأنِف', appellee: 'مستأنَف ضده',
  lawyer: 'محامٍ', agent: 'وكيل', third_party: 'طرف ثالث', unknown: 'غير محدّد',
};
const sideLabel = (s?: string | null) => (s ? (SIDE_LABEL[s] || s) : '—');

const STATUS_LABEL: Record<string, string> = {
  active: 'نشطة', pending: 'قيد النظر', closed: 'مغلقة', settled: 'مصالحة', appealed: 'مستأنفة', dismissed: 'مرفوضة',
};
const statusLabel = (s?: string | null) => (s ? (STATUS_LABEL[s] || s) : '—');

const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statCardStyle: React.CSSProperties = {
  flex: '1 1 120px', minWidth: 110, padding: '10px 12px',
  background: 'var(--dashboard-card, #fff)', border: '1px solid var(--quiet-gray-200, #e5e7eb)',
  borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4,
};
const statValueStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: 'var(--law-navy, #1E3A5F)', lineHeight: 1 };
const statLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: 4 };

export const OpponentAnalysisModal: React.FC<Props> = ({ opponent, onClose }) => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['opponent-analysis', opponent?.identity_key],
    queryFn: () => ClientManagementService.getOpponentAnalysis(opponent!.identity_key),
    enabled: !!opponent,
    staleTime: 60 * 1000,
  });

  if (!opponent) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface, #fff)', borderRadius: 10, width: '100%', maxWidth: 780,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={18} style={{ color: 'var(--law-navy, #1E3A5F)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text, #111827)', lineHeight: 1.3 }}>
                {data?.identity?.name || opponent.name || 'خصم'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }} dir="ltr">
                {opponent.national_id || opponent.commercial_reg || opponent.identity_key}
                {opponent.party_type === 'company' ? ' · شركة' : ''}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #64748b)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, color: 'var(--color-text-secondary, #64748b)' }}>
              <Loader2 size={18} className="spinning" /> جارٍ تحليل الخصم...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary, #64748b)' }}>تعذّر تحميل التحليل</div>
          ) : (
            <>
              {/* تنبيه تعارض المصالح */}
              {data.was_ever_client && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 14,
                  background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 8, fontSize: 13, color: 'var(--color-text, #111827)',
                }}>
                  <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>تنبيه تعارض مصالح: هذا الكيان <strong>عميل لديك أيضاً</strong>{data.client_is_active === false ? ' (مؤرشف)' : ''}.</span>
                  {data.client_user_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${data.client_user_id}`)}
                      style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--law-navy, #1E3A5F)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <ExternalLink size={12} /> فتح ملفه كعميل
                    </button>
                  )}
                </div>
              )}

              {/* بطاقات الإحصاء */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={statCardStyle}>
                  <span style={statValueStyle}>{data.total_cases_against_us}</span>
                  <span style={statLabelStyle}><Briefcase size={12} /> قضايا ظهر فيها</span>
                </div>
                <div style={statCardStyle}>
                  <span style={statValueStyle}>{data.cases_we_represent_opposite}</span>
                  <span style={statLabelStyle}><Scale size={12} /> نمثّل الجهة المقابلة</span>
                </div>
                <div style={statCardStyle}>
                  <span style={statValueStyle}>{data.sessions_count}</span>
                  <span style={statLabelStyle}><CalendarClock size={12} /> جلسات قضاياه</span>
                </div>
                <div style={statCardStyle}>
                  <span style={{ ...statValueStyle, color: data.was_ever_client ? '#d97706' : 'var(--law-navy, #1E3A5F)' }}>
                    {data.was_ever_client ? 'نعم' : 'لا'}
                  </span>
                  <span style={statLabelStyle}><UserCheck size={12} /> كان عميلاً؟</span>
                </div>
              </div>

              {/* جدول قضاياه */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary, #64748b)', marginBottom: 8 }}>
                قضاياه ({data.cases.length}{data.total_cases_against_us > data.cases.length ? ` من ${data.total_cases_against_us}` : ''})
              </div>
              {data.cases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary, #64748b)', fontSize: 13 }}>لا توجد قضايا مرئية</div>
              ) : (
                <div style={{ border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--quiet-gray-100, #f1f5f9)', color: 'var(--color-text-secondary, #64748b)' }}>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>رقم الملف</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>القضية</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>جهتنا / جهته</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>الحالة</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>الجلسة القادمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cases.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => navigate(`/cases/${c.id}`)}
                          style={{ cursor: 'pointer', borderTop: '1px solid var(--quiet-gray-100, #f1f5f9)', color: 'var(--color-text, #111827)' }}
                        >
                          <td style={{ padding: '7px 10px', fontFamily: 'monospace' }} dir="ltr">{c.file_number || c.id}</td>
                          <td style={{ padding: '7px 10px' }}>{c.title || '—'}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ color: 'var(--law-navy, #1E3A5F)' }}>{sideLabel(c.our_side)}</span>
                            <span style={{ color: 'var(--color-text-secondary, #94a3b8)' }}> / </span>
                            <span style={{ color: 'var(--status-red, #dc2626)' }}>{sideLabel(c.his_side)}</span>
                          </td>
                          <td style={{ padding: '7px 10px' }}>{statusLabel(c.status)}</td>
                          <td style={{ padding: '7px 10px' }} className="client-table__date">{fmtDate(c.next_hearing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentAnalysisModal;
