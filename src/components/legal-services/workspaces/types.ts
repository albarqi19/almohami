import type { LucideIcon } from 'lucide-react';
import type { LegalService } from '../../../types/legalServices';

// ── واجهة مساحة العمل ──
export interface WorkspaceProps {
  service: LegalService;
  refreshService: () => Promise<void>;
}

// ── عنصر مؤشر الأداء ──
export interface MicroStatItem {
  label: string;
  value: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';
}

// ── تنبيه سياقي ──
export interface ContextualAlertProps {
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
