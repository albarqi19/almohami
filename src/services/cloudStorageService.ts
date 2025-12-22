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
    download_url: string | null; // Direct download/preview URL from OneDrive
    created_at: string | null;
    modified_at: string | null;
    provider: string;
}

// ========== Direct Access Types ==========
export interface DirectUrlResponse {
    success: boolean;
    url?: string;
    expires_in?: number;
    file_name?: string;
    mime_type?: string;
    permission?: string;
    error?: string;
}

export interface UploadUrlResponse {
    success: boolean;
    upload_url?: string;
    expires_at?: string;
    case_folder_id?: string;
    instructions?: {
        method: string;
        headers: Record<string, string>;
        note: string;
    };
    error?: string;
}

export interface CaseFile {
    id: number;
    name: string;
    mime_type: string;
    file_size: number;
    cloud_file_id: string;
    uploaded_at: string;
    uploaded_by: string;
    can_download: boolean;
    can_delete: boolean;
}

export interface CaseFilesResponse {
    success: boolean;
    files: CaseFile[];
    total: number;
}

export interface AccessUser {
    user_id: number;
    user_name: string;
    user_role: string;
    permission: string;
    granted_by: string;
    granted_at: string;
    expires_at?: string;
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

    // ========== Direct Access Methods (No Server Proxy) ==========

    /**
     * Get direct download URL for a document
     * Use this URL to download directly from OneDrive
     */
    getDirectDownloadUrl: async (documentId: number): Promise<DirectUrlResponse> => {
        try {
            const response = await apiClient.get<DirectUrlResponse>(
                `/onedrive-direct/documents/${documentId}/download-url`
            );
            return response;
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في الحصول على رابط التحميل' };
        }
    },

    /**
     * Get preview URL for embedding document in browser
     */
    getPreviewUrl: async (documentId: number): Promise<DirectUrlResponse> => {
        try {
            const response = await apiClient.get<DirectUrlResponse>(
                `/onedrive-direct/documents/${documentId}/preview-url`
            );
            return response;
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في الحصول على رابط المعاينة' };
        }
    },

    /**
     * Get upload URL for direct upload to OneDrive
     * Frontend uploads directly to this URL (bypasses server)
     */
    getUploadUrl: async (caseId: number, fileName: string, fileSize?: number): Promise<UploadUrlResponse> => {
        try {
            const response = await apiClient.post<UploadUrlResponse>(
                `/onedrive-direct/cases/${caseId}/upload-url`,
                { file_name: fileName, file_size: fileSize }
            );
            return response;
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في الحصول على رابط الرفع' };
        }
    },

    /**
     * Upload file directly to OneDrive using the upload URL
     * This bypasses the server completely
     */
    uploadFileDirect: async (
        uploadUrl: string,
        file: File,
        onProgress?: (percent: number) => void
    ): Promise<{ success: boolean; fileId?: string; webUrl?: string; error?: string }> => {
        try {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);

                // OneDrive requires Content-Range header for upload sessions
                xhr.setRequestHeader('Content-Type', 'application/octet-stream');
                xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        onProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            fileId: response.id,
                            webUrl: response.webUrl
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `Upload failed: ${xhr.status}`
                        });
                    }
                };

                xhr.onerror = () => {
                    resolve({
                        success: false,
                        error: 'Network error during upload'
                    });
                };

                xhr.send(file);
            });
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في رفع الملف' };
        }
    },

    /**
     * Register uploaded file in the system after direct upload
     */
    registerUploadedFile: async (data: {
        case_id: number;
        cloud_file_id: string;
        file_name: string;
        file_size?: number;
        mime_type?: string;
        web_url?: string;
    }): Promise<{ success: boolean; document?: unknown; error?: string }> => {
        try {
            console.log('registerUploadedFile - Sending data:', data);
            const response = await apiClient.post(
                '/onedrive-direct/documents/register-upload',
                data
            );
            console.log('registerUploadedFile - Response:', response);
            return response as { success: boolean; document?: unknown; error?: string };
        } catch (error: unknown) {
            console.error('registerUploadedFile - Error:', error);
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في تسجيل الملف' };
        }
    },

    /**
     * Complete upload flow: get URL, upload, register
     */
    uploadFileToCase: async (
        caseId: number,
        file: File,
        onProgress?: (percent: number) => void
    ): Promise<{ success: boolean; document?: unknown; error?: string }> => {
        // Step 1: Get upload URL from backend
        const urlResponse = await CloudStorageService.getUploadUrl(caseId, file.name, file.size);
        if (!urlResponse.success || !urlResponse.upload_url) {
            return { success: false, error: urlResponse.error || 'فشل في الحصول على رابط الرفع' };
        }

        // Step 2: Upload directly to OneDrive
        const uploadResult = await CloudStorageService.uploadFileDirect(
            urlResponse.upload_url,
            file,
            onProgress
        );
        if (!uploadResult.success) {
            return { success: false, error: uploadResult.error };
        }

        // Step 3: Register file in system
        const registerResult = await CloudStorageService.registerUploadedFile({
            case_id: caseId,
            cloud_file_id: uploadResult.fileId!,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            web_url: uploadResult.webUrl
        });

        return registerResult;
    },

    /**
     * Get all accessible files for a case
     */
    getCaseFiles: async (caseId: number): Promise<CaseFilesResponse> => {
        try {
            const response = await apiClient.get<CaseFilesResponse>(
                `/onedrive-direct/cases/${caseId}/files`
            );
            return response;
        } catch (error: unknown) {
            return { success: false, files: [], total: 0 };
        }
    },

    /**
     * Download file directly (opens in new tab or downloads)
     */
    downloadFile: async (documentId: number): Promise<void> => {
        const result = await CloudStorageService.getDirectDownloadUrl(documentId);
        if (result.success && result.url) {
            // Open direct OneDrive URL in new tab
            window.open(result.url, '_blank');
        } else {
            throw new Error(result.error || 'فشل في تحميل الملف');
        }
    },

    /**
     * Preview file in browser
     */
    previewFile: async (documentId: number): Promise<string> => {
        const result = await CloudStorageService.getPreviewUrl(documentId);
        if (result.success && result.url) {
            return result.url;
        }
        throw new Error(result.error || 'فشل في معاينة الملف');
    },

    /**
     * Delete a document
     */
    deleteDocument: async (documentId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
        try {
            const response = await apiClient.delete(`/onedrive-direct/documents/${documentId}`);
            return response as { success: boolean; message?: string; error?: string };
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في حذف الملف' };
        }
    },

    /**
     * Grant access to a document
     */
    grantAccess: async (
        documentId: number,
        userId: number,
        permission: 'view' | 'download' | 'edit' | 'full' | 'none'
    ): Promise<{ success: boolean; message?: string; error?: string }> => {
        try {
            const response = await apiClient.post(`/onedrive-direct/documents/${documentId}/grant-access`, {
                user_id: userId,
                permission
            });
            return response as { success: boolean; message?: string; error?: string };
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في منح الصلاحية' };
        }
    },

    /**
     * Get document access list
     */
    getAccessList: async (documentId: number): Promise<{
        success: boolean;
        document_name?: string;
        is_public?: boolean;
        access_list?: AccessUser[];
        error?: string;
    }> => {
        try {
            const response = await apiClient.get(`/onedrive-direct/documents/${documentId}/access-list`);
            return response as {
                success: boolean;
                document_name?: string;
                is_public?: boolean;
                access_list?: AccessUser[];
                error?: string;
            };
        } catch (error: unknown) {
            const err = error as { message?: string };
            return { success: false, error: err.message || 'فشل في جلب قائمة الصلاحيات' };
        }
    },
};

export default CloudStorageService;
