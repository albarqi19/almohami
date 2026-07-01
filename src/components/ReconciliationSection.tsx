import React from 'react';
import { Handshake, Users, Calendar, FileCheck, Video, Building2, Scale } from 'lucide-react';
import type { ReconciliationData, ReconciliationParty } from '../types';

/**
 * قسم تفاصيل الصلح (تراضي) — يُدرَج داخل صفحة تفاصيل القضية عند is_reconciliation.
 * يحلّ محلّ قسم «الأحكام القضائية» ببطاقات الصلح (معلومات + أطراف + جلسات + وثيقة الصلح)
 * بنمط .case-card نفسه. الهوية ورقم الجوال مُخفيان عرضاً (خصوصية — يبقيان في القاعدة).
 */

const ROLE_LABELS: Record<string, string> = {
  claimant: 'المدّعي',
  defendant: 'المدّعى عليه',
  representative: 'الممثّل النظامي',
  additional: 'طرف إضافي',
};

// تلوين الحالات (الطلب/الجلسة/الوثيقة): أخضر ناجح، أحمر متعذّر، برتقالي جزئي، رمادي ملغى/مؤرشف، أزرق قيد التنفيذ.
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'صلح ناجح': { bg: 'rgba(21,115,71,0.12)', color: '#157347' },
  'وثيقة معتمدة': { bg: 'rgba(21,115,71,0.12)', color: '#157347' },
  'منتهية': { bg: 'rgba(21,115,71,0.12)', color: '#157347' },
  'صلح جزئي': { bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
  'عدم حضور': { bg: 'rgba(217,119,6,0.14)', color: '#b45309' },
  'تعذّر الصلح': { bg: 'rgba(209,73,91,0.12)', color: '#b91c1c' },
  'ملغى': { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  'ملغاة': { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  'ملغاة تلقائياً': { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  'مؤرشف': { bg: 'rgba(100,116,139,0.14)', color: '#475569' },
};
const statusStyle = (label?: string | null) =>
  (label && STATUS_STYLE[label]) || { bg: 'rgba(37,99,235,0.10)', color: '#2563eb' }; // قيد التنفيذ = أزرق

const StatusBadge: React.FC<{ label?: string | null; size?: number }> = ({ label, size = 12 }) => {
  if (!label) return null;
  const s = statusStyle(label);
  return (
    <span style={{ fontSize: size, fontWeight: 700, padding: '3px 12px', borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
};

const fmtDate = (d?: string): string => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ar-SA'); } catch { return d; }
};

const partyName = (p: ReconciliationParty): string => p.full_name || p.company_name || '—';

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #64748b)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
  </div>
);

const ReconciliationSection: React.FC<{ data: ReconciliationData | null }> = ({ data }) => {
  if (!data || !data.request) return null;

  const req = data.request;
  const parties = req.parties || [];
  const sessions = req.sessions || [];
  const agreements = req.agreements || [];

  return (
    <>
      {/* معلومات طلب الصلح — الحالة كشارة ملوّنة */}
      <div className="case-card">
        <div className="case-card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div className="case-card__title"><Handshake size={16} /> معلومات طلب الصلح</div>
          {req.status_label && <StatusBadge label={req.status_label} />}
        </div>
        <div className="case-card__content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {req.category_value && <InfoItem label="التصنيف" value={req.category_value} />}
            {req.request_type && <InfoItem label="نوع المطالبة" value={req.request_type} />}
            {req.monetary_value && (
              <InfoItem label="قيمة المطالبة" value={`${Number(req.monetary_value).toLocaleString('ar-SA')} ريال`} />
            )}
            {req.mediator_name && <InfoItem label="المصلح" value={req.mediator_name} />}
            {req.claim_hijri_date && <InfoItem label="تاريخ الطلب (هجري)" value={req.claim_hijri_date} />}
          </div>
          {req.summary_by_mediator ? (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(21,115,71,0.05)', borderRadius: 8, fontSize: 13, lineHeight: 1.7 }}>
              <strong>ملخّص المصلح:</strong> {req.summary_by_mediator}
            </div>
          ) : req.summary ? (
            <div style={{ marginTop: 12, padding: 10, background: 'var(--dashboard-card, #f8fafc)', borderRadius: 8, fontSize: 13, lineHeight: 1.7 }}>
              {req.summary}
            </div>
          ) : null}
        </div>
      </div>

      {/* أطراف الصلح — الهوية والجوال مخفيان عرضاً (خصوصية PDPL) */}
      {parties.length > 0 && (
        <div className="case-card">
          <div className="case-card__header">
            <div className="case-card__title"><Users size={16} /> أطراف الصلح ({parties.length})</div>
          </div>
          <div className="case-card__content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parties.map((p, i) => {
                const wakala = Array.isArray(p.wakala_details) && p.wakala_details.length > 0 ? p.wakala_details[0] : null;
                return (
                  <div key={`party-${i}`} style={{ padding: 10, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{partyName(p)}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(21,115,71,0.1)', color: '#157347', fontWeight: 600 }}>
                        {ROLE_LABELS[p.party_role] || p.party_role}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }}>
                      {/* الهوية ورقم الجوال مُخفيان عمداً (خصوصية) — يبقيان في القاعدة */}
                      {p.company_name && (
                        <span><Building2 size={12} /> منشأة{p.cr_number ? ` — سجل تجاري ${p.cr_number}` : ''}</span>
                      )}
                      {p.representative_type && <span><Scale size={12} /> {p.representative_type}</span>}
                    </div>
                    {wakala && wakala.WakalNumber && (
                      <div style={{ marginTop: 5, fontSize: 11, color: 'var(--color-text-secondary, #64748b)' }}>
                        وكالة رقم {wakala.WakalNumber}{wakala.WakalaStatusName ? ` (${wakala.WakalaStatusName})` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* جلسات الصلح */}
      {sessions.length > 0 && (
        <div className="case-card">
          <div className="case-card__header">
            <div className="case-card__title"><Calendar size={16} /> جلسات الصلح ({sessions.length})</div>
          </div>
          <div className="case-card__content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s, i) => (
                <div key={`session-${i}`} style={{ padding: 10, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {s.session_start_time ? new Date(s.session_start_time).toLocaleString('ar-SA') : `جلسة ${s.py_id || i + 1}`}
                    </span>
                    <StatusBadge label={s.status_label} size={11} />
                  </div>
                  {s.meeting_link && (
                    <a
                      href={s.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#157347', fontWeight: 600, textDecoration: 'none' }}
                    >
                      <Video size={14} /> دخول جلسة Teams
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* وثيقة الصلح — تحلّ محلّ «الأحكام القضائية» */}
      <div className="case-card">
        <div className="case-card__header">
          <div className="case-card__title">
            <FileCheck size={16} /> وثيقة الصلح {agreements.length > 0 ? `(${agreements.length})` : ''}
          </div>
        </div>
        <div className="case-card__content">
          {agreements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agreements.map((a, i) => (
                <div key={`agreement-${i}`} style={{ padding: 12, border: '1px solid rgba(21,115,71,0.25)', borderRadius: 8, background: 'rgba(21,115,71,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FileCheck size={15} color="#157347" />
                      وثيقة صلح
                    </span>
                    <StatusBadge label={a.status_label} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }}>
                    {a.py_id && <span>رقم الوثيقة: <strong>{a.py_id}</strong></span>}
                    {a.resolved_timestamp && <span>تاريخ الاعتماد: {fmtDate(a.resolved_timestamp)}</span>}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-secondary, #94a3b8)', fontStyle: 'italic' }}>
                    نصّ الوثيقة الكامل غير متاح من منصة تراضي حالياً (تُعرض بيانات الوثيقة فقط).
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #64748b)', textAlign: 'center', padding: 12 }}>
              لا توجد وثيقة صلح لهذا الطلب (لم يُبرَم صلح معتمد).
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReconciliationSection;
