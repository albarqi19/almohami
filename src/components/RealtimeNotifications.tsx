import React from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

/**
 * مكوّن بلا واجهة يشترك في قناة تنبيهات المستخدم الحيّة. يُركَّب في Layout مرّة
 * واحدة لكل الأدوار (العميل له جرسُه أيضاً) فيبقى حيّاً عبر التنقّل.
 */
const RealtimeNotifications: React.FC<{ userId: number }> = ({ userId }) => {
  useRealtimeNotifications(userId > 0 ? userId : null);
  return null;
};

export default RealtimeNotifications;
