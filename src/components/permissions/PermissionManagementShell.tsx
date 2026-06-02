import React, { useMemo, useState } from 'react';
import { PermissionsLayout, defaultSections, type SectionKey } from './PermissionsLayout';
import { RolesSection } from './sections/RolesSection';
import { MatrixSection } from './sections/MatrixSection';
import { GrantsSection } from './sections/GrantsSection';
import { AuditLogSection } from './sections/AuditLogSection';
import { UsersSection } from './sections/UsersSection';
import { usePermissionContext } from '../../contexts/PermissionContext';

interface Props {
  /** القسم الافتراضي عند الفتح */
  initialSection?: SectionKey;
  /** عند true يفتح modal إضافة مستخدم تلقائيًا (يُستخدم من زر "مستخدم جديد" بالهيدر) */
  triggerAddUser?: boolean;
  /** يُستدعى عندما يستهلك الـ users section الـ trigger (لإعادة تعيينه) */
  onAddUserConsumed?: () => void;
}

/**
 * الـ Shell الجديد بستايل ERP — يستبدل PermissionManagement القديم.
 *
 * أقسام:
 *  - users (legacy wrapped) — المستخدمون
 *  - roles — الأدوار + تعديل (يحل البق القديم!)
 *  - permissions — قائمة الصلاحيات
 *  - matrix — جدول role×permission بنمط draft→save
 *  - grants — منح الوصول للسجلات
 *  - audit — سجل التغييرات
 *
 * الأقسام التي يراها المستخدم تعتمد على صلاحياته.
 */
export const PermissionManagementShell: React.FC<Props> = ({ initialSection, triggerAddUser, onAddUserConsumed }) => {
  const { has, isSuperAdmin } = usePermissionContext();
  const [selectedRoleId, setSelectedRoleId] = useState<string | number | null>(null);

  // إذا فُعّل triggerAddUser من الخارج، حوّل القسم النشط إلى users تلقائيًا
  React.useEffect(() => {
    if (triggerAddUser) {
      setSection('users');
    }
  }, [triggerAddUser]);

  // فلترة الـ sections حسب صلاحيات المستخدم الفعلية
  const visibleSections = useMemo(() => {
    return defaultSections.filter((s) => {
      if (isSuperAdmin) return true;
      if (!s.permission) return true;
      return has(s.permission);
    });
  }, [has, isSuperAdmin]);

  const defaultKey: SectionKey = initialSection ?? visibleSections[0]?.key ?? 'users';
  const [section, setSection] = useState<SectionKey>(defaultKey);

  // تأكد أن القسم النشط ضمن الـ visible — وإلا حوّل لأول قسم متاح
  React.useEffect(() => {
    if (!visibleSections.find((s) => s.key === section) && visibleSections.length > 0) {
      setSection(visibleSections[0].key);
    }
  }, [visibleSections, section]);

  const renderSection = () => {
    switch (section) {
      case 'users':
        return (
          <UsersSection
            triggerAddUser={triggerAddUser}
            onAddUserConsumed={onAddUserConsumed}
          />
        );
      case 'roles':
        return <RolesSection selectedRoleId={selectedRoleId} onSelectRole={setSelectedRoleId} />;
      case 'matrix':
        return <MatrixSection onGoToRoles={() => setSection('roles')} />;
      case 'grants':
        return <GrantsSection />;
      case 'audit':
        return <AuditLogSection />;
      default:
        return <div className="erp-empty">القسم غير متاح.</div>;
    }
  };

  if (visibleSections.length === 0) {
    return (
      <div className="erp-perm erp-section-wrap">
        <div className="erp-empty" style={{
          minHeight: 240,
          background: 'var(--erp-bg)',
          border: '1px solid var(--erp-border)',
          borderRadius: 8,
        }}>
          لا تملك صلاحيات الوصول لأي قسم من إدارة الأدوار والصلاحيات.
        </div>
      </div>
    );
  }

  return (
    <div className="erp-section-wrap">
      <PermissionsLayout
        sections={visibleSections}
        activeSection={section}
        onSectionChange={setSection}
      >
        {renderSection()}
      </PermissionsLayout>
    </div>
  );
};

export default PermissionManagementShell;
