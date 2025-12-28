import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertCircle,
  Upload,
  MessageSquare,
  Download,
  Eye,
  Send,
  X,
  CheckCircle,
  Loader2,
  MessageCircle,
  User,
  Building,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import { DocumentService } from '../services/documentService';
import { MessageService } from '../services/messageService';
import type { Case, Document, Activity } from '../types';
import '../styles/client-case-detail.css';

const ClientCaseDetail: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  useAuth(); // for authentication check
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
    category: 'other'
  });
  const [messageForm, setMessageForm] = useState({
    message: ''
  });
  const [recipients, setRecipients] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null);

  useEffect(() => {
    const loadCaseData = async () => {
      if (!caseId) return;

      try {
        setIsLoading(true);
        const caseData = await CaseService.getCase(caseId);
        setCaseData(caseData);

        const documentsData = await DocumentService.getDocuments({ case_id: caseId });
        setDocuments(documentsData.data || []);

        // Load recipients for messaging
        try {
          const recipientsData = await MessageService.getRecipients(parseInt(caseId));
          setRecipients(recipientsData || []);
          if (recipientsData?.length > 0) {
            setSelectedRecipient(recipientsData[0].id);
          }
        } catch (e) {
          console.error('Error loading recipients:', e);
        }

        // Mock activities
        setActivities([
          {
            id: '1',
            type: 'case_created',
            title: 'إنشاء القضية',
            description: 'تم إنشاء القضية',
            performedBy: '2',
            performedAt: new Date(caseData.created_at),
            caseId: caseId,
            metadata: { status: 'active' }
          }
        ]);

      } catch (error) {
        console.error('Error loading case data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCaseData();
  }, [caseId]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title || !caseId) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);
      formData.append('case_id', caseId);

      const newDocument = await DocumentService.uploadDocument(formData as any);
      setDocuments(prev => [...prev, newDocument]);
      setUploadForm({ title: '', description: '', file: null, category: 'other' });
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, documentId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmitting(true);
      await DocumentService.addComment(documentId, commentText);
      setCommentText('');
      setShowCommentForm(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.message || !caseId || !selectedRecipient) return;

    try {
      setIsSubmitting(true);
      await MessageService.sendMessage({
        case_id: parseInt(caseId),
        recipient_id: selectedRecipient,
        message: messageForm.message.trim(),
        type: 'general'
      });
      setMessageForm({ message: '' });
      setShowMessageModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      'contract': 'عقد',
      'evidence': 'دليل',
      'pleading': 'مذكرة',
      'correspondence': 'مراسلات',
      'report': 'تقرير',
      'judgment': 'حكم',
      'court_document': 'وثيقة محكمة',
      'other': 'أخرى'
    };
    return categories[category] || category;
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      lawyer: 'محامي',
      admin: 'مدير',
      legal_assistant: 'مساعد قانوني'
    };
    return roles[role] || role;
  };

  const handleDocumentPreview = (doc: Document) => {
    const previewUrl = `https://api.alraedlaw.com/api/v1/documents/${doc.id}/preview`;
    window.open(previewUrl, '_blank');
  };

  const handleDocumentDownload = async (doc: Document) => {
    try {
      const blob = await DocumentService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || doc.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return 'غير محدد';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'غير محدد';
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj);
    } catch {
      return 'غير محدد';
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount) return 'غير محدد';
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'نشطة',
      pending: 'قيد الانتظار',
      closed: 'مغلقة',
      settled: 'مسوية',
      appealed: 'مستأنفة',
      dismissed: 'مرفوضة'
    };
    return statusMap[status] || status;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return <Upload size={14} />;
      case 'hearing_scheduled':
        return <Calendar size={14} />;
      case 'message_sent':
        return <MessageSquare size={14} />;
      case 'case_created':
        return <CheckCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getActivityIconClass = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return 'timeline-item__icon--document';
      case 'hearing_scheduled':
        return 'timeline-item__icon--hearing';
      case 'message_sent':
        return 'timeline-item__icon--message';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="client-case-detail">
        <div className="case-detail__loading">
          <div className="case-detail__spinner"></div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="client-case-detail">
        <div className="case-detail__not-found">
          <div className="case-detail__not-found-icon">
            <AlertCircle size={28} />
          </div>
          <h3 className="case-detail__not-found-title">لم يتم العثور على القضية</h3>
          <p className="case-detail__not-found-text">
            القضية المطلوبة غير موجودة أو ليس لديك صلاحية للوصول إليها
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-case-detail">
      {/* Header */}
      <div className="case-detail__header">
        <div className="case-detail__title-section">
          <h1 className="case-detail__title">{caseData.title}</h1>
          <p className="case-detail__file-number">رقم الملف: {caseData.file_number}</p>
          <span className={`case-detail__status case-detail__status--${caseData.status}`}>
            {getStatusText(caseData.status)}
          </span>
        </div>
        <div className="case-detail__actions">
          <button
            onClick={() => setShowUploadModal(true)}
            className="case-detail__btn case-detail__btn--primary"
          >
            <Upload size={18} />
            رفع وثيقة
          </button>
          <button
            onClick={() => setShowMessageModal(true)}
            className="case-detail__btn case-detail__btn--success"
          >
            <MessageSquare size={18} />
            إرسال رسالة
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="case-detail__content">
        {/* Main Content */}
        <div className="case-detail__main">
          {/* Case Info Card */}
          <div className="detail-card">
            <div className="detail-card__header">
              <h2 className="detail-card__title">
                <FileText size={18} />
                تفاصيل القضية
              </h2>
            </div>
            <div className="detail-card__body">
              {caseData.description && (
                <p className="case-info__description">{caseData.description}</p>
              )}
              <div className="case-info__grid">
                <div className="case-info__item">
                  <span className="case-info__label">الطرف الآخر</span>
                  <span className="case-info__value">
                    <User size={14} style={{ marginLeft: 6, opacity: 0.5 }} />
                    {caseData.opponent_name || 'غير محدد'}
                  </span>
                </div>
                <div className="case-info__item">
                  <span className="case-info__label">المحكمة</span>
                  <span className="case-info__value">
                    <Building size={14} style={{ marginLeft: 6, opacity: 0.5 }} />
                    {caseData.court || 'غير محدد'}
                  </span>
                </div>
                <div className="case-info__item">
                  <span className="case-info__label">القيمة المقدرة</span>
                  <span className="case-info__value">{formatCurrency(caseData.contract_value)}</span>
                </div>
                <div className="case-info__item">
                  <span className="case-info__label">الجلسة القادمة</span>
                  <span className="case-info__value">
                    <Calendar size={14} style={{ marginLeft: 6, opacity: 0.5 }} />
                    {formatDate(caseData.next_hearing)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="detail-card">
            <div className="detail-card__header">
              <h2 className="detail-card__title">
                <Upload size={18} />
                الوثائق ({documents.length})
              </h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="detail-card__action"
              >
                <Upload size={14} />
                رفع وثيقة
              </button>
            </div>
            <div className="detail-card__body">
              {documents.length === 0 ? (
                <div className="documents-empty">
                  <div className="documents-empty__icon">
                    <FileText size={28} />
                  </div>
                  <h3 className="documents-empty__title">لا توجد وثائق</h3>
                  <p className="documents-empty__text">لم يتم رفع أي وثائق لهذه القضية بعد</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="case-detail__btn case-detail__btn--primary"
                  >
                    <Upload size={16} />
                    رفع أول وثيقة
                  </button>
                </div>
              ) : (
                <div className="documents-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-item__icon">
                        <FileText size={20} />
                      </div>
                      <div className="document-item__content">
                        <h4 className="document-item__title">{doc.title}</h4>
                        {doc.description && (
                          <p className="document-item__desc">{doc.description}</p>
                        )}
                        <div className="document-item__meta">
                          <span className="document-item__meta-item">
                            <Clock size={12} />
                            {formatDate(doc.uploaded_at || doc.uploadedAt)}
                          </span>
                          {doc.file_size && (
                            <span className="document-item__meta-item">
                              {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                          {doc.category && (
                            <span className="document-item__badge document-item__badge--category">
                              {getCategoryName(doc.category)}
                            </span>
                          )}
                          {doc.is_confidential && (
                            <span className="document-item__badge document-item__badge--confidential">
                              سري
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="document-item__actions">
                        <button
                          onClick={() => handleDocumentPreview(doc)}
                          className="document-item__btn"
                          title="معاينة"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDocumentDownload(doc)}
                          className="document-item__btn"
                          title="تحميل"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => setShowCommentForm(showCommentForm === parseInt(doc.id) ? null : parseInt(doc.id))}
                          className="document-item__btn"
                          title="تعليق"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                      {showCommentForm === parseInt(doc.id) && (
                        <div className="comment-form">
                          <form onSubmit={(e) => handleCommentSubmit(e, doc.id)}>
                            <textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              className="form-textarea"
                              placeholder="اكتب تعليقك هنا..."
                              rows={3}
                              required
                            />
                            <div className="comment-form__actions">
                              <button
                                type="button"
                                onClick={() => setShowCommentForm(null)}
                                className="comment-btn comment-btn--cancel"
                              >
                                إلغاء
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="comment-btn comment-btn--submit"
                              >
                                {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="case-detail__sidebar">
          {/* Timeline Card */}
          <div className="detail-card">
            <div className="detail-card__header">
              <h2 className="detail-card__title">
                <Clock size={18} />
                المخطط الزمني
              </h2>
            </div>
            <div className="detail-card__body">
              <div className="timeline">
                {activities.map((activity) => (
                  <div key={activity.id} className="timeline-item">
                    <div className={`timeline-item__icon ${getActivityIconClass(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="timeline-item__content">
                      <p className="timeline-item__title">{activity.description}</p>
                      <span className="timeline-item__date">{formatDate(activity.performedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="detail-card">
            <div className="detail-card__header">
              <h2 className="detail-card__title">معلومات سريعة</h2>
            </div>
            <div className="detail-card__body">
              <div className="quick-info">
                <div className="quick-info__item">
                  <span className="quick-info__label">تاريخ الإنشاء</span>
                  <span className="quick-info__value">{formatDate(caseData.created_at)}</span>
                </div>
                <div className="quick-info__item">
                  <span className="quick-info__label">آخر تحديث</span>
                  <span className="quick-info__value">{formatDate(caseData.updated_at)}</span>
                </div>
                <div className="quick-info__item">
                  <span className="quick-info__label">عدد الوثائق</span>
                  <span className="quick-info__value">{documents.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="case-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="case-modal" onClick={(e) => e.stopPropagation()}>
            <div className="case-modal__header">
              <h3 className="case-modal__title">رفع وثيقة جديدة</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="case-modal__close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleFileUpload}>
              <div className="case-modal__body">
                <div className="form-group">
                  <label className="form-label">عنوان الوثيقة</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="form-input"
                    placeholder="أدخل عنوان الوثيقة"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">وصف الوثيقة (اختياري)</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="form-textarea"
                    placeholder="أدخل وصفاً للوثيقة"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">فئة الوثيقة</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="evidence">أدلة</option>
                    <option value="contract">عقود</option>
                    <option value="correspondence">مراسلات</option>
                    <option value="report">تقارير</option>
                    <option value="court_document">وثائق المحكمة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الملف</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                    className="form-file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
              </div>
              <div className="case-modal__footer">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="modal-btn modal-btn--primary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      رفع الوثيقة
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="modal-btn modal-btn--secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="case-modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="case-modal" onClick={(e) => e.stopPropagation()}>
            <div className="case-modal__header">
              <h3 className="case-modal__title">إرسال رسالة</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="case-modal__close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div className="case-modal__body">
                <div className="form-group">
                  <label className="form-label">المستلم</label>
                  <select
                    value={selectedRecipient || ''}
                    onChange={(e) => setSelectedRecipient(parseInt(e.target.value))}
                    className="form-select"
                    required
                  >
                    <option value="">اختر المستلم</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({getRoleName(r.role)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">نص الرسالة</label>
                  <textarea
                    required
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                    className="form-textarea"
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                  />
                </div>
              </div>
              <div className="case-modal__footer">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRecipient}
                  className="modal-btn modal-btn--success"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      إرسال
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="modal-btn modal-btn--secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCaseDetail;
