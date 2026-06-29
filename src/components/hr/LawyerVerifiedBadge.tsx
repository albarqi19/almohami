import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, IdCard } from 'lucide-react';
import type { SbaStatus } from '../../types/hr';

interface BadgeCfg {
  label: string;
  cls: string;
  icon: React.ReactNode;
  showDays: boolean;
}

const MAP: Record<SbaStatus, BadgeCfg> = {
  verified_same_firm: { label: 'محامٍ موثّق · مكتبك', cls: 'hr-badge--green', icon: <ShieldCheck size={13} />, showDays: true },
  verified_other_firm: { label: 'موثّق · منشأة أخرى', cls: 'hr-badge--gold', icon: <AlertTriangle size={13} />, showDays: true },
  expired: { label: 'رخصة منتهية', cls: 'hr-badge--red', icon: <AlertTriangle size={13} />, showDays: false },
  needs_national_id: { label: 'بحاجة رقم هوية', cls: 'hr-badge--blue', icon: <IdCard size={13} />, showDays: false },
  pending: { label: 'قيد التحقق', cls: 'hr-badge--gray', icon: <Clock size={13} />, showDays: false },
  not_found: { label: 'غير موثّق', cls: 'hr-badge--gray', icon: <AlertTriangle size={13} />, showDays: false },
  unavailable: { label: 'تعذّر التحقق', cls: 'hr-badge--gray', icon: <Clock size={13} />, showDays: false },
};

interface Props {
  status?: SbaStatus | null;
  /** المدّة المتبقّية على الرخصة بالأيام (موجبة = سارية). */
  remainingDays?: number | null;
}

/**
 * شارة التوثيق المهني — تميّز «موثّق مكتبك» عن «منشأة أخرى»، وتتعامل بأناقة مع
 * pending (التحقّق المجمّع لاحق) و needs_national_id (نقص لا فشل).
 */
export const LawyerVerifiedBadge: React.FC<Props> = ({ status, remainingDays }) => {
  if (!status) return null;
  const cfg = MAP[status];
  if (!cfg) return null;

  return (
    <span className={`hr-badge ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
      {cfg.showDays && typeof remainingDays === 'number' && (
        <span style={{ opacity: 0.85 }}>· {remainingDays > 0 ? `${remainingDays} يوم` : 'منتهية'}</span>
      )}
    </span>
  );
};

export default LawyerVerifiedBadge;
