import React from 'react';
import LegacyPermissionManagement from '../../PermissionManagement';

/**
 * Wrapper للمكوّن القديم (PermissionManagement.tsx).
 * نُبقي عليه فقط لقسم المستخدمين، وبقية الأقسام تأتي من sections الجديدة.
 *
 * الـ legacy يحوي tabs داخلية — نُخفيها عبر CSS لأن sidebar الـ shell الجديد
 * هو نقطة التنقل الرسمية.
 */
interface UsersSectionProps {
  /** يفتح modal إضافة مستخدم تلقائيًا — يُربط من زر "مستخدم جديد" بالهيدر الأعلى */
  triggerAddUser?: boolean;
  onAddUserConsumed?: () => void;
}

export const UsersSection: React.FC<UsersSectionProps> = ({ triggerAddUser, onAddUserConsumed }) => {
  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--erp-bg)',
        padding: 12,
      }}
      className="erp-users-legacy-wrap"
    >
      <style>{`
        /* ── Legacy users panel — sticky search/filters + sticky pagination ──
         * الـ legacy يُرجع المحتوى كـ div واحد فيه:
         *   1) tabs (مخفية بـ CSS)
         *   2) search/filters bar
         *   3) table wrapper
         *   4) pagination (آخر div)
         *
         * نُثبّت الـ search bar أعلى الـ scroll، و pagination أسفله.
         */

        /* الـ direct child الأول لـ wrap = wrapper الـ legacy. نجعله relative بـ flex column.
         * بحيث يكون الـ children داخله sticky بالنسبة للـ scroll container (.erp-users-legacy-wrap). */
        .erp-users-legacy-wrap > div:first-child {
          position: relative;
        }

        /* أول div فيه search input (toolbar) — sticky top */
        .erp-users-legacy-wrap > div:first-child > div:has(> input[type="text"]),
        .erp-users-legacy-wrap > div:first-child > div:has(> input[placeholder]) {
          position: sticky;
          top: -12px;
          z-index: 5;
          background: var(--erp-bg, var(--color-surface));
          padding-top: 12px;
          margin-top: -12px;
          border-bottom: 1px solid var(--color-border);
        }

        /* الـ pagination — آخر div مباشر للـ wrapper. نُحدّده عبر :last-child
         * ولأنه نمط معروف (يحوي "السابق"/"التالي"). */
        .erp-users-legacy-wrap > div:first-child > div:last-child {
          position: sticky;
          bottom: -12px;
          z-index: 5;
          background: var(--erp-bg, var(--color-surface));
          margin-bottom: -12px;
          padding-bottom: 12px;
        }
      `}</style>
      <LegacyPermissionManagement
        autoOpenAddUser={triggerAddUser}
        onAddUserModalChange={(isOpen: boolean) => {
          if (!isOpen) onAddUserConsumed?.();
        }}
      />
    </div>
  );
};
