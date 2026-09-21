import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * لوحة جانبية قابلة للطي — مشتركة بين مساحات الكتابة (العقد، الاستشارة).
 * أصنافها `cdw-panel*` في styles/contract-drafting-workspace.css.
 */

interface SidePanelProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({ id, title, icon, badge, action, collapsed, onToggle, children }) => (
  <section className={`cdw-panel${collapsed ? ' cdw-panel--collapsed' : ''}`} data-panel={id}>
    <div className="cdw-panel__head">
      <button type="button" className="cdw-panel__toggle" onClick={() => onToggle(id)} aria-expanded={!collapsed}>
        <span className="cdw-panel__icon">{icon}</span>
        <h3>{title}</h3>
        {badge}
        <ChevronDown size={14} className="cdw-panel__chev" />
      </button>
      {action}
    </div>
    {!collapsed && <div className="cdw-panel__body">{children}</div>}
  </section>
);
