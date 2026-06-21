import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Globe,
  Database,
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
  ShieldCheck,
  FileText,
  Trash2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Mail,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import NotificationSettings from '../components/NotificationSettings';
import PhoneField from '../components/PhoneField';
import TiptapEditor from '../components/TiptapEditor';
import { downloadInvoice, InvoicePreviewModal } from '../components/InvoiceDownload';
import LetterheadManager from '../components/settings/LetterheadManager';
import TwoFactorSettings from '../components/settings/TwoFactorSettings';
import SessionDefaultsSettings from '../components/settings/SessionDefaultsSettings';
import SessionReportTemplatesSettings from '../components/settings/SessionReportTemplatesSettings';
import FeeProposalTemplatesSettings from '../components/settings/FeeProposalTemplatesSettings';
import CorrespondenceTemplatesSettings from '../components/settings/CorrespondenceTemplatesSettings';
import SessionWorkflowSettingsComponent from '../components/settings/SessionWorkflowSettings';
import MicrosoftIntegrationSettings from '../components/settings/MicrosoftIntegrationSettings';
import EmailIntegrationSection from '../components/settings/EmailIntegrationSection';
import { apiClient, API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: string[];
  ownerOnly?: boolean; // إن كانت true: يظهر فقط للأونر (is_tenant_owner=true) داخل الأدوار المسموحة
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('notifications');

  // Check URL hash, query, or state for initial tab
  useEffect(() => {
    // Priority 1: ?tab= query (used by OAuth callbacks like Microsoft)
    const params = new URLSearchParams(location.search);
    const tabFromQuery = params.get('tab');
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
      return;
    }

    // Priority 2: URL hash (e.g., /settings#subscription)
    if (location.hash) {
      const tabFromHash = location.hash.replace('#', '');
      setActiveTab(tabFromHash);
      return;
    }

    // Priority 3: navigation state
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location]);

  const tabs: SettingsTab[] = [
    { id: 'notifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'najiz', label: 'إعدادات ناجز', icon: Cloud, roles: ['admin'] },
    { id: 'profile', label: 'الملف الشخصي', icon: User, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'privacy', label: 'الخصوصية والأمان', icon: Shield, roles: ['admin', 'lawyer', 'legal_assistant', 'client'] },
    { id: 'system', label: 'النظام', icon: Database, roles: ['admin'] },
    { id: 'company', label: 'إعدادات الشركة', icon: Building2, roles: ['admin'] },
    { id: 'branding', label: 'هوية الشركة', icon: Image, roles: ['admin'] },
    { id: 'letterheads', label: 'الكليشات', icon: FileText, roles: ['admin'] },
    { id: 'session_defaults', label: 'قوالب الجلسات', icon: ClipboardList, roles: ['admin'] },
    { id: 'session_report_templates', label: 'قوالب تقرير الجلسة', icon: FileText, roles: ['admin'] },
    { id: 'fee_proposal_templates', label: 'قوالب عروض الأتعاب', icon: FileText, roles: ['admin'] },
    { id: 'correspondence_templates', label: 'قوالب الصادر', icon: FileText, roles: ['admin'] },
    { id: 'session_workflow', label: 'سير عمل الجلسات', icon: Bell, roles: ['admin'] },
    { id: 'company_policy', label: 'سياسة الشركة', icon: ShieldCheck, roles: ['admin'] },
    { id: 'integrations', label: 'التكاملات', icon: Link, roles: ['admin', 'lawyer', 'legal_assistant'] },
    { id: 'email', label: 'البريد الإلكتروني', icon: Mail, roles: ['admin'], ownerOnly: true },
    { id: 'subscription', label: 'الاشتراك', icon: CreditCard, roles: ['admin'] },
    { id: 'invoices', label: 'الفواتير', icon: Receipt, roles: ['admin'] },
  ];

  // الحصول على دور المستخدم من AuthContext
  const userRole = user?.role || 'client';
  const isTenantOwner = !!user?.is_tenant_owner;
  const visibleTabs = tabs.filter(tab => {
    if (!tab.roles.includes(userRole)) return false;
    if (tab.ownerOnly && !isTenantOwner) return false;
    return true;
  });

  // Najiz Settings State
  const [najizSettings, setNajizSettings] = useState({
    auto_link_lawyers: true,
    send_whatsapp_on_import: false,
    default_case_priority: 'medium',
    ai_judgement_analysis_enabled: true,
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

  // Branding Settings State (الألوان أُلغيت — يبقى الشعار و tagline فقط)
  const [branding, setBranding] = useState({
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
  const [availableOptions, setAvailableOptions] = useState<any>(null);

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

  // Data Management State
  const [exportingData, setExportingData] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'warning' | 'confirm' | 'code' | 'deleting' | 'done'>('idle');
  const [deleteStats, setDeleteStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmText, setConfirmText] = useState('');

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
          // حفظ خيارات الاشتراك المتاحة
          if (response.data.available_options) {
            setAvailableOptions(response.data.available_options);
          }
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

                  {/* تحليل الأحكام */}
                  <div className="settings-option-card" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <Sparkles size={20} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div className="settings-option-card__title">تحليل الأحكام</div>
                        <div className="settings-option-card__desc">
                          عند استيراد حكم جديد من ناجز، يحلّل النظام نص المنطوق تلقائياً ويُحدّد
                          نتيجة القضية (لصالحنا/ضدنا/تسوية/مرفوضة شكلاً) مع درجة الثقة.
                          <br />
                          عند تحقق فوز مؤكد، يظهر للمحامي المخصص والمدير احتفال لطيف بالنتيجة (مرة واحدة لكل شخص).
                          <br />
                          <strong>ملاحظة:</strong> يمكنك إيقاف هذه الخاصية في أي وقت — الأحكام التي لم تُحلَّل بعد لن تُرسَل.
                        </div>
                      </div>
                    </div>
                    <div className="settings-option-card__actions" style={{ marginTop: '12px' }}>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={najizSettings.ai_judgement_analysis_enabled}
                          onChange={(e) => setNajizSettings(prev => ({
                            ...prev,
                            ai_judgement_analysis_enabled: e.target.checked
                          }))}
                        />
                        <span className="settings-toggle__slider"></span>
                        <span style={{ marginRight: '12px' }}>
                          {najizSettings.ai_judgement_analysis_enabled ? 'مفعّل' : 'معطّل'}
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
                  <PhoneField
                    value={userProfile.phone}
                    onChange={(v) => setUserProfile(prev => ({ ...prev, phone: v }))}
                    placeholder="5X XXX XXXX"
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
              <TwoFactorSettings />
            )}
          </>
        );

      case 'system':
        // Handle Export — uses API_BASE_URL from api.ts (not hardcoded)
        const handleExportExcel = async () => {
          try {
            setExportingData(true);
            const response = await fetch(`${API_BASE_URL}/tenant/data/export`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              },
            });
            if (!response.ok) throw new Error('فشل تصدير البيانات');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `بيانات_الشركة_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
          } catch (error) {
            alert('حدث خطأ أثناء تصدير البيانات');
          } finally {
            setExportingData(false);
          }
        };

        // Handle Delete Flow
        const handleStartDelete = async () => {
          setDeleteStep('warning');
          setDeleteError('');
          setVerificationCode('');
          setConfirmText('');
          try {
            setLoadingStats(true);
            const response: any = await apiClient.get('/tenant/data/stats');
            if (response.success) {
              setDeleteStats(response.data);
            }
          } catch (e) { console.error(e); }
          finally { setLoadingStats(false); }
        };

        const handleSendCode = async () => {
          try {
            setSendingCode(true);
            setDeleteError('');
            const response: any = await apiClient.post('/tenant/data/delete/send-code');
            if (response.success) {
              setEmailHint(response.email_hint || '');
              setDeleteStep('code');
            }
          } catch (error: any) {
            setDeleteError(error.message || 'فشل إرسال رمز التحقق');
          } finally {
            setSendingCode(false);
          }
        };

        const handleConfirmDelete = async () => {
          if (verificationCode.length !== 6) {
            setDeleteError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
            return;
          }
          try {
            setDeleteStep('deleting');
            setDeleteError('');
            // ✅ إرسال confirm_text للتحقق على السيرفر أيضاً
            const response: any = await apiClient.post('/tenant/data/delete/confirm', {
              verification_code: verificationCode,
              confirm_text: 'حذف جميع البيانات',
            });
            if (response.success) {
              setDeleteStep('done');
              setTimeout(() => {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
              }, 3000);
            }
          } catch (error: any) {
            setDeleteError(error.message || 'فشل حذف البيانات');
            setDeleteStep('code');
          }
        };

        return (
          <>
            {/* ===== تصدير البيانات ===== */}
            <div className="settings-section">
              <div className="settings-section__header">
                <div className="settings-section__icon" style={{ background: 'var(--status-green-light)', color: 'var(--status-green)' }}>
                  <Download size={14} />
                </div>
                <span className="settings-section__title">تصدير البيانات</span>
              </div>
              <div className="settings-section__content">
                <div className="settings-option-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <FileSpreadsheet size={24} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="settings-option-card__title" style={{ fontSize: '15px', marginBottom: '6px' }}>تصدير جميع البيانات - Excel</div>
                      <div className="settings-option-card__desc" style={{ marginBottom: '14px', lineHeight: '1.6' }}>
                        تصدير نسخة شاملة من جميع بيانات شركتك في ملف Excel مرتب يتضمن:
                        <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          📋 معلومات الشركة • 👥 المستخدمين • ⚖️ القضايا • 📅 الجلسات • ✅ المهام • 📄 المستندات • 📝 العقود • 🔑 الوكالات • ⚡ طلبات التنفيذ • 📑 المذكرات القانونية • 🧾 الفواتير
                        </span>
                      </div>
                      <button
                        className="settings-btn settings-btn--success"
                        onClick={handleExportExcel}
                        disabled={exportingData}
                        style={{ padding: '10px 24px' }}
                      >
                        {exportingData ? (
                          <><Loader2 className="animate-spin" size={16} /> جاري التصدير...</>
                        ) : (
                          <><Download size={16} /> تصدير Excel</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== النسخ الاحتياطي ===== */}
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

            {/* ===== حذف جميع البيانات ===== */}
            <div className="settings-section" style={{ border: '1px solid var(--status-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="settings-section__header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.15)' }}>
                <div className="settings-section__icon" style={{ background: 'var(--status-red-light)', color: 'var(--status-red)' }}>
                  <Trash2 size={14} />
                </div>
                <span className="settings-section__title" style={{ color: 'var(--status-red)' }}>منطقة الخطر</span>
              </div>
              <div className="settings-section__content">
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(239,68,68,0.08) 100%)',
                  borderRadius: '10px', padding: '20px',
                  border: '1px solid rgba(239,68,68,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <AlertTriangle size={24} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-red)', marginBottom: '8px' }}>
                        حذف جميع البيانات نهائياً
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.7', marginBottom: '16px' }}>
                        <strong style={{ color: 'var(--status-red)' }}>⚠️ تحذير:</strong> هذا الإجراء سيحذف <strong>جميع بيانات الشركة نهائياً</strong> بما في ذلك:
                        <ul style={{ margin: '8px 0 0 0', padding: '0 20px', listStyle: 'disc' }}>
                          <li>جميع القضايا والجلسات والأطراف</li>
                          <li>جميع المستخدمين والمحامين والموكلين</li>
                          <li>جميع المستندات والعقود والمذكرات</li>
                          <li>جميع المهام والمواعيد والاجتماعات</li>
                          <li>جميع الفواتير والمدفوعات والاشتراكات</li>
                          <li style={{ color: 'var(--status-red)', fontWeight: 600 }}>حساب الشركة نفسه سيتم حذفه</li>
                        </ul>
                      </div>
                      <div style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                        fontSize: '12px', color: 'var(--status-red)', fontWeight: 500
                      }}>
                        💡 ننصح بتصدير البيانات أولاً قبل المتابعة. يمكنك استخدام زر "تصدير Excel" أعلاه.
                      </div>
                      <button
                        className="settings-btn settings-btn--danger"
                        onClick={handleStartDelete}
                        style={{ padding: '10px 24px', fontWeight: 600 }}
                      >
                        <Trash2 size={16} />
                        حذف جميع البيانات
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== مودال حذف البيانات ===== */}
            {deleteStep !== 'idle' && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  background: 'var(--dashboard-card)', borderRadius: '16px',
                  width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.3)', position: 'relative'
                }}>
                  {/* Close button */}
                  {deleteStep !== 'deleting' && deleteStep !== 'done' && (
                    <button
                      onClick={() => { setDeleteStep('idle'); setDeleteError(''); }}
                      style={{
                        position: 'absolute', top: '16px', left: '16px',
                        background: 'var(--quiet-gray-100)', border: 'none', borderRadius: '8px',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)'
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}

                  {/* Header */}
                  <div style={{
                    background: deleteStep === 'done' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    padding: '30px', textAlign: 'center', borderRadius: '16px 16px 0 0'
                  }}>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {deleteStep === 'done' ? <CheckCircle size={32} style={{ color: 'white' }} /> :
                       deleteStep === 'code' ? <Mail size={32} style={{ color: 'white' }} /> :
                       deleteStep === 'deleting' ? <Loader2 size={32} className="animate-spin" style={{ color: 'white' }} /> :
                       <AlertTriangle size={32} style={{ color: 'white' }} />}
                    </div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 700 }}>
                      {deleteStep === 'done' ? 'تم الحذف بنجاح' :
                       deleteStep === 'deleting' ? 'جاري حذف البيانات...' :
                       deleteStep === 'code' ? 'إدخال رمز التحقق' :
                       deleteStep === 'confirm' ? 'تأكيد نهائي' :
                       'تحذير: حذف جميع البيانات'}
                    </h2>
                    {deleteStep === 'deleting' && (
                      <p style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', fontSize: '14px' }}>
                        يرجى عدم إغلاق هذه النافذة...
                      </p>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '24px' }}>

                    {/* Step: Warning */}
                    {deleteStep === 'warning' && (
                      <>
                        {/* Data Stats */}
                        {loadingStats ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} />
                            <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>جاري تحميل إحصائيات البيانات...</p>
                          </div>
                        ) : deleteStats && (
                          <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                            marginBottom: '20px'
                          }}>
                            {/* ✅ Dynamic stats from server — covers ALL entities */}
                            {Object.entries(deleteStats).map(([key, val]: [string, any]) => (
                              <div key={key} style={{
                                background: 'var(--quiet-gray-100)', borderRadius: '8px',
                                padding: '12px', textAlign: 'center'
                              }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-red)' }}>{val.count}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{val.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{
                          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                          padding: '16px', marginBottom: '16px', fontSize: '13px',
                          color: '#991b1b', lineHeight: '1.7'
                        }}>
                          <strong>⚠️ لا يمكن التراجع عن هذا الإجراء!</strong><br />
                          سيتم حذف جميع البيانات أعلاه نهائياً بما في ذلك حساب الشركة.
                          سيتم تسجيل خروجك بعد الحذف ولن تتمكن من الوصول للنظام مرة أخرى.
                        </div>

                        <div style={{
                          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                          padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#92400e'
                        }}>
                          💡 <strong>ننصحك</strong> بتصدير بياناتك أولاً قبل الحذف.
                          <button
                            onClick={() => { setDeleteStep('idle'); handleExportExcel(); }}
                            style={{
                              display: 'block', marginTop: '8px', background: '#059669',
                              color: 'white', border: 'none', borderRadius: '6px',
                              padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 500
                            }}
                          >
                            <Download size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px' }} />
                            تصدير البيانات الآن
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button
                            className="settings-btn"
                            onClick={() => setDeleteStep('idle')}
                          >إلغاء</button>
                          <button
                            className="settings-btn settings-btn--danger"
                            onClick={() => setDeleteStep('confirm')}
                            style={{ fontWeight: 600 }}
                          >
                            متابعة الحذف
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step: Confirm */}
                    {deleteStep === 'confirm' && (
                      <>
                        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '16px', lineHeight: '1.7' }}>
                          للتأكيد، اكتب <strong style={{ color: 'var(--status-red)' }}>"حذف جميع البيانات"</strong> في الحقل أدناه:
                        </p>
                        <input
                          type="text"
                          className="settings-field__input"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder='اكتب: حذف جميع البيانات'
                          style={{
                            width: '100%', marginBottom: '16px', textAlign: 'center',
                            fontSize: '15px', fontWeight: 600,
                            borderColor: confirmText === 'حذف جميع البيانات' ? 'var(--status-red)' : undefined
                          }}
                          dir="rtl"
                        />

                        {deleteError && (
                          <div style={{
                            background: '#fef2f2', color: '#991b1b', padding: '10px 14px',
                            borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
                          }}>{deleteError}</div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button className="settings-btn" onClick={() => setDeleteStep('warning')}>رجوع</button>
                          <button
                            className="settings-btn settings-btn--danger"
                            disabled={confirmText !== 'حذف جميع البيانات' || sendingCode}
                            onClick={handleSendCode}
                            style={{ fontWeight: 600 }}
                          >
                            {sendingCode ? (
                              <><Loader2 className="animate-spin" size={16} /> جاري الإرسال...</>
                            ) : (
                              <><Mail size={16} /> إرسال رمز التحقق</>
                            )}
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step: Verification Code */}
                    {deleteStep === 'code' && (
                      <>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                          <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'var(--status-blue-light)', margin: '0 auto 12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Mail size={28} style={{ color: 'var(--status-blue)' }} />
                          </div>
                          <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: '4px' }}>
                            تم إرسال رمز التحقق إلى البريد الإلكتروني
                          </p>
                          {emailHint && (
                            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', direction: 'ltr' }}>
                              {emailHint}
                            </p>
                          )}
                          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            الرمز صالح لمدة 10 دقائق فقط
                          </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text)' }}>
                            رمز التحقق (6 أرقام)
                          </label>
                          <input
                            type="text"
                            className="settings-field__input"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            style={{
                              width: '100%', textAlign: 'center', letterSpacing: '12px',
                              fontSize: '28px', fontWeight: 700, fontFamily: 'monospace',
                              padding: '16px', borderColor: verificationCode.length === 6 ? 'var(--status-red)' : undefined
                            }}
                            dir="ltr"
                            autoFocus
                          />
                        </div>

                        {deleteError && (
                          <div style={{
                            background: '#fef2f2', color: '#991b1b', padding: '10px 14px',
                            borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
                          }}>{deleteError}</div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button className="settings-btn" onClick={() => setDeleteStep('confirm')}>رجوع</button>
                          <button
                            className="settings-btn"
                            onClick={handleSendCode}
                            disabled={sendingCode}
                            style={{ fontSize: '12px' }}
                          >
                            {sendingCode ? <Loader2 className="animate-spin" size={14} /> : 'إعادة إرسال الرمز'}
                          </button>
                          <button
                            className="settings-btn settings-btn--danger"
                            disabled={verificationCode.length !== 6}
                            onClick={handleConfirmDelete}
                            style={{ fontWeight: 600 }}
                          >
                            <Trash2 size={16} />
                            حذف نهائي
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step: Deleting */}
                    {deleteStep === 'deleting' && (
                      <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--status-red)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                          جاري حذف جميع البيانات...
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          يرجى عدم إغلاق المتصفح أو هذه الصفحة
                        </p>
                      </div>
                    )}

                    {/* Step: Done */}
                    {deleteStep === 'done' && (
                      <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <CheckCircle size={48} style={{ color: 'var(--status-green)', marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                          تم حذف جميع البيانات بنجاح
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          سيتم تسجيل خروجك تلقائياً خلال ثوانٍ...
                        </p>
                        <div style={{
                          width: '100%', height: '4px', background: 'var(--quiet-gray-100)',
                          borderRadius: '4px', marginTop: '20px', overflow: 'hidden'
                        }}>
                          <div style={{
                            width: '100%', height: '100%', background: 'var(--status-green)',
                            animation: 'shrink 3s linear forwards'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                  <PhoneField
                    value={companyInfo.phone}
                    onChange={(v) => setCompanyInfo(prev => ({ ...prev, phone: v }))}
                    placeholder="5X XXX XXXX"
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
                  يظهر أسفل اسم الشركة في صفحة الهبوط
                </small>
              </div>

              {/* Preview - ERP neutral */}
              <div className="settings-option-card" style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px' }}>معاينة</div>
                {branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo Preview"
                    style={{
                      width: '72px', height: '72px', objectFit: 'contain',
                      marginBottom: '12px', background: '#ffffff',
                      border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '72px', height: '72px',
                    margin: '0 auto 12px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 size={28} style={{ color: '#475569' }} />
                  </div>
                )}
                <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: 600 }}>{companyInfo.name || 'اسم الشركة'}</div>
                {branding.tagline && (
                  <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>{branding.tagline}</div>
                )}
                <button
                  style={{
                    marginTop: '20px',
                    padding: '10px 24px',
                    background: '#0f172a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
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
                        {/* رسالة إذا لا يمكن الاشتراك */}
                        {availableOptions && !availableOptions.can_subscribe && (
                          <div style={{
                            background: 'var(--status-green-light)',
                            borderRadius: '8px',
                            padding: '16px',
                            marginTop: '12px',
                            textAlign: 'center'
                          }}>
                            <CheckCircle size={24} style={{ color: 'var(--status-green)', marginBottom: '8px' }} />
                            <div style={{ fontSize: '14px', color: 'var(--status-green)', fontWeight: 600 }}>
                              {availableOptions.message}
                            </div>
                          </div>
                        )}

                        {/* عرض الباقات إذا يمكن الاشتراك */}
                        {availableOptions?.can_subscribe && (
                          <>
                            {/* رسالة الترقية */}
                            {availableOptions.can_upgrade && (
                              <div style={{
                                background: 'var(--status-blue-light)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginTop: '12px',
                                marginBottom: '12px',
                                textAlign: 'center',
                                fontSize: '14px',
                                color: 'var(--status-blue)'
                              }}>
                                لديك اشتراك شهري نشط. يمكنك الترقية للاشتراك السنوي للتوفير!
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
                              {/* الباقة الشهرية */}
                              <div
                                style={{
                                  border: selectedPlan === 'monthly' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                  borderRadius: '12px',
                                  padding: '20px',
                                  cursor: availableOptions.can_subscribe_monthly ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s',
                                  background: selectedPlan === 'monthly' ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
                                  opacity: availableOptions.can_subscribe_monthly ? 1 : 0.5,
                                  position: 'relative'
                                }}
                                onClick={() => availableOptions.can_subscribe_monthly && setSelectedPlan('monthly')}
                              >
                                {!availableOptions.can_subscribe_monthly && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    لديك اشتراك شهري نشط
                                  </div>
                                )}
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
                                  cursor: availableOptions.can_subscribe_yearly ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.2s',
                                  background: selectedPlan === 'yearly' ? 'var(--color-primary-light)' : 'var(--color-bg-secondary)',
                                  position: 'relative',
                                  opacity: availableOptions.can_subscribe_yearly ? 1 : 0.5
                                }}
                                onClick={() => availableOptions.can_subscribe_yearly && setSelectedPlan('yearly')}
                              >
                                {plansData.plans.yearly.savings > 0 && availableOptions.can_subscribe_yearly && (
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
                                    {availableOptions.can_upgrade ? 'ترقية موصى بها!' : `وفّر ${plansData.plans.yearly.savings.toLocaleString('ar-SA')} ر.س!`}
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

                              {/* الباقة الخاصة */}
                              <div
                                style={{
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '12px',
                                  padding: '20px',
                                  transition: 'all 0.2s',
                                  background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-surface-subtle) 100%)',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  textAlign: 'center'
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  top: '-10px',
                                  right: '10px',
                                  background: 'var(--color-primary)',
                                  color: 'white',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  مخصصة
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>الباقة الخاصة</div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                                  باقة مصممة خصيصاً لاحتياجات شركتك
                                </div>
                                <div style={{
                                  fontSize: '13px',
                                  color: 'var(--color-primary)',
                                  fontWeight: 500,
                                  padding: '10px 16px',
                                  background: 'var(--color-primary-light)',
                                  borderRadius: '8px'
                                }}>
                                  تواصل مع الدعم الفني للتفاصيل
                                </div>
                              </div>
                            </div>

                            <button
                              className="settings-btn settings-btn--primary"
                              style={{ width: '100%', marginTop: '16px', padding: '14px' }}
                              onClick={() => handleOnlineSubscribe(selectedPlan)}
                              disabled={subscribing || (selectedPlan === 'monthly' && !availableOptions.can_subscribe_monthly) || (selectedPlan === 'yearly' && !availableOptions.can_subscribe_yearly)}
                            >
                              {subscribing ? (
                                <><Loader2 className="animate-spin" size={18} /> جاري إنشاء رابط الدفع...</>
                              ) : availableOptions.can_upgrade && selectedPlan === 'yearly' ? (
                                <>ترقية للسنوي - {plansData.plans.yearly.price.toLocaleString('ar-SA')} ر.س</>
                              ) : (
                                <>الدفع الإلكتروني - {plansData.plans[selectedPlan].price.toLocaleString('ar-SA')} ر.س</>
                              )}
                            </button>
                          </>
                        )}
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

      case 'letterheads':
        return <LetterheadManager />;

      case 'session_defaults':
        return <SessionDefaultsSettings />;

      case 'session_report_templates':
        return <SessionReportTemplatesSettings />;

      case 'fee_proposal_templates':
        return <FeeProposalTemplatesSettings />;

      case 'correspondence_templates':
        return <CorrespondenceTemplatesSettings />;

      case 'session_workflow':
        return <SessionWorkflowSettingsComponent />;

      case 'integrations':
        return <MicrosoftIntegrationSettings />;

      case 'email':
        return <EmailIntegrationSection />;

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
        {/* Mobile-only: قائمة منسدلة بدل الشريط الأفقي الطويل */}
        <div className="settings-sidebar-mobile">
          <label className="settings-sidebar-mobile__label">القسم</label>
          <select
            className="settings-sidebar-mobile__select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {visibleTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        {/* Sidebar (Desktop) */}
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
                {activeTab === 'privacy' && 'الخصوصية والأمان'}
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
                {activeTab === 'privacy' && 'إدارة إعدادات الأمان وكلمة المرور.'}
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
                {activeTab === 'privacy' && 'غيّر كلمة المرور بشكل دوري لحماية حسابك'}
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
