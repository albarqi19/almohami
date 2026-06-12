import { apiClient } from '../utils/api';

// Types
export interface Client {
    id: number;
    name: string;
    national_id: string | null;
    phone: string | null;
    email: string | null;
    role: 'client';
    is_active: boolean;
    assigned_cases_count?: number;
    created_at: string;

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

// Client Management Service
export class ClientManagementService {
    /**
     * Get list of clients
     */
    static async getClients(params?: {
        search?: string;
        without_phone?: boolean;
        preset?: 'with_cases' | 'vip';
        sort_by?: 'name' | 'created_at' | 'cases_count' | 'entity_type' | 'phone';
        sort_order?: 'asc' | 'desc';
        per_page?: number;
        page?: number;
    }): Promise<any> {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
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
        withoutPhone: number;
        withCases: number;
        vip: number;
        companies: number;
        individuals: number;
    }> {
        const response = await apiClient.get<any>('/client-management/stats');
        return response.data;
    }

    /**
     * Create a brand-new client (individual / company / organization)
     */
    static async createClient(payload: {
        name: string;
        national_id: string;
        email?: string;
        phone?: string;
        entity_type?: 'individual' | 'company' | 'organization';
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
}

export default ClientManagementService;
