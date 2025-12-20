import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Modal from '../components/Modal';
import {
  MessageSquare,
  Settings,
  Save,
  RefreshCw,
  Send,
  Clock,
  Globe,
  Phone,
  Key,
  Bell,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle
} from 'lucide-react';
import '../styles/whatsapp-settings.css';

interface WhatsappSettings {
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

// API helper function - استخدام ngrok URL
const API_BASE_URL = 'https://amusing-premium-jennet.ngrok-free.app/api';

const api = {
  get: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      }
    });
    return { data: await response.json() };
  },
  put: async (url: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
      body: JSON.stringify(data)
    });
    return { data: await response.json() };
  },
  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
      body: data ? JSON.stringify(data) : undefined
    });
    return { data: await response.json() };
  },
  delete: async (url: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      }
    });
    return { data: await response.json() };
  }
};

const WhatsappSettings: React.FC = () => {
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [testMessage, setTestMessage] = useState({ phone: '', message: '' });
  const [sendingTest, setSendingTest] = useState(false);

  // WhatsApp Instances State
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceDepartment, setNewInstanceDepartment] = useState('');
  const [selectedQRCode, setSelectedQRCode] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // جلب الإعدادات الحقيقية من الـ Backend API
      const response = await api.get('/v1/whatsapp/settings');
      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
      } else {
        // إذا لم توجد إعدادات، استخدم القيم الافتراضية
        const defaultSettings: WhatsappSettings = {
          notifications_enabled: true,
          daily_report_enabled: false,
          daily_report_time: '09:00',
          notification_settings: {},
          message_templates: {},
          working_hours: {}
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات:', error);
      // استخدم القيم الافتراضية في حالة الخطأ
      const defaultSettings: WhatsappSettings = {
        notifications_enabled: true,
        daily_report_enabled: false,
        daily_report_time: '09:00',
        notification_settings: {},
        message_templates: {},
        working_hours: {}
      };
      setSettings(defaultSettings);
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
        // إظهار رسالة نجاح
      }
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setSaving(true);
    try {
      const response = await api.post('/v1/whatsapp/reset-defaults');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('خطأ في إعادة التعيين:', error);
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage.phone || !testMessage.message) return;

    setSendingTest(true);
    try {
      const response = await api.post('/v1/whatsapp/test-message', testMessage);
      if (response.data.success) {
        setTestMessage({ phone: '', message: '' });
        // إظهار رسالة نجاح
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    } finally {
      setSendingTest(false);
    }
  };

  const updateNotificationSetting = (key: string, field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_settings: {
        ...settings.notification_settings,
        [key]: {
          ...settings.notification_settings[key],
          [field]: value
        }
      }
    });
  };

  const updateMessageTemplate = (key: string, field: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      message_templates: {
        ...settings.message_templates,
        [key]: {
          ...settings.message_templates[key],
          [field]: value
        }
      }
    });
  };

  const updateWorkingHour = (day: string, field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      working_hours: {
        ...settings.working_hours,
        [day]: {
          ...settings.working_hours[day],
          [field]: value
        }
      }
    });
  };

  // WhatsApp Instances Functions
  const loadInstances = async () => {
    try {
      // جلب Instances من الـ Backend API
      const response = await api.get('/v1/whatsapp/instances');
      if (response.data.success && response.data.data) {
        const backendInstances = response.data.data.map((inst: any) => ({
          id: String(inst.id),
          instance_name: inst.instance_name,
          phone_number: inst.phone_number,
          status: inst.status || 'disconnected',
          token: inst.token,
          department: inst.department,
          created_at: inst.created_at
        }));
        setInstances(backendInstances);
      } else {
        setInstances([]);
      }
    } catch (error) {
      console.error('خطأ في تحميل instances:', error);
      setInstances([]);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim() || !newInstanceDepartment.trim()) return;

    try {
      console.log('🚀 إنشاء instance جديد عبر Backend API...');

      const response = await api.post('/v1/whatsapp/instances', {
        instance_name: newInstanceName,
        department: newInstanceDepartment
      });

      if (response.data.success && response.data.data) {
        const result = response.data.data;
        console.log('✅ Backend API Response:', result);

        // إضافة instance جديد للقائمة
        const newInstance: WhatsappInstance = {
          id: String(result.id),
          instance_name: result.instance_name,
          status: result.status || 'connecting',
          token: result.token,
          department: result.department,
          created_at: result.created_at
        };

        setInstances(prev => [...prev, newInstance]);
        setNewInstanceName('');
        setNewInstanceDepartment('');
        setShowAddInstance(false);

        // جلب QR Code
        if (result.qr_code) {
          setSelectedQRCode(result.qr_code);
        } else {
          // انتظار قليل ثم جلب QR Code
          setTimeout(async () => {
            await getQRCode(String(result.id));
          }, 2000);
        }

        // مراقبة حالة الاتصال
        const checkStatus = setInterval(async () => {
          try {
            const statusResponse = await api.get(`/v1/whatsapp/instances/${result.id}/status`);
            if (statusResponse.data.success && statusResponse.data.data) {
              const statusData = statusResponse.data.data;

              if (statusData.status === 'connected') {
                console.log('🎉 تم الاتصال بنجاح!');

                setInstances(prev => prev.map(instance =>
                  instance.id === String(result.id)
                    ? {
                      ...instance,
                      status: 'connected',
                      phone_number: statusData.phone_number
                    }
                    : instance
                ));

                setSelectedQRCode(null);
                clearInterval(checkStatus);
                alert('🎉 تم ربط الواتساب بنجاح!');
              }
            }
          } catch (error) {
            console.log('⚠️ خطأ في فحص الحالة:', error);
          }
        }, 3000);

        // إيقاف الفحص بعد 60 ثانية
        setTimeout(() => clearInterval(checkStatus), 60000);

      } else {
        throw new Error(response.data.message || 'فشل في إنشاء Instance');
      }
    } catch (error) {
      console.error('❌ خطأ في إنشاء Instance:', error);
      alert(`خطأ في إنشاء Instance: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  const deleteInstance = async (instanceId: string) => {
    const instance = instances.find(inst => inst.id === instanceId);
    if (!instance) return;

    try {
      console.log('🗑️ حذف instance عبر Backend API:', instanceId);

      const response = await api.delete(`/v1/whatsapp/instances/${instanceId}`);

      if (response.data.success) {
        console.log('✅ تم حذف Instance بنجاح');
        // حذف من القائمة
        setInstances(prev => prev.filter(inst => inst.id !== instanceId));
      } else {
        throw new Error(response.data.message || 'فشل في حذف Instance');
      }
    } catch (error) {
      console.error('❌ خطأ في حذف instance:', error);
      alert(`خطأ في حذف Instance: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  const getQRCode = async (instanceId: string) => {
    try {
      console.log('📱 جلب QR Code من Backend API للـ instance:', instanceId);

      const response = await api.get(`/v1/whatsapp/instances/${instanceId}/qr`);

      if (response.data.success && response.data.data) {
        const result = response.data.data;
        console.log('✅ QR Code Response:', result);

        const qrData = result.qr_code || result.qrcode || result.base64;

        if (qrData) {
          if (typeof qrData === 'string') {
            if (qrData.startsWith('data:image')) {
              setSelectedQRCode(qrData);
            } else if (qrData.startsWith('http')) {
              setSelectedQRCode(qrData);
            } else {
              // نص QR - تحويله لـ QR Code
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
              setSelectedQRCode(qrImageUrl);
            }
          }
        } else {
          throw new Error('لم يتم العثور على QR Code في الاستجابة');
        }
      } else {
        throw new Error(response.data.message || 'فشل في جلب QR Code');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب QR Code:', error);
      alert(`خطأ في الحصول على QR Code: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  // تجربة الاتصال مع Evolution API
  const testEvolutionAPI = async () => {
    try {
      console.log('🧪 اختبار الاتصال مع Evolution API...');
      const response = await fetch('http://localhost:8080/', {
        headers: {
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Evolution API متاح:', result);
        alert('✅ Evolution API يعمل بشكل صحيح!');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Evolution API غير متاح:', error);
      alert('❌ Evolution API غير متاح. تأكد من تشغيله على localhost:8080');
    }
  };

  // تحميل instances عند تحميل الصفحة
  useEffect(() => {
    if (activeTab === 'instances') {
      loadInstances();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">فشل في تحميل الإعدادات</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'الإعدادات العامة', icon: Settings },
    { id: 'instances', name: 'أرقام الواتساب', icon: Smartphone },
    { id: 'notifications', name: 'التنبيهات', icon: Bell },
    { id: 'templates', name: 'قوالب الرسائل', icon: FileText },
    { id: 'schedule', name: 'جدولة العمل', icon: Clock },
    { id: 'test', name: 'اختبار الإرسال', icon: Send }
  ];

  return (
    <div className="whatsapp-page">
      {/* Header */}
      <div className="whatsapp-header">
        <div className="whatsapp-header__title-area">
          <h1>
            <MessageSquare size={18} />
            إعدادات الواتساب
          </h1>
          <p>إدارة إعدادات التنبيهات والرسائل عبر الواتساب</p>
        </div>
        <div className="whatsapp-header__actions">
          <button
            className="whatsapp-header__btn"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RefreshCw size={16} />
            إعادة التعيين
          </button>
          <button
            className="whatsapp-header__btn whatsapp-header__btn--primary"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <div className="whatsapp-spinner"></div>
            ) : (
              <Save size={16} />
            )}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="whatsapp-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`whatsapp-tab ${activeTab === tab.id ? 'whatsapp-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="whatsapp-content">
        <div className="whatsapp-section">
          <div className="whatsapp-section__content">
            {activeTab === 'general' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <Settings size={14} />
                    </div>
                    الإعدادات العامة
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  <div className="whatsapp-form-grid">
                    <div className="whatsapp-field">
                      <label className="whatsapp-field__label">
                        <Globe size={14} />
                        رابط الـ Webhook
                      </label>
                      <input
                        type="url"
                        className="whatsapp-field__input"
                        value={settings.webhook_url || ''}
                        onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                        placeholder="https://example.com/webhook"
                      />
                    </div>

                    <div className="whatsapp-field">
                      <label className="whatsapp-field__label">
                        <Phone size={14} />
                        معرف رقم الهاتف
                      </label>
                      <input
                        type="text"
                        className="whatsapp-field__input"
                        value={settings.phone_number_id || ''}
                        onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                        placeholder="Phone Number ID"
                      />
                    </div>

                    <div className="whatsapp-field">
                      <label className="whatsapp-field__label">
                        <Key size={14} />
                        رمز الوصول
                      </label>
                      <input
                        type="password"
                        className="whatsapp-field__input"
                        value={settings.access_token || ''}
                        onChange={(e) => setSettings({ ...settings, access_token: e.target.value })}
                        placeholder="Access Token"
                      />
                    </div>

                    <div className="whatsapp-field">
                      <label className="whatsapp-field__label">
                        <Key size={14} />
                        رمز التحقق
                      </label>
                      <input
                        type="text"
                        className="whatsapp-field__input"
                        value={settings.verify_token || ''}
                        onChange={(e) => setSettings({ ...settings, verify_token: e.target.value })}
                        placeholder="Verify Token"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <label className="whatsapp-toggle">
                      <input
                        type="checkbox"
                        className="whatsapp-toggle__checkbox"
                        checked={settings.notifications_enabled}
                        onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                      />
                      <span className="whatsapp-toggle__text">تفعيل التنبيهات</span>
                    </label>

                    <label className="whatsapp-toggle">
                      <input
                        type="checkbox"
                        className="whatsapp-toggle__checkbox"
                        checked={settings.daily_report_enabled}
                        onChange={(e) => setSettings({ ...settings, daily_report_enabled: e.target.checked })}
                      />
                      <span className="whatsapp-toggle__text">تفعيل التقرير اليومي</span>
                    </label>

                    {settings.daily_report_enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>في تمام الساعة:</span>
                        <input
                          type="time"
                          className="whatsapp-field__input"
                          style={{ width: 'auto' }}
                          value={settings.daily_report_time}
                          onChange={(e) => setSettings({ ...settings, daily_report_time: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'instances' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <Smartphone size={14} />
                    </div>
                    إدارة أرقام الواتساب
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="whatsapp-header__btn" onClick={testEvolutionAPI}>
                      🧪 اختبار API
                    </button>
                    <button className="whatsapp-header__btn whatsapp-header__btn--success" onClick={() => setShowAddInstance(true)}>
                      <Plus size={16} />
                      إضافة رقم جديد
                    </button>
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  <div className="whatsapp-instances-grid">
                    {instances.map((instance) => (
                      <div key={instance.id} className="whatsapp-instance-card">
                        <div className="whatsapp-instance-card__header">
                          <div>
                            <h4 className="whatsapp-instance-card__name">{instance.instance_name}</h4>
                            <p className="whatsapp-instance-card__dept">{instance.department}</p>
                          </div>
                          <div className="whatsapp-instance-card__status">
                            {instance.status === 'connected' && <CheckCircle size={18} className="whatsapp-instance-card__status--connected" />}
                            {instance.status === 'connecting' && <div className="whatsapp-spinner whatsapp-instance-card__status--connecting"></div>}
                            {instance.status === 'disconnected' && <XCircle size={18} className="whatsapp-instance-card__status--disconnected" />}
                            <button className="whatsapp-instance-card__delete" onClick={() => deleteInstance(instance.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="whatsapp-instance-card__info">
                          <div className="whatsapp-instance-card__row">
                            <span>الحالة:</span>
                            <span className="whatsapp-instance-card__value" style={{ color: instance.status === 'connected' ? 'var(--status-green)' : instance.status === 'connecting' ? 'var(--status-orange)' : 'var(--status-red)' }}>
                              {instance.status === 'connected' ? 'متصل' : instance.status === 'connecting' ? 'جاري الاتصال' : 'غير متصل'}
                            </span>
                          </div>
                          {instance.phone_number && (
                            <div className="whatsapp-instance-card__row">
                              <span>الرقم:</span>
                              <span className="whatsapp-instance-card__value">{instance.phone_number}</span>
                            </div>
                          )}
                        </div>
                        <div className="whatsapp-instance-card__actions">
                          {instance.status === 'disconnected' && (
                            <button className="whatsapp-instance-card__btn whatsapp-instance-card__btn--primary" onClick={() => getQRCode(instance.instance_name)}>
                              <QrCode size={14} />
                              عرض رمز QR
                            </button>
                          )}
                          {instance.status === 'connecting' && (
                            <button className="whatsapp-instance-card__btn whatsapp-instance-card__btn--warning" onClick={async () => {
                              try {
                                const response = await fetch(`http://localhost:8080/instance/fetchInstances`, { headers: { 'apikey': '429683C4C977415CAAFCCE10F7D57E11' } });
                                const instancesData = await response.json();
                                const current = instancesData.find((inst: any) => inst.instanceName === instance.instance_name);
                                if (current?.connectionStatus === 'open') {
                                  setInstances(prev => prev.map(inst => inst.id === instance.id ? { ...inst, status: 'connected', phone_number: current.phoneNumber || '+966xxxxxxxxx' } : inst));
                                  alert('🎉 تم الاتصال!');
                                }
                              } catch (error) { console.error('خطأ في التحديث:', error); }
                            }}>
                              🔄 تحديث الحالة
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <Bell size={14} />
                    </div>
                    إعدادات التنبيهات
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  {Object.entries(settings.notification_settings).map(([key, setting]: [string, any]) => (
                    <div key={key} className="whatsapp-notification-item">
                      <div className="whatsapp-notification-item__info">
                        <div className="whatsapp-notification-item__title">{getNotificationTitle(key)}</div>
                        <div className="whatsapp-notification-item__desc">{getNotificationDescription(key)}</div>
                      </div>
                      <div className="whatsapp-notification-item__actions">
                        <label className="whatsapp-toggle">
                          <input
                            type="checkbox"
                            className="whatsapp-toggle__checkbox"
                            checked={setting.enabled}
                            onChange={(e) => updateNotificationSetting(key, 'enabled', e.target.checked)}
                          />
                          <span className="whatsapp-toggle__text">مفعل</span>
                        </label>
                        {setting.enabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>تأخير:</span>
                            <input
                              type="number"
                              min="0"
                              max="60"
                              className="whatsapp-field__input"
                              style={{ width: '60px' }}
                              value={setting.delay_minutes}
                              onChange={(e) => updateNotificationSetting(key, 'delay_minutes', parseInt(e.target.value))}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>دقيقة</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'templates' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <FileText size={14} />
                    </div>
                    قوالب الرسائل
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  {Object.entries(settings.message_templates).map(([key, template]: [string, any]) => (
                    <div key={key} className="whatsapp-template-card">
                      <div className="whatsapp-template-card__header">
                        <span className="whatsapp-template-card__title">{template.title}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--quiet-gray-200)', borderRadius: '4px', color: 'var(--color-text-secondary)' }}>{key}</span>
                      </div>
                      <textarea
                        className="whatsapp-template-card__textarea"
                        value={template.template}
                        onChange={(e) => updateMessageTemplate(key, 'template', e.target.value)}
                        rows={3}
                        placeholder="اكتب قالب الرسالة هنا..."
                      />
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        يمكنك استخدام المتغيرات مثل: {'{client_name}'}, {'{case_number}'}, {'{case_title}'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'schedule' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <Clock size={14} />
                    </div>
                    ساعات العمل
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  <div className="whatsapp-schedule-grid">
                    {Object.entries(settings.working_hours).map(([day, hours]: [string, any]) => (
                      <div key={day} className="whatsapp-schedule-row">
                        <label className="whatsapp-toggle" style={{ minWidth: '100px' }}>
                          <input
                            type="checkbox"
                            className="whatsapp-toggle__checkbox"
                            checked={hours.enabled}
                            onChange={(e) => updateWorkingHour(day, 'enabled', e.target.checked)}
                          />
                          <span className="whatsapp-schedule-row__day">{getDayName(day)}</span>
                        </label>
                        {hours.enabled && (
                          <div className="whatsapp-schedule-row__inputs">
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>من:</span>
                            <input
                              type="time"
                              className="whatsapp-schedule-row__time"
                              value={hours.start}
                              onChange={(e) => updateWorkingHour(day, 'start', e.target.value)}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>إلى:</span>
                            <input
                              type="time"
                              className="whatsapp-schedule-row__time"
                              value={hours.end}
                              onChange={(e) => updateWorkingHour(day, 'end', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'test' && (
              <>
                <div className="whatsapp-section__header">
                  <div className="whatsapp-section__title">
                    <div className="whatsapp-section__title-icon">
                      <Send size={14} />
                    </div>
                    اختبار إرسال الرسائل
                  </div>
                </div>
                <div className="whatsapp-section__content">
                  <div className="whatsapp-test">
                    <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--status-orange-light)', border: '1px solid var(--status-orange)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <AlertCircle size={18} style={{ color: 'var(--status-orange)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--status-orange)', marginBottom: '4px' }}>تنبيه</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>تأكد من إدخال إعدادات الواتساب الصحيحة قبل إرسال رسائل الاختبار</div>
                      </div>
                    </div>

                    <div className="whatsapp-form-grid">
                      <div className="whatsapp-field">
                        <label className="whatsapp-field__label">رقم الهاتف (مع رمز البلد)</label>
                        <input
                          type="tel"
                          className="whatsapp-field__input"
                          value={testMessage.phone}
                          onChange={(e) => setTestMessage({ ...testMessage, phone: e.target.value })}
                          placeholder="966501234567"
                        />
                      </div>
                      <div className="whatsapp-field">
                        <label className="whatsapp-field__label">نص الرسالة</label>
                        <textarea
                          className="whatsapp-template-card__textarea"
                          value={testMessage.message}
                          onChange={(e) => setTestMessage({ ...testMessage, message: e.target.value })}
                          rows={3}
                          placeholder="اكتب رسالة الاختبار هنا..."
                        />
                      </div>
                    </div>

                    <button
                      className="whatsapp-header__btn whatsapp-header__btn--success"
                      onClick={sendTestMessage}
                      disabled={sendingTest || !testMessage.phone || !testMessage.message}
                    >
                      {sendingTest ? (
                        <div className="whatsapp-spinner"></div>
                      ) : (
                        <Send size={14} />
                      )}
                      إرسال رسالة اختبار
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal إضافة instance جديد */}
          <Modal
            isOpen={showAddInstance}
            onClose={() => setShowAddInstance(false)}
            title="إضافة رقم واتساب جديد"
            size="sm"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '4px'
                }}>
                  اسم المثيل
                </label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="مثال: reception_whatsapp"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '4px'
                }}>
                  القسم
                </label>
                <select
                  value={newInstanceDepartment}
                  onChange={(e) => setNewInstanceDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: 'var(--font-size-sm)',
                    outline: 'none'
                  }}
                >
                  <option value="">اختر القسم</option>
                  <option value="الاستقبال">الاستقبال</option>
                  <option value="المحاسبة">المحاسبة</option>
                  <option value="القانونية">الشؤون القانونية</option>
                  <option value="الإدارة">الإدارة</option>
                  <option value="المتابعة">المتابعة</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowAddInstance(false)}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-gray-100)',
                    color: 'var(--color-text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createInstance}
                  disabled={!newInstanceName.trim() || !newInstanceDepartment.trim()}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                    opacity: (!newInstanceName.trim() || !newInstanceDepartment.trim()) ? 0.5 : 1
                  }}
                >
                  إنشاء
                </motion.button>
              </div>
            </div>
          </Modal>

          {/* Modal عرض QR Code */}
          <Modal
            isOpen={!!selectedQRCode}
            onClose={() => setSelectedQRCode(null)}
            title="امسح رمز QR للربط"
            size="sm"
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-gray-100)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  <img
                    src={selectedQRCode || ''}
                    alt="QR Code"
                    style={{
                      width: '192px',
                      height: '192px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: '16px'
              }}>
                <p>1. افتح واتساب على هاتفك</p>
                <p>2. اذهب إلى الإعدادات {'>'} الأجهزة المرتبطة</p>
                <p>3. اضغط "ربط جهاز" وامسح الكود</p>
              </div>

              <button
                onClick={() => setSelectedQRCode(null)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer'
                }}
              >
                إغلاق
              </button>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getNotificationTitle = (key: string): string => {
  const titles: Record<string, string> = {
    case_created: 'إشعار قضية جديدة',
    case_updated: 'تحديث القضية',
    hearing_reminder: 'تذكير بجلسة محكمة',
    document_request: 'طلب وثائق',
    payment_reminder: 'تذكير بالدفع',
    lawyer_assigned: 'تعيين محامي',
    new_document_uploaded: 'رفع وثيقة جديدة'
  };
  return titles[key] || key;
};

const getNotificationDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    case_created: 'إشعار العميل عند إنشاء قضية جديدة',
    case_updated: 'إشعار العميل عند تحديث حالة القضية',
    hearing_reminder: 'تذكير العميل بمواعيد الجلسات',
    document_request: 'طلب وثائق من العميل',
    payment_reminder: 'تذكير العميل بالمستحقات المالية',
    lawyer_assigned: 'إشعار العميل عند تعيين محامي للقضية',
    new_document_uploaded: 'إشعار المحامي عند رفع وثيقة جديدة'
  };
  return descriptions[key] || 'وصف غير متوفر';
};

const getDayName = (day: string): string => {
  const days: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت'
  };
  return days[day] || day;
};

export default WhatsappSettings;
