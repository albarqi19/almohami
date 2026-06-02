import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/Modal';
import {
  MessageSquare,
  Save,
  RefreshCw,
  Send,
  Clock,
  Bell,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  BarChart2,
  X,
  Check,
  Loader2,
  Info
} from 'lucide-react';
import '../styles/whatsapp-settings.css';

// ── Types ──

interface WhatsappSettingsData {
  id?: number;
  webhook_url?: string;
  access_token?: string;
  verify_token?: string;
  phone_number_id?: string;
  notifications_enabled: boolean;
  notification_settings: Record<string, any>;
  message_templates: Record<string, any>;
  daily_report_time: string;
  daily_report_enabled: boolean;
  working_hours: Record<string, any>;
}

interface WhatsappInstance {
  id: string;
  instance_name: string;
  phone_number?: string;
  status: 'disconnected' | 'connecting' | 'connected';
  qr_code?: string;
  token: string;
  department: string;
  created_at: string;
}

interface WhatsappMessage {
  id: number;
  to_phone: string;
  from_phone?: string;
  message_content: string;
  message_type: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'resent';
  event_type?: string;
  case_id?: number;
  user_id?: number;
  case?: { id: number; title: string; file_number: string };
  user?: { id: number; name: string };
  metadata?: Record<string, any>;
  created_at: string;
}

interface MessageFilters {
  status: string;
  direction: string;
  search: string;
  page: number;
}

// ── API Helper ──

const API_BASE_URL = 'https://api.alraedlaw.com/api';

const api = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' }
    });
    return { data: await response.json() };
  },
  put: async (url: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
      body: JSON.stringify(data)
    });
    return { data: await response.json() };
  },
  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
      body: data ? JSON.stringify(data) : undefined
    });
    return { data: await response.json() };
  },
  delete: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' }
    });
    return { data: await response.json() };
  }
};

// ── Helper Functions ──

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الإرسال', color: '#f59e0b', bg: '#fef3c7' },
  sent: { label: 'تم الإرسال', color: '#3b82f6', bg: '#dbeafe' },
  delivered: { label: 'تم التوصيل', color: '#10b981', bg: '#d1fae5' },
  read: { label: 'تمت القراءة', color: '#059669', bg: '#a7f3d0' },
  failed: { label: 'فشل', color: '#ef4444', bg: '#fee2e2' },
  resent: { label: 'أعيد الإرسال', color: '#8b5cf6', bg: '#ede9fe' },
};

const EVENT_LABELS: Record<string, string> = {
  case_created: 'قضية جديدة',
  case_updated: 'تحديث قضية',
  case_procedure: 'إجراء قضية',
  hearing_reminder: 'تذكير جلسة',
  welcome_message: 'ترحيب',
  login_notification: 'تسجيل دخول',
  task_assigned: 'مهمة جديدة',
  daily_report: 'تقرير يومي',
  new_document_uploaded: 'وثيقة جديدة',
};

const NOTIFICATION_TITLES: Record<string, string> = {
  case_created: 'إشعار قضية جديدة',
  case_updated: 'تحديث القضية',
  case_procedure: 'إجراء على القضية',
  hearing_reminder: 'تذكير بجلسة محكمة',
  document_request: 'طلب وثائق',
  payment_reminder: 'تذكير بالدفع',
  lawyer_assigned: 'تعيين محامي',
  new_document_uploaded: 'رفع وثيقة جديدة',
  login_notification: 'إشعار تسجيل الدخول',
  task_assigned: 'مهمة جديدة',
  task_due_reminder: 'تذكير بمهمة',
  task_overdue: 'مهمة متأخرة',
};

const NOTIFICATION_DESCS: Record<string, string> = {
  case_created: 'إشعار العميل عند إنشاء قضية جديدة',
  case_updated: 'إشعار العميل عند تحديث حالة القضية',
  case_procedure: 'إشعار العميل عند إضافة إجراء على القضية',
  hearing_reminder: 'تذكير العميل بمواعيد الجلسات',
  document_request: 'طلب وثائق من العميل',
  payment_reminder: 'تذكير العميل بالمستحقات المالية',
  lawyer_assigned: 'إشعار العميل عند تعيين محامي للقضية',
  new_document_uploaded: 'إشعار المحامي عند رفع وثيقة جديدة',
  login_notification: 'إشعار المحامي عند تسجيل الدخول',
  task_assigned: 'إشعار المحامي عند تعيين مهمة',
  task_due_reminder: 'تذكير بمهمة قريبة الانتهاء',
  task_overdue: 'تحذير بمهمة متأخرة',
};

const DAY_NAMES: Record<string, string> = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت'
};

const NOTIFICATION_GROUPS = [
  {
    title: 'شؤون القضايا والعملاء',
    desc: 'التنبيهات التلقائية المرسلة للعملاء بخصوص تحديثات قضاياهم والمواعيد',
    keys: ['welcome_message', 'case_created', 'case_updated', 'case_procedure', 'hearing_reminder']
  },
  {
    title: 'المدفوعات والمستندات',
    desc: 'تنبيهات طلب الوثائق من العميل أو تذكيره بسداد الدفعات المالية المستحقة',
    keys: ['payment_reminder', 'document_request', 'new_document_uploaded']
  },
  {
    title: 'مهام ومتابعة المحامين',
    desc: 'التنبيهات الإدارية الصادرة لفريق العمل والوكلاء داخل النظام لتنسيق المهام',
    keys: ['lawyer_assigned', 'login_notification', 'task_assigned', 'task_due_reminder', 'task_overdue']
  }
];

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatPhone = (p: string) => {
  if (!p) return '';
  const clean = p.replace(/\D/g, '');
  if (clean.startsWith('966') && clean.length === 12) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return p;
};

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  welcome_message: ['{client_name}'],
  case_created: ['{client_name}', '{case_number}', '{case_title}'],
  case_updated: ['{client_name}', '{case_number}', '{case_title}'],
  case_procedure: ['{client_name}', '{case_number}', '{case_title}', '{procedure_title}'],
  hearing_reminder: ['{client_name}', '{case_number}', '{case_title}', '{hearing_date}', '{hearing_time}', '{hearing_court}'],
  payment_reminder: ['{client_name}', '{payment_amount}', '{due_date}'],
  document_request: ['{client_name}', '{case_number}', '{case_title}'],
  new_document_uploaded: ['{lawyer_name}', '{case_number}', '{case_title}'],
  lawyer_assigned: ['{client_name}', '{case_number}', '{case_title}', '{lawyer_name}'],
  login_notification: ['{lawyer_name}'],
  task_assigned: ['{lawyer_name}', '{task_title}', '{due_date}'],
  task_due_reminder: ['{lawyer_name}', '{task_title}', '{due_date}'],
  task_overdue: ['{lawyer_name}', '{task_title}', '{due_date}'],
};

const replaceTemplatePlaceholders = (text: string) => {
  if (!text) return '';
  return text
    .replace(/{client_name}/g, 'أحمد العتيبي')
    .replace(/{case_title}/g, 'طلب التعويض عن الأضرار العقدية')
    .replace(/{case_number}/g, '431205697')
    .replace(/{hearing_date}/g, '2026-06-15')
    .replace(/{hearing_time}/g, '09:30 ص')
    .replace(/{hearing_court}/g, 'المحكمة العامة بالرياض')
    .replace(/{procedure_title}/g, 'تقديم لائحة اعتراضية')
    .replace(/{payment_amount}/g, '15,000 ر.س')
    .replace(/{due_date}/g, '2026-07-01')
    .replace(/{task_title}/g, 'مراجعة مذكرة الدفاع الأولى')
    .replace(/{lawyer_name}/g, 'المحامي عبد العزيز الشهري');
};

// ── Main Component ──


const WhatsappSettings: React.FC = () => {
  const [settings, setSettings] = useState<WhatsappSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('instances');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Instances
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, sent_ok: 0, failed: 0 });
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [newInstanceDepartment, setNewInstanceDepartment] = useState('');
  const [selectedQRCode, setSelectedQRCode] = useState<string | null>(null);

  // Messages Log
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPagination, setMessagesPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState<MessageFilters>({ status: '', direction: '', search: '', page: 1 });
  const [resending, setResending] = useState<number | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);

  // Send Message
  const [sendForm, setSendForm] = useState({ phone: '', message: '', client_id: '', case_id: '' });
  const [sending, setSending] = useState(false);
  const [clients, setClients] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const [sendMode, setSendMode] = useState<'client' | 'direct'>('client');
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [clientCases, setClientCases] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState<boolean>(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [selectedNotificationKey, setSelectedNotificationKey] = useState<string>('case_created');
  const [selectedLogMsg, setSelectedLogMsg] = useState<WhatsappMessage | null>(null);

  // Clear selected log message when tab changes
  useEffect(() => {
    setSelectedLogMsg(null);
  }, [activeTab]);

  const loadClientCases = async (clientId: number) => {
    setCasesLoading(true);
    setClientCases([]);
    try {
      const response = await api.get(`/v1/client-management/${clientId}/cases`);
      if (response.data.success && response.data.data) {
        const list = response.data.data.data || response.data.data || [];
        setClientCases(list);
      }
    } catch (e) {
      console.error("Failed to load client cases", e);
    } finally {
      setCasesLoading(false);
    }
  };

  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    if (!settings || !templateKey) return;
    const templateObj = settings.message_templates[templateKey];
    if (!templateObj) return;

    let text = templateObj.template || '';
    
    // Replace variables if client and case are selected
    if (selectedClient) {
      text = text.replace(/{client_name}/g, selectedClient.name);
    }
    
    if (selectedCaseId && clientCases.length > 0) {
      const selectedCase = clientCases.find(c => String(c.id) === selectedCaseId);
      if (selectedCase) {
        const title = selectedCase.title || selectedCase.case_title || '';
        const fileNum = selectedCase.file_number || selectedCase.case_number || '';
        text = text.replace(/{case_title}/g, title);
        text = text.replace(/{case_number}/g, fileNum);
      }
    }
    
    setSendForm(prev => ({ ...prev, message: text }));
  };

  const insertPlaceholder = (templateKey: string, placeholder: string) => {
    const textarea = document.getElementById(`textarea-${templateKey}`) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    updateMessageTemplate(templateKey, 'template', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);
  };

  const getPreviewText = () => {
    let text = sendForm.message;
    if (selectedClient) {
      text = text.replace(/{client_name}/g, selectedClient.name);
    } else {
      text = text.replace(/{client_name}/g, 'اسم العميل');
    }
    
    if (selectedCaseId && clientCases.length > 0) {
      const selectedCase = clientCases.find(c => String(c.id) === selectedCaseId);
      if (selectedCase) {
        const title = selectedCase.title || selectedCase.case_title || '';
        const fileNum = selectedCase.file_number || selectedCase.case_number || '';
        text = text.replace(/{case_title}/g, title);
        text = text.replace(/{case_number}/g, fileNum);
      }
    } else {
      text = text.replace(/{case_title}/g, 'موضوع القضية');
      text = text.replace(/{case_number}/g, 'رقم القضية');
    }
    return text;
  };

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Custom Metadata for Connected Channel
  const [customMetadata, setCustomMetadata] = useState<Record<string, { channelName?: string; adminName?: string; connectionType?: string; usageNotes?: string }>>({});
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [tempMeta, setTempMeta] = useState<{ channelName?: string; adminName?: string; connectionType?: string; usageNotes?: string }>({});

  // Load custom metadata from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whatsapp_instances_custom_metadata');
      if (saved) {
        setCustomMetadata(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load custom metadata', e);
    }
  }, []);

  const startEditing = (instanceId: string, meta: { channelName?: string; adminName?: string; connectionType?: string; usageNotes?: string }) => {
    setEditingInstanceId(instanceId);
    setTempMeta({
      channelName: meta.channelName ?? 'قناة الإشعارات الرسمية',
      adminName: meta.adminName ?? '',
      connectionType: meta.connectionType ?? 'ربط رقم مباشر',
      usageNotes: meta.usageNotes ?? '',
    });
  };

  const saveChanges = (instanceId: string) => {
    const updated = {
      ...customMetadata,
      [instanceId]: tempMeta
    };
    setCustomMetadata(updated);
    localStorage.setItem('whatsapp_instances_custom_metadata', JSON.stringify(updated));
    setEditingInstanceId(null);
    showToast('تم حفظ تفاصيل القناة بنجاح');
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const testConnection = async (instanceId: string) => {
    setTestingConnection(instanceId);
    try {
      const response = await api.get(`/v1/whatsapp/instances/${instanceId}/status`);
      if (response.data.success && response.data.data?.status === 'connected') {
        showToast('الاتصال نشط ومستقر');
        setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'connected', phone_number: response.data.data.phone_number } : i));
      } else {
        showToast('الاتصال غير نشط، يرجى ربطه مجدداً', 'error');
        setInstances(prev => prev.map(i => i.id === instanceId ? { ...i, status: 'disconnected' } : i));
      }
    } catch {
      showToast('فشل في فحص اتصال الرقم', 'error');
    } finally {
      setTestingConnection(null);
    }
  };

  // ── Load Settings ──

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/v1/whatsapp/settings');
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setSettings(data);
        const tKeys = Object.keys(data.message_templates || {});
        if (tKeys.length > 0) {
          setSelectedTemplateKey(prev => prev || tKeys[0]);
        }
        const nKeys = Object.keys(data.notification_settings || {});
        if (nKeys.length > 0) {
          setSelectedNotificationKey(prev => prev || nKeys[0]);
        }
      } else {
        setSettings({
          notifications_enabled: true, daily_report_enabled: false, daily_report_time: '09:00',
          notification_settings: {}, message_templates: {}, working_hours: {}
        });
      }
    } catch {
      setSettings({
        notifications_enabled: true, daily_report_enabled: false, daily_report_time: '09:00',
        notification_settings: {}, message_templates: {}, working_hours: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await api.put('/v1/whatsapp/settings', settings);
      if (response.data.success) {
        setSettings(response.data.data);
        showToast('تم حفظ الإعدادات بنجاح');
      }
    } catch { showToast('فشل في حفظ الإعدادات', 'error'); }
    finally { setSaving(false); }
  };

  const resetToDefaults = async () => {
    setSaving(true);
    try {
      const response = await api.post('/v1/whatsapp/reset-defaults');
      if (response.data.success) { setSettings(response.data.data); showToast('تم إعادة التعيين'); }
    } catch { showToast('فشل في إعادة التعيين', 'error'); }
    finally { setSaving(false); }
  };

  // ── Settings Updaters ──

  const updateNotificationSetting = (key: string, field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_settings: { ...settings.notification_settings, [key]: { ...settings.notification_settings[key], [field]: value } }
    });
  };

  const updateMessageTemplate = (key: string, field: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      message_templates: { ...settings.message_templates, [key]: { ...settings.message_templates[key], [field]: value } }
    });
  };

  const updateWorkingHour = (day: string, field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      working_hours: { ...settings.working_hours, [day]: { ...settings.working_hours[day], [field]: value } }
    });
  };

  // ── Instances ──

  const loadInstances = async () => {
    try {
      const response = await api.get('/v1/whatsapp/instances');
      if (response.data.success && response.data.data) {
        setInstances(response.data.data.map((inst: any) => ({
          id: String(inst.id), instance_name: inst.instance_name, phone_number: inst.phone_number,
          status: inst.status || 'disconnected', token: inst.token, department: inst.department, created_at: inst.created_at
        })));
        if (response.data.today_stats) setTodayStats(response.data.today_stats);
      } else { setInstances([]); }
    } catch { setInstances([]); }
  };

  const createInstance = async () => {
    if (!newInstanceDepartment.trim()) return;
    try {
      const response = await api.post('/v1/whatsapp/instances', { instance_name: newInstanceDepartment, department: newInstanceDepartment });
      if (response.data.success && response.data.data) {
        const result = response.data.data;
        const newInst: WhatsappInstance = {
          id: String(result.id), instance_name: result.instance_name, status: result.status || 'connecting',
          token: result.token, department: result.department, created_at: result.created_at
        };
        setInstances(prev => [...prev, newInst]);
        setNewInstanceDepartment(''); setShowAddInstance(false);
        if (result.qr_code) { setSelectedQRCode(result.qr_code); }
        else { setTimeout(() => getQRCode(String(result.id)), 2000); }

        const checkStatus = setInterval(async () => {
          try {
            const sr = await api.get(`/v1/whatsapp/instances/${result.id}/status`);
            if (sr.data.success && sr.data.data?.status === 'connected') {
              setInstances(prev => prev.map(i => i.id === String(result.id) ? { ...i, status: 'connected', phone_number: sr.data.data.phone_number } : i));
              setSelectedQRCode(null); clearInterval(checkStatus);
              showToast('تم ربط الواتساب بنجاح');
            }
          } catch {}
        }, 3000);
        setTimeout(() => clearInterval(checkStatus), 90000);
      } else { throw new Error(response.data.message); }
    } catch (e: any) { showToast(e.message || 'فشل في إنشاء الرقم', 'error'); }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرقم؟')) return;
    try {
      const response = await api.delete(`/v1/whatsapp/instances/${id}`);
      if (response.data.success) { setInstances(prev => prev.filter(i => i.id !== id)); showToast('تم الحذف'); }
    } catch { showToast('فشل في الحذف', 'error'); }
  };

  const getQRCode = async (instanceId: string) => {
    try {
      const response = await api.get(`/v1/whatsapp/instances/${instanceId}/qr`);
      if (response.data.success && response.data.data) {
        const qr = response.data.data.qr_code || response.data.data.qrcode || response.data.data.base64;
        if (qr) {
          if (qr.startsWith('data:image') || qr.startsWith('http')) setSelectedQRCode(qr);
          else setSelectedQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
        }
      }
    } catch { showToast('فشل في جلب QR Code', 'error'); }
  };

  useEffect(() => { if (activeTab === 'instances') loadInstances(); }, [activeTab]);

  // ── Messages Log ──

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      let url = `/v1/whatsapp/messages?per_page=15&page=${filters.page}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.direction) url += `&direction=${filters.direction}`;
      if (filters.search) url += `&search=${filters.search}`;
      const response = await api.get(url);
      if (response.data.success) {
        setMessages(response.data.data.data || []);
        setMessagesPagination({
          current_page: response.data.data.current_page || 1,
          last_page: response.data.data.last_page || 1,
          total: response.data.data.total || 0
        });
      }
    } catch {}
    finally { setMessagesLoading(false); }
  }, [filters]);

  useEffect(() => { if (activeTab === 'log') loadMessages(); }, [activeTab, loadMessages]);

  const resendMessage = async (id: number) => {
    setResending(id);
    try {
      const response = await api.post(`/v1/whatsapp/messages/${id}/resend`);
      if (response.data.success) {
        showToast('تم إعادة الإرسال بنجاح');
        loadMessages();
      } else { showToast(response.data.message || 'فشل في إعادة الإرسال', 'error'); }
    } catch { showToast('فشل في إعادة الإرسال', 'error'); }
    finally { setResending(null); }
  };

  // ── Send Message ──

  const loadClients = useCallback(async () => {
    if (!clientSearch || clientSearch.length < 2) { setClients([]); return; }
    try {
      const response = await api.get(`/v1/client-management?search=${encodeURIComponent(clientSearch)}&per_page=10`);
      if (response.data.success) {
        const list = response.data.data?.data || response.data.data || [];
        setClients(list.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone || '' })));
        setShowClientDropdown(true);
      }
    } catch { setClients([]); }
  }, [clientSearch]);

  useEffect(() => { const t = setTimeout(loadClients, 300); return () => clearTimeout(t); }, [loadClients]);

  const sendDirectMessage = async () => {
    if (!sendForm.phone || !sendForm.message) return;
    setSending(true);
    try {
      const response = await api.post('/v1/whatsapp/send', {
        phone: sendForm.phone,
        message: sendForm.message,
        client_id: sendForm.client_id || undefined,
        case_id: sendForm.case_id || undefined,
      });
      if (response.data.success) {
        showToast('تم إرسال الرسالة بنجاح');
        setSendForm({ phone: '', message: '', client_id: '', case_id: '' });
        setClientSearch('');
        setSelectedClient(null);
        setSelectedCaseId('');
        setSelectedTemplateKey('');
        setClientCases([]);
      } else { showToast(response.data.message || 'فشل في الإرسال', 'error'); }
    } catch { showToast('فشل في الإرسال', 'error'); }
    finally { setSending(false); }
  };

  // ── Stats ──

  const loadStats = async () => {
    try {
      const response = await api.get('/v1/whatsapp/stats');
      if (response.data.success) setStats(response.data.data);
    } catch {}
  };

  useEffect(() => { if (activeTab === 'log') loadStats(); }, [activeTab]);

  // Click outside dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Render ──

  if (loading) {
    return (
      <div className="whatsapp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="wa-spin" style={{ color: 'var(--status-green)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>جارٍ تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="whatsapp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: '#ef4444', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>فشل في تحميل الإعدادات</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'instances',
      name: 'الاتصال',
      icon: Smartphone,
      badge: instances.length > 0 ? (instances.some(i => i.status === 'connected') ? 'نشط' : 'معطل') : '0'
    },
    { id: 'send', name: 'إرسال رسالة', icon: Send },
    {
      id: 'log',
      name: 'سجل الرسائل',
      icon: History,
      badge: todayStats.total > 0 ? `${todayStats.sent_ok}/${todayStats.total}` : undefined
    },
    {
      id: 'notifications',
      name: 'التنبيهات',
      icon: Bell,
      badge: settings ? Object.values(settings.notification_settings || {}).filter((n: any) => n.enabled).length : 0
    },
    {
      id: 'templates',
      name: 'القوالب',
      icon: FileText,
      badge: settings ? Object.keys(settings.message_templates || {}).length : 0
    },
    { id: 'schedule', name: 'ساعات العمل', icon: Clock },
  ];

  return (
    <div className="whatsapp-page" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`wa-toast wa-toast--${toast.type}`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="whatsapp-header">
        <div className="whatsapp-header__title-area">
          <h1><MessageSquare size={18} /> بوابة الواتساب</h1>
          <p>إرسال الرسائل وإدارة التنبيهات والاتصال</p>
        </div>
        <div className="whatsapp-header__actions">
          <button className="whatsapp-header__btn" onClick={resetToDefaults} disabled={saving}><RefreshCw size={16} />إعادة التعيين</button>
          <button className="whatsapp-header__btn whatsapp-header__btn--primary" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 size={16} className="wa-spin" /> : <Save size={16} />}حفظ الإعدادات
          </button>
        </div>
      </div>

      {/* Split Navigation Layout */}
      <div className="whatsapp-layout">
        {/* Right Sidebar navigation */}
        <aside className="whatsapp-sidebar">
          <div className="whatsapp-sidebar__menu">
            <div className="whatsapp-sidebar__title">الخيارات والبوابة</div>
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`whatsapp-sidebar-tab ${activeTab === tab.id ? 'whatsapp-sidebar-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="whatsapp-sidebar-label">
                  <tab.icon size={15} />
                  <span>{tab.name}</span>
                </span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span className="whatsapp-sidebar-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Left Content Area */}
        <main className="whatsapp-main">
          <div className="whatsapp-main-container">

            {/* ═══════════ TAB: Instances ═══════════ */}
            {activeTab === 'instances' && (
              <div className="wa-tab-content">
                {instances.length === 0 ? (
                  <div className="wa-empty-state">
                    <Smartphone size={48} className="wa-empty-state__icon" />
                    <h3 className="wa-empty-state__title">لا يوجد رقم واتساب متصل حالياً</h3>
                    <p className="wa-empty-state__desc">
                      قم بربط رقم الواتساب الخاص بالمنشأة القانونية لتتمكن من إرسال الإشعارات التلقائية وتذكيرات الجلسات والمدفوعات للعملاء فورياً.
                    </p>
                    <button className="fin-btn fin-btn--primary" style={{ marginTop: 16 }} onClick={() => setShowAddInstance(true)}>
                      <Plus size={14} /> ربط رقم واتساب جديد
                    </button>
                  </div>
                ) : (
                  instances.map(instance => {
                    const isConnected = instance.status === 'connected';
                    const isConnecting = instance.status === 'connecting';
                    return (
                      <div key={instance.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
                        {/* Connection Profile & Health Details */}
                        <div className="wa-card">
                          <div className="wa-card__header">
                            <div className="wa-card__header-title">
                              <MessageSquare size={16} />
                              <span>قناة الاتصال الرسمية</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className={`wa-status-tag wa-status-tag--${instance.status}`}>
                                <span className="wa-status-tag__dot" />
                                {isConnected ? 'متصل ونشط' : isConnecting ? 'جاري الربط...' : 'غير متصل'}
                              </span>

                              {editingInstanceId === instance.id ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="fin-btn fin-btn--primary fin-btn--xs" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => saveChanges(instance.id)}>حفظ</button>
                                  <button className="fin-btn fin-btn--ghost fin-btn--xs" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditingInstanceId(null)}>إلغاء</button>
                                </div>
                              ) : (
                                <button className="fin-btn fin-btn--ghost fin-btn--xs" style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => startEditing(instance.id, customMetadata[instance.id] || {})}>
                                  <FileText size={11} />
                                  <span>تعديل التفاصيل</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="wa-card__body">
                            <div className="wa-profile-row">
                              <div className={`wa-profile-avatar wa-profile-avatar--${instance.status}`}>
                                <Smartphone size={24} />
                              </div>
                              <div className="wa-profile-details">
                                <h2 className="wa-profile-name">{(customMetadata[instance.id] || {}).channelName || instance.department || 'الرقم الرسمي'}</h2>
                                {instance.phone_number ? (
                                  <span className="wa-profile-phone" dir="ltr">{formatPhone(instance.phone_number)}</span>
                                ) : (
                                  <span className="wa-profile-phone-placeholder">قيد انتظار مسح رمز QR للربط</span>
                                )}
                              </div>
                            </div>

                            <div className="wa-detail-grid">
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">اسم القناة</span>
                                {editingInstanceId === instance.id ? (
                                  <input
                                    type="text"
                                    className="wa-detail-input"
                                    value={tempMeta.channelName || ''}
                                    onChange={e => setTempMeta({ ...tempMeta, channelName: e.target.value })}
                                    placeholder="مثال: القناة الرئيسية للعملاء"
                                  />
                                ) : (
                                  <span className="wa-detail-value">{(customMetadata[instance.id] || {}).channelName || 'قناة الإشعارات الرسمية'}</span>
                                )}
                              </div>
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">القسم المسؤول</span>
                                <span className="wa-detail-value">{instance.department || 'الرقم الرسمي'}</span>
                              </div>
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">تاريخ التفعيل</span>
                                <span className="wa-detail-value">
                                  {instance.created_at ? new Date(instance.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                </span>
                              </div>
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">حالة آخر فحص</span>
                                <span className="wa-detail-value" style={{ color: isConnected ? 'var(--status-green)' : 'var(--status-red)', fontWeight: 600 }}>
                                  {isConnected ? 'نشط ومستقر الآن' : 'غير متصل'}
                                </span>
                              </div>
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">نوع الاتصال</span>
                                {editingInstanceId === instance.id ? (
                                  <input
                                    type="text"
                                    className="wa-detail-input"
                                    value={tempMeta.connectionType || ''}
                                    onChange={e => setTempMeta({ ...tempMeta, connectionType: e.target.value })}
                                    placeholder="مثال: Evolution API"
                                  />
                                ) : (
                                  <span className="wa-detail-value">{(customMetadata[instance.id] || {}).connectionType || 'ربط سحابي مباشر'}</span>
                                )}
                              </div>
                              <div className="wa-detail-item">
                                <span className="wa-detail-label">مسؤول القناة (مدير النظام)</span>
                                {editingInstanceId === instance.id ? (
                                  <input
                                    type="text"
                                    className="wa-detail-input"
                                    value={tempMeta.adminName || ''}
                                    onChange={e => setTempMeta({ ...tempMeta, adminName: e.target.value })}
                                    placeholder="اسم المسؤول أو المشرف..."
                                  />
                                ) : (
                                  <span className="wa-detail-value">{(customMetadata[instance.id] || {}).adminName || '— (لم يحدد)'}</span>
                                )}
                              </div>
                              <div className="wa-detail-item" style={{ gridColumn: 'span 2' }}>
                                <span className="wa-detail-label">ملاحظات التشغيل وإرشادات القناة</span>
                                {editingInstanceId === instance.id ? (
                                  <textarea
                                    className="wa-detail-textarea"
                                    value={tempMeta.usageNotes || ''}
                                    onChange={e => setTempMeta({ ...tempMeta, usageNotes: e.target.value })}
                                    placeholder="اكتب إرشادات أو ملاحظات ليراها الموظفون..."
                                    rows={2}
                                  />
                                ) : (
                                  <span className="wa-detail-value" style={{ fontStyle: (customMetadata[instance.id] || {}).usageNotes ? 'normal' : 'italic', color: (customMetadata[instance.id] || {}).usageNotes ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                                    {(customMetadata[instance.id] || {}).usageNotes || 'لا توجد ملاحظات مضافة حالياً. يمكنك إضافتها عبر تعديل التفاصيل.'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="wa-card__footer">
                            <div className="wa-card__footer-actions">
                              {isConnected ? (
                                <button
                                  className="fin-btn fin-btn--sm wa-btn-test-connection"
                                  onClick={() => testConnection(instance.id)}
                                  disabled={testingConnection === instance.id}
                                >
                                  {testingConnection === instance.id ? (
                                    <Loader2 size={13} className="wa-spin" />
                                  ) : (
                                    <CheckCircle size={13} />
                                  )}
                                  فحص اتصال القناة
                                </button>
                              ) : (
                                <button
                                  className="fin-btn fin-btn--primary fin-btn--sm"
                                  onClick={() => getQRCode(instance.id)}
                                >
                                  <QrCode size={13} />
                                  {isConnecting ? 'عرض رمز QR للربط' : 'بدء ربط القناة'}
                                </button>
                              )}

                              <button
                                className="fin-btn fin-btn--danger fin-btn--sm"
                                onClick={() => deleteInstance(instance.id)}
                              >
                                <Trash2 size={13} />
                                حذف القناة بالكامل
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Placeholder for future channels expansion */}
                        <div className="wa-card wa-placeholder-card">
                          <div className="wa-placeholder-card__content">
                            <Plus size={24} className="wa-placeholder-card__icon" />
                            <h4 className="wa-placeholder-card__title">قنوات اتصال إضافية (قريباً)</h4>
                            <p className="wa-placeholder-card__desc">
                              ستتمكن مستقبلاً من إضافة قنوات اتصال إضافية وإسنادها لأقسام الاستقبال، المحاسبة، أو شؤون القضايا لتوزيع صبيب الإشعارات.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ═══════════ TAB: Send Message ═══════════ */}
            {activeTab === 'send' && (
              <div className="wa-tab-content">
                <div className="wa-control-center">
                  {/* Compose & Settings */}
                  <div className="wa-control-panel-main">
                    <div className="wa-card">
                      <div className="wa-card__header">
                        <div className="wa-card__header-title">
                          <Send size={16} />
                          <span>إنشاء وإرسال رسالة جديدة</span>
                        </div>
                      </div>
                      <div className="wa-card__body">
                        {/* Input Mode Selector */}
                        <div className="wa-send-modes">
                          <button 
                            className={`wa-send-mode-btn ${sendMode === 'client' ? 'wa-send-mode-btn--active' : ''}`}
                            onClick={() => { setSendMode('client'); setSendForm(prev => ({ ...prev, phone: '', client_id: '' })); }}
                          >
                            <User size={14} />
                            <span>إرسال لعميل مسجل</span>
                          </button>
                          <button 
                            className={`wa-send-mode-btn ${sendMode === 'direct' ? 'wa-send-mode-btn--active' : ''}`}
                            onClick={() => { setSendMode('direct'); setSendForm(prev => ({ ...prev, phone: '', client_id: '', case_id: '' })); setSelectedClient(null); setClientSearch(''); setClientCases([]); }}
                          >
                            <Phone size={14} />
                            <span>إدخال رقم مباشر</span>
                          </button>
                        </div>

                        {/* Recipient Input block */}
                        {sendMode === 'client' ? (
                          <div className="wa-recipient-section">
                            {!selectedClient ? (
                              <div className="wa-field">
                                <label className="wa-label">البحث عن العميل</label>
                                <div ref={clientDropdownRef} style={{ position: 'relative' }}>
                                  <div className="wa-input-icon">
                                    <Search size={14} />
                                    <input
                                      type="text"
                                      placeholder="ابحث عن العميل بالاسم أو رقم الهاتف..."
                                      value={clientSearch}
                                      onChange={e => { setClientSearch(e.target.value); }}
                                      className="wa-input"
                                    />
                                  </div>
                                  <AnimatePresence>
                                    {showClientDropdown && clients.length > 0 && (
                                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="wa-dropdown">
                                        {clients.map(c => (
                                          <button key={c.id} className="wa-dropdown__item" onClick={() => {
                                            setSelectedClient(c);
                                            setSendForm(prev => ({ ...prev, phone: c.phone, client_id: String(c.id) }));
                                            setClientSearch('');
                                            setShowClientDropdown(false);
                                            loadClientCases(c.id);
                                          }}>
                                            <User size={13} />
                                            <span>{c.name}</span>
                                            {c.phone && <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, direction: 'ltr' }}>{c.phone}</span>}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            ) : (
                              /* Selected Client Profile Card */
                              <div className="wa-selected-client-card">
                                <div className="wa-selected-client-card__header">
                                  <div className="wa-selected-client-card__avatar">
                                    <User size={18} />
                                  </div>
                                  <div className="wa-selected-client-card__details">
                                    <div className="wa-selected-client-card__name">{selectedClient.name}</div>
                                    <div className="wa-selected-client-card__phone" dir="ltr">{formatPhone(selectedClient.phone)}</div>
                                  </div>
                                  <button 
                                    className="wa-selected-client-card__remove" 
                                    onClick={() => {
                                      setSelectedClient(null);
                                      setSendForm(prev => ({ ...prev, phone: '', client_id: '', case_id: '' }));
                                      setClientCases([]);
                                      setSelectedCaseId("");
                                    }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {/* Case Selection */}
                                <div className="wa-selected-client-card__cases" style={{ marginTop: 12 }}>
                                  <label className="wa-label">القضية المرتبطة بالرسالة (اختياري)</label>
                                  {casesLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                      <Loader2 size={12} className="wa-spin" />
                                      <span>جارٍ تحميل قضايا العميل...</span>
                                    </div>
                                  ) : clientCases.length === 0 ? (
                                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>لا توجد قضايا نشطة مسجلة لهذا العميل.</span>
                                  ) : (
                                    <select 
                                      className="wa-select" 
                                      style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                                      value={selectedCaseId}
                                      onChange={e => {
                                        const caseId = e.target.value;
                                        setSelectedCaseId(caseId);
                                        setSendForm(prev => ({ ...prev, case_id: caseId }));
                                      }}
                                    >
                                      <option value="">-- اختر القضية لربط الرسالة بها --</option>
                                      {clientCases.map(cs => (
                                        <option key={cs.id} value={cs.id}>
                                          {cs.file_number || cs.case_number ? `[${cs.file_number || cs.case_number}] ` : ''}
                                          {cs.title || cs.case_title || 'قضية بلا عنوان'}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Direct input mode */
                          <div className="wa-field">
                            <label className="wa-label">رقم الهاتف المستلم</label>
                            <div className="wa-input-icon">
                              <Phone size={14} />
                              <input 
                                type="tel" 
                                placeholder="966501234567" 
                                value={sendForm.phone}
                                onChange={e => setSendForm(prev => ({ ...prev, phone: e.target.value }))} 
                                className="wa-input" 
                                dir="ltr" 
                              />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                              أدخل الرقم بالصيغة الدولية المباشرة (مثل 966500000000) دون أصفار أو علامة +
                            </span>
                          </div>
                        )}

                        {/* Text Message Field */}
                        <div className="wa-field" style={{ marginTop: 12 }}>
                          <label className="wa-label">محتوى الرسالة</label>
                          <textarea
                            className="wa-textarea"
                            rows={6}
                            placeholder="اكتب نص رسالتك هنا..."
                            value={sendForm.message}
                            onChange={e => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            <span>{sendForm.message.length} حرف</span>
                            <span>يدعم استخدام المتغيرات التلقائية يدوياً: {'{client_name}'} (اسم العميل)، {'{case_title}'} (موضوع القضية)، {'{case_number}'} (رقم القضية)</span>
                          </div>
                        </div>
                      </div>

                      <div className="wa-card__footer">
                        <div className="wa-card__footer-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="wa-send-btn"
                            style={{ width: 'auto', padding: '10px 24px', margin: 0 }}
                            onClick={sendDirectMessage}
                            disabled={sending || !sendForm.phone || !sendForm.message}
                          >
                            {sending ? <Loader2 size={16} className="wa-spin" /> : <Send size={16} />}
                            <span>{sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة عبر الواتساب'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policy & Helper Pane */}
                  <div className="wa-control-panel-side">
                    <div className="wa-card">
                      <div className="wa-card__header">
                        <div className="wa-card__header-title">
                          <Info size={14} />
                          <span>سياسة وإرشادات الإرسال</span>
                        </div>
                      </div>
                      <div className="wa-card__body" style={{ gap: 12 }}>
                        <div className="wa-tip">
                          <Check size={14} style={{ color: 'var(--status-green)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong style={{ fontSize: 12 }}>الصيغة الدولية المعتمدة:</strong>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11 }}>تأكد من بدء الأرقام بـ 966 ليكون الربط صحيحاً.</p>
                          </div>
                        </div>
                        <div className="wa-tip">
                          <Check size={14} style={{ color: 'var(--status-green)', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong style={{ fontSize: 12 }}>الربط التلقائي بالعميل:</strong>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11 }}>عند تحديد عميل مسجل، سيقوم النظام تلقائياً بربط سجلات التراسل بملفه لإثراء سجل العميل.</p>
                          </div>
                        </div>
                        <div className="wa-tip wa-tip--warn">
                          <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong style={{ fontSize: 12 }}>تفادي حظر الحساب:</strong>
                            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#b45309' }}>ننصح بعدم تجاوز 100 رسالة صادرة في الساعة لتجنب خوارزميات الحظر من شركة واتساب.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Messages Log ═══════════ */}
            {activeTab === 'log' && (
              <div className="wa-tab-content">
                {/* Stats Bar */}
                {stats && (
                  <div className="wa-stats-bar">
                    <div className="wa-stat">
                      <span className="wa-stat__value">{stats.total ?? 0}</span>
                      <span className="wa-stat__label">إجمالي الرسائل</span>
                    </div>
                    <div className="wa-stat wa-stat--green">
                      <span className="wa-stat__value">{stats.sent ?? 0}</span>
                      <span className="wa-stat__label">مرسلة بنجاح</span>
                    </div>
                    <div className="wa-stat wa-stat--blue">
                      <span className="wa-stat__value">{stats.delivered ?? 0}</span>
                      <span className="wa-stat__label">وصلت للمستلم</span>
                    </div>
                    <div className="wa-stat wa-stat--red">
                      <span className="wa-stat__value">{stats.failed ?? 0}</span>
                      <span className="wa-stat__label">فشلت في الإرسال</span>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="wa-filters">
                  <div className="wa-input-icon" style={{ flex: 1 }}>
                    <Search size={14} />
                    <input 
                      type="text" 
                      placeholder="بحث برقم الهاتف أو محتوى الرسالة..." 
                      value={filters.search} 
                      className="wa-input"
                      onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} 
                    />
                  </div>
                  <select 
                    className="wa-select" 
                    value={filters.status} 
                    onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  >
                    <option value="">كل الحالات</option>
                    <option value="sent">مرسلة</option>
                    <option value="delivered">تم التوصيل</option>
                    <option value="read">مقروءة</option>
                    <option value="failed">فاشلة</option>
                    <option value="pending">قيد الإرسال</option>
                  </select>
                  <select 
                    className="wa-select" 
                    value={filters.direction} 
                    onChange={e => setFilters({ ...filters, direction: e.target.value, page: 1 })}
                  >
                    <option value="">كل الاتجاهات</option>
                    <option value="outbound">صادرة</option>
                    <option value="inbound">واردة</option>
                  </select>
                  <button className="wa-icon-btn" onClick={loadMessages} title="تحديث السجل">
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Table */}
                <div className="wa-table-wrap">
                  {messagesLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Loader2 size={24} className="wa-spin" style={{ color: 'var(--status-green)' }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="wa-empty" style={{ padding: 40 }}>
                      <History size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                      <p>لا توجد رسائل تراسل مسجلة تطابق خيارات البحث.</p>
                    </div>
                  ) : (
                    <table className="wa-table">
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>الاتجاه</th>
                          <th style={{ width: 140 }}>رقم المستلم</th>
                          <th>محتوى الرسالة</th>
                          <th style={{ width: 100 }}>حالة الإرسال</th>
                          <th style={{ width: 100 }}>النوع</th>
                          <th style={{ width: 120 }}>التاريخ والوقت</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map(msg => {
                          const isSelected = selectedLogMsg?.id === msg.id;
                          return (
                            <tr 
                              key={msg.id}
                              className={`wa-table__row ${isSelected ? 'wa-table__row--selected' : ''}`} 
                              onClick={() => setSelectedLogMsg(isSelected ? null : msg)}
                            >
                              <td>
                                <span className={`wa-dir-badge wa-dir-badge--${msg.direction}`}>
                                  {msg.direction === 'outbound' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                  {msg.direction === 'outbound' ? 'صادر' : 'وارد'}
                                </span>
                              </td>
                              <td style={{ direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>
                                {formatPhone(msg.to_phone || msg.from_phone || '')}
                              </td>
                              <td style={{ maxWidth: 280 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {msg.message_content}
                                </div>
                              </td>
                              <td>
                                <span className="wa-status-pill" style={{ color: STATUS_MAP[msg.status]?.color, background: STATUS_MAP[msg.status]?.bg }}>
                                  {STATUS_MAP[msg.status]?.label || msg.status}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                  {EVENT_LABELS[msg.event_type || ''] || msg.event_type || '—'}
                                </span>
                              </td>
                              <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                {formatDate(msg.created_at)}
                              </td>
                              <td>
                                {msg.status === 'failed' && (
                                  <button 
                                    className="wa-resend-btn" 
                                    onClick={e => { e.stopPropagation(); resendMessage(msg.id); }} 
                                    disabled={resending === msg.id}
                                    title="إعادة إرسال المحاولة"
                                  >
                                    {resending === msg.id ? <Loader2 size={13} className="wa-spin" /> : <RotateCcw size={13} />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {messagesPagination.last_page > 1 && (
                  <div className="wa-pagination">
                    <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                      <ChevronRight size={14} />
                    </button>
                    <span>صفحة {messagesPagination.current_page} من {messagesPagination.last_page} ({messagesPagination.total} رسالة)</span>
                    <button disabled={filters.page >= messagesPagination.last_page} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ TAB: Notifications ═══════════ */}
            {activeTab === 'notifications' && (
              <div className="wa-tab-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {NOTIFICATION_GROUPS.map((grp, gIdx) => (
                    <div key={gIdx} className="wa-card">
                      <div className="wa-card__header">
                        <div className="wa-card__header-title">
                          <Bell size={16} />
                          <span>{grp.title}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{grp.desc}</span>
                      </div>
                      <div className="wa-card__body" style={{ gap: 12 }}>
                        {grp.keys.map(key => {
                          const setting = settings.notification_settings[key];
                          const isSelected = selectedNotificationKey === key;
                          return (
                            <div 
                              key={key} 
                              className={`whatsapp-notification-item ${isSelected ? 'whatsapp-notification-item--selected' : ''}`} 
                              style={{ margin: 0, cursor: 'pointer' }}
                              onClick={() => setSelectedNotificationKey(key)}
                            >
                              <div className="whatsapp-notification-item__info">
                                <div className="whatsapp-notification-item__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{NOTIFICATION_TITLES[key] || key}</span>
                                  {isSelected && <span className="wa-tag" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-soft)' }}>نشط في المعاينة</span>}
                                </div>
                                <div className="whatsapp-notification-item__desc">{NOTIFICATION_DESCS[key] || ''}</div>
                              </div>
                              <div className="whatsapp-notification-item__actions" onClick={e => e.stopPropagation()}>
                                <label className="whatsapp-toggle">
                                  <input 
                                    type="checkbox" 
                                    className="whatsapp-toggle__checkbox" 
                                    checked={setting?.enabled ?? false}
                                    onChange={e => updateNotificationSetting(key, 'enabled', e.target.checked)} 
                                  />
                                  <span className="whatsapp-toggle__text">تفعيل</span>
                                </label>
                                {setting?.enabled && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--quiet-gray-100)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>تأخير:</span>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max="60" 
                                      className="wa-detail-input" 
                                      style={{ width: 45, padding: '2px 4px', fontSize: 12, textAlign: 'center' }}
                                      value={setting?.delay_minutes ?? 0} 
                                      onChange={e => updateNotificationSetting(key, 'delay_minutes', parseInt(e.target.value) || 0)} 
                                    />
                                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>دقيقة</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Templates ═══════════ */}
            {activeTab === 'templates' && (
              <div className="wa-tab-content">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
                  {Object.entries(settings.message_templates || {}).map(([key, template]: [string, any]) => {
                    const isSelected = selectedTemplateKey === key;
                    const vars = TEMPLATE_VARIABLES[key] || [];
                    return (
                      <div 
                        key={key} 
                        className={`whatsapp-template-card ${isSelected ? 'whatsapp-template-card--selected' : ''}`}
                        onClick={() => setSelectedTemplateKey(key)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="whatsapp-template-card__header">
                          <div className="whatsapp-template-card__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{NOTIFICATION_TITLES[key] || key}</span>
                          </div>
                          <span className="wa-tag">{key}</span>
                        </div>
                        
                        <textarea 
                          id={`textarea-${key}`}
                          className="whatsapp-template-card__textarea" 
                          value={template?.template || ''} 
                          rows={4}
                          onClick={e => { e.stopPropagation(); setSelectedTemplateKey(key); }}
                          onFocus={() => setSelectedTemplateKey(key)}
                          onChange={e => updateMessageTemplate(key, 'template', e.target.value)} 
                          placeholder="اكتب قالب الرسالة التلقائية هنا..." 
                        />
                        
                        {vars.length > 0 && (
                          <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>انقر لإدراج المتغير عند مؤشر الكتابة:</span>
                            <div className="wa-variable-pills-container">
                              {vars.map(v => (
                                <button
                                  key={v}
                                  type="button"
                                  className="wa-variable-pill"
                                  onClick={() => insertPlaceholder(key, v)}
                                >
                                  <span>+</span>
                                  <span>
                                    {v === '{client_name}' ? 'اسم العميل' :
                                     v === '{case_number}' ? 'رقم القضية' :
                                     v === '{case_title}' ? 'موضوع القضية' :
                                     v === '{procedure_title}' ? 'اسم الإجراء' :
                                     v === '{hearing_date}' ? 'تاريخ الجلسة' :
                                     v === '{hearing_time}' ? 'وقت الجلسة' :
                                     v === '{hearing_court}' ? 'المحكمة' :
                                     v === '{payment_amount}' ? 'قيمة الدفعة' :
                                     v === '{due_date}' ? 'تاريخ الاستحقاق' :
                                     v === '{lawyer_name}' ? 'اسم المحامي' :
                                     v === '{task_title}' ? 'اسم المهمة' : v}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════ TAB: Schedule ═══════════ */}
            {activeTab === 'schedule' && (
              <div className="wa-tab-content">
                <div className="wa-card">
                  <div className="wa-card__header">
                    <div className="wa-card__header-title">
                      <Clock size={16} />
                      <span>إدارة ساعات العمل وتأخير التنبيهات</span>
                    </div>
                  </div>
                  <div className="wa-card__body" style={{ gap: 16 }}>
                    <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        ملاحظة: تمنع ساعات العمل إرسال الإشعارات التلقائية خارج أوقات عمل المكتب الرسمية. أي رسالة تنشأ خارج هذه الأوقات سيتم جدولتها تلقائياً لترسل فور بدء ساعات العمل الرسمية لليوم التالي تفادياً لإزعاج العملاء.
                      </div>
                    </div>

                    <div className="whatsapp-schedule-grid" style={{ marginTop: 8 }}>
                      {settings.working_hours && Object.keys(settings.working_hours).length > 0 ? (
                        Object.entries(settings.working_hours).map(([day, hours]: [string, any]) => {
                          const isEnabled = hours?.enabled ?? false;
                          return (
                            <div 
                              key={day} 
                              className="whatsapp-schedule-row"
                              style={{ 
                                opacity: isEnabled ? 1 : 0.75,
                                background: isEnabled ? 'var(--quiet-gray-50)' : 'var(--quiet-gray-100)',
                                border: isEnabled ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <label className="whatsapp-toggle" style={{ minWidth: 120 }}>
                                <input 
                                  type="checkbox" 
                                  className="whatsapp-toggle__checkbox" 
                                  checked={isEnabled}
                                  onChange={e => updateWorkingHour(day, 'enabled', e.target.checked)} 
                                />
                                <span className="whatsapp-schedule-row__day" style={{ fontWeight: isEnabled ? 700 : 500 }}>
                                  {DAY_NAMES[day] || day}
                                </span>
                              </label>
                              
                              <div 
                                className="whatsapp-schedule-row__inputs"
                                style={{ 
                                  pointerEvents: isEnabled ? 'auto' : 'none',
                                  opacity: isEnabled ? 1 : 0.4,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>من:</span>
                                <input 
                                  type="time" 
                                  className="whatsapp-schedule-row__time" 
                                  value={hours?.start || '08:00'}
                                  onChange={e => updateWorkingHour(day, 'start', e.target.value)} 
                                />
                                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>إلى:</span>
                                <input 
                                  type="time" 
                                  className="whatsapp-schedule-row__time" 
                                  value={hours?.end || '17:00'}
                                  onChange={e => updateWorkingHour(day, 'end', e.target.value)} 
                                />
                              </div>

                              {!isEnabled && (
                                <span style={{ fontSize: 11, color: 'var(--status-red)', fontWeight: 500, marginRight: 'auto' }}>
                                  يوم عطلة مغلق
                                </span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="wa-empty" style={{ padding: 40 }}>
                          <Clock size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                          <p>لا توجد ساعات عمل. اضغط "إعادة التعيين" لتحميل الافتراضية.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {((activeTab === 'instances' && instances.length > 0) || activeTab === 'send' || activeTab === 'log' || activeTab === 'notifications' || activeTab === 'templates' || activeTab === 'schedule') && (
          <aside className="whatsapp-preview">
            <div className="whatsapp-preview__header">
              {activeTab === 'instances' ? (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>إحصائيات القناة اليومية</span>
                </div>
              ) : activeTab === 'send' ? (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} style={{ color: 'var(--status-green)' }} />
                  <span>معاينة حية للمستلم</span>
                </div>
              ) : activeTab === 'log' ? (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <History size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>تفاصيل الرسالة المحددة</span>
                </div>
              ) : activeTab === 'notifications' ? (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>معاينة الإشعار التلقائي</span>
                </div>
              ) : activeTab === 'templates' ? (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>معاينة القالب المباشر</span>
                </div>
              ) : (
                <div className="whatsapp-preview__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>حالة الجدولة والإرسال</span>
                </div>
              )}
            </div>
            <div className="whatsapp-preview__body">
              {activeTab === 'instances' && (
                instances.map(instance => {
                  const successRate = todayStats.total > 0 ? Math.round((todayStats.sent_ok / todayStats.total) * 100) : 100;
                  return (
                    <div key={`stats-${instance.id}`} className="wa-analytics-box">
                      <div className="wa-analytics-header">
                        <Send size={14} style={{ color: 'var(--status-green)' }} />
                        <span>صبيب وحركة إرسال اليوم</span>
                      </div>
                      <div className="wa-analytics-body">
                        <div className="wa-circular-chart-box" style={{ margin: '12px 0 20px 0' }}>
                          <div className="wa-circular-chart">
                            <svg viewBox="0 0 36 36" className="circular-chart green">
                              <path className="circle-bg"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path className="circle"
                                strokeDasharray={`${successRate}, 100`}
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <text x="18" y="20.35" className="percentage">{successRate}%</text>
                            </svg>
                          </div>
                          <span className="wa-circular-label">نسبة نجاح الإرسال اليومي</span>
                        </div>

                        <div className="wa-stat-list">
                          <div className="wa-stat-list-item">
                            <span className="wa-stat-list-label">إجمالي الرسائل المطلوبة</span>
                            <span className="wa-stat-list-value">{todayStats.total}</span>
                          </div>
                          <div className="wa-stat-list-item wa-stat-list-item--green">
                            <span className="wa-stat-list-label">الرسائل الناجحة</span>
                            <span className="wa-stat-list-value">{todayStats.sent_ok}</span>
                          </div>
                          <div className="wa-stat-list-item wa-stat-list-item--red">
                            <span className="wa-stat-list-label">الرسائل الفاشلة</span>
                            <span className="wa-stat-list-value">{todayStats.failed}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {activeTab === 'send' && (
                /* WhatsApp Mockup Preview */
                <div className="wa-phone-mockup">
                  {/* Phone Header */}
                  <div className="wa-phone-header">
                    <div className="wa-phone-header__back">
                      <ChevronRight size={18} />
                    </div>
                    <div className="wa-phone-header__avatar">
                      <User size={16} />
                    </div>
                    <div className="wa-phone-header__info">
                      <div className="wa-phone-header__name">
                        {selectedClient ? selectedClient.name : formatPhone(sendForm.phone) || 'مستلم الرسالة'}
                      </div>
                      <div className="wa-phone-header__status">متصل الآن</div>
                    </div>
                  </div>

                  {/* Phone Body */}
                  <div className="wa-phone-chat-bg">
                    <div className="wa-chat-bubble-container">
                      <div className="wa-chat-bubble outbound">
                        <div className="wa-chat-bubble__text">
                          {getPreviewText() ? (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{getPreviewText()}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 12 }}>
                              اكتب الرسالة لتشاهد معاينة حية لها في تطبيق الواتساب هنا...
                            </span>
                          )}
                        </div>
                        <div className="wa-chat-bubble__meta">
                          <span className="wa-chat-bubble__time">
                            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="wa-chat-bubble__ticks">
                            <svg viewBox="0 0 16 11" width="14" height="10" fill="currentColor">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L5.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                              <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.666 9.88a.32.32 0 0 1-.484.033L1.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'log' && (
                /* Selected Log Message Preview */
                !selectedLogMsg ? (
                  <div className="wa-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <History size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      حدد أي رسالة من جدول السجل لعرض تفاصيلها ومعاينتها الفورية هنا.
                    </p>
                  </div>
                ) : (
                  <div className="wa-phone-mockup" style={{ height: 'auto', minHeight: 380 }}>
                    {/* Phone Header */}
                    <div className="wa-phone-header">
                      <div className="wa-phone-header__back">
                        <ChevronRight size={18} />
                      </div>
                      <div className="wa-phone-header__avatar">
                        <User size={16} />
                      </div>
                      <div className="wa-phone-header__info">
                        <div className="wa-phone-header__name" style={{ direction: 'ltr', textAlign: 'right' }}>
                          {selectedLogMsg.direction === 'outbound' ? 'إلى: ' : 'من: '}
                          {formatPhone(selectedLogMsg.to_phone || selectedLogMsg.from_phone || '')}
                        </div>
                        <div className="wa-phone-header__status">
                          {STATUS_MAP[selectedLogMsg.status]?.label || selectedLogMsg.status}
                        </div>
                      </div>
                    </div>

                    {/* Phone Body */}
                    <div className="wa-phone-chat-bg" style={{ minHeight: 180 }}>
                      <div className="wa-chat-bubble-container">
                        <div className={`wa-chat-bubble ${selectedLogMsg.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                          <div className="wa-chat-bubble__text" style={{ whiteSpace: 'pre-wrap' }}>
                            {selectedLogMsg.message_content}
                          </div>
                          <div className="wa-chat-bubble__meta">
                            <span className="wa-chat-bubble__time">
                              {formatDate(selectedLogMsg.created_at)}
                            </span>
                            {selectedLogMsg.direction === 'outbound' && (
                              <span className="wa-chat-bubble__ticks">
                                {selectedLogMsg.status === 'failed' ? (
                                  <AlertCircle size={10} style={{ color: 'var(--status-red)' }} />
                                ) : (
                                  <svg viewBox="0 0 16 11" width="14" height="10" fill={selectedLogMsg.status === 'read' ? '#53bdeb' : 'currentColor'} style={{ color: selectedLogMsg.status === 'sent' || selectedLogMsg.status === 'delivered' || selectedLogMsg.status === 'read' ? undefined : 'rgba(0,0,0,0.3)' }}>
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L5.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                                    <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.666 9.88a.32.32 0 0 1-.484.033L1.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Trace Footer */}
                    <div style={{ background: 'var(--color-surface-subtle)', padding: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>النوع والمناسبة:</span>
                        <span style={{ fontWeight: 600 }}>{EVENT_LABELS[selectedLogMsg.event_type || ''] || selectedLogMsg.event_type || 'إرسال مباشر'}</span>
                      </div>
                      {selectedLogMsg.user && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>المرسِل (المشرف):</span>
                          <span style={{ fontWeight: 600 }}>{selectedLogMsg.user.name}</span>
                        </div>
                      )}
                      {selectedLogMsg.case && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>القضية المرتبطة:</span>
                          <span style={{ fontWeight: 600 }}>{selectedLogMsg.case.file_number} - {selectedLogMsg.case.title}</span>
                        </div>
                      )}
                      {selectedLogMsg.metadata?.error && (
                        <div style={{ marginTop: 4, padding: 8, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 4, color: 'var(--status-red)' }}>
                          <strong>تفاصيل خطأ الإرسال:</strong>
                          <p style={{ margin: '4px 0 0 0', lineHeight: 1.4, wordBreak: 'break-all' }}>
                            {typeof selectedLogMsg.metadata.error === 'string' ? selectedLogMsg.metadata.error : JSON.stringify(selectedLogMsg.metadata.error?.response?.message || selectedLogMsg.metadata.error?.error || 'خطأ في الاتصال بالشبكة')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {activeTab === 'notifications' && (
                <div className="wa-phone-mockup" style={{ height: 'auto', minHeight: 380 }}>
                  <div className="wa-phone-header">
                    <div className="wa-phone-header__back">
                      <ChevronRight size={18} />
                    </div>
                    <div className="wa-phone-header__avatar">
                      <User size={16} />
                    </div>
                    <div className="wa-phone-header__info">
                      <div className="wa-phone-header__name">بوابة الإشعارات التلقائية</div>
                      <div className="wa-phone-header__status">متصل حالياً</div>
                    </div>
                  </div>
                  <div className="wa-phone-chat-bg" style={{ minHeight: 200 }}>
                    <div className="wa-chat-bubble-container">
                      <div className="wa-chat-bubble outbound">
                        <div className="wa-chat-bubble__text">
                          <span style={{ whiteSpace: 'pre-wrap' }}>
                            {replaceTemplatePlaceholders(settings.message_templates[selectedNotificationKey]?.template) || (
                              <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 12 }}>
                                لا يوجد محتوى قالب متاح لهذا التنبيه حالياً.
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="wa-chat-bubble__meta">
                          <span className="wa-chat-bubble__time">
                            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="wa-chat-bubble__ticks">
                            <svg viewBox="0 0 16 11" width="14" height="10" fill="currentColor">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L5.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                              <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.666 9.88a.32.32 0 0 1-.484.033L1.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>الحدث البرمجي:</span>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedNotificationKey}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>الحالة الإجمالية:</span>
                      <span style={{ fontWeight: 600, color: settings.notification_settings[selectedNotificationKey]?.enabled ? 'var(--status-green)' : 'var(--status-red)' }}>
                        {settings.notification_settings[selectedNotificationKey]?.enabled ? 'مفعل ومجدول' : 'معطل حالياً'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>تأخير الإرسال:</span>
                      <span style={{ fontWeight: 600 }}>{settings.notification_settings[selectedNotificationKey]?.delay_minutes || 0} دقيقة</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'templates' && (
                <div className="wa-phone-mockup" style={{ height: 'auto', minHeight: 380 }}>
                  <div className="wa-phone-header">
                    <div className="wa-phone-header__back">
                      <ChevronRight size={18} />
                    </div>
                    <div className="wa-phone-header__avatar">
                      <User size={16} />
                    </div>
                    <div className="wa-phone-header__info">
                      <div className="wa-phone-header__name">مستودع قوالب البوابة</div>
                      <div className="wa-phone-header__status">متصل حالياً</div>
                    </div>
                  </div>
                  <div className="wa-phone-chat-bg" style={{ minHeight: 200 }}>
                    <div className="wa-chat-bubble-container">
                      <div className="wa-chat-bubble outbound">
                        <div className="wa-chat-bubble__text">
                          <span style={{ whiteSpace: 'pre-wrap' }}>
                            {replaceTemplatePlaceholders(settings.message_templates[selectedTemplateKey]?.template) || (
                              <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: 12 }}>
                                اكتب في مربع النص لتشاهد المعاينة هنا...
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="wa-chat-bubble__meta">
                          <span className="wa-chat-bubble__time">
                            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="wa-chat-bubble__ticks">
                            <svg viewBox="0 0 16 11" width="14" height="10" fill="currentColor">
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033L5.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                              <path d="M11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.666 9.88a.32.32 0 0 1-.484.033L1.4 7.37a.364.364 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.26 3.107a.32.32 0 0 0 .471-.019l6.234-7.585a.364.364 0 0 0-.022-.51z"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-subtle)', padding: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>القالب النشط:</span>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedTemplateKey}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                      ⚠️ <strong>تنبيه:</strong> تأكد من عدم العبث بأسماء المتغيرات مثل <code>{`{client_name}`}</code> لكي يستبدلها النظام تلقائياً عند الإرسال الفعلي.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (() => {
                const getWorkingHoursStatus = () => {
                  if (!settings.working_hours) return { open: false, text: 'ساعات العمل غير مهيأة' };
                  const now = new Date();
                  const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const currentDayKey = daysMap[now.getDay()];
                  const todayHours = settings.working_hours[currentDayKey];
                  if (!todayHours || !todayHours.enabled) {
                    return { open: false, text: `مغلق اليوم (${DAY_NAMES[currentDayKey]})` };
                  }
                  const startStr = todayHours.start || '08:00';
                  const endStr = todayHours.end || '17:00';
                  const [startH, startM] = startStr.split(':').map(Number);
                  const [endH, endM] = endStr.split(':').map(Number);
                  const currentH = now.getHours();
                  const currentM = now.getMinutes();
                  const startTotal = startH * 60 + startM;
                  const endTotal = endH * 60 + endM;
                  const currentTotal = currentH * 60 + currentM;
                  if (currentTotal >= startTotal && currentTotal <= endTotal) {
                    return { open: true, text: `مفتوح الآن (ينتهي عند ${endStr})` };
                  } else {
                    return { open: false, text: `مغلق حالياً (يبدأ عند ${startStr})` };
                  }
                };

                const status = getWorkingHoursStatus();
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={`wa-stat ${status.open ? 'wa-stat--green' : 'wa-stat--red'}`} style={{ padding: 16, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`wa-status-tag wa-status-tag--${status.open ? 'connected' : 'disconnected'}`} style={{ margin: 0 }}>
                          <span className="wa-status-tag__dot" />
                          {status.open ? 'نشط الآن' : 'في وضع الانتظار'}
                        </span>
                      </div>
                      <span className="wa-stat__value" style={{ fontSize: 15, marginTop: 4 }}>{status.text}</span>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                        {status.open 
                          ? 'بوابة الإرسال التلقائي نشطة حالياً وتقوم بمعالجة وإرسال كافة التنبيهات والإشعارات فوراً دون جدولة.'
                          : 'النظام حالياً خارج أوقات العمل الرسمية. سيتم جدولة كافة التنبيهات التلقائية الصادرة لتُرسل فور بدء ساعات العمل الرسمية القادمة.'}
                      </p>
                    </div>

                    <div className="wa-card">
                      <div className="wa-card__header">
                        <div className="wa-card__header-title">
                          <Clock size={14} />
                          <span>خريطة العمل الأسبوعية</span>
                        </div>
                      </div>
                      <div className="wa-card__body" style={{ padding: '10px 0', gap: 2 }}>
                        {Object.entries(settings.working_hours || {}).map(([day, hours]: [string, any]) => {
                          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                          return (
                            <div 
                              key={`schedule-preview-${day}`} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '8px 12px', 
                                borderRight: isToday ? '3px solid var(--color-primary)' : 'none',
                                background: isToday ? 'var(--color-primary-soft)' : 'transparent',
                                borderRadius: isToday ? '0 4px 4px 0' : '0'
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: isToday ? 600 : 500, color: hours?.enabled ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                                {DAY_NAMES[day] || day}
                                {isToday && <span style={{ fontSize: 10, color: 'var(--color-primary)', marginRight: 6 }}>(اليوم)</span>}
                              </span>
                              
                              {hours?.enabled ? (
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                                  {hours.start} - {hours.end}
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--status-red)', fontWeight: 500 }}>
                                  عطلة نهاية الأسبوع
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </aside>
        )}
        </div>

          {/* ── Modals ── */}
          <Modal isOpen={showAddInstance} onClose={() => setShowAddInstance(false)} title="إضافة رقم واتساب جديد" size="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MessageSquare size={18} style={{ color: '#25d366', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
                  سيتم إنشاء اتصال جديد بالواتساب. ستحتاج لمسح رمز QR من تطبيق الواتساب على هاتفك.
                </div>
              </div>
              <div>
                <label className="wa-label">اسم القسم / الغرض</label>
                <select value={newInstanceDepartment} onChange={e => setNewInstanceDepartment(e.target.value)} className="wa-select" style={{ width: '100%' }}>
                  <option value="">اختر القسم</option>
                  <option value="الرقم الرسمي">الرقم الرسمي</option>
                  <option value="الاستقبال">الاستقبال</option>
                  <option value="المحاسبة">المحاسبة</option>
                  <option value="الشؤون القانونية">الشؤون القانونية</option>
                  <option value="الإدارة">الإدارة</option>
                  <option value="خدمة العملاء">خدمة العملاء</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="wa-btn wa-btn--ghost" style={{ flex: 1 }} onClick={() => setShowAddInstance(false)}>إلغاء</button>
                <button className="wa-btn wa-btn--primary" style={{ flex: 1 }} onClick={createInstance}
                  disabled={!newInstanceDepartment.trim()}>
                  ربط الواتساب
                </button>
              </div>
            </div>
          </Modal>

          <Modal isOpen={!!selectedQRCode} onClose={() => setSelectedQRCode(null)} title="امسح رمز QR للربط" size="sm">
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: 16, background: 'var(--quiet-gray-100)', borderRadius: 8, marginBottom: 16 }}>
                <img src={selectedQRCode || ''} alt="QR Code" style={{ width: 200, height: 200, objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                <p>1. افتح واتساب على هاتفك</p>
                <p>2. اذهب إلى الإعدادات {'>'} الأجهزة المرتبطة</p>
                <p>3. اضغط "ربط جهاز" وامسح الكود</p>
              </div>
              <button className="wa-btn wa-btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={() => setSelectedQRCode(null)}>إغلاق</button>
            </div>
          </Modal>


      <style>{`
        .wa-spin { animation: wa-spin 1s linear infinite; }
        @keyframes wa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default WhatsappSettings;
