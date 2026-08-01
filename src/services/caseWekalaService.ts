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
    /** المؤرشفة تختفي من المقترحات وتبقى في matched/manual برقاقة «مؤرشفة» */
    is_archived?: boolean;
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

/**
 * ‏قضية لا وكالة لها — بديل إشعارات `wekala_missing` المتقاعدة.
 *
 * ‏كان هذا يصل صندوق التنبيهات صفّاً لكل (قضية × مستخدم) يتكرّر كل سبعة
 * ‏أيام؛ فبلغ 7,766 صفّاً 18.7% منها فقط صادق. صار قائمةً تُحسب عند فتحها،
 * ‏فتعكس اللحظة: ما إن تُربط الوكالة حتى تخرج القضية منها.
 */
export interface MissingWekalaCase {
    id: number;
    file_number: string;
    title: string;
    client_name: string | null;
    court: string | null;
    status: string;
    status_arabic: string;
    next_hearing: string | null;
    /** ‏وكالاتٌ سارية يظهر فيها أحد محامي القضية — مرشَّحاتٌ للربط بنقرة */
    suggestions_count: number;
}

export interface MissingWekalaResponse {
    data: MissingWekalaCase[];
    meta: {
        total: number;
        returned: number;
        scope: 'tenant' | 'own';
        lookahead_days: number;
    };
}

export class CaseWekalaService {
    static async missingCases(sort: 'hearing' | 'oldest' = 'hearing'): Promise<MissingWekalaResponse> {
        const res = await apiClient.get<ApiResponse<MissingWekalaCase[]> & { meta: MissingWekalaResponse['meta'] }>(
            `/wekalat/missing-cases?sort=${sort}`
        );
        if (!res.success || !res.data) throw new Error(res.message || 'فشل جلب القضايا بلا وكالة');
        return { data: res.data, meta: res.meta };
    }

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
