import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  Edit2,
  Search,
  MoreHorizontal,
  UserPlus,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail
} from 'lucide-react';
import { UserService, type User as ApiUser, type CreateUserForm, type UpdateUserForm, type UserFilters } from '../services/UserService';
import RoleService, { type Role as ApiRole } from '../services/roleService';
import PermissionService, { type Permission as ApiPermission, type GroupedPermission } from '../services/permissionService';
import { apiClient } from '../utils/api';

interface Permission extends ApiPermission {
  category: 'cases' | 'tasks' | 'documents' | 'reports' | 'admin' | 'clients';
}

interface Role extends Omit<ApiRole, 'display_name'> {
  displayName: string;
  isSystem: boolean;
  userCount: number;
  color: string;
}

interface User extends ApiUser {
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  department?: string;
}

interface PermissionManagementProps {
  className?: string;
  autoOpenAddUser?: boolean;
  onAddUserModalChange?: (isOpen: boolean) => void;
}

// Legacy cache key — kept only to clear stale data on mount
const USERS_CACHE_KEY = 'users_data';

const PermissionManagement: React.FC<PermissionManagementProps> = ({
  className = "",
  autoOpenAddUser = false,
  onAddUserModalChange
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // States for Roles & Permissions - with fallback defaults
  const DEFAULT_ROLES = [
    { id: 'admin', name: 'admin', displayName: 'مدير النظام', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-red-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
    { id: 'partner', name: 'partner', displayName: 'شريك', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-blue-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
    { id: 'senior_lawyer', name: 'senior_lawyer', displayName: 'محامي أول', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-green-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
    { id: 'lawyer', name: 'lawyer', displayName: 'محامي', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-teal-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
    { id: 'legal_assistant', name: 'legal_assistant', displayName: 'مساعد قانوني', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-yellow-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
    { id: 'client', name: 'client', displayName: 'عميل', description: '', isSystem: true, is_system: true, userCount: 0, color: 'var(--color-purple-500)', permissions: [], guard_name: 'web', tenant_id: null, users_count: 0, permissions_count: 0, created_at: '', updated_at: '' },
  ] as Role[];
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // States for API data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Load users from API (no cache — always fetch fresh, paginated server-side)
  const loadUsers = async (filters: UserFilters = {}, _forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await UserService.getAllUsers({
        ...filters,
        search: searchTerm || undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        exclude_role: 'client', // المستخدمون فقط (دون العملاء) — العملاء في صفحة /clients
        page: currentPage,
        limit: 10
      } as any);

      if (!response || !response.data) {
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      const transformedUsers: User[] = response.data.map((apiUser: any) => ({
        ...apiUser,
        status: (apiUser.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'pending',
        lastLogin: apiUser.last_login_at ? new Date(apiUser.last_login_at) : undefined,
        department: apiUser.department || 'غير محدد'
      }));

      setUsers(transformedUsers);
      setTotalPages(response.last_page || 1);
      setTotalUsers(response.total || 0);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'فشل في تحميل المستخدمين');
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever filters or page change
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedRole, selectedStatus, currentPage]);

  // Load roles and permissions on component mount
  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  // Auto open add user modal when prop is true
  useEffect(() => {
    if (autoOpenAddUser) {
      setShowAddUserModal(true);
      onAddUserModalChange?.(false); // Reset the prop
    }
  }, [autoOpenAddUser, onAddUserModalChange]);

  // Handle user creation
  const handleCreateUser = async (userData: CreateUserForm) => {
    try {
      setLoading(true);
      const response = await UserService.createUser(userData);

      // عرض رسالة نجاح مع الـ PIN المولد
      if (response && (response as any).pin) {
        alert(`تم إنشاء المستخدم بنجاح!\n\nرقم الهوية: ${userData.national_id}\nالرقم السري: ${(response as any).pin}\n\nتم إرسال رسالة ترحيب عبر واتساب للمستخدم الجديد.`);
      }

      // مسح الكاش وتحديث البيانات من السيرفر
      localStorage.removeItem(USERS_CACHE_KEY);
      await loadUsers({}, true); // Force refresh from server
      setShowAddUserModal(false);
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'فشل في إنشاء المستخدم');
      throw err; // إعادة رمي الخطأ ليلتقطه المودال ويعرض التفاصيل (validation errors)
    } finally {
      setLoading(false);
    }
  };

  // Handle user update
  const handleUpdateUser = async (id: string, userData: UpdateUserForm) => {
    try {
      setLoading(true);
      await UserService.updateUser(id, userData);
      localStorage.removeItem(USERS_CACHE_KEY);
      await loadUsers({}, true); // Force refresh from server
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'فشل في تحديث المستخدم');
      throw err; // إعادة رمي الخطأ ليلتقطه المودال ويعرض التفاصيل
    } finally {
      setLoading(false);
    }
  };

  // Handle resend credentials (PIN جديد + واتساب)
  const handleResendCredentials = async (id: string) => {
    if (!confirm('سيتم إنشاء رقم سري جديد وإرساله للمستخدم عبر واتساب. هل تريد المتابعة؟')) return;
    try {
      setLoading(true);
      const result = await UserService.resendCredentials(id);
      alert(`تم إعادة إنشاء بيانات الدخول بنجاح ✅\n\nالرقم السري الجديد: ${result.pin}\n\nتم إرسال الرسالة عبر واتساب (إذا كان الجهاز متصلاً ورقم الهاتف صحيحاً).`);
    } catch (err) {
      console.error('Error resending credentials:', err);
      alert('تعذّر إعادة إرسال بيانات الدخول. تحقق من اتصال الواتساب وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      setLoading(true);
      await UserService.deleteUser(id);
      localStorage.removeItem(USERS_CACHE_KEY);
      await loadUsers({}, true); // Force refresh from server
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'فشل في حذف المستخدم');
    } finally {
      setLoading(false);
    }
  };

  // Handle user status toggle
  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      await UserService.updateUserStatus(id, !currentStatus);
      localStorage.removeItem(USERS_CACHE_KEY);
      await loadUsers({}, true); // Force refresh from server
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'فشل في تحديث حالة المستخدم');
    } finally {
      setLoading(false);
    }
  };

  // Load roles from API
  const loadRoles = async () => {
    try {
      console.log('🔄 PermissionManagement: Starting to load roles...');
      setRolesLoading(true);
      const response = await RoleService.getAllRoles({ per_page: 100 }) as any;
      console.log('📦 PermissionManagement: Roles response:', response);

      // ✅ Only update roles if API returns non-empty data
      if (response.data && response.data.length > 0) {
        const transformedRoles = response.data.map((role: ApiRole) => ({
          ...role,
          displayName: role.display_name,
          isSystem: role.is_system,
          userCount: role.users_count,
          color: getRoleColor(role.name)
        }));

        console.log('✨ PermissionManagement: Transformed roles:', transformedRoles);
        setRoles(transformedRoles);
      } else {
        // Keep DEFAULT_ROLES when API returns empty
        console.log('⚠️ PermissionManagement: API returned empty, keeping defaults');
      }
    } catch (err) {
      console.error('❌ PermissionManagement Error loading roles:', err);
      // Keep DEFAULT_ROLES on error
    } finally {
      setRolesLoading(false);
    }
  };

  // Load permissions from API
  const loadPermissions = async () => {
    try {
      console.log('🔄 PermissionManagement: Starting to load permissions...');
      setPermissionsLoading(true);
      const response = await PermissionService.getAllPermissions({ all: true }) as any;
      console.log('📦 PermissionManagement: Permissions response:', response);
      console.log('✨ PermissionManagement: Permissions data:', response.data);
      setPermissions(response.data);
    } catch (err) {
      console.error('❌ PermissionManagement Error loading permissions:', err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Helper function for role colors
  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      admin: 'var(--color-red-500)',
      partner: 'var(--color-blue-500)',
      senior_lawyer: 'var(--color-green-500)',
      lawyer: 'var(--color-teal-500)',
      legal_assistant: 'var(--color-yellow-500)',
      client: 'var(--color-purple-500)'
    };
    return colors[roleName] || 'var(--color-gray-500)';
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'cases': return 'القضايا';
      case 'tasks': return 'المهام';
      case 'documents': return 'الوثائق';
      case 'reports': return 'التقارير';
      case 'admin': return 'الإدارة';
      case 'clients': return 'العملاء';
      default: return category;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle style={{ height: '16px', width: '16px', color: 'var(--color-green-500)' }} />;
      case 'inactive':
        return <XCircle style={{ height: '16px', width: '16px', color: 'var(--color-red-500)' }} />;
      case 'pending':
        return <AlertTriangle style={{ height: '16px', width: '16px', color: 'var(--color-yellow-500)' }} />;
      default:
        return null;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'pending': return 'معلق';
      default: return status;
    }
  };

  const getRoleDisplayName = (roleId: string) => {
    // البحث بالاسم (name) لأن user.role يحوي اسم الدور (مثل "admin") وليس id رقمي
    const match = roles.find(r => r.name === roleId || String(r.id) === roleId);
    if (match?.displayName) return match.displayName;
    // Fallback لقاموس ثابت بالعربي إذا كانت الأدوار لم تُحمَّل بعد
    const arabicMap: Record<string, string> = {
      admin: 'مدير النظام',
      owner: 'صاحب الشركة',
      partner: 'شريك',
      senior_lawyer: 'محامي أول',
      lawyer: 'محامي',
      legal_assistant: 'مساعد قانوني',
      accountant: 'محاسب',
      secretary: 'سكرتير',
      client: 'موكل',
      super_admin: 'مدير عام',
    };
    return arabicMap[roleId] || roleId;
  };

  // Server-side filtering/pagination is done in loadUsers — no local filter needed.
  // Reset to page 1 whenever filters change.
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedRole, selectedStatus]);

  const UserModal: React.FC<{
    user?: User;
    onClose: () => void;
    onSave: (user: User) => void | Promise<void>;
    onResendCredentials?: () => void | Promise<void>;
  }> = ({
    user,
    onClose,
    onSave,
    onResendCredentials
  }) => {
    const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'lawyer',
      status: user?.status || 'active',
      phone: user?.phone || '',
      department: user?.department || '',
      national_id: user?.national_id || ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    type WaStatus = 'loading' | 'connected' | 'disconnected' | 'no_instance' | 'error';
    const [waStatus, setWaStatus] = useState<WaStatus>('loading');
    const navigate = useNavigate();

    // فحص حالة جهاز الواتساب الخاص بالشركة عند فتح المودال (للإضافة فقط)
    useEffect(() => {
      if (user) { setWaStatus('connected'); return; } // التعديل لا يحتاج فحص
      let cancelled = false;
      (async () => {
        try {
          const resp: any = await apiClient.get('/whatsapp/instances');
          if (cancelled) return;
          const list: any[] = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.data) ? resp.data.data : []);
          if (list.length === 0) {
            setWaStatus('no_instance');
          } else {
            const anyConnected = list.some((i: any) => (i.status || '').toLowerCase() === 'connected');
            setWaStatus(anyConnected ? 'connected' : 'disconnected');
          }
        } catch {
          if (!cancelled) setWaStatus('error');
        }
      })();
      return () => { cancelled = true; };
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      const newUser: User = {
        id: user?.id || Date.now().toString(),
        ...formData,
        lastLogin: user?.lastLogin || new Date()
      } as User;
      setModalError(null);
      setSubmitting(true);
      try {
        await onSave(newUser);
        onClose();
      } catch (err: any) {
        // استخراج تفاصيل أخطاء الـ validation (422) من الباك إند
        let msg = 'تعذّر حفظ البيانات';
        if (err?.errors && typeof err.errors === 'object') {
          const fieldLabels: Record<string, string> = {
            name: 'الاسم',
            email: 'البريد الإلكتروني',
            national_id: 'رقم الهوية',
            role: 'الدور',
            phone: 'رقم الهاتف',
          };
          msg = Object.entries(err.errors)
            .map(([field, msgs]: [string, any]) => {
              const label = fieldLabels[field] || field;
              const raw = Array.isArray(msgs) ? msgs[0] : String(msgs);
              const arabic = /already been taken/i.test(raw)
                ? 'مستخدم مسبقاً (مسجّل في النظام)'
                : /required/i.test(raw)
                ? 'حقل مطلوب'
                : /invalid/i.test(raw)
                ? 'قيمة غير صالحة'
                : raw;
              return `• ${label}: ${arabic}`;
            })
            .join('\n');
        } else if (err?.message) {
          msg = err.message;
        }
        setModalError(msg);
      } finally {
        setSubmitting(false);
      }
    };

    // ERP-style shared field styles (compact, dense)
    const fieldLabelStyle: React.CSSProperties = {
      display: 'block',
      fontSize: '12px',
      fontWeight: 500,
      color: 'var(--color-text)',
      marginBottom: '4px',
      lineHeight: 1.4
    };
    const fieldInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '7px 10px',
      fontSize: '13px',
      color: 'var(--color-text)',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      lineHeight: 1.4,
      outline: 'none'
    };
    const requiredStarStyle: React.CSSProperties = {
      color: '#dc2626',
      fontWeight: 700,
      marginInlineStart: '2px'
    };
    const optionalHintStyle: React.CSSProperties = {
      color: 'var(--color-text-secondary)',
      fontSize: '11px',
      fontWeight: 400
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '10px',
            padding: '0',
            maxWidth: '720px',
            width: '92%',
            maxHeight: '88vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0
          }}>
            <div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.3
              }}>
                {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                margin: '3px 0 0 0',
                lineHeight: 1.3
              }}>
                {user ? 'تحديث بيانات المستخدم في النظام' : 'إنشاء حساب جديد لمستخدم في الشركة'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--color-text-secondary)',
                fontSize: '20px',
                lineHeight: 1,
                marginRight: '-8px'
              }}
            >
              ×
            </button>
          </div>

          {/* Body (scrollable) */}
          <div style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1
          }}>
            {modalError && (
              <div style={{
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '14px',
                color: '#dc2626',
                fontSize: '12px',
                whiteSpace: 'pre-line',
                lineHeight: 1.6
              }}>
                <strong style={{ display: 'block', marginBottom: '3px', fontSize: '12px' }}>تعذّر الحفظ:</strong>
                {modalError}
              </div>
            )}

            {/* تنبيه حالة الواتساب — يظهر فقط في وضع الإضافة */}
            {!user && (waStatus === 'no_instance' || waStatus === 'disconnected') && (
              <div style={{
                backgroundColor: waStatus === 'no_instance' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: `1px solid ${waStatus === 'no_instance' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '14px',
                fontSize: '12px',
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <span style={{
                  color: waStatus === 'no_instance' ? '#d97706' : '#dc2626',
                  fontSize: '16px',
                  lineHeight: 1,
                  flexShrink: 0,
                  marginTop: '1px'
                }}>⚠</span>
                <div style={{ flex: 1, color: 'var(--color-text)' }}>
                  <strong style={{
                    display: 'block',
                    marginBottom: '3px',
                    color: waStatus === 'no_instance' ? '#b45309' : '#b91c1c'
                  }}>
                    {waStatus === 'no_instance'
                      ? 'لم يتم ربط جهاز واتساب بعد'
                      : 'جهاز الواتساب غير متصل حالياً'}
                  </strong>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    {waStatus === 'no_instance'
                      ? 'الرقم السري لن يصل تلقائياً للمستخدم. يرجى ربط جهاز واتساب أولاً من صفحة إعدادات الواتساب.'
                      : 'الرقم السري لن يصل للمستخدم حتى يُعاد اتصال الجهاز.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate('/whatsapp-settings'); }}
                    style={{
                      marginTop: '8px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: waStatus === 'no_instance' ? '#d97706' : '#dc2626',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    {waStatus === 'no_instance' ? 'ربط جهاز واتساب ←' : 'إدارة الواتساب ←'}
                  </button>
                </div>
              </div>
            )}

            <form id="user-modal-form" onSubmit={handleSubmit}>
              {/* Section: المعلومات الأساسية */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: '1px dashed var(--color-border)'
                }}>
                  المعلومات الأساسية
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* الاسم — مطلوب */}
                  <div>
                    <label style={fieldLabelStyle}>
                      الاسم الكامل <span style={requiredStarStyle}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="مثال: محمد عبدالله"
                      style={fieldInputStyle}
                    />
                  </div>
                  {/* رقم الهوية — مطلوب */}
                  <div>
                    <label style={fieldLabelStyle}>
                      رقم الهوية الوطنية <span style={requiredStarStyle}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.national_id}
                      onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                      required
                      placeholder="10 أرقام"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Section: الدور والصلاحيات */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: '1px dashed var(--color-border)'
                }}>
                  الدور والصلاحيات
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* الدور — مطلوب */}
                  <div>
                    <label style={fieldLabelStyle}>
                      الدور <span style={requiredStarStyle}>*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                      style={fieldInputStyle}
                    >
                      {roles.filter(role => role.name !== 'client').map(role => (
                        <option key={role.id} value={role.name}>
                          {role.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* الحالة — للتعديل فقط */}
                  {user && (
                    <div>
                      <label style={fieldLabelStyle}>
                        الحالة
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        style={fieldInputStyle}
                      >
                        <option value="active">نشط</option>
                        <option value="inactive">غير نشط</option>
                        <option value="pending">معلق</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: التواصل */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                  paddingBottom: '4px',
                  borderBottom: '1px dashed var(--color-border)'
                }}>
                  معلومات التواصل
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* البريد — اختياري للإضافة، مطلوب للتعديل */}
                  <div>
                    <label style={fieldLabelStyle}>
                      البريد الإلكتروني{user
                        ? <span style={requiredStarStyle}> *</span>
                        : <span style={optionalHintStyle}> (اختياري)</span>}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required={!!user}
                      placeholder="example@domain.com"
                      style={fieldInputStyle}
                    />
                  </div>
                  {/* رقم الهاتف */}
                  <div>
                    <label style={fieldLabelStyle}>
                      رقم الهاتف (واتساب)
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Helper info — يظهر عند الإضافة فقط */}
              {!user && (
                <div style={{
                  marginTop: '6px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: 1.6
                }}>
                  <span style={{ color: '#3b82f6', flexShrink: 0, fontWeight: 700 }}>ⓘ</span>
                  <div>
                    <strong style={{ color: 'var(--color-text)' }}>تنبيه:</strong>{' '}
                    سيتم توليد رقم سري (PIN) من 5 أرقام تلقائياً وإرسال رسالة ترحيب عبر واتساب على رقم الهاتف المُسجَّل.
                  </div>
                </div>
              )}

              {/* Resend credentials — يظهر عند التعديل فقط */}
              {user && onResendCredentials && (
                <div style={{
                  marginTop: '6px',
                  padding: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>
                      إعادة إرسال بيانات الدخول
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      سيُولَّد رقم سري جديد ويُرسل عبر واتساب — مفيد لو لم تصل الرسالة الأولى.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onResendCredentials()}
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'white',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    إعادة الإرسال
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'rgba(0,0,0,0.015)',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="user-modal-form"
              disabled={submitting}
              style={{
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'جارٍ الحفظ...' : (user ? 'حفظ التعديلات' : 'إضافة المستخدم')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // ─── Role color/label helpers ───
  const roleColorOf = (roleName: string): string => {
    const r = roles.find(x => x.name === roleName || x.id === roleName);
    return r?.color || 'var(--color-text-secondary)';
  };

  // ─── Pagination button style ───
  const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 8px',
    fontSize: '12px',
    color: disabled ? 'var(--color-text-secondary)' : 'var(--color-text)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1
  });

  return (
    <div className={className}>
      {/* ─── ERP Header (compact, single row) ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '14px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: 0,
            lineHeight: 1.3,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Users size={18} style={{ color: 'var(--color-primary)' }} />
            الفريق والصلاحيات
          </h2>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            margin: '3px 0 0 0',
            lineHeight: 1.3
          }}>
            إدارة المستخدمين (المحامين والمساعدين) والأدوار والصلاحيات. <strong>العملاء يُداروَن من <a href="/clients" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>صفحة العملاء</a></strong>.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddUserModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <UserPlus size={15} />
          إضافة مستخدم
        </motion.button>
      </div>

      {/* Stats moved to Admin.tsx (single source) — avoid duplication. */}

      {/* ─── Tabs (compact pill-style) ─── */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '14px'
      }}>
        {[
          { id: 'users', label: 'المستخدمون', icon: Users, count: totalUsers || users.length },
          { id: 'roles', label: 'الأدوار', icon: Shield, count: roles.length },
          { id: 'permissions', label: 'الصلاحيات', icon: Key, count: permissions.length }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'all 0.15s ease'
              }}
            >
              <tab.icon size={14} />
              {tab.label}
              <span style={{
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 600,
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-secondary)',
                borderRadius: '8px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Users Tab ─── */}
      {activeTab === 'users' && (
        <div>
          {/* Compact horizontal toolbar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '180px' }}>
              <Search size={14} style={{
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)'
              }} />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد أو الهوية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 10px',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Role filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '7px 10px',
                fontSize: '13px',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                minWidth: '140px',
                cursor: 'pointer'
              }}
            >
              <option value="all">كل الأدوار</option>
              {roles.filter(role => role.name !== 'client').map(role => (
                <option key={role.id} value={role.name}>
                  {role.displayName}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '7px 10px',
                fontSize: '13px',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                minWidth: '120px',
                cursor: 'pointer'
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="pending">معلق</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadUsers({}, true)}
              title="تحديث"
              style={{
                padding: '7px 10px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={14} />
            </button>

            {/* Result count */}
            <div style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              marginInlineStart: 'auto',
              whiteSpace: 'nowrap'
            }}>
              {totalUsers > 0
                ? `${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, totalUsers)} من ${totalUsers}`
                : `${users.length} مستخدم`}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '6px',
              marginBottom: '10px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px'
            }}>
              <RefreshCw size={18} className="spinning" style={{ marginInlineEnd: 8, verticalAlign: 'middle' }} />
              جارٍ تحميل المستخدمين...
            </div>
          )}

          {/* Empty */}
          {!loading && users.length === 0 && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)'
            }}>
              <Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: '13px' }}>
                {searchTerm || selectedRole !== 'all' || selectedStatus !== 'all'
                  ? 'لا توجد نتائج تطابق البحث'
                  : 'لا يوجد مستخدمون بعد'}
              </div>
            </div>
          )}

          {/* ─── ERP-style compact table ─── */}
          {!loading && users.length > 0 && (
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              overflowX: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                minWidth: '720px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--color-secondary)',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    {['#', 'الاسم', 'رقم الهوية', 'الدور', 'البريد / الهاتف', 'الحالة', 'آخر دخول', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: 'right',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const roleColor = roleColorOf(user.role || '');
                    return (
                      <tr key={user.id} style={{
                        borderBottom: idx < users.length - 1 ? '1px solid var(--color-border)' : 'none',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px', width: '40px' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: `${roleColor}20`,
                              color: roleColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              {user.name?.charAt(0) || '؟'}
                            </div>
                            <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                              {user.name}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '12px' }} dir="ltr">
                          {user.national_id || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: `${roleColor}15`,
                            color: roleColor,
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            {getRoleDisplayName(user.role || '')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {user.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                {user.email}
                              </span>
                            </div>
                          )}
                          {user.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: user.email ? '2px' : 0 }} dir="ltr">
                              <Phone size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {!user.email && !user.phone && '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: user.status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: user.status === 'active' ? '#10b981' : '#ef4444',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            {getStatusIcon(user.status)}
                            {getStatusDisplayName(user.status)}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAddUserModal(true);
                              }}
                              title="تعديل"
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                                title="المزيد"
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'transparent',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: 'var(--color-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <MoreHorizontal size={13} />
                              </button>
                              {dropdownOpen === user.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  marginTop: '4px',
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '6px',
                                  padding: '4px',
                                  minWidth: '180px',
                                  zIndex: 100,
                                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
                                }}>
                                  <button
                                    onClick={() => {
                                      handleResendCredentials(user.id);
                                      setDropdownOpen(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '7px 10px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      textAlign: 'right',
                                      cursor: 'pointer',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      color: 'var(--color-text)'
                                    }}
                                  >
                                    إعادة إرسال بيانات الدخول
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleToggleUserStatus(user.id, user.status === 'active');
                                      setDropdownOpen(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '7px 10px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      textAlign: 'right',
                                      cursor: 'pointer',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      color: 'var(--color-text)'
                                    }}
                                  >
                                    {user.status === 'active' ? 'إلغاء التفعيل' : 'تفعيل'}
                                  </button>
                                  <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                                  <button
                                    onClick={() => {
                                      handleDeleteUser(user.id);
                                      setDropdownOpen(null);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '7px 10px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      textAlign: 'right',
                                      cursor: 'pointer',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      color: '#dc2626'
                                    }}
                                  >
                                    حذف المستخدم
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── Pagination ─── */}
          {!loading && totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                صفحة <strong style={{ color: 'var(--color-text)' }}>{currentPage}</strong> من <strong style={{ color: 'var(--color-text)' }}>{totalPages}</strong>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={paginationBtnStyle(currentPage === 1)}
                  title="الأولى"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={paginationBtnStyle(currentPage === 1)}
                >
                  <ChevronRight size={14} />
                  السابق
                </button>
                {/* Page numbers (compact: window of 5) */}
                {(() => {
                  const pages: number[] = [];
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const end = Math.min(totalPages, start + 4);
                  for (let p = start; p <= end; p++) pages.push(p);
                  return pages.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        padding: '4px 9px',
                        fontSize: '12px',
                        fontWeight: p === currentPage ? 700 : 500,
                        color: p === currentPage ? 'white' : 'var(--color-text)',
                        backgroundColor: p === currentPage ? 'var(--color-primary)' : 'transparent',
                        border: '1px solid ' + (p === currentPage ? 'var(--color-primary)' : 'var(--color-border)'),
                        borderRadius: '4px',
                        cursor: 'pointer',
                        minWidth: '28px'
                      }}
                    >
                      {p}
                    </button>
                  ));
                })()}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={paginationBtnStyle(currentPage === totalPages)}
                >
                  التالي
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={paginationBtnStyle(currentPage === totalPages)}
                  title="الأخيرة"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          {rolesLoading ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px'
            }}>
              <RefreshCw size={18} className="spinning" style={{ marginInlineEnd: 8, verticalAlign: 'middle' }} />
              جارٍ تحميل الأدوار...
            </div>
          ) : roles.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)'
            }}>
              <Shield size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: '13px' }}>لا توجد أدوار بعد</div>
            </div>
          ) : (
            // ─── ERP-style roles table ───
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              overflowX: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                minWidth: '640px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--color-secondary)',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    {['#', 'الدور', 'الوصف', 'النوع', 'المستخدمون', 'الصلاحيات', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: 'right',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap'
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, idx) => (
                    <tr key={role.id} style={{
                      borderBottom: idx < roles.length - 1 ? '1px solid var(--color-border)' : 'none',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px', width: '40px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: `${role.color}15`,
                            color: role.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Shield size={14} />
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {role.displayName}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        <div style={{
                          maxWidth: '260px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {role.description || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {role.isSystem ? (
                          <span style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            color: '#3b82f6',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            نظام
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(139, 92, 246, 0.12)',
                            color: '#8b5cf6',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            مخصص
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text)', fontWeight: 600, fontSize: '13px' }}>
                        {role.userCount}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-text)'
                          }}>
                            {role.permissions.length}
                          </span>
                          {role.permissions.length > 0 && (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                              {role.permissions.slice(0, 2).map(permissionName => {
                                const permission = permissions.find(p => p.name === permissionName);
                                return permission ? (
                                  <span key={permissionName} style={{
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    backgroundColor: 'var(--color-secondary)',
                                    color: 'var(--color-text-secondary)',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {permission.display_name}
                                  </span>
                                ) : null;
                              })}
                              {role.permissions.length > 2 && (
                                <span style={{
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  backgroundColor: 'var(--color-secondary)',
                                  color: 'var(--color-text-secondary)',
                                  borderRadius: '3px'
                                }}>
                                  +{role.permissions.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <button
                          title="تعديل الدور"
                          style={{
                            padding: '4px 6px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div>
          {permissionsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              جاري تحميل الصلاحيات...
            </div>
          ) : permissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              لا توجد صلاحيات بعد
            </div>
          ) : (
            <>
              {Object.entries(
                permissions.reduce((acc, permission) => {
                  if (!acc[permission.category]) acc[permission.category] = [];
                  acc[permission.category].push(permission);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([category, categoryPermissions]) => (
                <div
                  key={category}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px'
                  }}
                >
                  <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text)',
                    margin: 0,
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Shield style={{ height: '20px', width: '20px', color: 'var(--color-primary)' }} />
                    {getCategoryDisplayName(category)}
                  </h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '12px'
                  }}>
                    {categoryPermissions.map(permission => (
                      <div
                        key={permission.id}
                        style={{
                          padding: '12px',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <h4 style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text)',
                            margin: 0
                          }}>
                            {permission.display_name}
                          </h4>
                          <span style={{
                            padding: '2px 6px',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-secondary)',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '4px'
                          }}>
                            {permission.name}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          margin: 0
                        }}>
                          {permission.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddUserModal && (
          <UserModal
            user={selectedUser || undefined}
            onClose={() => {
              setShowAddUserModal(false);
              setSelectedUser(null);
            }}
            onResendCredentials={selectedUser ? () => handleResendCredentials(selectedUser.id) : undefined}
            onSave={async (user) => {
              if (selectedUser) {
                // Update existing user
                await handleUpdateUser(selectedUser.id, {
                  name: user.name,
                  email: user.email,
                  role: user.role || '',
                  phone: user.phone,
                  national_id: user.national_id,
                  is_active: user.status === 'active'
                });
              } else {
                // Create new user
                await handleCreateUser({
                  name: user.name,
                  email: user.email,
                  role: user.role || '',
                  phone: user.phone,
                  national_id: user.national_id || ''
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PermissionManagement;
