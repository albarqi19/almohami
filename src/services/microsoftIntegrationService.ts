import { apiClient } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────
// Types — mirror the backend responses (see MicrosoftSyncSettingsController)
// ─────────────────────────────────────────────────────────────────────

export type SyncMode = 'bidirectional' | 'outbound_only' | 'paused';

export interface MicrosoftStatus {
    connected: boolean;
    provider: 'microsoft_graph';
    can_connect?: boolean;
    email?: string;
    display_name?: string | null;
    connected_at?: string | null;
    expires_at?: string | null;
    is_expired?: boolean;
    needs_reauth?: boolean;
    sync_mode?: SyncMode;
    calendar_sync_enabled?: boolean;
    todo_sync_enabled?: boolean;
    granted_scopes?: string[];
}

export interface MicrosoftPreferences {
    calendar_sync_enabled: boolean;
    todo_sync_enabled: boolean;
    default_reminder_minutes_before: number;
    todo_list_name: string;
    sync_mode: SyncMode;
    timezone: string;
    needs_reauth: boolean;
}

export interface MicrosoftSyncLogEntry {
    id: number;
    tenant_id: number;
    user_id: number | null;
    connection_id: number | null;
    entity_type: 'session' | 'task' | 'subtask' | 'webhook' | 'subscription' | 'reconciliation';
    entity_id: number | null;
    direction: 'to_ms' | 'from_ms' | 'webhook_received' | 'webhook_observed' | 'webhook_applied' | 'renewal' | 'reconcile';
    operation: 'create' | 'update' | 'delete' | 'skip' | 'conflict' | 'overwrite' | 'merge';
    status: 'success' | 'failed' | 'retried' | 'observed';
    loop_guard_triggered: 'etag' | 'timing' | 'payload_hash' | 'none' | null;
    error_code: string | null;
    error_message: string | null;
    duration_ms: number | null;
    created_at: string;
}

export interface AuthorizeResponse {
    success: boolean;
    auth_url: string;
    features: string[];
}

// ─────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────

class MicrosoftIntegrationService {
    /**
     * Start OAuth — returns the Microsoft login URL the frontend should redirect to.
     */
    async startAuth(features: Array<'calendar' | 'todo' | 'mail'> = ['calendar', 'todo']): Promise<AuthorizeResponse> {
        const featuresParam = features.join(',');
        return await apiClient.get<AuthorizeResponse>(
            `/microsoft/authorize?features=${encodeURIComponent(featuresParam)}`
        );
    }

    /**
     * Current connection + sync status for the authenticated user.
     */
    async getStatus(): Promise<MicrosoftStatus> {
        return await apiClient.get<MicrosoftStatus>('/microsoft/status');
    }

    async getPreferences(): Promise<{ success: boolean; data: MicrosoftPreferences }> {
        return await apiClient.get<{ success: boolean; data: MicrosoftPreferences }>(
            '/microsoft/preferences'
        );
    }

    async updatePreferences(prefs: Partial<{
        calendar_sync_enabled: boolean;
        todo_sync_enabled: boolean;
        default_reminder_minutes_before: number;
        sync_mode: SyncMode;
    }>): Promise<{ success: boolean; message: string; data: MicrosoftPreferences }> {
        return await apiClient.put('/microsoft/preferences', prefs);
    }

    async disconnect(): Promise<{ success: boolean; message: string }> {
        return await apiClient.delete<{ success: boolean; message: string }>('/microsoft/disconnect');
    }

    async fullResync(): Promise<{ success: boolean; message: string }> {
        return await apiClient.post<{ success: boolean; message: string }>('/microsoft/resync');
    }

    async getSyncLog(): Promise<{ success: boolean; data: MicrosoftSyncLogEntry[] }> {
        return await apiClient.get<{ success: boolean; data: MicrosoftSyncLogEntry[] }>(
            '/microsoft/sync-log'
        );
    }
}

export const microsoftIntegrationService = new MicrosoftIntegrationService();
