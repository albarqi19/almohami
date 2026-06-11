import React, { useState } from 'react';
import {
  Users, Shield, Grid3x3, Share2, History,
  type LucideIcon,
} from 'lucide-react';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

export type SectionKey = 'users' | 'roles' | 'matrix' | 'grants' | 'audit';

interface NavEntry {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  permission?: string;
}

interface PermissionsLayoutProps {
  /** قائمة عناصر الـ sidebar — يمكن تخصيصها لإخفاء أقسام حسب صلاحيات المستخدم */
  sections: NavEntry[];
  activeSection: SectionKey;
  onSectionChange: (key: SectionKey) => void;
  /** المحتوى الرئيسي للقسم النشط */
  children: React.ReactNode;
  /** Side Panel اختياري على اليسار (تفاصيل العنصر المحدد) */
  panel?: React.ReactNode;
}

export const PermissionsLayout: React.FC<PermissionsLayoutProps> = ({
  sections,
  activeSection,
  onSectionChange,
  children,
  panel,
}) => {
  return (
    <div className={`erp-perm erp-shell${panel ? ' erp-shell--with-panel' : ''}`}>
      {/* Sidebar Navigation (vertical) */}
      <nav className="erp-shell__nav">
        <div className="erp-nav-section">
          <div className="erp-nav-section__title">إدارة</div>
          {sections.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                className={`erp-nav-item${active ? ' erp-nav-item--active' : ''}`}
                onClick={() => onSectionChange(s.key)}
              >
                <span className="erp-nav-item__icon">
                  <Icon size={14} />
                </span>
                <span className="erp-nav-item__label">{s.label}</span>
                {s.badge !== undefined && (
                  <span className="erp-nav-item__badge">{s.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="erp-shell__main">{children}</div>

      {/* Optional Side Panel */}
      {panel && <aside className="erp-shell__panel">{panel}</aside>}
    </div>
  );
};

/** الـ navigation الافتراضي. الفلترة حسب الصلاحيات تتم في PermissionManagement الجديد. */
export const defaultSections: NavEntry[] = [
  { key: 'users', label: 'المستخدمون', icon: Users, permission: 'users.view' },
  { key: 'roles', label: 'الأدوار', icon: Shield, permission: 'roles.view' },
  { key: 'matrix', label: 'مصفوفة الصلاحيات', icon: Grid3x3, permission: 'roles.manage' },
  { key: 'grants', label: 'منح الوصول', icon: Share2, permission: 'permissions.grant_record' },
  { key: 'audit', label: 'سجل التغييرات', icon: History, permission: 'audit.view' },
];

export const useSectionState = (initial: SectionKey = 'users') => {
  const [section, setSection] = useState<SectionKey>(initial);
  return { section, setSection };
};
