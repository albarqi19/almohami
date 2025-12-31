import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertTriangle
} from 'lucide-react';
import { UserService, type User as ApiUser, type CreateUserForm, type UpdateUserForm, type UserFilters } from '../services/UserService';
import RoleService, { type Role as ApiRole } from '../services/roleService';
import PermissionService, { type Permission as ApiPermission, type GroupedPermission } from '../services/permissionService';

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
}

const USERS_CACHE_KEY = 'users_data';
const USERS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const PermissionManagement: React.FC<PermissionManagementProps> = ({ className = "" }) => {
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

  // States for API data - initialize from cache
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USERS_CACHE_DURATION) {
          return data.users || [];
        }
      }
    } catch (e) { console.error('Cache error:', e); }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USERS_CACHE_DURATION) return false;
      }
    } catch (e) { }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USERS_CACHE_DURATION) {
          return data.totalPages || 1;
        }
      }
    } catch (e) { }
    return 1;
  });
  const [totalUsers, setTotalUsers] = useState(() => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < USERS_CACHE_DURATION) {
          return data.totalUsers || 0;
        }
      }
    } catch (e) { }
    return 0;
  });

  // Load users from API
  const loadUsers = async (filters: UserFilters = {}, forceRefresh = false) => {
    // Check if we have valid cache for default filters
    if (!forceRefresh && !searchTerm && selectedRole === 'all' && selectedStatus === 'all') {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < USERS_CACHE_DURATION && data.users?.length > 0) {
            setUsers(data.users);
            setTotalPages(data.totalPages || 1);
            setTotalUsers(data.totalUsers || 0);
            setLoading(false);
            return;
          }
        } catch (e) { }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const response = await UserService.getAllUsers({
        ...filters,
        search: searchTerm || undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        page: currentPage,
        limit: 10
      });

      // Check if response and response.data exist
      if (!response || !response.data) {
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      // Transform API data to match local User interface
      const transformedUsers: User[] = response.data.map((apiUser: any) => ({
        ...apiUser,
        status: (apiUser.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'pending',
        lastLogin: apiUser.last_login_at ? new Date(apiUser.last_login_at) : undefined,
        department: apiUser.department || 'غير محدد'
      }));

      setUsers(transformedUsers);
      setTotalPages(response.last_page || 1);
      setTotalUsers(response.total || 0);

      // Save to cache (only if default filters)
      if (!searchTerm && selectedRole === 'all' && selectedStatus === 'all') {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify({
          data: { users: transformedUsers, totalPages: response.last_page || 1, totalUsers: response.total || 0 },
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'فشل في تحميل المستخدمين');
      // Set empty data on error
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount and when filters change
  useEffect(() => {
    // Only fetch if no cached data for default filters
    if (!searchTerm && selectedRole === 'all' && selectedStatus === 'all') {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < USERS_CACHE_DURATION && data.users?.length > 0) {
            // Cache is valid, already loaded in initial state
            return;
          }
        } catch (e) { }
      }
    }
    loadUsers();
  }, [searchTerm, selectedRole, selectedStatus, currentPage]);

  // Load roles and permissions on component mount
  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

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
    return roles.find(r => r.id === roleId)?.displayName || roleId;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const UserModal: React.FC<{ user?: User; onClose: () => void; onSave: (user: User) => void }> = ({
    user,
    onClose,
    onSave
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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newUser: User = {
        id: user?.id || Date.now().toString(),
        ...formData,
        lastLogin: user?.lastLogin || new Date()
      } as User;
      onSave(newUser);
      onClose();
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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            margin: 0,
            marginBottom: '20px'
          }}>
            {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  الاسم
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  الدور
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  الحالة
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="pending">معلق</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  رقم الهوية الوطنية *
                </label>
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px'
                }}>
                  القسم
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'white',
                  backgroundColor: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {user ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            margin: 0,
            marginBottom: '4px'
          }}>
            إدارة الصلاحيات والمستخدمين
          </h2>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            إدارة المستخدمين والأدوار والصلاحيات
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddUserModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: 'pointer'
          }}
        >
          <UserPlus style={{ height: '18px', width: '18px' }} />
          إضافة مستخدم
        </motion.button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '24px'
      }}>
        {[
          { id: 'users', label: 'المستخدمين', icon: Users },
          { id: 'roles', label: 'الأدوار', icon: Shield },
          { id: 'permissions', label: 'الصلاحيات', icon: Key }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <tab.icon style={{ height: '16px', width: '16px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          {/* Filters */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}>
                البحث
              </label>
              <div style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  height: '16px',
                  width: '16px',
                  color: 'var(--color-text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="البحث في الأسماء والإيميلات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}>
                الدور
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              >
                <option value="all">جميع الأدوار</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}>
                الحالة
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="pending">معلق</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--color-red-50)',
              border: '1px solid var(--color-red-200)',
              borderRadius: '8px',
              marginBottom: '16px',
              color: 'var(--color-red-700)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              color: 'var(--color-text-secondary)'
            }}>
              جارٍ تحميل المستخدمين...
            </div>
          )}

          {/* Users Table */}
          {!loading && (
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr auto',
                padding: '16px',
                backgroundColor: 'var(--color-secondary)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                gap: '16px'
              }}>
                <div>الحالة</div>
                <div>المستخدم</div>
                <div>الدور</div>
                <div>القسم</div>
                <div>آخر دخول</div>
                <div>الإجراءات</div>
              </div>

              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr auto',
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)',
                    gap: '16px',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getStatusIcon(user.status)}
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {getStatusDisplayName(user.status)}
                    </span>
                  </div>

                  <div>
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text)',
                      marginBottom: '2px'
                    }}>
                      {user.name}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {user.email}
                    </div>
                  </div>

                  <div>
                    <span style={{
                      padding: '4px 8px',
                      fontSize: 'var(--font-size-xs)',
                      backgroundColor: `${roles.find(r => r.id === user.role)?.color}15`,
                      color: roles.find(r => r.id === user.role)?.color,
                      borderRadius: '4px'
                    }}>
                      {getRoleDisplayName(user.role || '')}
                    </span>
                  </div>

                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {user.department || 'غير محدد'}
                  </div>

                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : 'لم يسجل دخول'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAddUserModal(true);
                      }}
                      style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <Edit2 style={{ height: '14px', width: '14px' }} />
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                        style={{
                          padding: '6px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        <MoreHorizontal style={{ height: '14px', width: '14px' }} />
                      </button>

                      {dropdownOpen === user.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '8px',
                          minWidth: '150px',
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <button
                            onClick={() => {
                              handleToggleUserStatus(user.id, user.status === 'active');
                              setDropdownOpen(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'right',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text)'
                            }}
                          >
                            {user.status === 'active' ? 'إلغاء التفعيل' : 'تفعيل'}
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteUser(user.id);
                              setDropdownOpen(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'right',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-red-600)'
                            }}
                          >
                            حذف المستخدم
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          {rolesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              جاري تحميل الأدوار...
            </div>
          ) : roles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              لا توجد أدوار بعد
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px'
            }}>
              {roles.map(role => (
                <motion.div
                  key={role.id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: `${role.color}15`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Shield style={{ height: '24px', width: '24px', color: role.color }} />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {role.isSystem && (
                        <span style={{
                          padding: '4px 8px',
                          fontSize: 'var(--font-size-xs)',
                          backgroundColor: 'var(--color-blue-100)',
                          color: 'var(--color-blue-600)',
                          borderRadius: '4px'
                        }}>
                          نظام
                        </span>
                      )}
                      <button
                        style={{
                          padding: '6px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        <Edit2 style={{ height: '14px', width: '14px' }} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text)',
                    margin: 0,
                    marginBottom: '8px'
                  }}>
                    {role.displayName}
                  </h3>

                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                    marginBottom: '16px'
                  }}>
                    {role.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {role.userCount} مستخدم
                    </span>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {role.permissions.length} صلاحية
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px'
                  }}>
                    {role.permissions.slice(0, 3).map(permissionName => {
                      const permission = permissions.find(p => p.name === permissionName);
                      return permission ? (
                        <span
                          key={permissionName}
                          style={{
                            padding: '2px 6px',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: 'var(--color-secondary)',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '4px'
                          }}
                        >
                          {permission.display_name}
                        </span>
                      ) : null;
                    })}
                    {role.permissions.length > 3 && (
                      <span style={{
                        padding: '2px 6px',
                        fontSize: 'var(--font-size-xs)',
                        backgroundColor: 'var(--color-secondary)',
                        color: 'var(--color-text-secondary)',
                        borderRadius: '4px'
                      }}>
                        +{role.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
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
