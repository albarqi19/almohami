import { apiClient } from '../utils/api';

export interface CloudStorageStatus {
    connected: boolean;
    provider: string;
    email?: string;
    display_name?: string;
    connected_at?: string;
    expires_at?: string;
    is_expired?: boolean;
}

export interface CloudStorageFile {
    id: string;
    name: string;
    size: number;
    is_folder: boolean;
    mime_type: string | null;
    web_url: string | null;
    created_at: string | null;
    modified_at: string | null;
    provider: string;
}

export interface CloudStorageFilesResponse {
    success: boolean;
    files: CloudStorageFile[];
    folder_id: string;
}

interface AuthUrlResponse {
    success: boolean;
    auth_url: string;
    message: string;
}

interface DisconnectResponse {
    success: boolean;
    message: string;
}

export const CloudStorageService = {
    /**
     * Get OneDrive authorization URL
     */
    getOneDriveAuthUrl: async (): Promise<{ success: boolean; auth_url: string }> => {
        const response = await apiClient.get<AuthUrlResponse>('/cloud-storage/onedrive/authorize');
        return { success: response.success, auth_url: response.auth_url || '' };
    },

    /**
     * Get OneDrive connection status
     */
    getOneDriveStatus: async (): Promise<CloudStorageStatus> => {
        try {
            const response = await apiClient.get<CloudStorageStatus>('/cloud-storage/onedrive/status');
            return response;
        } catch (error) {
            return { connected: false, provider: 'onedrive' };
        }
    },

    /**
     * Disconnect OneDrive
     */
    disconnectOneDrive: async (): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<DisconnectResponse>('/cloud-storage/onedrive/disconnect');
        return { success: response.success, message: response.message || '' };
    },

    /**
     * Get OneDrive files
     */
    getOneDriveFiles: async (folderId?: string): Promise<CloudStorageFilesResponse> => {
        const endpoint = folderId
            ? `/cloud-storage/onedrive/files?folder_id=${folderId}`
            : '/cloud-storage/onedrive/files';
        try {
            const response = await apiClient.get<CloudStorageFilesResponse>(endpoint);
            return response;
        } catch (error) {
            return { success: false, files: [], folder_id: 'root' };
        }
    },

    /**
     * Start OneDrive OAuth flow
     * Opens a new window/redirects to Microsoft login
     */
    connectOneDrive: async (): Promise<void> => {
        const result = await CloudStorageService.getOneDriveAuthUrl();
        if (result.auth_url) {
            window.location.href = result.auth_url;
        }
    },
};

export default CloudStorageService;
