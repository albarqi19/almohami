import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertCircle,
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
  Clock,
  Link2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import ClientCaseMemos from '../components/ClientCaseMemos';
import { DocumentService } from '../services/documentService';
import { downloadDocument as downloadDocumentUnified } from '../components/FilePreview';
import { MessageService } from '../services/messageService';
import { ActivityService } from '../services/activityService';
import type { TimelineItem } from '../services/activityService';
import type { Case, Document } from '../types';
import { isExternalLinkDoc, safeExternalHref, externalLinkHost } from '../types';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

const ClientCaseDetail: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  useAuth(); // for authentication check
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        // بوابة العميل تستخدم مسار العميل المخصّص (/client/cases/{id}) لا مسار الطاقم
        const caseData = await CaseService.getClientCaseDetails(caseId);
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

        // Load timeline activities
        try {
          const timelineData = await ActivityService.getClientTimeline(caseId);
          setActivities(timelineData);
        } catch (e) {
          console.error('Error loading timeline:', e);
        }

      } catch (error) {
        console.error('Error loading case data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCaseData();
  }, [caseId]);

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

  /**
   * الرابط الخارجي لا يمرّ بمسار المعاينة/التنزيل إطلاقاً — الباك يردّ له 200 ومعه
   * JSON (`{success, external:true, url}`) لا ملفاً. فالمعاينة كانت تفتح للعميل تبويباً
   * فيه JSON خام يحوي الرابط، والتنزيل كان ينجح (`response.ok` صادقة و`.blob()` يمرّ)
   * فيحفظ ذلك الـJSON ملفاً باسم عنوان الرابط. الخروج المبكر هنا يقطع الحالتين معاً.
   *
   * ويمرّ الفتح بـ`safeExternalHref` لأن حراسة الباك عند **الإنشاء** ليست حراسةً عند
   * **العرض**، وحماية React لـ`href` لا تلمس `window.open` إطلاقاً.
   *
   * @returns true إن كانت الوثيقة رابطاً — أي أن النداء عُولج هنا ويجب أن يتوقّف.
   */
  const openExternalDoc = (doc: Document): boolean => {
    if (!isExternalLinkDoc(doc)) return false;
    const href = safeExternalHref(doc.external_url);
    if (!href) {
      toast.error('رابط غير صالح — تعذّر فتح هذه الوثيقة');
      return true;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  };

  const handleDocumentPreview = (doc: Document) => {
    if (openExternalDoc(doc)) return;
    // كان window.open على مسار المعاينة مباشرةً — والمسار خلف المصادقة، و`window.open`
    // لا يحمل توكناً إطلاقاً، فتُفتح لسانةٌ فارغة بردّ 401. الموحّدة تجلب بالمصادقة
    // ثم تفتح ما يعود (رابط OneDrive المباشر للسحابي، أو الملف نفسه للمحلي).
    void downloadDocumentUnified({
      id: doc.id,
      file_name: doc.file_name || doc.fileName || 'document',
      mime_type: doc.mime_type || doc.mimeType,
      cloud_file_id: doc.cloud_file_id,
      cloud_web_url: doc.cloud_web_url,
    });
  };

  const handleDocumentDownload = async (doc: Document) => {
    if (openExternalDoc(doc)) return;
    // كان ينادي DocumentService.downloadDocument مباشرةً بلا تفريعٍ على السحابة، فكانت
    // كلُّ وثيقةٍ على OneDrive تسقط في نداءٍ يرفضه المتصفّح (لا CORS على مضيف مايكروسوفت)
    // بلا رسالةٍ ولا ملف — زرٌّ ميّتٌ صامتٌ في وجه العميل. الموحّدة تتفرّع على cloud_file_id.
    await downloadDocumentUnified({
      id: doc.id,
      file_name: doc.file_name || doc.fileName || 'document',
      mime_type: doc.mime_type || doc.mimeType,
      cloud_file_id: doc.cloud_file_id,
      cloud_web_url: doc.cloud_web_url,
    });
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
      case 'document':
        return <FileText size={14} />;
      case 'task':
        return <CheckCircle size={14} />;
      case 'activity':
      default:
        return <Clock size={14} />;
    }
  };

  const getActivityIconClass = (type: string) => {
    switch (type) {
      case 'document':
        return 'timeline-item__icon--document';
      case 'task':
        return 'timeline-item__icon--hearing';
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

          {/* Memos Card (مذكرات القضية) */}
          {caseId && <ClientCaseMemos caseId={caseId} />}

          {/* Documents Card */}
          <div className="detail-card">
            <div className="detail-card__header">
              <h2 className="detail-card__title">
                <FileText size={18} />
                الوثائق ({documents.length})
              </h2>
            </div>
            <div className="detail-card__body">
              {documents.length === 0 ? (
                <div className="documents-empty">
                  <div className="documents-empty__icon">
                    <FileText size={28} />
                  </div>
                  <h3 className="documents-empty__title">لا توجد وثائق</h3>
                  <p className="documents-empty__text">لم يتم رفع أي وثائق لهذه القضية بعد. إذا طلب منك المحامي وثائق، ستجدها في صفحة "الوثائق المطلوبة".</p>
                </div>
              ) : (
                <div className="documents-list">
                  {documents.map((doc) => {
                    // الرابط والملف صفّان مختلفان: الرابط بلا حجم ولا تنزيل، ونطاقه يُعرض قبل النقر.
                    const isLink = isExternalLinkDoc(doc);
                    const linkHref = isLink ? safeExternalHref(doc.external_url) : null;
                    const linkHost = isLink ? externalLinkHost(doc.external_url) : null;
                    const linkBroken = isLink && !linkHref;
                    return (
                    <div key={doc.id} className="document-item">
                      <div className="document-item__icon">
                        {isLink ? <Link2 size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="document-item__content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <h4 className="document-item__title">{doc.title}</h4>
                          {isLink && !linkBroken && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, fontSize: 11, lineHeight: '17px', padding: '0 5px', borderRadius: 2, border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                              <Link2 size={10} /> رابط خارجي
                            </span>
                          )}
                          {linkBroken && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, fontSize: 11, lineHeight: '17px', padding: '0 5px', borderRadius: 2, border: '1px solid var(--status-orange, #a05a00)', color: 'var(--status-orange, #a05a00)' }}>
                              <AlertCircle size={10} /> رابط غير صالح
                            </span>
                          )}
                        </div>
                        {/* النطاق تحت العنوان: يكشف إلى أين يقود الرابط قبل النقر */}
                        {linkHost && (
                          <div
                            dir="ltr"
                            style={{ marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                          >
                            {linkHost}
                          </div>
                        )}
                        {doc.description && (
                          <p className="document-item__desc">{doc.description}</p>
                        )}
                        <div className="document-item__meta">
                          <span className="document-item__meta-item">
                            <Clock size={12} />
                            {formatDate(doc.uploaded_at || doc.uploadedAt)}
                          </span>
                          {!isLink && doc.file_size && (
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
                        {/* الرابط المعطوب لا يُنقَر أصلاً — لا فتحَ ولا تنزيل */}
                        <button
                          onClick={() => handleDocumentPreview(doc)}
                          className="document-item__btn"
                          disabled={linkBroken}
                          style={linkBroken ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                          title={linkBroken ? 'رابط غير صالح' : isLink ? 'فتح الرابط' : 'معاينة'}
                        >
                          {isLink ? <ExternalLink size={16} /> : <Eye size={16} />}
                        </button>
                        {!isLink && (
                          <button
                            onClick={() => handleDocumentDownload(doc)}
                            className="document-item__btn"
                            title="تحميل"
                          >
                            <Download size={16} />
                          </button>
                        )}
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
                    );
                  })}
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
                {activities.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '1rem 0' }}>لا توجد أنشطة بعد</p>
                ) : activities.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="timeline-item">
                    <div className={`timeline-item__icon ${getActivityIconClass(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="timeline-item__content">
                      <p className="timeline-item__title">{activity.title}</p>
                      {activity.user && <span className="timeline-item__user">{activity.user}</span>}
                      <span className="timeline-item__date">{formatDate(activity.date)}</span>
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
