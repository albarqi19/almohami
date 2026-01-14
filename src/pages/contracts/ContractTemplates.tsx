import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  FileCheck,
  Scale,
  Briefcase,
  Percent,
  RefreshCw,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { contractTemplateService } from '../../services/contractTemplateService';
import type { ContractTemplate, ContractType, ScopeType } from '../../types/contracts';
import '../../styles/contracts-page.css';

const CONTRACT_TYPES: { value: ContractType | ''; label: string }[] = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'representation', label: 'تمثيل قانوني' },
  { value: 'consultation', label: 'استشارة' },
  { value: 'retainer', label: 'اشتراك شهري' },
  { value: 'contingency', label: 'نسبة من الحكم' },
  { value: 'other', label: 'أخرى' },
];

const SCOPE_TYPES: { value: ScopeType | ''; label: string }[] = [
  { value: '', label: 'جميع النطاقات' },
  { value: 'plaintiff', label: 'مدعي' },
  { value: 'defendant', label: 'مدعى عليه' },
  { value: 'both', label: 'كلاهما' },
];

const ContractTemplates: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [scopeFilter, setScopeFilter] = useState<ScopeType | ''>('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<ContractTemplate | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<ContractTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // جلب القوالب
  const { data: templatesData, isLoading, refetch } = useQuery({
    queryKey: ['contractTemplates', { search, type: typeFilter, scope_type: scopeFilter, is_active: activeOnly || undefined }],
    queryFn: () => contractTemplateService.getTemplates({
      search: search || undefined,
      type: typeFilter || undefined,
      scope_type: scopeFilter || undefined,
      is_active: activeOnly || undefined,
    }),
  });

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const allTemplates: ContractTemplate[] = templatesData?.data?.data || [];
    return {
      total: allTemplates.length,
      active: allTemplates.filter((t: ContractTemplate) => t.is_active).length,
      inactive: allTemplates.filter((t: ContractTemplate) => !t.is_active).length,
    };
  }, [templatesData]);

  // حذف قالب
  const deleteMutation = useMutation({
    mutationFn: (id: number) => contractTemplateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      setDeleteModal(null);
    },
  });

  // نسخ قالب
  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      contractTemplateService.duplicate(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      setDuplicateModal(null);
      setDuplicateName('');
    },
  });

  const templates: ContractTemplate[] = templatesData?.data?.data || [];

  // أيقونة النوع
  const getTypeIcon = (type: ContractType) => {
    switch (type) {
      case 'representation':
        return <Scale size={16} />;
      case 'consultation':
        return <Briefcase size={16} />;
      case 'contingency':
        return <Percent size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // لون النوع
  const getTypeColor = (type: ContractType) => {
    switch (type) {
      case 'representation':
        return { bg: '#dbeafe', text: '#1d4ed8' };
      case 'consultation':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'contingency':
        return { bg: '#d1fae5', text: '#059669' };
      case 'retainer':
        return { bg: '#ede9fe', text: '#7c3aed' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  // اسم النوع بالعربي
  const getTypeName = (type: ContractType) => {
    const found = CONTRACT_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  // اسم النطاق بالعربي
  const getScopeName = (scope: ScopeType) => {
    const found = SCOPE_TYPES.find(s => s.value === scope);
    return found?.label || scope;
  };

  return (
    <div className="contracts-page" style={{ direction: 'rtl' }}>
      {/* الهيدر الموحد */}
      <header className="requests-header-bar">
        <div className="requests-header-bar__start">
          <div className="requests-header-bar__title">
            <FileCheck size={20} />
            <span>قوالب العقود</span>
            <span className="requests-header-bar__count">{stats.total}</span>
          </div>
          <div className="requests-header-bar__stats">
            <span className="request-stat-pill request-stat-pill--approved">
              <span className="request-stat-pill__dot" />
              {stats.active} نشط
            </span>
            <span className="request-stat-pill request-stat-pill--rejected">
              <span className="request-stat-pill__dot" />
              {stats.inactive} غير نشط
            </span>
          </div>
        </div>

        <div className="requests-header-bar__center">
          <div className="requests-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث في القوالب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="requests-search-box__clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <select
            className="requests-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContractType | '')}
          >
            {CONTRACT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            className="requests-filter-select"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ScopeType | '')}
          >
            {SCOPE_TYPES.map(scope => (
              <option key={scope.value} value={scope.value}>{scope.label}</option>
            ))}
          </select>
          <button className="requests-icon-btn" onClick={() => refetch()} title="تحديث">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="requests-header-bar__end">
          <div className="requests-view-tabs">
            <button
              className={`requests-view-tab ${viewMode === 'list' ? 'requests-view-tab--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="عرض قائمة"
            >
              <List size={16} />
            </button>
            <button
              className={`requests-view-tab ${viewMode === 'grid' ? 'requests-view-tab--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="عرض بطاقات"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <label className="settings-checkbox" style={{ fontSize: '13px', gap: '6px', marginLeft: '8px' }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            النشطة فقط
          </label>
          <button className="btn-primary" onClick={() => navigate('/contract-templates/new')}>
            <Plus size={16} />
            قالب جديد
          </button>
        </div>
      </header>

      {/* قائمة القوالب */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>جاري التحميل...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>لا توجد قوالب</h3>
          <p>ابدأ بإنشاء قالب عقد جديد</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/contract-templates/new')}
          >
            <Plus size={18} />
            إنشاء قالب
          </button>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map((template) => {
            const typeColor = getTypeColor(template.type);
            return (
              <motion.div
                key={template.id}
                className="template-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
              >
                {/* شارة الافتراضي */}
                {template.is_default && (
                  <div className="default-badge">افتراضي</div>
                )}

                {/* القائمة المنسدلة */}
                <div className="card-menu">
                  <button
                    className="menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === template.id ? null : template.id);
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>

                  <AnimatePresence>
                    {activeMenu === template.id && (
                      <motion.div
                        className="menu-dropdown"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => navigate(`/contract-templates/${template.id}`)}>
                          <Edit2 size={16} />
                          تعديل
                        </button>
                        <button onClick={() => {
                          setDuplicateModal(template);
                          setDuplicateName(`نسخة من ${template.name}`);
                          setActiveMenu(null);
                        }}>
                          <Copy size={16} />
                          نسخ
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            setDeleteModal(template);
                            setActiveMenu(null);
                          }}
                        >
                          <Trash2 size={16} />
                          حذف
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* محتوى البطاقة */}
                <div
                  className="card-content"
                  onClick={() => navigate(`/contract-templates/${template.id}`)}
                >
                  {/* الأيقونة والحالة */}
                  <div className="card-header">
                    <div
                      className="type-badge"
                      style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                    >
                      {getTypeIcon(template.type)}
                      <span>{getTypeName(template.type)}</span>
                    </div>
                    <div className={`status-dot ${template.is_active ? 'active' : 'inactive'}`}>
                      {template.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </div>
                  </div>

                  {/* الاسم */}
                  <h3 className="template-name">{template.name}</h3>
                  {template.name_ar && template.name_ar !== template.name && (
                    <p className="template-name-ar">{template.name_ar}</p>
                  )}

                  {/* الوصف */}
                  {template.description && (
                    <p className="template-description">{template.description}</p>
                  )}

                  {/* المعلومات */}
                  <div className="template-info">
                    <div className="info-item">
                      <span className="label">النطاق:</span>
                      <span className="value">{getScopeName(template.scope_type)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">الضريبة:</span>
                      <span className="value">{template.default_vat_rate}%</span>
                    </div>
                    {template.usage_count !== undefined && (
                      <div className="info-item">
                        <span className="label">الاستخدام:</span>
                        <span className="value">{template.usage_count} عقد</span>
                      </div>
                    )}
                  </div>

                  {/* شروط الدفع الافتراضية */}
                  {template.default_payment_terms && template.default_payment_terms.length > 0 && (
                    <div className="payment-terms-preview">
                      <span className="terms-label">شروط الدفع:</span>
                      <span className="terms-count">
                        {template.default_payment_terms.length} شرط
                      </span>
                    </div>
                  )}
                </div>

                {/* أزرار سريعة */}
                <div className="card-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contracts/new?template=${template.id}`);
                    }}
                  >
                    <Plus size={16} />
                    إنشاء عقد
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      // يمكن فتح معاينة
                    }}
                  >
                    <Eye size={16} />
                    معاينة
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* مودال الحذف */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteModal(null)}
          >
            <motion.div
              className="modal-content delete-modal"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon danger">
                <Trash2 size={24} />
              </div>
              <h3>حذف القالب</h3>
              <p>هل أنت متأكد من حذف قالب "{deleteModal.name}"؟</p>
              <p className="warning">لا يمكن التراجع عن هذا الإجراء</p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteModal(null)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-danger"
                  onClick={() => deleteMutation.mutate(deleteModal.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال النسخ */}
      <AnimatePresence>
        {duplicateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDuplicateModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">
                <Copy size={24} />
              </div>
              <h3>نسخ القالب</h3>
              <p>أدخل اسماً للقالب الجديد</p>
              <input
                type="text"
                className="modal-input"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="اسم القالب الجديد"
              />
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setDuplicateModal(null);
                    setDuplicateName('');
                  }}
                >
                  إلغاء
                </button>
                <button
                  className="btn-primary"
                  onClick={() => duplicateMutation.mutate({
                    id: duplicateModal.id,
                    name: duplicateName,
                  })}
                  disabled={duplicateMutation.isPending || !duplicateName.trim()}
                >
                  {duplicateMutation.isPending ? 'جاري النسخ...' : 'نسخ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractTemplates;
