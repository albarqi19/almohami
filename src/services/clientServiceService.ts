import { apiClient } from '../utils/api';

/**
 * الخدماتُ القانونية في بوابة العميل — مرآةُ `ClientServicePresenter` في الباك.
 * لا ملاحظات داخلية ولا أسعار ولا مخاطر؛ ما ليس هنا لا يصل العميل.
 */
export type ServiceGroup = 'all' | 'active' | 'closed';

export interface ClientServiceType { key: string; label: string }

export interface ClientService {
  id: number;
  service_number: string | null;
  title: string;
  service_type: string;
  service_type_label: string;
  status: string;
  status_label: string;
  is_closed: boolean;
  priority: string | null;
  description: string | null;
  assigned_lawyer: { id: number; name: string } | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  source: string | null;
  requested_by_client: boolean;
  case: { id: number; title: string; file_number?: string | null } | null;
  documents_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientServiceDocument {
  id: number;
  title: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  cloud_file_id: string | null;
  is_cloud: boolean;
  relation_type: string;
  created_at: string | null;
}

export interface ClientServiceTimelineItem { id: number; type: string; title: string; date: string | null }

export interface ClientServiceDetail extends ClientService {
  timeline: ClientServiceTimelineItem[];
  documents: ClientServiceDocument[];
}

export interface ClientServicesPage {
  rows: ClientService[];
  total: number;
  page: number;
  lastPage: number;
  counts: Record<ServiceGroup, number>;
}

export interface ServiceRequestInput {
  service_type: string;
  title: string;
  description: string;
}

interface ListResponse {
  success: boolean;
  message?: string;
  data: { data: ClientService[]; total: number; current_page: number; last_page: number };
  counts: Record<ServiceGroup, number>;
}

interface DetailResponse { success: boolean; message?: string; data: ClientServiceDetail }
interface TypesResponse { success: boolean; message?: string; data: ClientServiceType[] }

export const RELATION_LABELS: Record<string, string> = {
  attachment: 'مرفق',
  deliverable: 'مخرَج نهائي',
  client_upload: 'رفعتَه أنت',
};

export const ClientServiceService = {
  async types(): Promise<ClientServiceType[]> {
    const res = await apiClient.get<TypesResponse>('/client/services/types');
    if (!res.success) throw new Error(res.message || 'تعذّر جلب أنواع الخدمات');
    return res.data;
  },

  async list(params: { group?: ServiceGroup; serviceType?: string; page?: number; perPage?: number } = {}): Promise<ClientServicesPage> {
    const qs = new URLSearchParams();
    if (params.group && params.group !== 'all') qs.set('group', params.group);
    if (params.serviceType) qs.set('service_type', params.serviceType);
    qs.set('page', String(params.page ?? 1));
    qs.set('per_page', String(params.perPage ?? 20));
    const res = await apiClient.get<ListResponse>(`/client/services?${qs.toString()}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الخدمات');
    return {
      rows: res.data.data,
      total: res.data.total,
      page: res.data.current_page,
      lastPage: res.data.last_page,
      counts: res.counts,
    };
  },

  async show(id: number | string): Promise<ClientServiceDetail> {
    const res = await apiClient.get<DetailResponse>(`/client/services/${id}`);
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الخدمة');
    return res.data;
  },

  async request(input: ServiceRequestInput): Promise<ClientServiceDetail> {
    const res = await apiClient.post<DetailResponse>('/client/services', input);
    if (!res.success) throw new Error(res.message || 'تعذّر إرسال الطلب');
    return res.data;
  },
};

const GREGORIAN = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' });

/** YYYY-MM-DD أو ISO ⇒ تاريخ ميلادي مقروء. */
export function formatServiceDate(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return GREGORIAN.format(d);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
