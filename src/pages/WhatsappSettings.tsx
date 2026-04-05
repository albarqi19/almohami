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

  // Stats
  const [stats, setStats] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load Settings ──

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/v1/whatsapp/settings');
      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
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
      const response = await api.get(`/v1/clients?search=${clientSearch}&per_page=10`);
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
    { id: 'instances', name: 'الاتصال', icon: Smartphone },
    { id: 'send', name: 'إرسال رسالة', icon: Send },
    { id: 'log', name: 'سجل الرسائل', icon: History },
    { id: 'notifications', name: 'التنبيهات', icon: Bell },
    { id: 'templates', name: 'القوالب', icon: FileText },
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

      {/* Tabs */}
      <div className="whatsapp-tabs">
        {tabs.map(tab => (
          <button key={tab.id} className={`whatsapp-tab ${activeTab === tab.id ? 'whatsapp-tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={14} />{tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="whatsapp-content">
        <div className="whatsapp-section">
          <div className="whatsapp-section__content">

            {/* ═══════════ TAB: Instances ═══════════ */}
            {activeTab === 'instances' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title"><Smartphone size={14} />إدارة أرقام الواتساب</div>
                  {instances.length === 0 && (
                    <button className="whatsapp-header__btn whatsapp-header__btn--success" onClick={() => setShowAddInstance(true)}><Plus size={16} />إضافة رقم جديد</button>
                  )}
                </div>
                <div className="whatsapp-section__content">
                  {instances.length === 0 ? (
                    <div className="wa-empty">
                      <Smartphone size={48} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                      <h3>لا يوجد رقم واتساب متصل</h3>
                      <p>قم بإضافة رقم واتساب لبدء إرسال التنبيهات للعملاء</p>
                      <button className="whatsapp-header__btn whatsapp-header__btn--success" style={{ marginTop: 16 }} onClick={() => setShowAddInstance(true)}>
                        <Plus size={16} />إضافة رقم واتساب
                      </button>
                    </div>
                  ) : (
                    <div className="wa-instance-grid">
                      {instances.map(instance => {
                        const isConnected = instance.status === 'connected';
                        const isConnecting = instance.status === 'connecting';
                        return (
                          <div key={instance.id} className={`wa-inst ${isConnected ? 'wa-inst--connected' : isConnecting ? 'wa-inst--connecting' : 'wa-inst--off'}`}>
                            {/* Header */}
                            <div className={`wa-inst__header ${isConnected ? 'wa-inst__header--on' : isConnecting ? 'wa-inst__header--wait' : 'wa-inst__header--off'}`}>
                              <div className="wa-inst__header-right">
                                <div className="wa-inst__logo">
                                  <MessageSquare size={18} />
                                </div>
                                <div>
                                  <h3 className="wa-inst__title">{instance.department || 'الرقم الرسمي'}</h3>
                                  {instance.phone_number && (
                                    <span className="wa-inst__phone-sm" dir="ltr">{formatPhone(instance.phone_number)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="wa-inst__header-left">
                                <span className={`wa-inst__badge ${isConnected ? 'wa-inst__badge--on' : isConnecting ? 'wa-inst__badge--wait' : 'wa-inst__badge--off'}`}>
                                  {isConnected ? <><span className="wa-inst__dot" />متصل</> : isConnecting ? <><Loader2 size={10} className="wa-spin" />جاري الربط</> : <><span className="wa-inst__dot wa-inst__dot--off" />غير متصل</>}
                                </span>
                              </div>
                            </div>

                            {/* Body */}
                            <div className="wa-inst__body">
                              {/* Stats Row */}
                              {isConnected && (
                                <div className="wa-inst__stats">
                                  <div className="wa-inst__stat">
                                    <Send size={12} />
                                    <span className="wa-inst__stat-val">{todayStats.total}</span>
                                    <span className="wa-inst__stat-lbl">اليوم</span>
                                  </div>
                                  <div className="wa-inst__stat wa-inst__stat--green">
                                    <CheckCircle size={12} />
                                    <span className="wa-inst__stat-val">{todayStats.sent_ok}</span>
                                    <span className="wa-inst__stat-lbl">ناجحة</span>
                                  </div>
                                  <div className="wa-inst__stat wa-inst__stat--red">
                                    <XCircle size={12} />
                                    <span className="wa-inst__stat-val">{todayStats.failed}</span>
                                    <span className="wa-inst__stat-lbl">فاشلة</span>
                                  </div>
                                </div>
                              )}

                              {/* Not connected message */}
                              {!isConnected && !isConnecting && (
                                <div className="wa-inst__offline">
                                  <Smartphone size={20} />
                                  <span>الرقم غير متصل حالياً</span>
                                </div>
                              )}

                              {/* Footer actions */}
                              <div className="wa-inst__footer">
                                <div className="wa-inst__date"><Clock size={11} />{instance.created_at ? new Date(instance.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                                <div className="wa-inst__actions">
                                  {!isConnected && (
                                    <button className="wa-inst__action-btn wa-inst__action-btn--primary" onClick={() => getQRCode(instance.id)}>
                                      <QrCode size={13} />{isConnecting ? 'عرض QR' : 'ربط'}
                                    </button>
                                  )}
                                  <button className="wa-inst__action-btn wa-inst__action-btn--danger" onClick={() => deleteInstance(instance.id)} title="حذف">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══════════ TAB: Send Message ═══════════ */}
            {activeTab === 'send' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title"><Send size={14} />إرسال رسالة</div>
                </div>
                <div className="wa-send-layout">
                  {/* Compose */}
                  <div className="wa-send-card">
                    <div className="wa-send-card__title"><User size={14} />المستلم</div>
                    <div ref={clientDropdownRef} style={{ position: 'relative' }}>
                      <div className="wa-input-icon">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="ابحث عن عميل بالاسم أو الرقم..."
                          value={clientSearch}
                          onChange={e => { setClientSearch(e.target.value); if (sendForm.client_id) setSendForm({ ...sendForm, client_id: '' }); }}
                          className="wa-input"
                        />
                      </div>
                      <AnimatePresence>
                        {showClientDropdown && clients.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="wa-dropdown">
                            {clients.map(c => (
                              <button key={c.id} className="wa-dropdown__item" onClick={() => {
                                setSendForm({ ...sendForm, phone: c.phone, client_id: String(c.id) });
                                setClientSearch(c.name);
                                setShowClientDropdown(false);
                              }}>
                                <User size={13} /><span>{c.name}</span>{c.phone && <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, direction: 'ltr' }}>{c.phone}</span>}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label className="wa-label">رقم الهاتف</label>
                      <div className="wa-input-icon">
                        <Phone size={14} />
                        <input type="tel" placeholder="966501234567" value={sendForm.phone}
                          onChange={e => setSendForm({ ...sendForm, phone: e.target.value })} className="wa-input" dir="ltr" />
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label className="wa-label">نص الرسالة</label>
                      <textarea
                        className="wa-textarea"
                        rows={5}
                        placeholder="اكتب رسالتك هنا..."
                        value={sendForm.message}
                        onChange={e => setSendForm({ ...sendForm, message: e.target.value })}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        <span>{sendForm.message.length} حرف</span>
                        <span>يدعم الرموز التعبيرية والأسطر المتعددة</span>
                      </div>
                    </div>

                    <button
                      className="wa-send-btn"
                      onClick={sendDirectMessage}
                      disabled={sending || !sendForm.phone || !sendForm.message}
                    >
                      {sending ? <Loader2 size={16} className="wa-spin" /> : <Send size={16} />}
                      {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="wa-send-tips">
                    <div className="wa-tip"><Info size={14} /><span>أدخل الرقم بصيغة دولية (966XXXXXXXXX) بدون + أو 00</span></div>
                    <div className="wa-tip"><Info size={14} /><span>يمكنك البحث عن عميل بالاسم واختياره لتعبئة الرقم تلقائياً</span></div>
                    <div className="wa-tip wa-tip--warn"><AlertCircle size={14} /><span>الإرسال المفرط قد يؤدي لحظر الرقم. الحد: 100 رسالة/ساعة</span></div>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════ TAB: Messages Log ═══════════ */}
            {activeTab === 'log' && (
              <>
                {/* Stats Bar */}
                {stats && (
                  <div className="wa-stats-bar">
                    <div className="wa-stat"><span className="wa-stat__value">{stats.total ?? 0}</span><span className="wa-stat__label">إجمالي</span></div>
                    <div className="wa-stat wa-stat--green"><span className="wa-stat__value">{stats.sent ?? 0}</span><span className="wa-stat__label">مرسلة</span></div>
                    <div className="wa-stat wa-stat--blue"><span className="wa-stat__value">{stats.delivered ?? 0}</span><span className="wa-stat__label">وصلت</span></div>
                    <div className="wa-stat wa-stat--red"><span className="wa-stat__value">{stats.failed ?? 0}</span><span className="wa-stat__label">فاشلة</span></div>
                  </div>
                )}

                {/* Filters */}
                <div className="wa-filters">
                  <div className="wa-input-icon" style={{ flex: 1 }}>
                    <Search size={14} />
                    <input type="text" placeholder="بحث بالرقم أو المحتوى..." value={filters.search} className="wa-input"
                      onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />
                  </div>
                  <select className="wa-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
                    <option value="">كل الحالات</option>
                    <option value="sent">مرسلة</option>
                    <option value="delivered">تم التوصيل</option>
                    <option value="read">مقروءة</option>
                    <option value="failed">فاشلة</option>
                    <option value="pending">قيد الإرسال</option>
                  </select>
                  <select className="wa-select" value={filters.direction} onChange={e => setFilters({ ...filters, direction: e.target.value, page: 1 })}>
                    <option value="">كل الاتجاهات</option>
                    <option value="outbound">صادرة</option>
                    <option value="inbound">واردة</option>
                  </select>
                  <button className="wa-icon-btn" onClick={loadMessages} title="تحديث"><RefreshCw size={14} /></button>
                </div>

                {/* Table */}
                <div className="wa-table-wrap">
                  {messagesLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} className="wa-spin" style={{ color: 'var(--status-green)' }} /></div>
                  ) : messages.length === 0 ? (
                    <div className="wa-empty" style={{ padding: 40 }}>
                      <History size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                      <p>لا توجد رسائل</p>
                    </div>
                  ) : (
                    <table className="wa-table">
                      <thead>
                        <tr>
                          <th>الاتجاه</th>
                          <th>الرقم</th>
                          <th>المحتوى</th>
                          <th>الحالة</th>
                          <th>النوع</th>
                          <th>التاريخ</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {messages.map(msg => (
                          <React.Fragment key={msg.id}>
                            <tr className={`wa-table__row ${expandedMsg === msg.id ? 'wa-table__row--expanded' : ''}`} onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}>
                              <td>
                                <span className={`wa-dir-badge wa-dir-badge--${msg.direction}`}>
                                  {msg.direction === 'outbound' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                  {msg.direction === 'outbound' ? 'صادر' : 'وارد'}
                                </span>
                              </td>
                              <td style={{ direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{formatPhone(msg.to_phone || msg.from_phone || '')}</td>
                              <td style={{ maxWidth: 250 }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {msg.message_content?.slice(0, 60)}{msg.message_content?.length > 60 ? '...' : ''}
                                </div>
                              </td>
                              <td>
                                <span className="wa-status-pill" style={{ color: STATUS_MAP[msg.status]?.color, background: STATUS_MAP[msg.status]?.bg }}>
                                  {STATUS_MAP[msg.status]?.label || msg.status}
                                </span>
                              </td>
                              <td><span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{EVENT_LABELS[msg.event_type || ''] || msg.event_type || '—'}</span></td>
                              <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(msg.created_at)}</td>
                              <td>
                                {msg.status === 'failed' && (
                                  <button className="wa-resend-btn" onClick={e => { e.stopPropagation(); resendMessage(msg.id); }} disabled={resending === msg.id}>
                                    {resending === msg.id ? <Loader2 size={13} className="wa-spin" /> : <RotateCcw size={13} />}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expandedMsg === msg.id && (
                              <tr className="wa-table__expand">
                                <td colSpan={7}>
                                  <div className="wa-msg-detail">
                                    <div className="wa-msg-detail__content">{msg.message_content}</div>
                                    <div className="wa-msg-detail__meta">
                                      {msg.user && <span><User size={11} /> {msg.user.name}</span>}
                                      {msg.case && <span><FileText size={11} /> {msg.case.file_number} - {msg.case.title}</span>}
                                      {msg.metadata?.error && <span style={{ color: '#ef4444' }}><AlertCircle size={11} /> {typeof msg.metadata.error === 'string' ? msg.metadata.error : JSON.stringify(msg.metadata.error?.response?.message || msg.metadata.error?.error || 'خطأ')}</span>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {messagesPagination.last_page > 1 && (
                  <div className="wa-pagination">
                    <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}><ChevronRight size={14} /></button>
                    <span>صفحة {messagesPagination.current_page} من {messagesPagination.last_page} ({messagesPagination.total} رسالة)</span>
                    <button disabled={filters.page >= messagesPagination.last_page} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}><ChevronLeft size={14} /></button>
                  </div>
                )}
              </>
            )}

            {/* ═══════════ TAB: Notifications ═══════════ */}
            {activeTab === 'notifications' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title"><Bell size={14} />إعدادات التنبيهات</div>
                </div>
                <div className="whatsapp-section__content">
                  {settings.notification_settings && Object.keys(settings.notification_settings).length > 0 ? (
                    Object.entries(settings.notification_settings).map(([key, setting]: [string, any]) => (
                      <div key={key} className="whatsapp-notification-item">
                        <div className="whatsapp-notification-item__info">
                          <div className="whatsapp-notification-item__title">{NOTIFICATION_TITLES[key] || key}</div>
                          <div className="whatsapp-notification-item__desc">{NOTIFICATION_DESCS[key] || ''}</div>
                        </div>
                        <div className="whatsapp-notification-item__actions">
                          <label className="whatsapp-toggle">
                            <input type="checkbox" className="whatsapp-toggle__checkbox" checked={setting?.enabled ?? false}
                              onChange={e => updateNotificationSetting(key, 'enabled', e.target.checked)} />
                            <span className="whatsapp-toggle__text">مفعل</span>
                          </label>
                          {setting?.enabled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>تأخير:</span>
                              <input type="number" min="0" max="60" className="whatsapp-field__input" style={{ width: 60 }}
                                value={setting?.delay_minutes ?? 0} onChange={e => updateNotificationSetting(key, 'delay_minutes', parseInt(e.target.value))} />
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>دقيقة</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="wa-empty" style={{ padding: 40 }}>
                      <Bell size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                      <p>لا توجد إعدادات تنبيهات. اضغط "إعادة التعيين" لتحميل الافتراضية.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══════════ TAB: Templates ═══════════ */}
            {activeTab === 'templates' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title"><FileText size={14} />قوالب الرسائل</div>
                </div>
                <div className="whatsapp-section__content">
                  {Object.entries(settings.message_templates || {}).map(([key, template]: [string, any]) => (
                    <div key={key} className="whatsapp-template-card">
                      <div className="whatsapp-template-card__header">
                        <span className="whatsapp-template-card__title">{template?.title || key}</span>
                        <span className="wa-tag">{key}</span>
                      </div>
                      <textarea className="whatsapp-template-card__textarea" value={template?.template || ''} rows={3}
                        onChange={e => updateMessageTemplate(key, 'template', e.target.value)} placeholder="اكتب قالب الرسالة..." />
                      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        المتغيرات: {'{client_name}'}, {'{case_number}'}, {'{case_title}'}, {'{procedure_title}'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ═══════════ TAB: Schedule ═══════════ */}
            {activeTab === 'schedule' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title"><Clock size={14} />ساعات العمل</div>
                </div>
                <div className="whatsapp-section__content">
                  {settings.working_hours && Object.keys(settings.working_hours).length > 0 ? (
                    <div className="whatsapp-schedule-grid">
                      {Object.entries(settings.working_hours).map(([day, hours]: [string, any]) => (
                        <div key={day} className="whatsapp-schedule-row">
                          <label className="whatsapp-toggle" style={{ minWidth: 100 }}>
                            <input type="checkbox" className="whatsapp-toggle__checkbox" checked={hours?.enabled ?? false}
                              onChange={e => updateWorkingHour(day, 'enabled', e.target.checked)} />
                            <span className="whatsapp-schedule-row__day">{DAY_NAMES[day] || day}</span>
                          </label>
                          {hours?.enabled && (
                            <div className="whatsapp-schedule-row__inputs">
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>من:</span>
                              <input type="time" className="whatsapp-schedule-row__time" value={hours?.start || '08:00'}
                                onChange={e => updateWorkingHour(day, 'start', e.target.value)} />
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>إلى:</span>
                              <input type="time" className="whatsapp-schedule-row__time" value={hours?.end || '17:00'}
                                onChange={e => updateWorkingHour(day, 'end', e.target.value)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="wa-empty" style={{ padding: 40 }}>
                      <Clock size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }} />
                      <p>لا توجد ساعات عمل. اضغط "إعادة التعيين" لتحميل الافتراضية.</p>
                    </div>
                  )}
                </div>
              </>
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

        </div>
      </div>

      <style>{`
        .wa-spin { animation: wa-spin 1s linear infinite; }
        @keyframes wa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default WhatsappSettings;
