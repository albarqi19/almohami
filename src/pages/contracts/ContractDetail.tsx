import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  FileText,
  User,
  Briefcase,
  Calendar,
  CreditCard,
  Download,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Edit2,
  Plus,
  Receipt,
  Loader2,
  Users,
  DollarSign,
  FileCheck,
  Percent,
  Trash2,
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import ContractPreview from '../../components/contracts/ContractPreview';
import type { Contract, ContractStatus, PaymentTerm } from '../../types/contracts';
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

const TERM_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلق', color: '#6b7280', bg: '#f3f4f6' },
  invoiced: { label: 'تم الفوترة', color: '#3b82f6', bg: '#dbeafe' },
  partial: { label: 'مدفوع جزئياً', color: '#d97706', bg: '#fef3c7' },
  paid: { label: 'مدفوع', color: '#059669', bg: '#d1fae5' },
  overdue: { label: 'متأخر', color: '#dc2626', bg: '#fee2e2' },
  cancelled: { label: 'ملغي', color: '#9ca3af', bg: '#f3f4f6' },
};

const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [activeTab, setActiveTab] = useState<'overview' | 'parties' | 'payments' | 'invoices'>('overview');
  const [showPreview, setShowPreview] = useState(false);
  const [generateInvoiceModal, setGenerateInvoiceModal] = useState<PaymentTerm | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signedByName, setSignedByName] = useState('');

  // جلب العقد
  const { data: contractData, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractService.getContract(Number(id)),
    enabled: !!id,
  });

  // توقيع العقد
  const signMutation = useMutation({
    mutationFn: (signedBy: string) => contractService.signContract(Number(id), signedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      setShowSignModal(false);
      setSignedByName('');
    },
  });

  const handleSign = () => {
    if (!signedByName.trim()) {
      alert('الرجاء إدخال اسم الموقع');
      return;
    }
    signMutation.mutate(signedByName.trim());
  };

  // إنشاء فاتورة من شرط دفع
  const generateInvoiceMutation = useMutation({
    mutationFn: (termId: number) => contractService.generateInvoiceFromTerm(termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      setGenerateInvoiceModal(null);
      alert('تم إنشاء الفاتورة بنجاح');
    },
    onError: (error: Error) => {
      setGenerateInvoiceModal(null);
      alert(error.message || 'حدث خطأ أثناء إنشاء الفاتورة');
    },
  });

  // حذف العقد
  const deleteMutation = useMutation({
    mutationFn: () => contractService.deleteContract(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      navigate('/contracts');
    },
  });

  const handleDelete = () => {
    if (window.confirm('هل أنت متأكد من حذف هذا العقد؟ لا يمكن التراجع عن هذا الإجراء.')) {
      deleteMutation.mutate();
    }
  };

  const contract = contractData?.data;

  // تنسيق التاريخ
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number | null | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <Loader2 className="spinner" size={32} />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="error-page">
        <AlertTriangle size={48} />
        <h2>العقد غير موجود</h2>
        <button className="btn-primary" onClick={() => navigate('/contracts')}>
          العودة للعقود
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[contract.status] || {
    label: contract.status || 'غير محدد',
    color: '#6b7280',
    bg: '#f3f4f6',
    icon: <FileText size={14} />
  };
  const totalAmount = Number(contract.total_amount) || 0;
  const paidAmount = Number(contract.paid_amount) || 0;
  const collectionRate = totalAmount > 0
    ? ((paidAmount / totalAmount) * 100).toFixed(1)
    : '0';

  return (
    <div className="contract-detail-page" style={{ direction: 'rtl' }}>
      {/* الهيدر */}
      <div className="detail-header">
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/contracts')}>
            <ArrowRight size={20} />
          </button>
          <div>
            <div className="contract-number">{contract.contract_number}</div>
            <h1>{contract.title || contract.template?.name || 'عقد'}</h1>
          </div>
        </div>

        <div className="header-actions">
          <span
            className="status-badge large"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          <button className="btn-secondary" onClick={() => setShowPreview(true)}>
            <FileText size={18} />
            معاينة
          </button>
          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                const response = await contractService.downloadPdf(contract.id);
                if (response.success && response.data?.url) {
                  window.open(response.data.url, '_blank');
                } else {
                  // إذا لم يكن هناك URL، استخدم طباعة المعاينة
                  setShowPreview(true);
                }
              } catch (error) {
                console.error('Error downloading PDF:', error);
                // fallback: عرض المعاينة للطباعة
                setShowPreview(true);
              }
            }}
          >
            <Download size={18} />
            تحميل PDF
          </button>
          {(!contract.status || contract.status === 'draft') && (
            <button
              className="btn-primary"
              onClick={() => {
                setSignedByName(contract.client?.name || '');
                setShowSignModal(true);
              }}
              disabled={signMutation.isPending}
            >
              {signMutation.isPending ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <CheckCircle size={18} />
              )}
              توقيع العقد
            </button>
          )}
          {/* زر الحذف - يظهر للمسودات أو العقود بدون حالة */}
          {(!contract.status || contract.status === 'draft') && (
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              style={{ backgroundColor: '#dc2626', color: 'white', marginRight: '8px' }}
            >
              {deleteMutation.isPending ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <Trash2 size={18} />
              )}
              حذف
            </button>
          )}
        </div>
      </div>

      {/* بطاقات الملخص */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#dbeafe' }}>
            <DollarSign size={20} color="#3b82f6" />
          </div>
          <div className="card-content">
            <span className="label">قيمة العقد</span>
            <span className="value">{formatAmount(contract.total_amount)} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle size={20} color="#059669" />
          </div>
          <div className="card-content">
            <span className="label">المحصّل</span>
            <span className="value">{formatAmount(contract.paid_amount || 0)} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Clock size={20} color="#d97706" />
          </div>
          <div className="card-content">
            <span className="label">المتبقي</span>
            <span className="value">{formatAmount(contract.remaining_amount || (contract.total_amount - (contract.paid_amount || 0)))} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#ede9fe' }}>
            <Percent size={20} color="#7c3aed" />
          </div>
          <div className="card-content">
            <span className="label">نسبة التحصيل</span>
            <span className="value">{collectionRate}%</span>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="detail-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FileText size={18} />
          نظرة عامة
        </button>
        <button
          className={`tab ${activeTab === 'parties' ? 'active' : ''}`}
          onClick={() => setActiveTab('parties')}
        >
          <Users size={18} />
          الأطراف
          {contract.parties && contract.parties.length > 0 && (
            <span className="tab-badge">{contract.parties.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} />
          شروط الدفع
          {contract.payment_terms && contract.payment_terms.length > 0 && (
            <span className="tab-badge">{contract.payment_terms.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={18} />
          الفواتير
          {contract.invoices && contract.invoices.length > 0 && (
            <span className="tab-badge">{contract.invoices.length}</span>
          )}
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="detail-content">
        {/* نظرة عامة */}
        {activeTab === 'overview' && (
          <motion.div
            className="overview-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="info-grid">
              {/* معلومات العميل */}
              <div className="info-section">
                <h3>
                  <User size={18} />
                  العميل
                </h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="label">الاسم:</span>
                    <span className="value">{contract.client?.name}</span>
                  </div>
                  {contract.client?.email && (
                    <div className="info-row">
                      <span className="label">البريد:</span>
                      <span className="value">{contract.client.email}</span>
                    </div>
                  )}
                  {contract.client?.phone && (
                    <div className="info-row">
                      <span className="label">الهاتف:</span>
                      <span className="value">{contract.client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات القضية */}
              {contract.case && (
                <div className="info-section">
                  <h3>
                    <Briefcase size={18} />
                    القضية
                  </h3>
                  <div className="info-content">
                    <div className="info-row">
                      <span className="label">رقم الملف:</span>
                      <span className="value">{contract.case.file_number}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">العنوان:</span>
                      <span className="value">{contract.case.title}</span>
                    </div>
                    <button
                      className="btn-link"
                      onClick={() => navigate(`/cases/${contract.case?.id}`)}
                    >
                      عرض القضية
                    </button>
                  </div>
                </div>
              )}

              {/* تواريخ العقد */}
              <div className="info-section">
                <h3>
                  <Calendar size={18} />
                  التواريخ
                </h3>
                <div className="info-content">
                  {contract.start_date && (
                    <div className="info-row">
                      <span className="label">تاريخ البدء:</span>
                      <span className="value">{formatDate(contract.start_date)}</span>
                    </div>
                  )}
                  {contract.end_date && (
                    <div className="info-row">
                      <span className="label">تاريخ الانتهاء:</span>
                      <span className="value">{formatDate(contract.end_date)}</span>
                    </div>
                  )}
                  {contract.signed_at && (
                    <div className="info-row">
                      <span className="label">تاريخ التوقيع:</span>
                      <span className="value">{formatDate(contract.signed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* المعلومات المالية */}
              <div className="info-section">
                <h3>
                  <DollarSign size={18} />
                  المعلومات المالية
                </h3>
                <div className="info-content">
                  <div className="info-row">
                    <span className="label">المبلغ الأساسي:</span>
                    <span className="value">{formatAmount(contract.subtotal || contract.total_amount)} ر.س</span>
                  </div>
                  <div className="info-row">
                    <span className="label">نسبة الضريبة:</span>
                    <span className="value">{contract.vat_rate}%</span>
                  </div>
                  <div className="info-row">
                    <span className="label">قيمة الضريبة:</span>
                    <span className="value">{formatAmount(contract.vat_amount)} ر.س</span>
                  </div>
                  <div className="info-row total">
                    <span className="label">الإجمالي:</span>
                    <span className="value">{formatAmount(contract.total_amount)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات */}
            {contract.notes && (
              <div className="notes-section">
                <h3>ملاحظات</h3>
                <p>{contract.notes}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* الأطراف */}
        {activeTab === 'parties' && (
          <motion.div
            className="parties-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {contract.parties && contract.parties.length > 0 ? (
              <div className="parties-list">
                {contract.parties.map((party, index) => (
                  <div key={party.id || index} className="party-card">
                    <div className="party-header">
                      <span className={`party-type ${party.party_type}`}>
                        {party.party_type === 'first' ? 'الطرف الأول' : 'الطرف الثاني'}
                      </span>
                      {party.role && <span className="party-role">{party.role}</span>}
                    </div>
                    <div className="party-content">
                      <h4>{party.name}</h4>
                      {party.national_id && (
                        <p>رقم الهوية: {party.national_id}</p>
                      )}
                      {party.phone && <p>الهاتف: {party.phone}</p>}
                      {party.email && <p>البريد: {party.email}</p>}
                      {party.address && <p>العنوان: {party.address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-tab">
                <Users size={48} />
                <p>لا توجد أطراف مسجلة</p>
              </div>
            )}
          </motion.div>
        )}

        {/* شروط الدفع */}
        {activeTab === 'payments' && (
          <motion.div
            className="payments-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {contract.payment_terms && contract.payment_terms.length > 0 ? (
              <div className="payment-terms-list">
                {contract.payment_terms.map((term, index) => {
                  const termStatus = TERM_STATUS_CONFIG[term.status];
                  return (
                    <div key={term.id || index} className="payment-term-card">
                      <div className="term-header">
                        <div className="term-info">
                          <span className="term-order">#{index + 1}</span>
                          <h4>{term.name}</h4>
                        </div>
                        <span
                          className="term-status"
                          style={{ backgroundColor: termStatus.bg, color: termStatus.color }}
                        >
                          {termStatus.label}
                        </span>
                      </div>
                      <div className="term-content">
                        <div className="term-details">
                          <div className="detail">
                            <span className="label">المبلغ:</span>
                            <span className="value">{formatAmount(term.amount || term.calculated_amount || 0)} ر.س</span>
                          </div>
                          {term.due_date && (
                            <div className="detail">
                              <span className="label">تاريخ الاستحقاق:</span>
                              <span className="value">{formatDate(term.due_date)}</span>
                            </div>
                          )}
                          {term.due_condition && (
                            <div className="detail">
                              <span className="label">شرط الاستحقاق:</span>
                              <span className="value">{term.due_condition}</span>
                            </div>
                          )}
                        </div>
                        {term.status === 'pending' && (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => setGenerateInvoiceModal(term)}
                          >
                            <Receipt size={16} />
                            إنشاء فاتورة
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-tab">
                <CreditCard size={48} />
                <p>لا توجد شروط دفع</p>
              </div>
            )}
          </motion.div>
        )}

        {/* الفواتير */}
        {activeTab === 'invoices' && (
          <motion.div
            className="invoices-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {contract.invoices && contract.invoices.length > 0 ? (
              <div className="invoices-list">
                {contract.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="invoice-card"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className="invoice-header">
                      <span className="invoice-number">{invoice.invoice_number}</span>
                      <span className={`invoice-status ${invoice.status}`}>
                        {invoice.status === 'paid' ? 'مدفوعة' :
                         invoice.status === 'partial' ? 'جزئية' :
                         invoice.status === 'overdue' ? 'متأخرة' : 'معلقة'}
                      </span>
                    </div>
                    <div className="invoice-content">
                      <p className="invoice-title">{invoice.title}</p>
                      <p className="invoice-amount">{formatAmount(invoice.total_amount)} ر.س</p>
                      <p className="invoice-date">الاستحقاق: {formatDate(invoice.due_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-tab">
                <Receipt size={48} />
                <p>لا توجد فواتير</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* معاينة العقد */}
      {showPreview && (
        <ContractPreview
          content={contract.content}
          variables={{}}
          contractTitle={contract.title || contract.template?.name || 'عقد'}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* مودال إنشاء فاتورة */}
      <AnimatePresence>
        {generateInvoiceModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGenerateInvoiceModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">
                <Receipt size={24} />
              </div>
              <h3>إنشاء فاتورة</h3>
              <p>هل تريد إنشاء فاتورة لـ "{generateInvoiceModal.name}"؟</p>
              <p className="modal-amount">
                المبلغ: {formatAmount(generateInvoiceModal.amount || generateInvoiceModal.calculated_amount || 0)} ر.س
              </p>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setGenerateInvoiceModal(null)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-primary"
                  onClick={() => generateInvoiceMutation.mutate(generateInvoiceModal.id)}
                  disabled={generateInvoiceMutation.isPending}
                >
                  {generateInvoiceMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال التوقيع */}
      <AnimatePresence>
        {showSignModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSignModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">
                <FileCheck size={24} />
              </div>
              <h3>توقيع العقد</h3>
              <p style={{ marginBottom: '16px' }}>أدخل اسم الموقع على العقد:</p>
              <input
                type="text"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                placeholder="اسم الموقع"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  marginBottom: '16px',
                  direction: 'rtl',
                }}
              />
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowSignModal(false)}
                >
                  إلغاء
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSign}
                  disabled={signMutation.isPending || !signedByName.trim()}
                >
                  {signMutation.isPending ? 'جاري التوقيع...' : 'توقيع'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractDetail;
