import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Send,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import type { Contract, ContractStatus } from '../../types/contracts';
import '../../styles/contracts-page.css';

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: '#6b7280', bg: '#f3f4f6', icon: <FileText size={14} /> },
  pending_signature: { label: 'بانتظار التوقيع', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  active: { label: 'نشط', color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={14} /> },
  completed: { label: 'مكتمل', color: '#3b82f6', bg: '#dbeafe', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'ملغي', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={14} /> },
  expired: { label: 'منتهي', color: '#9ca3af', bg: '#f3f4f6', icon: <AlertTriangle size={14} /> },
  suspended: { label: 'موقوف', color: '#f59e0b', bg: '#fef3c7', icon: <AlertTriangle size={14} /> },
};

const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [sendModal, setSendModal] = useState<Contract | null>(null);
  const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // جلب العقود
  const { data: contractsData, isLoading, refetch } = useQuery({
    queryKey: ['contracts', { search, status: statusFilter, page }],
    queryFn: () => contractService.getContracts({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      per_page: 10,
    }),
  });

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const allContracts = contractsData?.data?.data || [];
    return {
      total: contractsData?.data?.total || 0,
      active: allContracts.filter((c: Contract) => c.status === 'active').length,
      draft: allContracts.filter((c: Contract) => c.status === 'draft').length,
      pending: allContracts.filter((c: Contract) => c.status === 'pending_signature').length,
    };
  }, [contractsData]);

  // إرسال العقد
  const sendMutation = useMutation({
    mutationFn: ({ id, channel }: { id: number; channel: 'email' | 'whatsapp' }) =>
      contractService.sendContract(id, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSendModal(null);
    },
  });

  const contracts = contractsData?.data?.data || [];
  const pagination = contractsData?.data;

  // تنسيق التاريخ
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA').format(amount) + ' ر.س';
  };

  return (
    <div className="contracts-page" style={{ direction: 'rtl' }}>
      {/* الهيدر الموحد */}
      <header className="requests-header-bar">
        <div className="requests-header-bar__start">
          <div className="requests-header-bar__title">
            <FileText size={20} />
            <span>العقود</span>
            <span className="requests-header-bar__count">{stats.total}</span>
          </div>
          <div className="requests-header-bar__stats">
            <span className="request-stat-pill request-stat-pill--approved">
              <span className="request-stat-pill__dot" />
              {stats.active} نشط
            </span>
            <span className="request-stat-pill request-stat-pill--pending">
              <span className="request-stat-pill__dot" />
              {stats.pending} بانتظار التوقيع
            </span>
            <span className="request-stat-pill" style={{ background: 'var(--quiet-gray-100)', color: 'var(--color-text-secondary)' }}>
              <span className="request-stat-pill__dot" style={{ background: 'var(--color-text-secondary)' }} />
              {stats.draft} مسودة
            </span>
          </div>
        </div>

        <div className="requests-header-bar__center">
          <div className="requests-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث في العقود..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button className="requests-search-box__clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <select
            className="requests-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ContractStatus | '');
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="draft">مسودة</option>
            <option value="pending_signature">بانتظار التوقيع</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
            <option value="expired">منتهي</option>
          </select>
          <button className="requests-icon-btn" onClick={() => refetch()} title="تحديث">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="requests-header-bar__end">
          <div className="requests-view-tabs">
            <button
              className={`requests-view-tab ${viewMode === 'table' ? 'requests-view-tab--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="عرض جدول"
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
          <button className="btn-primary" onClick={() => navigate('/contracts/new')}>
            <Plus size={16} />
            عقد جديد
          </button>
        </div>
      </header>

      {/* جدول العقود */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>جاري التحميل...</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>لا توجد عقود</h3>
          <p>ابدأ بإنشاء عقد جديد</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/contracts/new')}
          >
            <Plus size={18} />
            إنشاء عقد
          </button>
        </div>
      ) : (
        <>
          <div className="contracts-table-wrapper">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>رقم العقد</th>
                  <th>العنوان</th>
                  <th>العميل</th>
                  <th>القضية</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                  <th>تاريخ البدء</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const statusConfig = STATUS_CONFIG[contract.status];
                  return (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="contract-row"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <td className="contract-number">
                        <span className="number-badge">{contract.contract_number}</span>
                      </td>
                      <td className="contract-title">
                        <div className="title-cell">
                          <span className="title">{contract.title || contract.template?.name || '-'}</span>
                          {contract.template && !contract.title && (
                            <span className="template-name">{contract.template.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="contract-client">
                        <div className="client-cell">
                          <User size={14} />
                          <span>{contract.client?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="contract-case">
                        {contract.case ? (
                          <div className="case-cell">
                            <Briefcase size={14} />
                            <span>{contract.case.file_number}</span>
                          </div>
                        ) : (
                          <span className="no-case">-</span>
                        )}
                      </td>
                      <td className="contract-value">
                        <span className="amount">{formatAmount(contract.total_amount)}</span>
                        {(contract.paid_amount ?? 0) > 0 && (
                          <span className="paid">
                            محصّل: {formatAmount(contract.paid_amount || 0)}
                          </span>
                        )}
                      </td>
                      <td className="contract-status">
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="contract-date">
                        <div className="date-cell">
                          <Calendar size={14} />
                          <span>{contract.start_date ? formatDate(contract.start_date) : '-'}</span>
                        </div>
                      </td>
                      <td className="contract-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="actions-menu">
                          <button
                            className="menu-trigger"
                            onClick={() => setActiveMenu(activeMenu === contract.id ? null : contract.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          <AnimatePresence>
                            {activeMenu === contract.id && (
                              <motion.div
                                className="menu-dropdown"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                              >
                                <button onClick={() => navigate(`/contracts/${contract.id}`)}>
                                  <Eye size={16} />
                                  عرض التفاصيل
                                </button>
                                <button onClick={() => contractService.downloadPdf(contract.id)}>
                                  <Download size={16} />
                                  تحميل PDF
                                </button>
                                {contract.status === 'active' && (
                                  <button onClick={() => {
                                    setSendModal(contract);
                                    setActiveMenu(null);
                                  }}>
                                    <Send size={16} />
                                    إرسال للعميل
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* الترقيم */}
          {pagination && pagination.last_page > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronRight size={18} />
              </button>
              <span className="page-info">
                صفحة {page} من {pagination.last_page}
              </span>
              <button
                className="page-btn"
                disabled={page === pagination.last_page}
                onClick={() => setPage(page + 1)}
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* مودال الإرسال */}
      <AnimatePresence>
        {sendModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSendModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">
                <Send size={24} />
              </div>
              <h3>إرسال العقد</h3>
              <p>اختر طريقة الإرسال للعميل</p>

              <div className="send-options">
                <label className={`send-option ${sendChannel === 'email' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={sendChannel === 'email'}
                    onChange={() => setSendChannel('email')}
                  />
                  <span className="option-content">
                    <strong>البريد الإلكتروني</strong>
                    <span>{sendModal.client?.email || 'غير متوفر'}</span>
                  </span>
                </label>
                <label className={`send-option ${sendChannel === 'whatsapp' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="channel"
                    value="whatsapp"
                    checked={sendChannel === 'whatsapp'}
                    onChange={() => setSendChannel('whatsapp')}
                  />
                  <span className="option-content">
                    <strong>واتساب</strong>
                    <span>{sendModal.client?.phone || 'غير متوفر'}</span>
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setSendModal(null)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-primary"
                  onClick={() => sendMutation.mutate({
                    id: sendModal.id,
                    channel: sendChannel,
                  })}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? 'جاري الإرسال...' : 'إرسال'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Contracts;
