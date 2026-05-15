import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export type WekalaExpiryState =
    | 'active'
    | 'expiring_soon'
    | 'expiring_urgent'
    | 'expired'
    | 'terminated'
    | 'none';

export interface CaseWekalaItem {
    id: number;
    number: string;
    type?: string | null;
    status: string;
    source?: string | null;
    issue_date_hijri?: string | null;
    issue_date_gregorian?: string | null;
    expiry_date_hijri?: string | null;
    expiry_date_gregorian?: string | null;
    expiry_state: WekalaExpiryState;
    days_until_expiry: number | null;
    is_manual_include: boolean;
    match_reason: { clients: string[]; agents: string[] };
    agents: { id: number; name: string; id_number: string | null; adjective?: string | null }[];
    clients: { id: number; name: string; id_number: string | null; adjective?: string | null }[];
}

export interface CaseWekalaSummary {
    matched_count: number;
    suggested_count: number;
    has_expiring_soon: boolean;
    has_expired_only: boolean;
    primary_active_wekala: null | {
        id: number;
        number: string;
        status: string;
        expiry_state: WekalaExpiryState;
        days_until_expiry: number | null;
        expiry_date_gregorian: string | null;
    };
}

export interface CaseWekalatResponse {
    matched: CaseWekalaItem[];
    suggested_client_only: CaseWekalaItem[];
    suggested_lawyer_only: CaseWekalaItem[];
    manual: CaseWekalaItem[];
    excluded_ids: number[];
    summary: CaseWekalaSummary;
}

export interface WekalaCaseItem {
    id: number;
    file_number: string;
    title: string;
    client_name: string | null;
    status: string;
    status_arabic: string;
    last_session_date: string | null;
    next_hearing: string | null;
}

export class CaseWekalaService {
    static async forCase(caseId: number | string): Promise<CaseWekalatResponse> {
        const res = await apiClient.get<ApiResponse<CaseWekalatResponse>>(`/cases/${caseId}/wekalat`);
        if (!res.success || !res.data) throw new Error(res.message || 'فشل جلب وكالات القضية');
        return res.data;
    }

    static async override(
        caseId: number | string,
        wekalaId: number | string,
        action: 'include' | 'exclude',
        note?: string
    ): Promise<void> {
        const res = await apiClient.post<ApiResponse<unknown>>(`/cases/${caseId}/wekalat/${wekalaId}`, {
            action,
            note,
        });
        if (!res.success) throw new Error(res.message || 'فشل تحديث ربط الوكالة');
    }

    static async removeOverride(caseId: number | string, wekalaId: number | string): Promise<void> {
        const res = await apiClient.delete<ApiResponse<unknown>>(`/cases/${caseId}/wekalat/${wekalaId}/override`);
        if (!res.success) throw new Error(res.message || 'فشل إلغاء الإجراء');
    }

    static async casesForWekala(wekalaId: number | string): Promise<WekalaCaseItem[]> {
        const res = await apiClient.get<ApiResponse<WekalaCaseItem[]>>(`/wekalat/${wekalaId}/cases`);
        if (!res.success || !res.data) throw new Error(res.message || 'فشل جلب القضايا المرتبطة');
        return res.data;
    }
}
