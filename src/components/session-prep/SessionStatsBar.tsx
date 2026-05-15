// شريط الإحصاءات السريعة (6 مؤشرات)

import React from 'react';
import { ClipboardList, FileText, FileSearch, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import type { SessionWorkspaceData } from '../../hooks/useSessionPrep';
import type { AiBriefResponse } from '../../services/sessionPrepService';

interface Props {
  session: SessionWorkspaceData;
  aiBrief?: AiBriefResponse | null;
}

export const SessionStatsBar: React.FC<Props> = ({ session, aiBrief }) => {
  const prepsTotal = session.preparations_count ?? 0;
  const prepsDone = session.completed_preparations_count ?? 0;
  const motionsTotal = session.motions_count ?? 0;
  const motionsReady = session.ready_motions_count ?? 0;

  const briefStatus = session.ai_brief_status;
  const briefStatusLabel = {
    pending: 'لم يُولّد',
    generating: 'قيد التوليد',
    ready: 'جاهز',
    failed: 'فشل',
    stale: 'قديم',
  }[briefStatus] || 'غير محدد';

  const urgentCount = aiBrief?.urgent_items_count ?? 0;
  const hasProcGap = aiBrief?.has_procedural_gap || aiBrief?.has_contradictions;
  const hasDeadline = aiBrief?.has_deadline_risk;

  return (
    <div className="sp-stats">
      <Stat
        icon={ClipboardList}
        label="تحضيرات"
        value={`${prepsDone}/${prepsTotal}`}
        color="var(--color-primary)"
      />
      <Stat
        icon={FileText}
        label="طلبات جاهزة"
        value={`${motionsReady}/${motionsTotal}`}
        color="var(--color-primary)"
      />
      <Stat
        icon={FileSearch}
        label="كشف الجلسة"
        value={briefStatusLabel}
        color={briefStatus === 'ready' ? 'var(--color-success)' : briefStatus === 'failed' ? 'var(--color-error)' : 'var(--color-text-secondary)'}
      />
      <Stat
        icon={AlertTriangle}
        label="تنبيهات حرجة"
        value={urgentCount > 0 ? String(urgentCount) : '—'}
        color={urgentCount > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)'}
      />
      <Stat
        icon={AlertCircle}
        label="ثغرات إجرائية"
        value={hasProcGap ? 'نعم' : 'لا'}
        color={hasProcGap ? 'var(--color-error)' : 'var(--color-text-secondary)'}
      />
      <Stat
        icon={Clock}
        label="مهل حرجة"
        value={hasDeadline ? 'نعم' : '—'}
        color={hasDeadline ? 'var(--color-warning)' : 'var(--color-text-secondary)'}
      />
    </div>
  );
};

const Stat: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  color?: string;
}> = ({ icon: Icon, label, value, color = 'var(--color-text)' }) => (
  <div className="sp-stat">
    <Icon size={13} strokeWidth={2} />
    <span className="sp-stat__label">{label}</span>
    <span className="sp-stat__value" style={{ color }}>
      {value}
    </span>
  </div>
);
