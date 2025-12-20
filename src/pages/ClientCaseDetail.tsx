import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import { DocumentService } from '../services/documentService';
import { MessageService } from '../services/messageService';
import DocumentUploadModal from '../components/DocumentUploadModal';
import type { Case, Document, Activity } from '../types';

const ClientCaseDetail: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
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
    subject: '',
    message: ''
  });

  // Mock data - في التطبيق الحقيقي سيتم جلبها من API
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'case_created',
      title: 'إنشاء القضية',
      description: 'تم إنشاء القضية',
      performedBy: '2',
      performedAt: new Date('2024-01-15'),
      caseId: caseId || '1',
      metadata: { status: 'active' }
    },
    {
      id: '2',
      type: 'document_uploaded',
      title: 'رفع وثيقة',
      description: 'تم رفع صك الملكية الأصلي',
      performedBy: user?.id || '4',
      performedAt: new Date('2024-01-20'),
      caseId: caseId || '1',
      metadata: { documentId: '1', documentTitle: 'صك الملكية الأصلي' }
    },
    {
      id: '3',
      type: 'hearing_scheduled',
      title: 'تحديد موعد الجلسة',
      description: 'تم تحديد موعد الجلسة القادمة',
      performedBy: '2',
      performedAt: new Date('2024-03-01'),
      caseId: caseId || '1',
      metadata: { hearingDate: '2024-10-25' }
    }
  ];

  useEffect(() => {
    const loadCaseData = async () => {
      if (!caseId) return;
      
      try {
        setIsLoading(true);
        // جلب بيانات القضية
        const caseData = await CaseService.getCase(caseId);
        setCaseData(caseData);

        // جلب الوثائق الخاصة بالقضية
        const documentsData = await DocumentService.getDocuments({ case_id: caseId });
        setDocuments(documentsData.data);

        // TODO: جلب الأنشطة من API
        setActivities(mockActivities);
        
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
      setUploadForm({ title: '', description: '', file: null, category: 'evidence' });
      setShowUploadModal(false);

      // إضافة نشاط جديد
      const newActivity: Activity = {
        id: Date.now().toString(),
        type: 'document_uploaded',
        title: 'رفع وثيقة جديدة',
        description: `تم رفع وثيقة: ${uploadForm.title}`,
        performedBy: user?.id || '4',
        performedAt: new Date(),
        caseId: caseId || '1',
        metadata: { documentId: newDocument.id, documentTitle: uploadForm.title }
      };

      setActivities([newActivity, ...activities]);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      // يمكن إضافة رسالة خطأ للمستخدم هنا
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة معالجة إرسال التعليق
  const handleCommentSubmit = async (e: React.FormEvent, documentId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmitting(true);
      await DocumentService.addComment(documentId, commentText);
      setCommentText('');
      setShowCommentForm(null);
      // TODO: إعادة تحميل الوثائق لعرض التعليق الجديد
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.subject || !messageForm.message || !caseData) return;

    try {
      setIsSubmitting(true);
      
      // تحديد المحامي المستلم للرسالة (أول محامٍ في القضية)
      const receiverId = caseData.lawyers?.[0]?.id || caseData.assignedLawyers?.[0] || '2';
      
      await MessageService.sendMessage({
        subject: messageForm.subject,
        content: messageForm.message,
        receiver_id: receiverId,
        case_id: caseId
      });

      // إضافة نشاط جديد
      const newActivity: Activity = {
        id: Date.now().toString(),
        type: 'message_sent',
        title: 'إرسال رسالة',
        description: `تم إرسال رسالة: ${messageForm.subject}`,
        performedBy: user?.id || '4',
        performedAt: new Date(),
        caseId: caseId || '1',
        metadata: { 
          subject: messageForm.subject,
          message: messageForm.message
        }
      };

      setActivities([newActivity, ...activities]);
      setMessageForm({ subject: '', message: '' });
      setShowMessageModal(false);
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (category: string) => {
    const categories: { [key: string]: string } = {
      'contract': 'عقد',
      'evidence': 'دليل',
      'pleading': 'مذكرة',
      'correspondence': 'مراسلات',
      'report': 'تقرير',
      'judgment': 'حكم',
      'other': 'أخرى'
    };
    return categories[category] || category;
  };

  const handleDocumentPreview = (doc: Document) => {
    // فتح معاينة الوثيقة في نافذة جديدة أو modal
    const previewUrl = `http://127.0.0.1:8000/api/v1/documents/${doc.id}/preview`;
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

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'غير محدد';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return 'تاريخ غير صحيح';
    
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.1)', text: 'نشطة' },
      pending: { color: 'var(--color-warning)', bg: 'rgba(251, 191, 36, 0.1)', text: 'قيد الانتظار' },
      closed: { color: 'var(--color-text-secondary)', bg: 'rgba(107, 114, 128, 0.1)', text: 'مغلقة' },
      settled: { color: 'var(--color-primary)', bg: 'rgba(59, 130, 246, 0.1)', text: 'مسوية' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '12px',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: config.color,
        backgroundColor: config.bg
      }}>
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لم يتم العثور على القضية
          </h3>
          <p className="text-gray-600">
            القضية المطلوبة غير موجودة أو ليس لديك صلاحية للوصول إليها
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {caseData.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              رقم الملف: {caseData.file_number}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              رفع وثيقة
            </button>
            <button
              onClick={() => setShowMessageModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              إرسال رسالة
            </button>
          </div>
        </div>
        {getStatusBadge(caseData.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              تفاصيل القضية
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">الوصف</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {caseData.description}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">الطرف الآخر</h4>
                  <p className="text-gray-600 dark:text-gray-400">{caseData.opponent_name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">المحكمة</h4>
                  <p className="text-gray-600 dark:text-gray-400">{caseData.court}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">القيمة المقدرة</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {caseData.contract_value ? formatCurrency(caseData.contract_value) : 'غير محدد'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">الجلسة القادمة</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {caseData.next_hearing ? formatDate(caseData.next_hearing) : 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                الوثائق ({documents.length})
              </h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Upload className="h-4 w-4" />
                رفع وثيقة
              </button>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  لا توجد وثائق
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  لم يتم رفع أي وثائق لهذه القضية بعد
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  رفع أول وثيقة
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                            {doc.title}
                          </h4>
                          {doc.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              {formatDate(doc.uploaded_at || doc.uploadedAt)}
                            </span>
                            {doc.file_size && (
                              <span>
                                {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            )}
                            {doc.category && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {getCategoryName(doc.category)}
                              </span>
                            )}
                            {doc.is_confidential && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs">
                                سري
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          onClick={() => handleDocumentPreview(doc)}
                          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="معاينة"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDocumentDownload(doc)}
                          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="تحميل"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setShowCommentForm(showCommentForm === parseInt(doc.id) ? null : parseInt(doc.id))}
                          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="إضافة تعليق"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Comment Form */}
                    {showCommentForm === parseInt(doc.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={(e) => handleCommentSubmit(e, doc.id)} className="space-y-3">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none dark:bg-gray-700 dark:text-white"
                            placeholder="اكتب تعليقك هنا..."
                            rows={3}
                            required
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCommentForm(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-4 py-1 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50"
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              المخطط الزمني
            </h2>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                      {activity.type === 'document_uploaded' && <Upload className="h-4 w-4 text-white" />}
                      {activity.type === 'hearing_scheduled' && <Calendar className="h-4 w-4 text-white" />}
                      {activity.type === 'message_sent' && <MessageSquare className="h-4 w-4 text-white" />}
                      {activity.type === 'case_created' && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(activity.performedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              معلومات سريعة
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">تاريخ الإنشاء</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(caseData.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">آخر تحديث</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(caseData.updated_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">عدد الوثائق</span>
                <span className="text-gray-900 dark:text-white">
                  {documents.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                رفع وثيقة جديدة
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عنوان الوثيقة
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="أدخل عنوان الوثيقة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  وصف الوثيقة
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="أدخل وصفاً للوثيقة (اختياري)"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  فئة الوثيقة
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="evidence">أدلة</option>
                  <option value="contract">عقود</option>
                  <option value="correspondence">مراسلات</option>
                  <option value="report">تقارير</option>
                  <option value="court_document">وثائق المحكمة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الملف
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadForm({...uploadForm, file: e.target.files?.[0] || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    'رفع الوثيقة'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                إرسال رسالة للمحامي
              </h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  موضوع الرسالة
                </label>
                <input
                  type="text"
                  required
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="أدخل موضوع الرسالة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نص الرسالة
                </label>
                <textarea
                  required
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="أدخل نص الرسالة"
                  rows={5}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={async () => {
          // Reload documents after successful upload
          if (caseId) {
            const documentsData = await DocumentService.getDocuments({ case_id: caseId });
            setDocuments(documentsData.data);
          }
          setShowUploadModal(false);
        }}
        cases={caseData ? [caseData] : []}
      />
    </div>
  );
};

export default ClientCaseDetail;
