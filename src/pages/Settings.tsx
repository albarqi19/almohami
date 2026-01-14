import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Monitor,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Cloud,
  Link,
  Loader2,
  AlertCircle,
  Building2,
  CreditCard,
  Receipt,
  Save,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Image,
  Upload,
  ShieldCheck
} from 'lucide-react';
import NotificationSettings from '../components/NotificationSettings';
import TiptapEditor from '../components/TiptapEditor';
import { downloadInvoice, InvoicePreviewModal } from '../components/InvoiceDownload';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/settings-page.css';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('notifications');

  // Check URL hash or state for initial tab
  useEffect(() => {
    // Check if there's a hash in the URL (e.g., /settings#subscription)
    if (location.hash) {
      const tabFromHash = location.hash.replace('#', '');
      setActiveTab(tabFromHash);
    }
    // Check if there's a state passed via navigation
    else if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location]);

  const tabs: SettingsTab[] = [
    { id: 'notifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'najiz', label: 'إعدادات ناجز', icon: Cloud, roles: ['admin'] },
    { id: 'profile', label: 'الملف الشخصي', icon: User, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'appearance', label: 'المظهر', icon: Palette, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'privacy', label: 'الخصوصية والأمان', icon: Shield, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'language', label: 'اللغة والمنطقة', icon: Globe, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'system', label: 'النظام', icon: Database, roles: ['admin'] },
    { id: 'company', label: 'إعدادات الشركة', icon: Building2, roles: ['admin'] },
    { id: 'branding', label: 'هوية الشركة', icon: Image, roles: ['admin'] },
    { id: 'company_policy', label: 'سياسة الشركة', icon: ShieldCheck, roles: ['admin'] },
    { id: 'subscription', label: 'الاشتراك', icon: CreditCard, roles: ['admin'] },
    { id: 'invoices', label: 'الفواتير', icon: Receipt, roles: ['admin'] },
  ];

  // الحصول على دور المستخدم من AuthContext
  const userRole = user?.role || 'client';
  const visibleTabs = tabs.filter(tab => tab.roles.includes(userRole));

  // Najiz Settings State
  const [najizSettings, setNajizSettings] = useState({
    auto_link_lawyers: true,
    send_whatsapp_on_import: false,
    default_case_priority: 'medium'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Company Settings State
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    license_number: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Branding Settings State
  const [branding, setBranding] = useState({
    primary_color: '#C5A059',
    secondary_color: '#1a1a1a',
    logo_url: '',
    tagline: ''
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState('');

  // Subscription State
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [plansData, setPlansData] = useState<any>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  // Policy Settings State
  const [policySettings, setPolicySettings] = useState({
    enabled: false,
    title: 'سياسة الالتزام والأمان',
    content: '',
    interval_days: 10,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    national_id: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);

  // PIN Change State (for clients)
  const [pinForm, setPinForm] = useState({
    current_pin: '',
    new_pin: '',
    confirm_pin: ''
  });
  const [changingPin, setChangingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState({ type: '', text: '' });

  // Load Najiz settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const response: any = await apiClient.get('/tenant/settings');
        if (response.success) {
          setNajizSettings(prev => ({ ...prev, ...response.data }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Load Company Info and Branding
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response: any = await apiClient.get('/tenant');
        if (response.success && response.data?.tenant) {
          const tenant = response.data.tenant;
          setCompanyInfo({
            name: tenant.name || '',
            email: tenant.email || '',
            phone: tenant.phone || '',
            address: tenant.address || '',
            license_number: tenant.license_number || ''
          });
          // Load branding data
          setBranding({
            primary_color: tenant.primary_color || '#C5A059',
            secondary_color: tenant.secondary_color || '#1a1a1a',
            logo_url: tenant.logo_url || tenant.logo || '',
            tagline: tenant.tagline || ''
          });
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      }
    };
    loadCompanyInfo();
  }, []);

  // Load Subscription
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        setLoadingSubscription(true);
        const response: any = await apiClient.get('/subscription/current');
        if (response.success && response.data) {
          // API returns: { tenant, subscription, is_trial, trial_days_remaining, has_active_subscription, can_access_system }
          setSubscription({
            ...response.data.subscription,
            status: response.data.is_trial ? 'trial' :
              response.data.has_active_subscription ? 'active' : 'expired',
            is_trial: response.data.is_trial,
            trial_ends_at: response.data.tenant?.trial_ends_at,
            trial_days_remaining: response.data.trial_days_remaining,
          });
          // حفظ معلومات الشركة للفواتير
          if (response.data.tenant) {
            setTenantInfo({
              name: response.data.tenant.name,
              email: response.data.tenant.email,
              phone: response.data.tenant.phone,
              address: response.data.tenant.address,
            });
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    loadSubscription();
  }, []);

  // Load Invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const response: any = await apiClient.get('/subscription/invoices');
        console.log('Invoices API Response:', response);
        if (response.success && response.data) {
          // Laravel paginate يرجع البيانات في data.data
          const invoicesData = response.data.data || response.data.invoices || response.data;
          setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        }
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    loadInvoices();
  }, []);

  // Load Plans Pricing
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const response: any = await apiClient.get('/subscription/plans');
        if (response.success && response.data) {
          setPlansData(response.data);
        }
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  // Handle Online Subscription Payment
  const handleOnlineSubscribe = async (plan: 'monthly' | 'yearly') => {
    try {
      setSubscribing(true);
      const response: any = await apiClient.post('/subscription/subscribe', {
        plan,
        payment_method: 'online',
        payment_gateway: 'streampay'
      });

      if (response.success && response.data?.payment_url) {
        // Redirect to StreamPay payment page
        window.location.href = response.data.payment_url;
      } else {
        alert(response.message || 'فشل في إنشاء رابط الدفع');
      }
    } catch (error: any) {
      console.error('Error subscribing:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الاشتراك');
    } finally {
      setSubscribing(false);
      setShowPlanModal(false);
    }
  };

  // Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء الاشتراك؟ سيبقى نشطاً حتى نهاية المدة المدفوعة.')) {
      return;
    }

    try {
      const response: any = await apiClient.post('/subscription/cancel');
      if (response.success) {
        alert('تم إلغاء الاشتراك بنجاح');
        // Reload subscription data
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      alert(error.response?.data?.message || 'فشل في إلغاء الاشتراك');
    }
  };

  // Load Policy Settings
  useEffect(() => {
    const loadPolicySettings = async () => {
      if (userRole !== 'admin') return;

      try {
        const response: any = await apiClient.get('/tenant/advanced-settings/group/policy');
        if (response.success && response.data?.settings) {
          const settings = response.data.settings;
          setPolicySettings({
            enabled: settings.company_policy_enabled?.value === true || settings.company_policy_enabled?.value === 'true',
            title: settings.company_policy_title?.value || 'سياسة الالتزام والأمان',
            content: settings.company_policy_content?.value || '',
            interval_days: parseInt(settings.company_policy_interval_days?.value) || 10,
          });
        }
      } catch (error) {
        console.error('Error loading policy settings:', error);
      }
    };

    loadPolicySettings();
  }, [userRole]);

  // Load User Profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response: any = await apiClient.get('/auth/me');
        if (response.success && response.data) {
          const user = response.data.user || response.data;
          setUserProfile({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            national_id: user.national_id || ''
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, []);

  // Save User Profile
  const saveUserProfile = async () => {
    try {
      setSavingProfile(true);
      const response: any = await apiClient.put('/auth/profile', userProfile);
      if (response.success) {
        setSettingsMessage('تم حفظ الملف الشخصي بنجاح');
        setTimeout(() => setSettingsMessage(''), 3000);
      }
    } catch (error) {
      setSettingsMessage('حدث خطأ أثناء حفظ الملف الشخصي');
      console.error('Error saving user profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Company Info
  const saveCompanyInfo = async () => {
    try {
      setSavingCompany(true);
      const response: any = await apiClient.put('/tenant', companyInfo);
      if (response.success) {
        setSettingsMessage('تم حفظ معلومات الشركة بنجاح');
        setTimeout(() => setSettingsMessage(''), 3000);
      }
    } catch (error) {
      setSettingsMessage('حدث خطأ أثناء حفظ معلومات الشركة');
      console.error('Error saving company info:', error);
    } finally {
      setSavingCompany(false);
    }
  };

  // Save Branding Settings
  const saveBranding = async () => {
    try {
      setSavingBranding(true);
      setBrandingMessage('');
      const response: any = await apiClient.put('/tenant', branding);
      if (response.success) {
        setBrandingMessage('تم حفظ هوية الشركة بنجاح');
        setTimeout(() => setBrandingMessage(''), 3000);
      }
    } catch (error) {
      setBrandingMessage('حدث خطأ أثناء حفظ هوية الشركة');
      console.error('Error saving branding:', error);
    } finally {
      setSavingBranding(false);
    }
  };


  // Save Najiz settings
  const saveNajizSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMessage('');
      const response: any = await apiClient.patch('/tenant/settings', najizSettings);
      if (response.success) {
        setSettingsMessage('تم حفظ الإعدادات بنجاح');
        setTimeout(() => setSettingsMessage(''), 3000);
      }
    } catch (error) {
      setSettingsMessage('حدث خطأ أثناء حفظ الإعدادات');
      console.error('Error saving settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Policy Settings
  const savePolicySettings = async () => {
    try {
      setSavingPolicy(true);
      const response: any = await apiClient.put('/tenant/advanced-settings', {
        settings: {
          company_policy_enabled: policySettings.enabled,
          company_policy_title: policySettings.title,
          company_policy_content: policySettings.content,
          company_policy_interval_days: policySettings.interval_days,
        },
      });

      if (response.success) {
        setSettingsMessage('تم حفظ إعدادات السياسة بنجاح');
        setTimeout(() => setSettingsMessage(''), 3000);
      }
    } catch (error) {
      setSettingsMessage('حدث خطأ أثناء حفظ إعدادات السياسة');
      console.error('Error saving policy settings:', error);
    } finally {
      setSavingPolicy(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationSettings />;

      case 'najiz':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Cloud size={14} />
              </div>
              <span className="settings-section__title">إعدادات ناجز</span>
            </div>
            <div className="settings-section__content">
              {loadingSettings ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري تحميل الإعدادات...</span>
                </div>
              ) : (
                <>
                  <div className="settings-option-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Link size={20} />
                      <div>
                        <div className="settings-option-card__title">ربط المحامين تلقائياً بالقضايا</div>
                        <div className="settings-option-card__desc">
                          عند استيراد القضايا من ناجز، يتم ربط المحامين تلقائياً بالقضايا بناءً على رقم الهوية.
                          <br />
                          <strong>ملاحظة:</strong> يجب أن يكون المحامي مسجلاً في النظام مسبقاً برقم هويته.
                        </div>
                      </div>
                    </div>
                    <div className="settings-option-card__actions" style={{ marginTop: '12px' }}>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={najizSettings.auto_link_lawyers}
                          onChange={(e) => setNajizSettings(prev => ({
                            ...prev,
                            auto_link_lawyers: e.target.checked
                          }))}
                        />
                        <span className="settings-toggle__slider"></span>
                        <span style={{ marginRight: '12px' }}>
                          {najizSettings.auto_link_lawyers ? 'مفعّل' : 'معطّل'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-btn-group" style={{ marginTop: '20px' }}>
                    <button
                      className="settings-btn settings-btn--primary"
                      onClick={saveNajizSettings}
                      disabled={savingSettings}
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          جاري الحفظ...
                        </>
                      ) : (
                        'حفظ الإعدادات'
                      )}
                    </button>
                    {settingsMessage && (
                      <span style={{
                        color: settingsMessage.includes('خطأ') ? '#ef4444' : '#22c55e',
                        marginRight: '12px'
                      }}>
                        {settingsMessage}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <User size={14} />
              </div>
              <span className="settings-section__title">الملف الشخصي</span>
            </div>
            <div className="settings-section__content">
              <div className="settings-form-grid">
                <div className="settings-field">
                  <label className="settings-field__label">الاسم الكامل <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>(غير قابل للتعديل)</span></label>
                  <input
                    type="text"
                    className="settings-field__input settings-field__input--disabled"
                    value={userProfile.name}
                    disabled
                    style={{ backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">رقم الهوية الوطنية <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>(غير قابل للتعديل)</span></label>
                  <input
                    type="text"
                    className="settings-field__input settings-field__input--disabled"
                    value={userProfile.national_id}
                    disabled
                    style={{ backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="settings-field__input"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    disabled={!editingProfile}
                    style={!editingProfile ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">رقم الهاتف</label>
                  <input
                    type="tel"
                    className="settings-field__input"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+966501234567"
                    disabled={!editingProfile}
                    style={!editingProfile ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
              </div>

              <div className="settings-btn-group">
                {!editingProfile ? (
                  <button
                    className="settings-btn settings-btn--secondary"
                    onClick={() => setEditingProfile(true)}
                  >
                    ✏️ تعديل البيانات
                  </button>
                ) : (
                  <>
                    <button
                      className="settings-btn settings-btn--primary"
                      onClick={async () => {
                        await saveUserProfile();
                        setEditingProfile(false);
                      }}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <><Loader2 className="animate-spin" size={16} /> جاري الحفظ...</>
                      ) : (
                        <><Save size={16} /> حفظ التغييرات</>
                      )}
                    </button>
                    <button
                      className="settings-btn"
                      onClick={() => setEditingProfile(false)}
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Palette size={14} />
              </div>
              <span className="settings-section__title">المظهر والثيم</span>
            </div>
            <div className="settings-section__content">
              <div style={{ marginBottom: '20px' }}>
                <label className="settings-field__label" style={{ marginBottom: '10px', display: 'block' }}>وضع الألوان</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'light', label: 'فاتح', icon: Sun },
                    { id: 'dark', label: 'داكن', icon: Moon },
                    { id: 'system', label: 'حسب النظام', icon: Monitor }
                  ].map((theme) => (
                    <label key={theme.id} className="settings-radio-option">
                      <input
                        type="radio"
                        name="theme"
                        value={theme.id}
                        defaultChecked={theme.id === 'light'}
                      />
                      <theme.icon className="settings-radio-option__icon" />
                      <span className="settings-radio-option__text">{theme.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-field__label">حجم الخط</label>
                <select className="settings-field__select" style={{ width: '150px' }}>
                  <option value="small">صغير</option>
                  <option value="medium" selected>متوسط</option>
                  <option value="large">كبير</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        // Handle PIN change for clients
        const handlePinChange = async () => {
          if (!pinForm.current_pin || !pinForm.new_pin || !pinForm.confirm_pin) {
            setPinMessage({ type: 'error', text: 'جميع الحقول مطلوبة' });
            return;
          }
          if (pinForm.new_pin.length !== 4 || !/^\d{4}$/.test(pinForm.new_pin)) {
            setPinMessage({ type: 'error', text: 'رمز PIN يجب أن يكون 4 أرقام' });
            return;
          }
          if (pinForm.new_pin !== pinForm.confirm_pin) {
            setPinMessage({ type: 'error', text: 'رمز PIN الجديد غير متطابق' });
            return;
          }

          try {
            setChangingPin(true);
            const response: any = await apiClient.put('/client/change-pin', {
              current_pin: pinForm.current_pin,
              new_pin: pinForm.new_pin
            });
            if (response.success) {
              setPinMessage({ type: 'success', text: 'تم تغيير رمز PIN بنجاح' });
              setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
              setTimeout(() => setPinMessage({ type: '', text: '' }), 3000);
            } else {
              setPinMessage({ type: 'error', text: response.message || 'فشل في تغيير رمز PIN' });
            }
          } catch (error: any) {
            setPinMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء تغيير رمز PIN' });
          } finally {
            setChangingPin(false);
          }
        };

        return (
          <>
            {/* PIN Change Section - For Clients */}
            {userRole === 'client' && (
              <div className="settings-section">
                <div className="settings-section__header">
                  <div className="settings-section__icon">
                    <Shield size={14} />
                  </div>
                  <span className="settings-section__title">تغيير رمز PIN</span>
                </div>
                <div className="settings-section__content">
                  <div className="settings-form-grid">
                    <div className="settings-field">
                      <label className="settings-field__label">رمز PIN الحالي</label>
                      <input
                        type="password"
                        className="settings-field__input"
                        value={pinForm.current_pin}
                        onChange={(e) => setPinForm(prev => ({ ...prev, current_pin: e.target.value }))}
                        placeholder="****"
                        maxLength={4}
                        pattern="\d{4}"
                      />
                    </div>
                    <div className="settings-field">
                      <label className="settings-field__label">رمز PIN الجديد</label>
                      <input
                        type="password"
                        className="settings-field__input"
                        value={pinForm.new_pin}
                        onChange={(e) => setPinForm(prev => ({ ...prev, new_pin: e.target.value }))}
                        placeholder="****"
                        maxLength={4}
                        pattern="\d{4}"
                      />
                    </div>
                    <div className="settings-field">
                      <label className="settings-field__label">تأكيد رمز PIN الجديد</label>
                      <input
                        type="password"
                        className="settings-field__input"
                        value={pinForm.confirm_pin}
                        onChange={(e) => setPinForm(prev => ({ ...prev, confirm_pin: e.target.value }))}
                        placeholder="****"
                        maxLength={4}
                        pattern="\d{4}"
                      />
                    </div>
                  </div>

                  {pinMessage.text && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      marginTop: '12px',
                      background: pinMessage.type === 'error' ? 'var(--status-red-light)' : 'var(--status-green-light)',
                      color: pinMessage.type === 'error' ? 'var(--status-red)' : 'var(--status-green)',
                      fontSize: '13px'
                    }}>
                      {pinMessage.text}
                    </div>
                  )}

                  <div className="settings-btn-group" style={{ marginTop: '16px' }}>
                    <button
                      className="settings-btn settings-btn--primary"
                      onClick={handlePinChange}
                      disabled={changingPin}
                    >
                      {changingPin ? (
                        <><Loader2 className="animate-spin" size={16} /> جاري التغيير...</>
                      ) : (
                        'تغيير رمز PIN'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password Change Section - For Non-Clients */}
            {userRole !== 'client' && (
              <div className="settings-section">
                <div className="settings-section__header">
                  <div className="settings-section__icon">
                    <Shield size={14} />
                  </div>
                  <span className="settings-section__title">كلمة المرور</span>
                </div>
                <div className="settings-section__content">
                  <div className="settings-option-card">
                    <div className="settings-option-card__title">تغيير كلمة المرور</div>
                    <div className="settings-option-card__desc">آخر تغيير: منذ 30 يوماً</div>
                    <div className="settings-option-card__actions">
                      <button className="settings-btn">تغيير كلمة المرور</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Two-Factor Auth - For Non-Clients */}
            {userRole !== 'client' && (
              <div className="settings-section">
                <div className="settings-section__header">
                  <div className="settings-section__icon">
                    <Shield size={14} />
                  </div>
                  <span className="settings-section__title">المصادقة الثنائية</span>
                </div>
                <div className="settings-section__content">
                  <div className="settings-option-card">
                    <div className="settings-option-card__title">حماية إضافية لحسابك</div>
                    <div className="settings-option-card__desc">أضف طبقة أمان إضافية باستخدام رمز التحقق</div>
                    <div className="settings-option-card__actions">
                      <button className="settings-btn settings-btn--primary">تفعيل المصادقة الثنائية</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'language':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Globe size={14} />
              </div>
              <span className="settings-section__title">اللغة والمنطقة</span>
            </div>
            <div className="settings-section__content">
              <div className="settings-form-grid">
                <div className="settings-field">
                  <label className="settings-field__label">اللغة</label>
                  <select className="settings-field__select">
                    <option value="ar" selected>العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">المنطقة الزمنية</label>
                  <select className="settings-field__select">
                    <option value="Asia/Riyadh" selected>توقيت السعودية (GMT+3)</option>
                    <option value="Asia/Dubai">توقيت الإمارات (GMT+4)</option>
                    <option value="Asia/Kuwait">توقيت الكويت (GMT+3)</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">تنسيق التاريخ</label>
                  <select className="settings-field__select">
                    <option value="hijri">هجري</option>
                    <option value="gregorian" selected>ميلادي</option>
                    <option value="both">هجري وميلادي</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <>
            <div className="settings-section">
              <div className="settings-section__header">
                <div className="settings-section__icon">
                  <Database size={14} />
                </div>
                <span className="settings-section__title">النسخ الاحتياطي</span>
              </div>
              <div className="settings-section__content">
                <div className="settings-option-card">
                  <div className="settings-option-card__title">إدارة النسخ الاحتياطية</div>
                  <div className="settings-option-card__desc">آخر نسخة احتياطية: اليوم 03:00 ص</div>
                  <div className="settings-option-card__actions">
                    <button className="settings-btn settings-btn--primary">إنشاء نسخة احتياطية</button>
                    <button className="settings-btn">جدولة النسخ الاحتياطي</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section__header">
                <div className="settings-section__icon">
                  <Database size={14} />
                </div>
                <span className="settings-section__title">تصدير البيانات</span>
              </div>
              <div className="settings-section__content">
                <div className="settings-option-card">
                  <div className="settings-option-card__title">تصدير جميع البيانات</div>
                  <div className="settings-option-card__desc">تصدير البيانات بصيغ مختلفة</div>
                  <div className="settings-option-card__actions">
                    <button className="settings-btn settings-btn--success">تصدير Excel</button>
                    <button className="settings-btn settings-btn--info">تصدير PDF</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case 'company':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Building2 size={14} />
              </div>
              <span className="settings-section__title">معلومات الشركة</span>
            </div>
            <div className="settings-section__content">
              <div className="settings-form">
                <div className="settings-form__group">
                  <label className="settings-form__label">اسم الشركة</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مكتب المحاماة"
                    disabled={!editingCompany}
                    style={!editingCompany ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    className="settings-form__input"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@lawfirm.sa"
                    disabled={!editingCompany}
                    style={!editingCompany ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">رقم الهاتف</label>
                  <input
                    type="tel"
                    className="settings-form__input"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+966 50 000 0000"
                    disabled={!editingCompany}
                    style={!editingCompany ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">العنوان</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="الرياض، المملكة العربية السعودية"
                    disabled={!editingCompany}
                    style={!editingCompany ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="settings-form__group">
                  <label className="settings-form__label">رقم الترخيص</label>
                  <input
                    type="text"
                    className="settings-form__input"
                    value={companyInfo.license_number}
                    onChange={(e) => setCompanyInfo(prev => ({ ...prev, license_number: e.target.value }))}
                    placeholder="1234567890"
                    disabled={!editingCompany}
                    style={!editingCompany ? { backgroundColor: 'var(--dashboard-bg)', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="settings-btn-group">
                  {!editingCompany ? (
                    <button
                      className="settings-btn settings-btn--secondary"
                      onClick={() => setEditingCompany(true)}
                    >
                      ✏️ تعديل البيانات
                    </button>
                  ) : (
                    <>
                      <button
                        className="settings-btn settings-btn--primary"
                        disabled={savingCompany}
                        onClick={async () => {
                          await saveCompanyInfo();
                          setEditingCompany(false);
                        }}
                      >
                        {savingCompany ? (
                          <><Loader2 className="animate-spin" size={16} /> جاري الحفظ...</>
                        ) : (
                          <><Save size={16} /> حفظ التغييرات</>
                        )}
                      </button>
                      <button
                        className="settings-btn"
                        onClick={() => setEditingCompany(false)}
                      >
                        إلغاء
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'branding':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Image size={14} />
              </div>
              <span className="settings-section__title">هوية الشركة (Branding)</span>
            </div>
            <div className="settings-section__content">
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                خصص مظهر صفحة تسجيل الدخول الخاصة بشركتك. هذه الإعدادات تظهر عند دخول المستخدمين عبر رابط شركتك المخصص.
              </p>

              {/* Logo Preview */}
              <div className="settings-option-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    background: branding.logo_url ? `url(${branding.logo_url}) center/contain no-repeat` : 'var(--color-surface-subtle)',
                    border: '2px dashed var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {!branding.logo_url && <Upload size={24} style={{ color: 'var(--color-text-secondary)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="settings-option-card__title">شعار الشركة</div>
                    <div className="settings-option-card__desc">يظهر في صفحة تسجيل الدخول الخاصة بشركتك</div>
                    <div className="settings-field" style={{ marginTop: '10px' }}>
                      <input
                        type="url"
                        className="settings-field__input"
                        value={branding.logo_url}
                        onChange={(e) => setBranding(prev => ({ ...prev, logo_url: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="settings-form-grid" style={{ marginBottom: '20px' }}>
                <div className="settings-field">
                  <label className="settings-field__label">اللون الأساسي</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      style={{
                        width: '50px',
                        height: '40px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      className="settings-field__input"
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#C5A059"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    يُستخدم في الأزرار والعناصر الرئيسية
                  </small>
                </div>

                <div className="settings-field">
                  <label className="settings-field__label">اللون الثانوي</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      style={{
                        width: '50px',
                        height: '40px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      className="settings-field__input"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="#1a1a1a"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    يُستخدم في الخلفيات والنصوص
                  </small>
                </div>
              </div>

              {/* Tagline */}
              <div className="settings-field" style={{ marginBottom: '20px' }}>
                <label className="settings-field__label">الشعار النصي (Tagline)</label>
                <input
                  type="text"
                  className="settings-field__input"
                  value={branding.tagline}
                  onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="مثال: نخبة في القانون منذ 2010"
                />
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  يظهر أسفل اسم الشركة في صفحة تسجيل الدخول
                </small>
              </div>

              {/* Preview */}
              <div className="settings-option-card" style={{
                background: branding.secondary_color,
                padding: '30px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ color: 'white', opacity: 0.5, fontSize: '12px', marginBottom: '10px' }}>معاينة</div>
                {branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo Preview"
                    style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '10px', background: 'white', borderRadius: '8px', padding: '8px' }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 10px',
                    borderRadius: '8px',
                    background: branding.primary_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building2 size={28} style={{ color: 'white' }} />
                  </div>
                )}
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>{companyInfo.name || 'اسم الشركة'}</div>
                {branding.tagline && (
                  <div style={{ color: 'white', opacity: 0.7, fontSize: '14px', marginTop: '5px' }}>{branding.tagline}</div>
                )}
                <button
                  style={{
                    marginTop: '15px',
                    padding: '10px 24px',
                    background: branding.primary_color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  تسجيل الدخول
                </button>
              </div>

              {/* Save Button */}
              <div className="settings-btn-group">
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={saveBranding}
                  disabled={savingBranding}
                >
                  {savingBranding ? (
                    <><Loader2 className="animate-spin" size={16} /> جاري الحفظ...</>
                  ) : (
                    <><Save size={16} /> حفظ هوية الشركة</>
                  )}
                </button>
                {brandingMessage && (
                  <span style={{
                    color: brandingMessage.includes('خطأ') ? '#ef4444' : '#22c55e',
                    marginRight: '12px'
                  }}>
                    {brandingMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'company_policy':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <ShieldCheck size={14} />
              </div>
              <span className="settings-section__title">سياسة الالتزام والأمان</span>
            </div>
            <div className="settings-section__content">
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                قم بإعداد سياسة الشركة التي يجب على المستخدمين الموافقة عليها بشكل دوري للوصول إلى النظام.
              </p>

              {/* Enable/Disable Toggle */}
              <div className="settings-option-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="settings-option-card__title">تفعيل سياسة الشركة</div>
                    <div className="settings-option-card__desc">
                      عند التفعيل، سيُطلب من جميع المستخدمين الموافقة على سياسة الشركة للوصول إلى النظام
                    </div>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={policySettings.enabled}
                      onChange={(e) => setPolicySettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    />
                    <span className="settings-toggle__slider"></span>
                    <span style={{ marginRight: '12px' }}>
                      {policySettings.enabled ? 'مفعّل' : 'معطّل'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Policy Title */}
              <div className="settings-field" style={{ marginBottom: '20px' }}>
                <label className="settings-field__label">عنوان السياسة</label>
                <input
                  type="text"
                  className="settings-field__input"
                  value={policySettings.title}
                  onChange={(e) => setPolicySettings(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="سياسة الالتزام والأمان"
                />
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  العنوان الذي سيظهر للمستخدمين في نافذة السياسة
                </small>
              </div>

              {/* Interval Days */}
              <div className="settings-field" style={{ marginBottom: '20px' }}>
                <label className="settings-field__label">فترة التجديد (بالأيام)</label>
                <input
                  type="number"
                  className="settings-field__input"
                  value={policySettings.interval_days}
                  onChange={(e) => setPolicySettings(prev => ({ ...prev, interval_days: parseInt(e.target.value) || 10 }))}
                  min="1"
                  max="365"
                  style={{ maxWidth: '200px' }}
                />
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  عدد الأيام التي يجب بعدها على المستخدمين إعادة الموافقة على السياسة
                </small>
              </div>

              {/* Policy Content */}
              <div className="settings-field" style={{ marginBottom: '20px' }}>
                <label className="settings-field__label">محتوى السياسة</label>
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: '300px'
                }}>
                  <TiptapEditor
                    content={policySettings.content}
                    onChange={(content) => setPolicySettings(prev => ({ ...prev, content }))}
                    placeholder="اكتب محتوى سياسة الشركة هنا..."
                  />
                </div>
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                  استخدم المحرر لتنسيق نص السياسة. يمكنك إضافة عناوين، قوائم، وتنسيقات نصية مختلفة.
                </small>
              </div>

              {/* Save Button */}
              <div className="settings-btn-group">
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={savePolicySettings}
                  disabled={savingPolicy}
                >
                  {savingPolicy ? (
                    <><Loader2 className="animate-spin" size={16} /> جاري الحفظ...</>
                  ) : (
                    <><Save size={16} /> حفظ إعدادات السياسة</>
                  )}
                </button>
                {settingsMessage && settingsMessage.includes('السياسة') && (
                  <span style={{
                    color: settingsMessage.includes('خطأ') ? '#ef4444' : '#22c55e',
                    marginRight: '12px'
                  }}>
                    {settingsMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'subscription':
        // Use API-provided trial_days_remaining if available, otherwise calculate
        const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
        const now = new Date();
        const trialDaysRemaining = subscription?.trial_days_remaining !== undefined
          ? subscription.trial_days_remaining
          : (trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0);
        const isTrial = subscription?.status === 'trial' || subscription?.is_trial === true;
        const isActive = subscription?.status === 'active';

        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <CreditCard size={14} />
              </div>
              <span className="settings-section__title">إدارة الاشتراك</span>
            </div>
            <div className="settings-section__content">
              {loadingSubscription ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري التحميل...</span>
                </div>
              ) : (
                <>
                  <div className="settings-subscription-card">
                    <div className="settings-subscription-card__header">
                      <div className="settings-subscription-card__badge" style={
                        isTrial ? { background: 'var(--status-blue-light)', color: 'var(--status-blue)' } :
                          isActive ? { background: 'var(--status-green-light)', color: 'var(--status-green)' } :
                            { background: 'var(--status-red-light)', color: 'var(--status-red)' }
                      }>
                        {isActive ? (
                          <><CheckCircle size={16} /> اشتراك نشط</>
                        ) : isTrial ? (
                          <><Calendar size={16} /> فترة تجريبية</>
                        ) : (
                          <><XCircle size={16} /> منتهي</>
                        )}
                      </div>
                    </div>

                    {isTrial ? (
                      // Trial Mode Display
                      <div className="settings-subscription-card__content">
                        <div style={{
                          background: 'var(--status-blue-light)',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '16px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '14px', color: 'var(--status-blue)', marginBottom: '8px' }}>
                            🎁 أنت في الفترة التجريبية المجانية
                          </div>
                          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--status-blue)' }}>
                            {trialDaysRemaining} يوم متبقي
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                            تنتهي في: {trialEndsAt ? trialEndsAt.toLocaleDateString('ar-SA') : 'غير محدد'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                          اشترك الآن للاستمرار في استخدام النظام بعد انتهاء الفترة التجريبية
                        </div>
                      </div>
                    ) : isActive ? (
                      // Active Subscription Display
                      <div className="settings-subscription-card__content">
                        <div className="settings-subscription-card__plan">الباقة الحالية</div>
                        <div className="settings-subscription-card__price">
                          {plansData ? (
                            subscription?.plan === 'yearly'
                              ? `${plansData.plans.yearly.price.toLocaleString('ar-SA')} ر.س / سنوياً`
                              : `${plansData.plans.monthly.price.toLocaleString('ar-SA')} ر.س / شهرياً`
                          ) : (
                            subscription?.plan === 'yearly' ? 'سنوي' : 'شهري'
                          )}
                        </div>
                        <div className="settings-subscription-card__info">
                          <Calendar size={14} />
                          التجديد القادم: {subscription?.renews_at ? new Date(subscription.renews_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                        </div>
                      </div>
                    ) : (
                      // Expired/Inactive Display
                      <div className="settings-subscription-card__content" style={{ textAlign: 'center' }}>
                        <div style={{
                          background: 'var(--status-red-light)',
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '16px'
                        }}>
                          <XCircle size={32} style={{ color: 'var(--status-red)', marginBottom: '8px' }} />
                          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--status-red)' }}>
                            انتهى اشتراكك
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                            اشترك الآن للاستمرار في استخدام النظام
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="settings-subscription-card__actions">
                      <button
                        className="settings-btn settings-btn--primary"
                        onClick={() => setShowPlanModal(true)}
                        disabled={subscribing}
                      >
                        {subscribing ? (
                          <><Loader2 className="animate-spin" size={16} /> جاري المعالجة...</>
                        ) : (
                          isTrial || !isActive ? '🚀 اشترك الآن' : 'تجديد الاشتراك'
                        )}
                      </button>
                      {isActive && (
                        <button
                          className="settings-btn settings-btn--danger"
                          onClick={handleCancelSubscription}
                        >
                          إلغاء الاشتراك
                        </button>
                      )}
                    </div>
                  </div>

                  {/* خيارات الاشتراك */}
                  <div className="settings-option-card" style={{ marginTop: '16px' }}>
                    <div className="settings-option-card__title">باقات الاشتراك</div>
                    {loadingPlans ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" size={20} />
                        <span>جاري تحميل الباقات...</span>
                      </div>
                    ) : plansData ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                          {/* الباقة الشهرية */}
                          <div
                            style={{
                              border: selectedPlan === 'monthly' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                              borderRadius: '12px',
                              padding: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: selectedPlan === 'monthly' ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)'
                            }}
                            onClick={() => setSelectedPlan('monthly')}
                          >
                            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>الباقة الشهرية</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {plansData.plans.monthly.price.toLocaleString('ar-SA')} <span style={{ fontSize: '14px', fontWeight: 400 }}>ر.س/شهر</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                              مرونة في الإلغاء والتجديد
                            </div>
                          </div>

                          {/* الباقة السنوية */}
                          <div
                            style={{
                              border: selectedPlan === 'yearly' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                              borderRadius: '12px',
                              padding: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: selectedPlan === 'yearly' ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
                              position: 'relative'
                            }}
                            onClick={() => setSelectedPlan('yearly')}
                          >
                            {plansData.plans.yearly.savings > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '10px',
                                background: 'var(--status-green)',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                وفّر {plansData.plans.yearly.savings.toLocaleString('ar-SA')} ر.س!
                              </div>
                            )}
                            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>الباقة السنوية</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {plansData.plans.yearly.price.toLocaleString('ar-SA')} <span style={{ fontSize: '14px', fontWeight: 400 }}>ر.س/سنة</span>
                            </div>
                            {plansData.plans.yearly.savings > 0 && (
                              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                                <s style={{ color: 'var(--status-red)' }}>{(plansData.plans.monthly.price * 12).toLocaleString('ar-SA')} ر.س</s> توفير {plansData.plans.yearly.savings.toLocaleString('ar-SA')} ر.س
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          className="settings-btn settings-btn--primary"
                          style={{ width: '100%', marginTop: '16px', padding: '14px' }}
                          onClick={() => handleOnlineSubscribe(selectedPlan)}
                          disabled={subscribing}
                        >
                          {subscribing ? (
                            <><Loader2 className="animate-spin" size={18} /> جاري إنشاء رابط الدفع...</>
                          ) : (
                            <>الدفع الإلكتروني - {plansData.plans[selectedPlan].price.toLocaleString('ar-SA')} ر.س</>
                          )}
                        </button>
                      </>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        فشل في تحميل الباقات
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '16px',
                      marginTop: '12px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      <span>دفع آمن</span>
                      <span>Visa / Mastercard / مدى</span>
                      <span>🍎 Apple Pay</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'invoices':
        return (
          <div className="settings-section">
            <div className="settings-section__header">
              <div className="settings-section__icon">
                <Receipt size={14} />
              </div>
              <span className="settings-section__title">سجل الفواتير</span>
            </div>
            <div className="settings-section__content">
              {loadingInvoices ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري التحميل...</span>
                </div>
              ) : invoices.length > 0 ? (
                <div className="settings-invoices-table">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>المبلغ</th>
                        <th>الضريبة</th>
                        <th>الإجمالي</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice: any) => (
                        <tr key={invoice.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{invoice.invoice_number}</td>
                          <td>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</td>
                          <td>{Number(invoice.amount).toFixed(2)} ر.س</td>
                          <td>{Number(invoice.tax_amount || 0).toFixed(2)} ر.س</td>
                          <td style={{ fontWeight: 600 }}>{Number(invoice.total_amount).toFixed(2)} ر.س</td>
                          <td>
                            <span className={`settings-badge settings-badge--${invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'danger'}`}>
                              {invoice.status === 'paid' ? 'مدفوع' : invoice.status === 'pending' ? 'معلق' : 'فشل'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="settings-btn settings-btn--small"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowInvoicePreview(true);
                                }}
                                title="معاينة الفاتورة"
                              >
                                👁️ معاينة
                              </button>
                              <button 
                                className="settings-btn settings-btn--small settings-btn--primary"
                                onClick={() => {
                                  const tenant = tenantInfo || { name: 'عميل', email: '', phone: '' };
                                  downloadInvoice(invoice, tenant);
                                }}
                                title="تحميل الفاتورة كـ PDF"
                              >
                                <Download size={14} />
                                تحميل
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px 40px',
                  color: 'var(--color-text-secondary)'
                }}>
                  <Receipt size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <div style={{ fontSize: '16px', fontWeight: 500 }}>لا توجد فواتير حالياً</div>
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>ستظهر الفواتير هنا بعد أول اشتراك</div>
                </div>
              )}
            </div>

            {/* Invoice Preview Modal */}
            {selectedInvoice && (
              <InvoicePreviewModal
                invoice={selectedInvoice}
                tenant={tenantInfo || { name: 'عميل', email: '', phone: '' }}
                isOpen={showInvoicePreview}
                onClose={() => {
                  setShowInvoicePreview(false);
                  setSelectedInvoice(null);
                }}
              />
            )}
          </div>
        );

      default:
        return <div>التبويب غير موجود</div>;
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header__title-area">
          <h1>
            <SettingsIcon size={18} />
            الإعدادات
          </h1>
          <p>إدارة تفضيلاتك وإعدادات النظام</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-sidebar__tab ${activeTab === tab.id ? 'settings-sidebar__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="settings-content">
          {renderTabContent()}
        </div>

        {/* Help Panel */}
        <div className="settings-help-panel">
          <div className="settings-help-panel__header">
            <div className="settings-help-panel__icon">
              <AlertCircle size={16} />
            </div>
            <span className="settings-help-panel__title">المساعدة</span>
          </div>

          <div className="settings-help-panel__content">
            <div className="settings-help-panel__section">
              <div className="settings-help-panel__section-title">
                💡 {activeTab === 'notifications' && 'إعدادات الإشعارات'}
                {activeTab === 'najiz' && 'إعدادات ناجز'}
                {activeTab === 'profile' && 'الملف الشخصي'}
                {activeTab === 'appearance' && 'المظهر'}
                {activeTab === 'privacy' && 'الخصوصية والأمان'}
                {activeTab === 'language' && 'اللغة والمنطقة'}
                {activeTab === 'system' && 'إعدادات النظام'}
                {activeTab === 'company' && 'إعدادات الشركة'}
                {activeTab === 'branding' && 'هوية الشركة'}
                {activeTab === 'company_policy' && 'سياسة الشركة'}
                {activeTab === 'subscription' && 'إدارة الاشتراك'}
                {activeTab === 'invoices' && 'الفواتير'}
              </div>
              <p className="settings-help-panel__section-text">
                {activeTab === 'notifications' && 'تحكم في كيفية استلام التنبيهات والإشعارات من النظام.'}
                {activeTab === 'najiz' && 'إدارة اتصال ناجز وخيارات الاستيراد التلقائي.'}
                {activeTab === 'profile' && 'تحديث معلوماتك الشخصية وبيانات الاتصال.'}
                {activeTab === 'appearance' && 'تخصيص مظهر النظام والألوان.'}
                {activeTab === 'privacy' && 'إدارة إعدادات الأمان وكلمة المرور.'}
                {activeTab === 'language' && 'تغيير اللغة والمنطقة الزمنية.'}
                {activeTab === 'system' && 'إدارة النسخ الاحتياطي وتصدير البيانات.'}
                {activeTab === 'company' && 'تحديث معلومات شركتك مثل الاسم والبريد والعنوان.'}
                {activeTab === 'branding' && 'خصص مظهر صفحة تسجيل الدخول الخاصة بشركتك.'}
                {activeTab === 'company_policy' && 'إدارة سياسة الشركة التي يجب على المستخدمين الموافقة عليها للوصول إلى النظام.'}
                {activeTab === 'subscription' && 'إدارة اشتراكك الحالي، الترقية للسنوي، أو الإلغاء.'}
                {activeTab === 'invoices' && 'عرض وتحميل جميع الفواتير السابقة.'}
              </p>
            </div>

            <div className="settings-help-panel__tip">
              <span className="settings-help-panel__tip-icon">💡</span>
              <span className="settings-help-panel__tip-text">
                {activeTab === 'notifications' && 'فعّل إشعارات الجلسات لتذكيرك بمواعيد الجلسات القادمة'}
                {activeTab === 'najiz' && 'تأكد من صحة بيانات اتصال ناجز قبل الاستيراد'}
                {activeTab === 'profile' && 'تأكد من تحديث رقم الهاتف لاستقبال الإشعارات'}
                {activeTab === 'appearance' && 'جرب الوضع الداكن لتقليل إجهاد العين'}
                {activeTab === 'privacy' && 'غيّر كلمة المرور بشكل دوري لحماية حسابك'}
                {activeTab === 'language' && 'اختر المنطقة الزمنية المناسبة لعرض مواعيد الجلسات بشكل صحيح'}
                {activeTab === 'system' && 'قم بعمل نسخ احتياطي دوري للحفاظ على بياناتك'}
                {activeTab === 'company' && 'تحديث بيانات الشركة يظهر في الفواتير والتقارير'}
                {activeTab === 'branding' && 'رابط شركتك المخصص: company-slug.alraedlaw.com'}
                {activeTab === 'company_policy' && 'حدد فترة التجديد المناسبة لضمان التزام المستخدمين بالسياسة بشكل دوري'}
                {activeTab === 'subscription' && 'الاشتراك السنوي يوفر لك شهرين مجاناً!'}
                {activeTab === 'invoices' && 'يمكنك تحميل الفواتير بصيغة PDF للأرشفة'}
              </span>
            </div>

            <div className="settings-help-panel__link">
              <Globe size={14} />
              فتح دليل المستخدم
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
