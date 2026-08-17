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

    /**
     * 🔴 **يُستثنى العميل، ولا تُعدَّد الأدوار المسموحة.**
     *
     * كان الشرط قائمةً مغلقة: `['lawyer','senior_lawyer','legal_assistant']`.
     * فكلُّ دورٍ خارجها لا يُرسل نبضةً أصلاً ⇒ **لا يظهر «متّصلاً» أبداً** مهما
     * عمل، ولا يُنقَل إلى `offline` أيضاً فتتجمّد حالتُه على آخر قيمةٍ قديمة.
     *
     * وقِيس على الإنتاج (2026-08-17): **392 مستخدماً محروماً** — منهم 352 `admin`
     * و10 `secretary` و10 `partner` و7 `owner`، **و14 بأدوارٍ مكتوبةٍ بخطأ**
     * (`lawyer1` و`laywer_1`) سقطت من القائمة صامتةً.
     *
     * 🔑 **والأدوارُ المخصّصة هي الضحيّةُ البنيوية:** قائمةٌ مكتوبةٌ مسبقاً لا
     * يمكن أن تعرف دوراً يخترعه المكتبُ لنفسه — فكلُّ دورٍ جديدٍ يولد محروماً.
     *
     * فالمنعُ الآن على العميل وحدَه: هو **نوعُ مستخدمٍ لا دور**، وحضورُه لا
     * يعني للمكتب شيئاً. وما عداه موظّفٌ يُتتبَّع أياً كان مسمّاه.
     * (نفس القاعدة المعتمدة في المشروع: امنع العميل ولا تُعدّد الأدوار.)
     */
    const shouldTrack = !!user && user.role !== 'client';

    if (!shouldTrack) {
        return null;
    }

    return <PresenceHeartbeat />;
};

export default PresenceTracker;
