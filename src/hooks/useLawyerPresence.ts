import { useState, useEffect, useRef } from 'react';
import { getEcho } from '../lib/echo';
import { apiClient } from '../utils/api';

export type PresenceStatus = 'online' | 'idle' | 'away' | 'offline';

export interface OnlineLawyer {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
    status: PresenceStatus;
    last_activity_at: string | null;
    last_activity_ago: string | null;
}

/**
 * Hook لتتبع حالة المحامين عبر Reverb WebSocket (real-time)
 * يجلب القائمة الأولية عبر HTTP مرة واحدة، ثم يستقبل التحديثات فورياً
 */
export function useLawyerPresence(tenantId: number) {
    const [lawyers, setLawyers] = useState<OnlineLawyer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const channelRef = useRef<ReturnType<typeof getEcho> | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        const authToken = localStorage.getItem('authToken') ?? '';

        // 1. جلب القائمة الأولية عبر HTTP (مرة واحدة فقط)
        apiClient.get('/presence/online-users')
            .then((data: unknown) => {
                setLawyers(data as OnlineLawyer[]);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));

        // 2. الاشتراك في الـ channel لتلقي التحديثات فورياً عبر Reverb
        const echo = getEcho(authToken);
        const channel = echo.channel(`presence.tenant.${tenantId}`);

        channel.listen('.user.presence.updated', (payload: OnlineLawyer) => {
            setLawyers(prev => {
                const exists = prev.find(u => u.id === payload.id);
                if (exists) {
                    return prev.map(u => u.id === payload.id ? { ...u, ...payload } : u);
                }
                return [...prev, payload];
            });
        });

        channelRef.current = echo;

        return () => {
            echo.leaveChannel(`presence.tenant.${tenantId}`);
        };
    }, [tenantId]);

    const onlineLawyers = lawyers.filter(l => l.status === 'online' || l.status === 'idle');
    const onlineCount = lawyers.filter(l => l.status === 'online').length;

    return { lawyers, onlineLawyers, onlineCount, isLoading };
}
