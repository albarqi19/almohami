import { apiClient, API_BASE_URL } from '../utils/api';

export type LetterStatus = 'draft' | 'sent' | 'printed' | 'cancelled';
export type RecipientType = 'client' | 'external';
export type DeliveryMethod = 'whatsapp' | 'email' | 'both' | 'print';

/** أنواع المستند المتاحة للصادر الحرّ (مصدرها OutgoingCorrespondence::LETTER_DOC_TYPES). */
export const LETTER_DOC_TYPES: { value: string; label: string }[] = [
  { value: 'letter', label: 'خطاب' },
  { value: 'notice', label: 'إنذار' },
  { value: 'announcement', label: 'إشعار' },
  { value: 'memo', label: 'مذكرة عامة' },
  { value: 'general', label: 'مستند عام' },
];

export const DELIVERY_METHODS: { value: DeliveryMethod; label: string; hint: string; needsPhone: boolean; needsEmail: boolean }[] = [
  { value: 'whatsapp', label: 'واتساب', hint: 'يحتاج رقم جوال', needsPhone: true, needsEmail: false },
  { value: 'email', label: 'بريد إلكتروني', hint: 'يحتاج إيميل', needsPhone: false, needsEmail: true },
  { value: 'both', label: 'واتساب + إيميل', hint: 'يحتاج جوال وإيميل', needsPhone: true, needsEmail: true },
  { value: 'print', label: 'طباعة دون إرسال', hint: 'يُسجَّل صادراً مرقّماً دون إرسال', needsPhone: false, needsEmail: false },
];

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  draft: 'مسودة',
  sent: 'مُرسَل',
  printed: 'طباعة (دون إرسال)',
  cancelled: 'ملغى',
};

export interface OutgoingLetter {
  id: number;
  document_type: string;
  type_label?: string;
  letterhead_id: number | null;
  template_id: number | null;
  case_id: number | null;
  client_id: number | null;
  title: string;
  body: string | null;
  accent_color: string | null;
  recipient_type: RecipientType | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  delivery_method: DeliveryMethod | null;
  status: LetterStatus;
  outgoing_number: string | null;
  sent_at: string | null;
  client?: { id: number; name: string; phone?: string; email?: string };
  case?: { id: number; title: string; file_number: string };
  correspondence?: { id: number; number: string; status: string };
}

export interface OutgoingLetterTemplate {
  id: number;
  name: string;
  document_type: string;
  title: string | null;
  body: string | null;
  letterhead_id: number | null;
  accent_color: string | null;
  is_active: boolean;
  is_default: boolean;
}

export interface OutgoingLetterInput {
  document_type: string;
  title: string;
  body?: string | null;
  letterhead_id?: number | null;
  template_id?: number | null;
  case_id?: number | null;
  client_id?: number | null;
  accent_color?: string | null;
  recipient_type?: RecipientType | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  delivery_method?: DeliveryMethod | null;
}

/** مرفق عابر: الملف + وصف يكتبه المستخدم (يظهر في فهرس المرفقات بدل اسم الملف التقني). */
export interface LetterAttachment { file: File; label?: string }

interface ListResponse<T> { success: boolean; data: T[]; meta?: { total: number; last_page: number; current_page: number; per_page: number } }
interface ItemResponse { success: boolean; message?: string; data: OutgoingLetter }
interface SendResponse { success: boolean; message: string; number?: string; code?: string; channels?: Record<string, string> }

export const outgoingLetterService = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<ListResponse<OutgoingLetter>>(`/outgoing-letters${toQuery(params)}`),

  get: (id: number) => apiClient.get<ItemResponse>(`/outgoing-letters/${id}`),

  create: (data: OutgoingLetterInput) => apiClient.post<ItemResponse>('/outgoing-letters', data),

  update: (id: number, data: Partial<OutgoingLetterInput>) => apiClient.put<ItemResponse>(`/outgoing-letters/${id}`, data),

  remove: (id: number) => apiClient.delete<{ success: boolean; message: string }>(`/outgoing-letters/${id}`),

  /** إصدار: إرسال (واتساب/إيميل) أو طباعة دون إرسال — مع مرفقات عابرة وأوصافها. */
  send: (id: number, deliveryMethod?: DeliveryMethod, attachments?: LetterAttachment[]) => {
    const fd = new FormData();
    if (deliveryMethod) fd.append('delivery_method', deliveryMethod);
    appendAttachments(fd, attachments);
    return apiClient.post<SendResponse>(`/outgoing-letters/${id}/send`, fd);
  },

  setStatus: (id: number, status: LetterStatus) =>
    apiClient.post<ItemResponse>(`/outgoing-letters/${id}/status`, { status }),

  /** معاينة PDF (تدمج المرفقات المرفوعة وأوصافها) — يُعيد رابط blob للعرض داخل الصفحة (iframe). */
  async previewBlobUrl(id: number, attachments?: LetterAttachment[]): Promise<string> {
    const fd = new FormData();
    appendAttachments(fd, attachments);
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE_URL}/outgoing-letters/${id}/preview`, {
      method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
    });
    if (!res.ok) throw new Error('تعذّر توليد المعاينة');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // ===== القوالب =====
  templates: {
    list: () => apiClient.get<{ success: boolean; data: OutgoingLetterTemplate[] }>('/outgoing-letter-templates'),
    create: (data: Partial<OutgoingLetterTemplate>) => apiClient.post('/outgoing-letter-templates', data),
    update: (id: number, data: Partial<OutgoingLetterTemplate>) => apiClient.put(`/outgoing-letter-templates/${id}`, data),
    remove: (id: number) => apiClient.delete(`/outgoing-letter-templates/${id}`),
    setDefault: (id: number) => apiClient.post(`/outgoing-letter-templates/${id}/set-default`),
    duplicate: (id: number) => apiClient.post(`/outgoing-letter-templates/${id}/duplicate`),
    async openPreview(id: number): Promise<void> {
      return getPdfBlob(`${API_BASE_URL}/outgoing-letter-templates/${id}/preview`);
    },
  },
};

/** يلحق الملفات وأوصافها بالتوازي (attachments[] + attachment_labels[]) بنفس الترتيب. */
function appendAttachments(fd: FormData, attachments?: LetterAttachment[]): void {
  (attachments ?? []).forEach((a) => {
    fd.append('attachments[]', a.file);
    fd.append('attachment_labels[]', (a.label ?? '').trim() || a.file.name);
  });
}

function toQuery(params?: Record<string, string | number>): string {
  if (!params) return '';
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

async function getPdfBlob(url: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('تعذّر توليد المعاينة');
  await openBlob(res);
}

async function openBlob(res: Response): Promise<void> {
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
