import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

import { API_HOST, API_ROOT } from '../utils/api';

// 🔴 كان المضيفُ ونقطةُ المصادقة مثبَّتين هنا نصّاً، فلا يراهما `VITE_API_URL`.
//    ونتيجتُه أن نشرةً على نطاقٍ آخر تفتح WebSocket إلى خادم المنصّة —
//    ويموت البثُّ **صامتاً**: لا خطأ في الواجهة، بل دردشةٌ لا تصل وحضورٌ
//    لا يتحدّث، ويظنّ المستخدمُ أن لا أحدَ يكتب.
const REVERB_HOST = API_HOST;

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(authToken: string): Echo<'reverb'> {
    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY ?? 'bddf8bcc28d9d97d3296673166f771f6',
            wsHost: REVERB_HOST,
            wsPort: 443,
            wssPort: 443,
            forceTLS: true,
            enabledTransports: ['ws', 'wss'],
            authEndpoint: `${API_ROOT}/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            },
        });
    }
    return echoInstance;
}

export function updateEchoToken(authToken: string): void {
    if (echoInstance) {
        (echoInstance.connector as any).options.auth = {
            headers: { Authorization: `Bearer ${authToken}` },
        };
    }
}

export function destroyEcho(): void {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
}
