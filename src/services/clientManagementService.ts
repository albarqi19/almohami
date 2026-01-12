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
}

export interface PotentialClient {
    party_id: number;
    name: string;
    national_id: string;
    side: 'plaintiff' | 'defendant';
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

// Client Management Service
export class ClientManagementService {
    /**
     * Get list of clients
     */
    static async getClients(params?: {
        search?: string;
        without_phone?: boolean;
        per_page?: number;
        page?: number;
    }): Promise<any> {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.without_phone) searchParams.append('without_phone', '1');
        if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
        if (params?.page) searchParams.append('page', params.page.toString());

        const query = searchParams.toString();
        const response = await apiClient.get<any>(`/client-management${query ? `?${query}` : ''}`);
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
     * Update client data (rating, classification, notes)
     */
    static async updateClient(clientId: number | string, data: {
        rating?: number;
        classification?: 'vip' | 'regular' | 'one_time';
        internal_notes?: string;
        name?: string;
        phone?: string;
    }): Promise<Client> {
        const response = await apiClient.patch<any>(`/client-management/${clientId}`, data);
        return response.data;
    }
}

export default ClientManagementService;
