import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../hooks/usePresence';

/**
 * الغلاف الذي يحمل الـhook فعلياً — لا يُركّب إلا لمن يُتتبَّع حضوره.
 * (الـhooks لا تُستدعى شرطياً، فالشرط يكون على تركيب المكوّن لا على النداء.)
 */
const PresenceHeartbeat: React.FC = () => {
    usePresence();
    return null;
};

/**
 * Invisible component that activates presence tracking for lawyers/legal assistants
 * Should be placed in the main Layout to track activity across the app
 *
 * ⚠️ كان يستدعي usePresence() بلا شرط: `shouldTrack` يُحسب ثم لا يُستعمل إلا في
 * console.log، فكلُّ داخلٍ للمنصّة — عميلاً كان أو محاسباً — يبعث نبضتين في الدقيقة
 * يردّها الباك بـ200 فارغة (needsPresenceTracking) بعد أن يكون Sanctum قد كتب
 * `personal_access_tokens.last_used_at` لكلٍّ منها. الشرطُ الآن يمنع الطلب من أصله.
 */
export const PresenceTracker: React.FC = () => {
    const { user } = useAuth();

    // Only track for specific roles
    const shouldTrack = !!user && ['lawyer', 'senior_lawyer', 'legal_assistant'].includes(user.role || '');

    if (!shouldTrack) {
        return null;
    }

    return <PresenceHeartbeat />;
};

export default PresenceTracker;
