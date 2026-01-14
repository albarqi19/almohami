import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  MoreVertical,
  Clock,
  Calendar,
  User,
  Receipt,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building,
  FileText,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import type { Payment, PaymentStatus, PaymentMethod } from '../../types/billing';
import '../../styles/billing-page.css';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'بانتظار التأكيد', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  confirmed: { label: 'مؤكدة', color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={14} /> },
  rejected: { label: 'مرفوضة', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={14} /> },
  refunded: { label: 'مستردة', color: '#f59e0b', bg: '#fef3c7', icon: <RefreshCw size={14} /> },
};

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
  cash: { label: 'نقداً', icon: <CreditCard size={14} /> },
  bank_transfer: { label: 'تحويل بنكي', icon: <Building size={14} /> },
  check: { label: 'شيك', icon: <FileText size={14} /> },
  card: { label: 'بطاقة', icon: <CreditCard size={14} /> },
  online: { label: 'إلكتروني', icon: <CreditCard size={14} /> },
  mada: { label: 'مدى', icon: <CreditCard size={14} /> },
  apple_pay: { label: 'Apple Pay', icon: <CreditCard size={14} /> },
  stc_pay: { label: 'STC Pay', icon: <CreditCard size={14} /> },
  other: { label: 'أخرى', icon: <CreditCard size={14} /> },
};

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<Payment | null>(null);
  const [rejectModal, setRejectModal] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refundModal, setRefundModal] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // جلب المدفوعات
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['payments', { search, status: statusFilter, payment_method: methodFilter, page }],
    queryFn: () => paymentService.getPayments({
      search: search || undefined,
      status: statusFilter || undefined,
      payment_method: methodFilter || undefined,
      page,
      per_page: 15,
    }),
  });

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const allPayments: Payment[] = paymentsData?.data?.data || [];
    return {
      total: paymentsData?.data?.total || 0,
      pending: allPayments.filter((p: Payment) => p.status === 'pending').length,
      confirmed: allPayments.filter((p: Payment) => p.status === 'confirmed').length,
      rejected: allPayments.filter((p: Payment) => p.status === 'rejected').length,
    };
  }, [paymentsData]);

  // تأكيد الدفعة
  const confirmMutation = useMutation({
    mutationFn: (id: number) => paymentService.confirmPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setConfirmModal(null);
    },
  });

  // رفض الدفعة
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      paymentService.rejectPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setRejectModal(null);
      setRejectReason('');
    },
  });

  // استرداد الدفعة
  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      paymentService.refundPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setRefundModal(null);
      setRefundReason('');
    },
  });

  const payments = paymentsData?.data?.data || [];
  const pagination = paymentsData?.data;

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
    <div className="billing-page" style={{ direction: 'rtl' }}>
      {/* الهيدر الموحد */}
      <header className="requests-header-bar">
        <div className="requests-header-bar__start">
          <div className="requests-header-bar__title">
            <CreditCard size={20} />
            <span>المدفوعات</span>
            <span className="requests-header-bar__count">{stats.total}</span>
          </div>
          <div className="requests-header-bar__stats">
            <span className="request-stat-pill request-stat-pill--pending">
              <span className="request-stat-pill__dot" />
              {stats.pending} بانتظار التأكيد
            </span>
            <span className="request-stat-pill request-stat-pill--approved">
              <span className="request-stat-pill__dot" />
              {stats.confirmed} مؤكدة
            </span>
            <span className="request-stat-pill request-stat-pill--rejected">
              <span className="request-stat-pill__dot" />
              {stats.rejected} مرفوضة
            </span>
          </div>
        </div>

        <div className="requests-header-bar__center">
          <div className="requests-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث برقم الدفعة أو المرجع..."
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
              setStatusFilter(e.target.value as PaymentStatus | '');
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="pending">بانتظار التأكيد</option>
            <option value="confirmed">مؤكدة</option>
            <option value="rejected">مرفوضة</option>
            <option value="refunded">مستردة</option>
          </select>
          <select
            className="requests-filter-select"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as PaymentMethod | '');
              setPage(1);
            }}
          >
            <option value="">كل طرق الدفع</option>
            {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
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
        </div>
      </header>

      {/* جدول المدفوعات */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>جاري التحميل...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={48} />
          <h3>لا توجد مدفوعات</h3>
          <p>لم يتم العثور على مدفوعات مطابقة</p>
        </div>
      ) : (
        <>
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>رقم الدفعة</th>
                  <th>العميل</th>
                  <th>الفاتورة</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: Payment) => {
                  const statusConfig = STATUS_CONFIG[payment.status];
                  const methodConfig = PAYMENT_METHOD_CONFIG[payment.payment_method];
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="payment-row"
                    >
                      <td className="payment-number">
                        <span className="number-badge">{payment.payment_number}</span>
                      </td>
                      <td className="payment-client">
                        <div className="client-cell">
                          <User size={14} />
                          <span>{payment.client?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="payment-invoice">
                        {payment.invoice ? (
                          <button
                            className="invoice-link"
                            onClick={() => navigate(`/invoices/${payment.invoice?.id}`)}
                          >
                            <Receipt size={14} />
                            {payment.invoice.invoice_number}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="payment-amount">
                        <span className="amount">{formatAmount(payment.amount)}</span>
                      </td>
                      <td className="payment-method">
                        <span className="method-badge">
                          {methodConfig?.icon}
                          {methodConfig?.label || payment.payment_method}
                        </span>
                        {payment.bank_name && (
                          <span className="bank-name">{payment.bank_name}</span>
                        )}
                      </td>
                      <td className="payment-date">
                        <div className="date-cell">
                          <Calendar size={14} />
                          <span>{formatDate(payment.payment_date)}</span>
                        </div>
                      </td>
                      <td className="payment-status">
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
                      <td className="payment-actions">
                        <div className="actions-menu">
                          <button
                            className="menu-trigger"
                            onClick={() => setActiveMenu(activeMenu === payment.id ? null : payment.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          <AnimatePresence>
                            {activeMenu === payment.id && (
                              <motion.div
                                className="menu-dropdown"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                              >
                                {payment.status === 'pending' && (
                                  <>
                                    <button
                                      className="success"
                                      onClick={() => {
                                        setConfirmModal(payment);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <CheckCircle size={16} />
                                      تأكيد
                                    </button>
                                    <button
                                      className="danger"
                                      onClick={() => {
                                        setRejectModal(payment);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <XCircle size={16} />
                                      رفض
                                    </button>
                                  </>
                                )}
                                {payment.status === 'confirmed' && (
                                  <button
                                    className="warning"
                                    onClick={() => {
                                      setRefundModal(payment);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <RefreshCw size={16} />
                                    استرداد
                                  </button>
                                )}
                                {payment.receipt_path && (
                                  <button onClick={() => window.open(payment.receipt_path, '_blank')}>
                                    <Eye size={16} />
                                    عرض الإيصال
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

      {/* مودال التأكيد */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon success">
                <CheckCircle size={24} />
              </div>
              <h3>تأكيد الدفعة</h3>
              <p>هل أنت متأكد من تأكيد الدفعة "{confirmModal.payment_number}"؟</p>
              <p className="modal-amount">{formatAmount(confirmModal.amount)}</p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmModal(null)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-success"
                  onClick={() => confirmMutation.mutate(confirmModal.id)}
                  disabled={confirmMutation.isPending}
                >
                  {confirmMutation.isPending ? 'جاري التأكيد...' : 'تأكيد'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال الرفض */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRejectModal(null)}
          >
            <motion.div
              className="modal-content delete-modal"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon danger">
                <XCircle size={24} />
              </div>
              <h3>رفض الدفعة</h3>
              <p>هل أنت متأكد من رفض الدفعة "{rejectModal.payment_number}"؟</p>
              <div className="form-group">
                <label>سبب الرفض</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                >
                  إلغاء
                </button>
                <button
                  className="btn-danger"
                  onClick={() => rejectMutation.mutate({
                    id: rejectModal.id,
                    reason: rejectReason,
                  })}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                >
                  {rejectMutation.isPending ? 'جاري الرفض...' : 'رفض'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال الاسترداد */}
      <AnimatePresence>
        {refundModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRefundModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon warning">
                <RefreshCw size={24} />
              </div>
              <h3>استرداد الدفعة</h3>
              <p>هل أنت متأكد من استرداد الدفعة "{refundModal.payment_number}"؟</p>
              <p className="modal-amount">{formatAmount(refundModal.amount)}</p>
              <div className="form-group">
                <label>سبب الاسترداد</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="أدخل سبب الاسترداد..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setRefundModal(null);
                    setRefundReason('');
                  }}
                >
                  إلغاء
                </button>
                <button
                  className="btn-warning"
                  onClick={() => refundMutation.mutate({
                    id: refundModal.id,
                    reason: refundReason,
                  })}
                  disabled={refundMutation.isPending || !refundReason.trim()}
                >
                  {refundMutation.isPending ? 'جاري الاسترداد...' : 'استرداد'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;
