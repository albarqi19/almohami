import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

const REVERB_HOST = 'api.alraedlaw.com';

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
