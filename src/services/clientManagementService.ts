import { apiClient } from '../utils/api';

/**
 * لغة التواصل المفضلة للعميل — رسائل النظام (الإفادات، التحديثات، التذكيرات)
 * تُرسل دائماً بالعربية، وإن كانت لغة العميل غير العربية تُلحق ترجمة قانونية
 * آلية بلغته أسفل النص العربي. يجب أن تطابق القائمة المدعومة في الباك اند
 * (MessageTranslationService::SUPPORTED_LANGUAGES).
 */
export const CLIENT_LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'ar', label: 'العربية (الافتراضي)' },
    { value: 'en', label: 'الإنجليزية — English' },
    { value: 'ur', label: 'الأردو — اردو' },
    { value: 'hi', label: 'الهندية — हिन्दी' },
    { value: 'bn', label: 'البنغالية — বাংলা' },
    { value: 'fil', label: 'الفلبينية — Filipino' },
    { value: 'id', label: 'الإندونيسية — Indonesia' },
    { value: 'tr', label: 'التركية — Türkçe' },
    { value: 'fr', label: 'الفرنسية — Français' },
];

export const clientLanguageLabel = (code?: string | null): string =>
    CLIENT_LANGUAGES.find(l => l.value === (code || 'ar'))?.label ?? code ?? 'العربية (الافتراضي)';

/**
 * مصادر العميل المحتمل (lead source) — قنوات وصوله للمكتب، لقياس مردود التسويق.
 * "other" يُتبع بنص حر في lead_source_detail. القيم تُخزَّن كما هي في users.lead_source.
 */
export const LEAD_SOURCES: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'twitter', label: 'تويتر / X' },
    { value: 'snapchat', label: 'سناب شات' },
    { value: 'instagram', label: 'إنستغرام' },
    { value: 'tiktok', label: 'تيك توك' },
    { value: 'facebook', label: 'فيسبوك' },
    { value: 'linkedin', label: 'لينكدإن' },
    { value: 'whatsapp', label: 'واتساب' },
    { value: 'google', label: 'بحث جوجل' },
    { value: 'ads', label: 'إعلان مموّل' },
    { value: 'referral', label: 'ترشيح (عميل/صديق)' },
    { value: 'website', label: 'الموقع الإلكتروني' },
    { value: 'walk_in', label: 'زيارة / اتصال مباشر' },
    { value: 'other', label: 'أخرى' },
];

export const leadSourceLabel = (code?: string | null): string =>
    code ? (LEAD_SOURCES.find(s => s.value === code)?.label ?? code) : '—';

// Types
export interface Client {
    id: number;
    name: string;
    national_id: string | null;
    phone: string | null;
    email: string | null;
    role: 'client';
    client_status?: 'prospect' | 'client';
    lead_source?: string | null;          // قناة وصول العميل المحتمل
    lead_source_detail?: string | null;   // تفصيل المصدر (مرشِّح/حملة)
    is_active: boolean;
    assigned_cases_count?: number;
    client_cases_count?: number;       // قضايا رئيسية (cases.client_id)
    additional_cases_count?: number;   // قضايا إضافية (case_clients)
    total_cases_count?: number;        // المجموع الموحّد (رئيسي + إضافي)
    created_at: string;
    preferred_language?: string | null;

    // Legal entity profile (for the redesigned ClientDetailPage)
    entity_type?: 'individual' | 'company' | 'organization' | null;
    commercial_registration?: string | null;
    vat_number?: string | null;
    national_address?: string | null;
    industry?: string | null;
    legal_representative?: string | null;
    legal_representative_nid?: string | null;
    point_of_contact_name?: string | null;
    point_of_contact_phone?: string | null;
    point_of_contact_email?: string | null;
    relationship_manager_id?: number | null;
    relationship_manager?: { id: number; name: string; role?: string } | null;
}

export interface PotentialClient {
    party_id: number;
    name: string;
    national_id: string;
    side: 'plaintiff' | 'defendant' | 'lawyer' | 'agent' | 'appellant' | 'appellee' | 'other';
    role: string;
    user_id: number | null;
    has_account: boolean;
    has_phone: boolean;
    phone: string | null;
}

export interface CaseClientsResponse {
    client: Client | null;
    potential_clients: PotentialClient[];
}

export interface UpdatePhoneResponse {
    client_id: number;
    phone: string;
    credentials_sent: boolean;
}

export interface CreateClientResponse {
    client: Client;
    credentials_sent: boolean;
    is_existing: boolean;
}

export interface ClientCommunication {
    id: number;
    type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'sms' | 'other';
    direction: 'inbound' | 'outbound';
    subject: string | null;
    notes: string | null;
    occurred_at: string;
    created_at: string;
    logged_by_user?: { id: number; name: string } | null;
    loggedBy?: { id: number; name: string } | null;
    logged_by?: { id: number; name: string } | null;
}

export type LogCommunicationPayload = {
    type: ClientCommunication['type'];
    direction?: ClientCommunication['direction'];
    subject?: string | null;
    notes?: string | null;
    occurred_at?: string | null;
};

export type UpdateClientPayload = {
    rating?: number;
    classification?: 'vip' | 'regular' | 'one_time';
    internal_notes?: string;
    name?: string;
    phone?: string;
    preferred_language?: string;
    entity_type?: 'individual' | 'company' | 'organization' | null;
    commercial_registration?: string | null;
    vat_number?: string | null;
    national_address?: string | null;
    industry?: string | null;
    legal_representative?: string | null;
    legal_representative_nid?: string | null;
    point_of_contact_name?: string | null;
    point_of_contact_phone?: string | null;
    point_of_contact_email?: string | null;
    relationship_manager_id?: number | null;
};

/** عميل مرتبط بقضية (متعددة الموكلين) */
export interface CaseLinkedClient {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    national_id: string | null;
    entity_type: string | null;
    is_active: boolean;
    is_primary: boolean;
    source: string;
}

/** صف خصم في قائمة الخصوم (مجمّع بالهوية) */
export interface OpponentRow {
    identity_key: string;
    name: string | null;
    national_id: string | null;
    commercial_reg: string | null;
    party_type: string | null;
    cases_count: number;
    /** معرّف المستخدم إن كان هذا الخصم عميلاً لدينا أيضاً (تعارض مصالح محتمل) */
    client_user_id?: number | null;
}

/** بطاقة تحليل خصم */
export interface OpponentAnalysis {
    identity: {
        key: string;
        national_id: string | null;
        commercial_reg: string | null;
        name: string | null;
        party_type: string | null;
    };
    total_cases_against_us: number;
    cases_we_represent_opposite: number;
    was_ever_client: boolean;
    client_user_id: number | null;
    client_status: 'prospect' | 'client' | null;
    client_is_active: boolean | null;
    sessions_count: number;
    cases: Array<{
        id: number;
        file_number: string | null;
        title: string | null;
        status: string | null;
        our_side: string | null;
        his_side: string | null;
        next_hearing: string | null;
    }>;
}

// Client Management Service
export class ClientManagementService {
    /**
     * Get list of clients
     */
    static async getClients(params?: {
        search?: string;
        status?: 'client' | 'prospect';
        without_phone?: boolean;
        preset?: 'with_cases' | 'vip';
        sort_by?: 'name' | 'created_at' | 'cases_count' | 'entity_type' | 'phone';
        sort_order?: 'asc' | 'desc';
        per_page?: number;
        page?: number;
    }): Promise<any> {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.status) searchParams.append('status', params.status);
        if (params?.without_phone) searchParams.append('without_phone', '1');
        if (params?.preset) searchParams.append('preset', params.preset);
        if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
        if (params?.sort_order) searchParams.append('sort_order', params.sort_order);
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());

        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management${query ? `?${query}` : ''}`);
        return response.data;
    }

    /**
     * Aggregate client counts (across all clients in tenant, not page-bound).
     */
    static async getClientStats(): Promise<{
        total: number;
        clients: number;
        prospects: number;
        withoutPhone: number;
        withCases: number;
        vip: number;
        companies: number;
        individuals: number;
        opponents: number;
    }> {
        const response = await apiClient.get<any>('/client-management/stats');
        return response.data;
    }

    /**
     * تحويل عميل محتمل (prospect) إلى عميل فعلي (client).
     */
    static async convertToClient(
        clientId: number | string,
        payload: { national_id?: string; phone?: string } = {}
    ): Promise<{ client: Client; credentials_sent: boolean }> {
        const response = await apiClient.put<any>(`/client-management/${clientId}/convert`, payload);
        return response.data;
    }

    /**
     * تبويب الخصوم: قائمة الخصوم مجمّعة بالهوية (ضمن قضايا المستخدم المرئية).
     */
    static async getOpponents(params?: { search?: string; per_page?: number; page?: number }): Promise<any> {
        const sp = new URLSearchParams();
        if (params?.search) sp.append('search', params.search);
        if (params?.per_page) sp.append('per_page', String(params.per_page));
        if (params?.page) sp.append('page', String(params.page));
        const q = sp.toString();
        const response = await apiClient.get<any>(`/client-management/opponents${q ? `?${q}` : ''}`);
        return response.data;
    }

    /**
     * بطاقة تحليل خصم بمفتاح الهوية (national_id أو commercial_reg).
     */
    static async getOpponentAnalysis(identity: string): Promise<OpponentAnalysis> {
        const response = await apiClient.get<any>(`/client-management/opponents/${encodeURIComponent(identity)}/analysis`);
        return response.data;
    }

    /**
     * Create a brand-new client (individual / company / organization)
     */
    static async createClient(payload: {
        name: string;
        national_id?: string;
        email?: string;
        phone?: string;
        preferred_language?: string;
        entity_type?: 'individual' | 'company' | 'organization';
        client_status?: 'prospect' | 'client';
        lead_source?: string;
        lead_source_detail?: string;
        classification?: 'vip' | 'regular' | 'one_time';
        commercial_registration?: string;
        vat_number?: string;
        national_address?: string;
        industry?: string;
        legal_representative?: string;
        legal_representative_nid?: string;
        point_of_contact_name?: string;
        point_of_contact_phone?: string;
        point_of_contact_email?: string;
    }): Promise<{ client: Client; pin: string; temporary_password: string }> {
        const response = await apiClient.post<any>('/client-management', payload);
        return response.data;
    }

    /**
     * Update client phone and optionally send credentials
     */
    static async updateClientPhone(
        clientId: number,
        phone: string,
        sendCredentials: boolean = true
    ): Promise<UpdatePhoneResponse> {
        const response = await apiClient.put<any>(`/client-management/${clientId}/phone`, {
            phone,
            send_credentials: sendCredentials,
        });
        return response.data;
    }

    /**
     * Get clients associated with a case
     */
    static async getCaseClients(caseId: number | string): Promise<CaseClientsResponse> {
        const response = await apiClient.get<any>(`/client-management/case/${caseId}`);
        return response.data;
    }

    /**
     * عملاء القضية المرتبطون (الرئيسي + الإضافيون) — قضايا متعددة الموكلين
     */
    static async getCaseLinkedClients(caseId: number | string): Promise<CaseLinkedClient[]> {
        const response = await apiClient.get<any>(`/cases/${caseId}/clients`);
        return response.data ?? [];
    }

    /** ربط عميل إضافي بالقضية */
    static async addCaseClient(caseId: number | string, clientId: number): Promise<void> {
        await apiClient.post<any>(`/cases/${caseId}/clients`, { client_id: clientId });
    }

    /** فك ربط عميل إضافي عن القضية */
    static async removeCaseClient(caseId: number | string, clientId: number): Promise<void> {
        await apiClient.delete<any>(`/cases/${caseId}/clients/${clientId}`);
    }

    /**
     * Create client from case party
     */
    static async createClientFromParty(
        caseId: number | string,
        partyId: number,
        phone?: string,
        sendCredentials: boolean = true
    ): Promise<CreateClientResponse> {
        const response = await apiClient.post<any>(
            `/client-management/case/${caseId}/party/${partyId}`,
            { phone, send_credentials: sendCredentials }
        );
        return response.data;
    }

    /**
     * Get client details with statistics
     */
    static async getClientDetails(clientId: number | string): Promise<{
        client: Client;
        statistics: {
            total_cases: number;
            active_cases: number;
            pending_cases: number;
            closed_cases: number;
            total_fees: number;
            paid_amount: number;
            remaining_amount: number;
        };
        upcoming_session: {
            date: string;
            case_id: number;
            case_title: string;
        } | null;
    }> {
        const response = await apiClient.get<any>(`/client-management/${clientId}`);
        return response.data;
    }

    /**
     * Get client cases
     */
    static async getClientCases(clientId: number | string, params?: {
        status?: string;
        per_page?: number;
        page?: number;
    }): Promise<{ data: any[]; meta: any }> {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.append('status', params.status);
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());

        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management/${clientId}/cases${query ? `?${query}` : ''}`);
        return response.data;
    }

    /**
     * Get client activities/timeline
     */
    static async getClientActivities(clientId: number | string, params?: {
        per_page?: number;
        page?: number;
    }): Promise<{ data: any[]; meta: any }> {
        const searchParams = new URLSearchParams();
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());

        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management/${clientId}/activities${query ? `?${query}` : ''}`);
        return response.data;
    }

    /**
     * Update client data — supports rating/notes plus the new legal-entity
     * fields. Uses PUT to match the registered route.
     */
    static async updateClient(clientId: number | string, data: UpdateClientPayload): Promise<Client> {
        const response = await apiClient.put<any>(`/client-management/${clientId}`, data);
        return response.data;
    }

    /**
     * أرشفة العميل (soft delete عبر is_active=false).
     */
    static async deleteClient(clientId: number | string): Promise<void> {
        await apiClient.delete<any>(`/client-management/${clientId}`);
    }

    // ----------- Endpoints powering the redesigned ClientDetailPage -----------

    static async getClientTasks(clientId: number | string, params?: {
        status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
        per_page?: number;
        page?: number;
    }): Promise<{ data: any[]; meta?: any }> {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.append('status', params.status);
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());
        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management/${clientId}/tasks${query ? `?${query}` : ''}`);
        return response.data;
    }

    static async getClientUpcomingSessions(clientId: number | string, limit = 10): Promise<any[]> {
        const response = await apiClient.get<any>(`/client-management/${clientId}/upcoming-sessions?limit=${limit}`);
        return response.data || [];
    }

    static async getClientCommunications(clientId: number | string, params?: {
        per_page?: number;
        page?: number;
    }): Promise<{ data: ClientCommunication[]; meta?: any }> {
        const searchParams = new URLSearchParams();
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());
        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management/${clientId}/communications${query ? `?${query}` : ''}`);
        return response.data;
    }

    static async logCommunication(clientId: number | string, payload: LogCommunicationPayload): Promise<ClientCommunication> {
        const response = await apiClient.post<any>(`/client-management/${clientId}/communications`, payload);
        return response.data;
    }

    /** إرسال رسالة واتساب للعميل من داخل النظام — الباك يدوّنها تلقائياً في سجل التواصل ويعيد السجل */
    static async sendWhatsapp(clientId: number | string, payload: { message: string; subject?: string | null }): Promise<ClientCommunication> {
        const response = await apiClient.post<any>(`/client-management/${clientId}/send-whatsapp`, payload);
        return response.data;
    }

    static async getClientDocuments(clientId: number | string, params?: {
        per_page?: number;
        page?: number;
    }): Promise<{ data: any[]; meta?: any }> {
        const searchParams = new URLSearchParams();
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());
        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management/${clientId}/documents${query ? `?${query}` : ''}`);
        return response.data;
    }

    static async getClientWekalat(clientId: number | string): Promise<any[]> {
        const response = await apiClient.get<any>(`/client-management/${clientId}/wekalat`);
        return response.data || [];
    }

    // ===== مستندات العميل الثابتة (client_documents عبر OneDrive) =====

    /** قائمة المستندات الثابتة للعميل (هوية/سجل تجاري/عقد/توكيل). */
    static async getClientPermanentDocuments(clientId: number | string): Promise<any[]> {
        const response = await apiClient.get<any>(`/client-management/${clientId}/client-documents`);
        return response.data || [];
    }

    /** الخطوة 1: رابط رفع OneDrive لمجلد العميل. */
    static async getClientDocUploadUrl(clientId: number | string, fileName: string): Promise<{ upload_url: string; folder_id?: string }> {
        const response = await apiClient.post<any>(`/client-management/${clientId}/client-documents/upload-url`, { file_name: fileName });
        return response.data;
    }

    /** الخطوة 3: تسجيل المستند بعد رفعه مباشرةً إلى OneDrive (رفع جديد، بحارس الانتماء). */
    static async registerClientDocument(clientId: number | string, payload: {
        doc_type: string; cloud_file_id: string; file_name: string;
        title?: string; document_number?: string; mime_type?: string; file_size?: number;
        issue_date_gregorian?: string; expiry_date_gregorian?: string;
    }): Promise<any> {
        const response = await apiClient.post<any>(`/client-management/${clientId}/client-documents`, payload);
        return response.data;
    }

    /** تعيين ملف موجود مسبقاً من درايف المكتب لملف العميل (لا حارس مجلد). */
    static async assignClientDocument(clientId: number | string, payload: {
        doc_type: string; cloud_file_id: string; file_name: string;
        title?: string; document_number?: string; mime_type?: string; file_size?: number;
    }): Promise<any> {
        const response = await apiClient.post<any>(`/client-management/${clientId}/client-documents/assign`, payload);
        return response.data;
    }

    /** رابط تنزيل مؤقت لمستند العميل. */
    static async downloadClientDocument(clientId: number | string, docId: number | string): Promise<string> {
        const response = await apiClient.get<any>(`/client-management/${clientId}/client-documents/${docId}/download`);
        const url = response.data?.url;
        if (!url) throw new Error('تعذّر الحصول على رابط التنزيل');
        return url;
    }

    static async deleteClientDocument(clientId: number | string, docId: number | string): Promise<void> {
        await apiClient.delete<any>(`/client-management/${clientId}/client-documents/${docId}`);
    }
}

/** تصنيفات مستندات العميل الثابتة (تطابق ClientDocument::DOC_TYPES في الباك). */
export const CLIENT_DOC_TYPES: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'national_id', label: 'الهوية الوطنية' },
    { value: 'commercial_registration', label: 'السجل التجاري' },
    { value: 'contract', label: 'عقد' },
    { value: 'power_of_attorney', label: 'وكالة / توكيل' },
    { value: 'other', label: 'أخرى' },
];

export const clientDocTypeLabel = (t: string): string =>
    CLIENT_DOC_TYPES.find((x) => x.value === t)?.label ?? t;

export default ClientManagementService;
