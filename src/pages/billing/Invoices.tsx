import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Send,
  XCircle,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import InvoiceView from '../../components/billing/InvoiceView';
import type { CaseInvoice, InvoiceStatus } from '../../types/billing';
import '../../styles/billing-page.css';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: '#6b7280', bg: '#f3f4f6', icon: <FileText size={14} /> },
  sent: { label: 'مرسلة', color: '#3b82f6', bg: '#dbeafe', icon: <Send size={14} /> },
  pending: { label: 'معلقة', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  partial: { label: 'مدفوعة جزئياً', color: '#8b5cf6', bg: '#ede9fe', icon: <Clock size={14} /> },
  paid: { label: 'مدفوعة', color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={14} /> },
  overdue: { label: 'متأخرة', color: '#dc2626', bg: '#fee2e2', icon: <AlertTriangle size={14} /> },
  cancelled: { label: 'ملغاة', color: '#6b7280', bg: '#f3f4f6', icon: <XCircle size={14} /> },
  refunded: { label: 'مستردة', color: '#f59e0b', bg: '#fef3c7', icon: <XCircle size={14} /> },
};

// واجهة بيانات المكتب
interface FirmInfo {
  name: string;
  cr: string;
  license: string;
  phone: string;
  email: string;
  address: string;
  iban: string;
  bank: string;
}

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [viewInvoice, setViewInvoice] = useState<CaseInvoice | null>(null);
  const [cancelModal, setCancelModal] = useState<CaseInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [sendModal, setSendModal] = useState<CaseInvoice | null>(null);
  const [sendChannel, setSendChannel] = useState<'email' | 'whatsapp'>('email');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [firmInfo, setFirmInfo] = useState<FirmInfo | null>(null);

  // جلب الفواتير
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', { search, status: statusFilter, page }],
    queryFn: () => invoiceService.getInvoices({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      per_page: 15,
    }),
  });

  // جلب بيانات المكتب/الشركة
  useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const response = await fetch('/api/tenant', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success && data.data?.tenant) {
        const tenant = data.data.tenant;
        // جلب معلومات البنك من settings إذا كانت متاحة
        const settings = tenant.settings || {};
        setFirmInfo({
          name: tenant.name || '',
          cr: tenant.commercial_registration || tenant.tax_number || '',
          license: settings.license_number || tenant.commercial_registration || '',
          phone: tenant.phone || '',
          email: tenant.email || '',
          address: tenant.address ? `${tenant.address}${tenant.city ? ', ' + tenant.city : ''}${tenant.country ? ', ' + tenant.country : ''}` : '',
          iban: settings.iban || '',
          bank: settings.bank_name || '',
        });
      }
      return data;
    },
  });

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const allInvoices: CaseInvoice[] = invoicesData?.data?.data || [];
    return {
      total: invoicesData?.data?.total || 0,
      pending: allInvoices.filter((i: CaseInvoice) => i.status === 'pending').length,
      overdue: allInvoices.filter((i: CaseInvoice) => i.status === 'overdue').length,
      paid: allInvoices.filter((i: CaseInvoice) => i.status === 'paid').length,
    };
  }, [invoicesData]);

  // إلغاء فاتورة
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      invoiceService.cancelInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCancelModal(null);
      setCancelReason('');
    },
  });

  // إرسال فاتورة
  const sendMutation = useMutation({
    mutationFn: ({ id, channel }: { id: number; channel: 'email' | 'whatsapp' }) =>
      invoiceService.sendInvoice(id, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSendModal(null);
    },
  });

  const invoices = invoicesData?.data?.data || [];
  const pagination = invoicesData?.data;

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

  // حساب الأيام المتبقية/المتأخرة
  const getDueDays = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="billing-page" style={{ direction: 'rtl' }}>
      {/* الهيدر الموحد */}
      <header className="requests-header-bar">
        <div className="requests-header-bar__start">
          <div className="requests-header-bar__title">
            <Receipt size={20} />
            <span>الفواتير</span>
            <span className="requests-header-bar__count">{stats.total}</span>
          </div>
          <div className="requests-header-bar__stats">
            <span className="request-stat-pill request-stat-pill--pending">
              <span className="request-stat-pill__dot" />
              {stats.pending} معلقة
            </span>
            <span className="request-stat-pill request-stat-pill--rejected">
              <span className="request-stat-pill__dot" />
              {stats.overdue} متأخرة
            </span>
            <span className="request-stat-pill request-stat-pill--approved">
              <span className="request-stat-pill__dot" />
              {stats.paid} مدفوعة
            </span>
          </div>
        </div>

        <div className="requests-header-bar__center">
          <div className="requests-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو اسم العميل..."
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
              setStatusFilter(e.target.value as InvoiceStatus | '');
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">مرسلة</option>
            <option value="pending">معلقة</option>
            <option value="partial">مدفوعة جزئياً</option>
            <option value="paid">مدفوعة</option>
            <option value="overdue">متأخرة</option>
            <option value="cancelled">ملغاة</option>
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

      {/* جدول الفواتير */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>جاري التحميل...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <Receipt size={48} />
          <h3>لا توجد فواتير</h3>
          <p>لم يتم العثور على فواتير مطابقة</p>
        </div>
      ) : (
        <>
          <div className="invoices-table-wrapper">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الاستحقاق</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: CaseInvoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status];
                  const dueDays = getDueDays(invoice.due_date);
                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="invoice-row"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <td className="invoice-number">
                        <span className="number-badge">{invoice.invoice_number}</span>
                      </td>
                      <td className="invoice-client">
                        <div className="client-cell">
                          <User size={14} />
                          <div>
                            <span className="client-name">{invoice.client?.name || '-'}</span>
                            <span className="invoice-title">{invoice.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="invoice-amount">
                        {formatAmount(invoice.total_amount)}
                      </td>
                      <td className="invoice-paid">
                        <span className={invoice.paid_amount > 0 ? 'has-paid' : ''}>
                          {formatAmount(invoice.paid_amount)}
                        </span>
                      </td>
                      <td className="invoice-remaining">
                        <span className={invoice.remaining_amount > 0 ? 'has-remaining' : 'fully-paid'}>
                          {formatAmount(invoice.remaining_amount)}
                        </span>
                      </td>
                      <td className="invoice-due">
                        <div className="due-cell">
                          <Calendar size={14} />
                          <div>
                            <span className="due-date">{formatDate(invoice.due_date)}</span>
                            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <span className={`due-days ${dueDays < 0 ? 'overdue' : dueDays <= 7 ? 'soon' : ''}`}>
                                {dueDays < 0
                                  ? `متأخرة ${Math.abs(dueDays)} يوم`
                                  : dueDays === 0
                                  ? 'اليوم'
                                  : `${dueDays} يوم`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="invoice-status">
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
                      <td className="invoice-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="actions-menu">
                          <button
                            className="menu-trigger"
                            onClick={() => setActiveMenu(activeMenu === invoice.id ? null : invoice.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          <AnimatePresence>
                            {activeMenu === invoice.id && (
                              <motion.div
                                className="menu-dropdown"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                              >
                                <button onClick={() => {
                                  setViewInvoice(invoice);
                                  setActiveMenu(null);
                                }}>
                                  <Eye size={16} />
                                  عرض الفاتورة
                                </button>
                                <button onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                  <FileText size={16} />
                                  التفاصيل
                                </button>
                                {['pending', 'sent'].includes(invoice.status) && (
                                  <button onClick={() => {
                                    setSendModal(invoice);
                                    setActiveMenu(null);
                                  }}>
                                    <Send size={16} />
                                    إرسال
                                  </button>
                                )}
                                {['pending', 'sent', 'draft'].includes(invoice.status) && (
                                  <button
                                    className="danger"
                                    onClick={() => {
                                      setCancelModal(invoice);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <XCircle size={16} />
                                    إلغاء
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

      {/* عرض الفاتورة */}
      {viewInvoice && (
        <InvoiceView
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          firmInfo={firmInfo || undefined}
        />
      )}

      {/* مودال الإلغاء */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCancelModal(null)}
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
              <h3>إلغاء الفاتورة</h3>
              <p>هل أنت متأكد من إلغاء الفاتورة "{cancelModal.invoice_number}"؟</p>
              <div className="form-group">
                <label>سبب الإلغاء</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="أدخل سبب الإلغاء..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setCancelModal(null);
                    setCancelReason('');
                  }}
                >
                  تراجع
                </button>
                <button
                  className="btn-danger"
                  onClick={() => cancelMutation.mutate({
                    id: cancelModal.id,
                    reason: cancelReason,
                  })}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'جاري الإلغاء...' : 'إلغاء الفاتورة'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3>إرسال الفاتورة</h3>
              <p>اختر طريقة الإرسال</p>

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

export default Invoices;
