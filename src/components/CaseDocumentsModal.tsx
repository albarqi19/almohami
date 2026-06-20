import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  FileText,
  Download,
  Eye,
  Upload,
  Send,
  File,
  Image,
  FileVideo,
  Archive,
  User,
  Calendar,
  Tag,
  Loader2,
  AlertCircle,
  Brain,
  Trash2,
  Sparkles,
  HelpCircle,
  ClipboardList,
  FilePlus
} from 'lucide-react';
import { useModalTour } from '../hooks/useModalTour';
import Modal from './Modal';
import DocumentPreviewModal from './DocumentPreviewModal';
import SmartUploadModal from './SmartUploadModal';
import LegalMemoWorkspace from './LegalMemoWorkspace';
import MemoSendModal from './MemoSendModal';
import AnalysisProgress from './AnalysisProgress';
import { usePermission } from '../hooks/usePermission';
import { MEMO_APPROVAL_STATE_LABELS } from '../services/memoWorkflowService';
import CloudFilePickerModal from './CloudFilePickerModal';
import DocumentRequestsPanel from './DocumentRequests/DocumentRequestsPanel';

import { DocumentService } from '../services/documentService';
import { CloudStorageService } from '../services/cloudStorageService';
import { LegalMemoService, type LegalMemo, type AnalysisStep } from '../services/legalMemoService';
import type { Document as DocumentType } from '../types';

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

interface CaseParty {
  name: string;
  side: 'plaintiff' | 'defendant' | 'lawyer' | 'agent' | 'appellant' | 'appellee' | string;
  role?: string;
}

interface CaseDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  clientName?: string;
  caseNumber?: string;
  caseType?: string;
  parties?: CaseParty[];
  clientId?: number;
}

interface DocumentComment {
  id: string;
  content: string;
  is_internal: boolean;
  author?: {
    id: string;
    name: string;
    role?: string;
  } | null;
  created_at: string;
}

const CaseDocumentsModal: React.FC<CaseDocumentsModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  clientName,
  caseNumber,
  caseType,
  parties,
  clientId,
}) => {
  const [showDocumentRequestsPanel, setShowDocumentRequestsPanel] = useState(false);
  const { startTour, hasTour } = useModalTour('modal:case-documents', isOpen);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [memos, setMemos] = useState<LegalMemo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [showCreateMemo, setShowCreateMemo] = useState(false);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [editingMemo, setEditingMemo] = useState<LegalMemo | null>(null);
  const [sendMemo, setSendMemo] = useState<LegalMemo | null>(null);
  // صلاحيات أزرار المذكرات (الباك يمنعها أيضاً — هذا لإخفاء الأزرار غير الصالحة)
  const canCreateMemo = usePermission('memos.create');
  const canEditMemo = usePermission('memos.edit');
  const canDeleteMemo = usePermission('memos.delete');
  const canSendMemo = usePermission('memos.send');
  // الرفع المباشر إلى OneDrive + السحب والإفلات
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [oneDriveConnected, setOneDriveConnected] = useState<boolean | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);



  const [previewDocument, setPreviewDocument] = useState<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: Date;
    cloud_file_id?: string | null;
    cloud_web_url?: string | null;
  } | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  // AI Analysis viewer
  const [viewingAnalysis, setViewingAnalysis] = useState<{docId: string; analysis: any; analyzedAt?: string; analyzedBy?: string} | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  // متغيرات واجهة الخطوات للتحليل الذكي
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);

  // Load documents and memos when modal opens
  useEffect(() => {
    console.log('CaseDocumentsModal useEffect triggered:', { isOpen, caseId }); // للتشخيص
    if (isOpen && caseId) {
      loadDocuments();
      loadMemos();
      // جلب حالة اتصال OneDrive (الرفع يتم مباشرة إلى OneDrive)
      CloudStorageService.getOneDriveStatus()
        .then((status) => setOneDriveConnected(!!status.connected))
        .catch(() => setOneDriveConnected(false));
    }
  }, [isOpen, caseId]);

  // Load comments when document is selected
  useEffect(() => {
    if (selectedDocument) {
      loadComments(selectedDocument.id);
    }
  }, [selectedDocument]);

  const loadDocuments = async () => {
    try {
      console.log('Loading documents for case:', caseId); // للتشخيص
      setLoading(true);
      setError(null);
      const result = await DocumentService.getCaseDocuments(caseId);
      console.log('Documents loaded:', result); // للتشخيص
      setDocuments(result || []);
    } catch (err) {
      console.error('Error loading case documents:', err); // هذا موجود بالفعل
      setError(err instanceof Error ? err.message : 'خطأ في تحميل الوثائق');
    } finally {
      setLoading(false);
    }
  };

  const loadMemos = async () => {
    try {
      console.log('Loading memos for case:', caseId);
      const result = await LegalMemoService.getCaseMemos(caseId);
      console.log('Memos loaded:', result);
      setMemos(result || []);
    } catch (err) {
      console.error('Error loading case memos:', err);
      // لا نعرض خطأ للمذكرات لأنها ميزة جديدة
    }
  };

  const loadComments = async (documentId: string) => {
    try {
      setLoadingComments(true);
      const result = await DocumentService.getDocumentComments(documentId);
      setComments(result || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedDocument) return;

    try {
      setAddingComment(true);
      await DocumentService.addDocumentComment(selectedDocument.id, newComment.trim());
      setNewComment('');
      // Reload comments
      await loadComments(selectedDocument.id);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setAddingComment(false);
    }
  };

  const handleEditMemo = (memo: LegalMemo) => {
    setEditingMemo(memo);
    setShowCreateMemo(true);
  };

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف الوثيقة "${fileName}"؟\nلا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await DocumentService.deleteDocument(documentId);
      // إعادة تحميل الوثائق
      await loadDocuments();
      // إذا كانت الوثيقة المحذوفة محددة حالياً، قم بإلغاء تحديدها
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('خطأ في حذف الوثيقة:', error);
      alert('حدث خطأ أثناء حذف الوثيقة. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemo = async (memoId: string, memoTitle: string) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف المذكرة "${memoTitle}"؟\nلا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await LegalMemoService.deleteMemo(memoId);
      // إعادة تحميل المذكرات
      await loadMemos();
    } catch (error) {
      console.error('خطأ في حذف المذكرة:', error);
      alert('حدث خطأ أثناء حذف المذكرة. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartAnalysisMemo = async (memoId: string, memoTitle: string) => {
    const confirmed = window.confirm(`هل تريد إجراء تحليل ذكي للمذكرة "${memoTitle}"؟\nقد يستغرق هذا بعض الوقت.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      setShowAnalysisProgress(true);
      setAnalysisSteps([]);

      // دالة لتحديث الخطوات
      const updateProgress = (step: AnalysisStep) => {
        setAnalysisSteps(prev => {
          const existingIndex = prev.findIndex(s => s.id === step.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = step;
            return updated;
          } else {
            return [...prev, step];
          }
        });
      };

      const response = await LegalMemoService.analyzeSmartly(parseInt(memoId), true, updateProgress); // إجبار إعادة التحليل
      console.log('استجابة التحليل الذكي من الخارج:', response);
      console.log('response.success:', response?.success);
      console.log('response.data:', response?.data);
      console.log('response.analysis_result:', response?.analysis_result);

      // التحقق من وجود analysis_result مباشرة في response أو في response.data
      const analysis = response?.analysis_result || response?.data?.analysis_result;

      if (response && analysis) {
        // دالة لتنسيق النص من JSON
        const formatAnalysisText = (text: string): string => {
          if (!text) return '';

          let processedText = text;

          // إذا كان النص يبدأ بـ { فهو JSON
          if (text.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.content) {
                processedText = parsed.content;
              }
            } catch (e) {
              // إذا فشل التحليل، نعرض النص كما هو
              console.warn('Failed to parse JSON:', e);
            }
          }

          return processedText
            // تحويل النص العريض
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e293b; font-weight: 600;">$1</strong>')
            // تحويل النقاط
            .replace(/^\* (.+)$/gm, '<div style="margin: 8px 0; padding-right: 16px; position: relative;"><span style="position: absolute; right: 0; color: #218092;">•</span>$1</div>')
            // تحويل العناوين
            .replace(/^## (.+)$/gm, '<h4 style="color: #1e293b; font-weight: 600; margin: 16px 0 8px 0; font-size: 16px;">$1</h4>')
            .replace(/^# (.+)$/gm, '<h3 style="color: #1e293b; font-weight: 700; margin: 20px 0 12px 0; font-size: 18px;">$1</h3>')
            // تحويل الفقرات
            .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.7;">')
            .replace(/\n/g, '<br>')
            // إضافة تاج البداية والنهاية للفقرة
            .replace(/^/, '<p style="margin: 12px 0; line-height: 1.7;">')
            .replace(/$/, '</p>');
        };

        // عرض النتائج في منطقة الرسائل بتنسيق جميل
        let analysisDisplay = `
          <div style="direction: rtl; font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; max-height: 70vh; overflow-y: auto;">
            <div style="background: #218092; color: white; padding: 24px; border-radius: 12px 12px 0 0; margin-bottom: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); position: sticky; top: 0; z-index: 10;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 28px;">🎯</span>
                <h2 style="margin: 0; font-size: 24px; font-weight: bold;">نتائج التحليل الذكي</h2>
              </div>
              <p style="margin: 12px 0 0 0; opacity: 0.95; font-size: 16px;">المذكرة: ${memoTitle} | درجة الجودة: ${analysis.quality_score}/100</p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              
              ${analysis.document_analysis ? `
              <div style="padding: 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <span style="font-size: 22px;">📄</span>
                  <h3 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">تحليل الوثائق المرفقة</h3>
                </div>
                <div style="color: #475569; margin: 0; background: white; padding: 20px; border-radius: 10px; border-right: 5px solid #3b82f6; line-height: 1.8; font-size: 15px;">${formatAnalysisText(analysis.document_analysis || '')}</div>
              </div>
              ` : ''}
              
              ${analysis.memo_analysis ? `
              <div style="padding: 24px; border-bottom: 1px solid #f1f5f9; background: #f0f9ff;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <span style="font-size: 22px;">⚖️</span>
                  <h3 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">التحليل القانوني للمذكرة</h3>
                </div>
                <div style="color: #475569; margin: 0; background: white; padding: 20px; border-radius: 10px; border-right: 5px solid #2563eb; line-height: 1.8; font-size: 15px; max-height: none;">${formatAnalysisText(analysis.memo_analysis || '')}</div>
              </div>
              ` : ''}
              
              ${analysis.improvement_suggestions?.length ? `
              <div style="padding: 24px; border-bottom: 1px solid #f1f5f9; background: #f0fdf4;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <span style="font-size: 22px;">💡</span>
                  <h3 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">اقتراحات التحسين</h3>
                </div>
                <div style="background: white; padding: 20px; border-radius: 10px; border-right: 5px solid #16a34a;">
                  ${analysis.improvement_suggestions.map((suggestion: string) =>
          `<div style="margin-bottom: 12px; color: #475569; line-height: 1.6;">• ${suggestion}</div>`
        ).join('')}
                </div>
              </div>
              ` : ''}
              
              ${analysis.legal_compliance_issues?.length ? `
              <div style="padding: 24px; background: #fff7ed;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <span style="font-size: 22px;">⚠️</span>
                  <h3 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 600;">نقاط الامتثال القانوني</h3>
                </div>
                <div style="background: white; padding: 20px; border-radius: 10px; border-right: 5px solid #ea580c;">
                  ${analysis.legal_compliance_issues.map((issue: string) =>
          `<div style="margin-bottom: 12px; color: #475569; line-height: 1.6;">• ${issue}</div>`
        ).join('')}
                </div>
              </div>
              ` : ''}
              
              <div style="padding: 15px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                <button onclick="this.parentElement.parentElement.parentElement.parentElement.style.display='none'" style="margin-top: 10px; padding: 8px 16px; background: #218092; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background='#1a6b79'" onmouseout="this.style.background='#218092'">إغلاق التحليل</button>
              </div>
            </div>
          </div>
        `;

        setError(analysisDisplay);

        // إعادة تحميل المذكرات لإظهار التحديثات
        await loadMemos();
      } else {
        setError('حدث خطأ أثناء التحليل الذكي: ' + (response?.message || 'خطأ غير معروف'));

        // إضافة خطوة الخطأ
        updateProgress({
          id: 'analysis_error',
          title: 'خطأ في التحليل',
          status: 'error',
          message: response?.message || 'خطأ غير معروف'
        });
      }

      // إنتظار قليل قبل إخفاء واجهة الخطوات
      setTimeout(() => {
        setShowAnalysisProgress(false);
      }, 2000);

    } catch (error) {
      console.error('خطأ في التحليل الذكي:', error);

      // إضافة خطوة الخطأ
      setAnalysisSteps(prev => [...prev, {
        id: 'fatal_error',
        title: 'خطأ في الاتصال',
        status: 'error',
        message: 'فشل في الاتصال بالخادم',
        error: (error as Error).message
      }]);

      // إخفاء واجهة الخطوات بعد فترة
      setTimeout(() => {
        setShowAnalysisProgress(false);
      }, 3000);

      alert('حدث خطأ أثناء التحليل الذكي. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = async (doc: DocumentType) => {
    try {
      setLoadingAnalysis(doc.id);
      const response = await DocumentService.getDocumentAnalysis(doc.id);
      if (response.success && response.data?.has_analysis) {
        setViewingAnalysis({
          docId: doc.id,
          analysis: response.data.analysis,
          analyzedAt: response.data.analyzed_at,
          analyzedBy: response.data.analyzed_by,
        });
      } else {
        alert('لم يتم تحليل هذه الوثيقة بعد');
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      alert('حدث خطأ في جلب نتيجة التحليل');
    } finally {
      setLoadingAnalysis(null);
    }
  };

  // رفع مباشر إلى OneDrive لملف أو أكثر (رابط رفع → رفع مباشر → تسجيل في النظام)
  const handleDirectUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    // يجب الاتصال بـ OneDrive أولاً
    if (oneDriveConnected === false) {
      alert('يجب الاتصال بـ OneDrive أولاً قبل رفع الملفات. افتح إعدادات التخزين السحابي للربط.');
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    let failed = 0;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        const result = await CloudStorageService.uploadFileToCase(Number(caseId), file);
        if (!result.success) {
          console.error('OneDrive upload failed for', file.name, result.error);
          failed++;
        }
      } catch (err) {
        console.error('OneDrive upload failed for', file.name, err);
        failed++;
      } finally {
        setUploadProgress({ done: i + 1, total: list.length });
      }
    }

    setUploading(false);
    setUploadProgress(null);
    await loadDocuments();

    if (failed > 0) {
      alert(`تعذّر رفع ${failed} من ${list.length} ملف إلى OneDrive`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDirectUpload(e.target.files);
    }
    e.target.value = ''; // السماح بإعادة رفع نفس الملف
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // تجاهل عند الانتقال بين العناصر الداخلية
    if (e.currentTarget === e.target) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDirectUpload(e.dataTransfer.files);
    }
  };

  const handlePreview = (doc: DocumentType) => {
    // Use official API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1';

    const previewDoc = {
      id: doc.id,
      name: doc.file_name || doc.fileName || 'ملف غير معروف',
      size: doc.file_size || doc.fileSize || 0,
      type: doc.mime_type || doc.mimeType || 'application/octet-stream',
      url: `${apiUrl}/documents/${doc.id}/preview`,
      uploadedAt: doc.uploaded_at ? new Date(doc.uploaded_at) : (doc.uploadedAt || new Date()),
      // تمرير الحقول السحابية ليفتح OneDrive عبر الرابط المباشر بدل بروكسي الخادم
      cloud_file_id: doc.cloud_file_id,
      cloud_web_url: doc.cloud_web_url,
    };
    setPreviewDocument(previewDoc);
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const blob = await DocumentService.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading document:', err);
    }
  };

  const getFileIcon = (doc: DocumentType) => {
    const mimeType = doc.mime_type || doc.mimeType || '';
    if (mimeType.includes('pdf')) {
      return <FileText size={20} style={{ color: '#dc2626' }} />;
    } else if (mimeType.includes('image')) {
      return <Image size={20} style={{ color: '#16a34a' }} />;
    } else if (mimeType.includes('video')) {
      return <FileVideo size={20} style={{ color: '#2563eb' }} />;
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return <Archive size={20} style={{ color: '#d97706' }} />;
    } else {
      return <File size={20} style={{ color: '#6b7280' }} />;
    }
  };

  const formatFileSize = (doc: DocumentType) => {
    const bytes = doc.file_size || doc.fileSize || 0;
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'تاريخ غير صحيح';
    }
  };

  return (
    <>
      {console.log('CaseDocumentsModal render:', { isOpen, caseId, caseTitle })} {/* للتشخيص */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
        title={`وثائق القضية${caseTitle ? ' — ' + caseTitle : ''}`}
        headerActions={hasTour ? (
          <button
            data-tour="docs-help-btn"
            onClick={startTour}
            title="جولة تعريفية بالنافذة"
            aria-label="جولة تعريفية"
            style={{
              padding: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <HelpCircle size={15} />
          </button>
        ) : null}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '80vh',
            maxHeight: '600px',
            position: 'relative'
          }}>
          {/* طبقة السحب والإفلات (الرفع مباشرةً إلى OneDrive) */}
          {isDragging && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              backgroundColor: oneDriveConnected === false ? 'rgba(220, 38, 38, 0.08)' : 'rgba(37, 99, 235, 0.08)',
              border: `2px dashed ${oneDriveConnected === false ? 'var(--color-error)' : 'var(--color-primary)'}`,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              pointerEvents: 'none',
              backdropFilter: 'blur(1px)'
            }}>
              {oneDriveConnected === false ? (
                <>
                  <AlertCircle size={40} style={{ color: 'var(--color-error)' }} />
                  <span style={{ color: 'var(--color-error)', fontSize: '16px', fontWeight: 600 }}>
                    يجب الاتصال بـ OneDrive أولاً
                  </span>
                </>
              ) : (
                <>
                  <FilePlus size={40} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-primary)', fontSize: '16px', fontWeight: 600 }}>
                    أفلت الملفات هنا لرفعها إلى OneDrive
                  </span>
                </>
              )}
            </div>
          )}
                        {/* Header toolbar - no title since Modal has one */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid var(--color-border)',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button data-tour="docs-cloud" onClick={() => setShowCloudPicker(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ملف سحابي
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <button
                data-tour="docs-upload-direct"
                title="رفع ملفات إلى OneDrive"
                onClick={() => {
                  if (oneDriveConnected === false) {
                    alert('يجب الاتصال بـ OneDrive أولاً قبل رفع الملفات. افتح إعدادات التخزين السحابي للربط.');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '14px', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}>
                {uploading
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <FilePlus size={14} />}
                {uploading && uploadProgress ? `جارٍ الرفع ${uploadProgress.done}/${uploadProgress.total}` : 'رفع'}
              </button>
              <button data-tour="docs-upload" onClick={() => setShowSmartUpload(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'var(--color-primary)', color: 'white', border: '1px solid var(--color-primary)', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                <Upload size={14} />
                رفع وثيقة ذكي
              </button>
              {canCreateMemo && (
              <button data-tour="docs-memo" onClick={() => { setEditingMemo(null); setShowCreateMemo(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'transparent', color: 'var(--color-success)', border: '1px solid var(--color-success)', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-success)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-success)'; }}>
                <FileText size={14} />
                مذكرة
              </button>
              )}
              {clientId ? (
                <button
                  data-tour="docs-requests"
                  onClick={() => setShowDocumentRequestsPanel(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6366f1'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6366f1'; }}
                  title="طلب وثائق من العميل"
                >
                  <ClipboardList size={14} />
                  طلبات الوثائق
                </button>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Documents List */}
            <div style={{
              flex: selectedDocument ? '0 0 60%' : 1,
              borderRight: selectedDocument ? '1px solid var(--color-border)' : 'none',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <Loader2 size={32} style={{
                    color: 'var(--color-primary)',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ color: 'var(--color-text-secondary)' }}>جارٍ تحميل الوثائق...</p>
                </div>
              ) : error ? (
                <div style={{
                  display: 'flex',
                  alignItems: error.includes('<div') ? 'stretch' : 'center',
                  justifyContent: 'center',
                  flex: 1,
                  flexDirection: 'column',
                  gap: error.includes('<div') ? '0' : '16px',
                  padding: error.includes('<div') ? '0' : '20px',
                  maxHeight: error.includes('<div') ? '80vh' : 'auto',
                  overflowY: error.includes('<div') ? 'auto' : 'visible'
                }}>
                  {!error.includes('<div') && <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />}
                  {error.includes('<div') ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: error }}
                      style={{
                        width: '100%',
                        maxHeight: 'inherit',
                        overflowY: 'auto'
                      }}
                    />
                  ) : (
                    <p style={{ color: 'var(--color-error)' }}>{error}</p>
                  )}
                </div>
              ) : documents.length === 0 && memos.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <FileText size={48} style={{ color: 'var(--color-text-tertiary)' }} />
                  <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد وثائق أو مذكرات لهذه القضية</p>
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '0'
                }}>
                  <div>
                    {/* المذكرات القانونية - ERP rows */}
                    {memos.length > 0 && (
                      <div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-surface-subtle)',
                          borderBottom: '1px solid var(--color-border)',
                          borderTop: '1px solid var(--color-border)',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          <span>المذكرات القانونية</span>
                          <span>{memos.length}</span>
                        </div>
                        {memos.map((memo) => (
                          <div
                            key={`memo-${memo.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '9px 12px',
                              borderBottom: '1px solid var(--color-border)',
                              cursor: 'pointer',
                              transition: 'background 0.1s'
                            }}
                            onClick={() => handleEditMemo(memo)}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <FileText size={15} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '14px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memo.title}</span>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{(LegalMemoService.getStatusOptions() as any)[memo.status] || memo.status}</span>
                                {memo.approval_state && memo.approval_state !== 'not_required' && (
                                  <span style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', padding: '1px 7px', borderRadius: '10px', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-primary)' }}>
                                    {MEMO_APPROVAL_STATE_LABELS[memo.approval_state] ?? memo.approval_state}
                                  </span>
                                )}
                                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{new Date(memo.created_at).toLocaleDateString('ar')}</span>
                              </div>
                              {memo.content && (
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {memo.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                              {canSendMemo && (
                                <button onClick={(e) => { e.stopPropagation(); setSendMemo(memo); }}
                                  style={{ background: 'none', border: 'none', padding: '5px 7px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-success)', borderRadius: '2px' }}
                                  title="إرسال / اعتماد">إرسال</button>
                              )}
                              {canEditMemo && (
                                <button onClick={(e) => { e.stopPropagation(); handleSmartAnalysisMemo(memo.id, memo.title); }}
                                  style={{ background: 'none', border: 'none', padding: '5px 7px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-primary)', borderRadius: '2px' }}
                                  title="تحليل ذكي">تحليل</button>
                              )}
                              {canDeleteMemo && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMemo(memo.id, memo.title); }}
                                  style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', borderRadius: '2px' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                                  title="حذف"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* الوثائق - ERP rows */}
                    {documents.length > 0 && (
                      <div>
                        {/* Group header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-surface-subtle)',
                          borderBottom: '1px solid var(--color-border)',
                          borderTop: memos.length > 0 ? '1px solid var(--color-border)' : 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          <span>الوثائق</span>
                          <span>{documents.length}</span>
                        </div>
                      </div>
                    )}

                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '9px 12px',
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          backgroundColor: selectedDocument?.id === doc.id ? 'var(--color-primary-soft)' : 'transparent',
                          transition: 'background 0.1s'
                        }}
                        onClick={() => setSelectedDocument(doc)}
                        onMouseEnter={(e) => { if (selectedDocument?.id !== doc.id) e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)'; }}
                        onMouseLeave={(e) => { if (selectedDocument?.id !== doc.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {/* Icon */}
                        <span style={{ display: 'flex', alignItems: 'center', paddingTop: '1px', flexShrink: 0 }}>{getFileIcon(doc)}</span>

                        {/* Name + details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                              {doc.title || doc.file_name || doc.fileName}
                            </span>
                            {(doc as any).ai_analysis && (
                              <span style={{ fontSize: '11px', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '2px', padding: '0 5px', flexShrink: 0, lineHeight: '17px' }}>يوجد تحليل</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {(doc.file_name || doc.fileName) && (
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{doc.file_name || doc.fileName}</span>
                            )}
                            <span style={{ whiteSpace: 'nowrap' }}>{formatFileSize(doc)}</span>
                            {doc.uploader?.name && <span style={{ whiteSpace: 'nowrap' }}>↑ {doc.uploader.name}</span>}
                            <span style={{ whiteSpace: 'nowrap' }}>{formatDate((doc.uploaded_at || doc.uploadedAt || new Date()).toString())}</span>
                            {doc.category && <span style={{ whiteSpace: 'nowrap' }}>{doc.category}</span>}
                          </div>
                          {doc.description && (
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.description}
                            </p>
                          )}
                          {(doc as any).ai_analysis?.description && (
                            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(doc as any).ai_analysis.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                          <button onClick={(e) => { e.stopPropagation(); handlePreview(doc); }}
                            style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', borderRadius: '2px' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                            title="معاينة"><Eye size={13} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(doc.id, doc.file_name || doc.fileName || 'document'); }}
                            style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', borderRadius: '2px' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-success)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                            title="تحميل"><Download size={13} /></button>
                          {(doc as any).ai_analysis && (
                            <button onClick={(e) => { e.stopPropagation(); handleViewAnalysis(doc); }} disabled={loadingAnalysis === doc.id}
                              style={{ background: 'none', border: 'none', padding: '5px 7px', cursor: loadingAnalysis === doc.id ? 'wait' : 'pointer', fontSize: '12px', color: 'var(--color-primary)', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}
                              title="عرض التحليل">
                              {loadingAnalysis === doc.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                              التحليل
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id, doc.file_name || doc.fileName || 'الوثيقة'); }}
                            style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', borderRadius: '2px' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                            title="حذف"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Panel */}
            {selectedDocument && (
              <div style={{
                flex: '0 0 40%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-surface)'
              }}>
                <div style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text)' }}>التعليقات</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> — {selectedDocument.title}</span>
                  </div>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', borderRadius: '3px', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    title="إغلاق التعليقات"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '20px'
                }}>
                  {loadingComments ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}>
                      <Loader2 size={20} style={{
                        color: 'var(--color-primary)',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>جارٍ تحميل التعليقات...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      padding: '20px'
                    }}>
                      لا توجد تعليقات على هذه الوثيقة
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          style={{
                            padding: '12px',
                            backgroundColor: 'var(--color-background)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <User size={14} style={{ color: 'var(--color-primary)' }} />
                            <span style={{
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--color-text)'
                            }}>
                              {comment.author?.name || 'مستخدم غير معروف'}
                            </span>
                            <span style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-tertiary)'
                            }}>
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text)',
                            margin: 0
                          }}>
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Comment */}
                <div style={{
                  padding: '20px',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="اكتب تعليقاً..."
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: 'var(--font-size-sm)',
                        minHeight: '60px',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      disabled={addingComment}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addingComment}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: newComment.trim() && !addingComment ? 'var(--color-primary)' : 'var(--color-gray-300)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: newComment.trim() && !addingComment ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {addingComment ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />

      {/* Document Requests Panel */}
      {clientId ? (
        <DocumentRequestsPanel
          isOpen={showDocumentRequestsPanel}
          onClose={() => setShowDocumentRequestsPanel(false)}
          caseId={Number(caseId)}
          clientId={clientId}
          clientName={clientName}
          caseTitle={caseTitle}
        />
      ) : null}

      {/* Smart Upload Modal */}
      <SmartUploadModal
        isOpen={showSmartUpload}
        onClose={() => setShowSmartUpload(false)}
        caseId={caseId}
        caseTitle={caseTitle}
        clientName={clientName}
        caseNumber={caseNumber}
        caseType={caseType}
        parties={parties}
        onDocumentAdded={() => {
          loadDocuments();
          setShowSmartUpload(false);
        }}
      />

      {/* Legal Memo Workspace */}
      <LegalMemoWorkspace
        isOpen={showCreateMemo}
        onClose={() => {
          setShowCreateMemo(false);
          setEditingMemo(null); // مسح المذكرة المحددة للتعديل
        }}
        caseId={caseId}
        caseTitle={caseTitle}
        editingMemo={editingMemo}
        onMemoCreated={(memo) => {
          console.log('تم إنشاء/تحديث مذكرة:', memo);
          setShowCreateMemo(false);
          setEditingMemo(null);
          loadMemos(); // إعادة تحميل المذكرات
        }}
      />

      {/* نافذة إرسال/اعتماد المذكرة (واعية بالحالة) */}
      {sendMemo && (
        <MemoSendModal
          memoId={sendMemo.id}
          isOpen={!!sendMemo}
          onClose={() => setSendMemo(null)}
          approvalState={sendMemo.approval_state}
          requiresApproval={(sendMemo as any).case?.requires_memo_approval}
          onSent={() => { setSendMemo(null); loadMemos(); }}
        />
      )}

      {/* Analysis Progress Modal */}
      <AnalysisProgress
        steps={analysisSteps}
        isVisible={showAnalysisProgress}
      />

      {/* Cloud File Picker Modal */}
      <CloudFilePickerModal
        isOpen={showCloudPicker}
        onClose={() => setShowCloudPicker(false)}
        caseId={caseId}
        caseTitle={caseTitle}
        onFileAssigned={() => {
          loadDocuments();
          setShowCloudPicker(false);
        }}
      />

      {/* AI Analysis Viewer Modal */}
      {viewingAnalysis && (
        <div
          onClick={() => setViewingAnalysis(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '6px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              direction: 'rtl',
              border: '1px solid var(--color-border)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>تحليل الوثيقة</span>
              <button onClick={() => setViewingAnalysis(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>

            {/* ERP-style table rows */}
            <div style={{ fontSize: '13px' }}>
              {[[
                'نوع الوثيقة', viewingAnalysis.analysis.document_type
              ],[
                'الأهمية', viewingAnalysis.analysis.priority
              ],[
                'العنوان المقترح', viewingAnalysis.analysis.suggested_title
              ],[
                'الملخص', viewingAnalysis.analysis.summary
              ],[
                'الوصف', viewingAnalysis.analysis.description
              ]].filter(([, v]) => v).map(([label, value], i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr',
                  borderBottom: '1px solid var(--color-border)',
                  minHeight: '36px'
                }}>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: '500',
                    fontSize: '12px',
                    display: 'flex', alignItems: 'flex-start', paddingTop: '10px',
                    borderLeft: '1px solid var(--color-border)'
                  }}>{label}</div>
                  <div style={{
                    padding: '8px 12px',
                    color: 'var(--color-text)',
                    lineHeight: 1.6,
                    display: 'flex', alignItems: 'flex-start', paddingTop: '9px'
                  }}>{value}</div>
                </div>
              ))}

              {/* Parties */}
              {viewingAnalysis.analysis.parties?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid var(--color-border)', minHeight: '36px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '12px', borderLeft: '1px solid var(--color-border)', paddingTop: '10px' }}>الأطراف</div>
                  <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
                    {viewingAnalysis.analysis.parties.map((p: string, i: number) => (
                      <span key={i} style={{ padding: '1px 8px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '12px', color: 'var(--color-text)' }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {viewingAnalysis.analysis.keywords?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid var(--color-border)', minHeight: '36px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '12px', borderLeft: '1px solid var(--color-border)', paddingTop: '10px' }}>الكلمات المفتاحية</div>
                  <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
                    {viewingAnalysis.analysis.keywords.map((k: string, i: number) => (
                      <span key={i} style={{ padding: '1px 8px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Important Dates */}
              {viewingAnalysis.analysis.important_dates?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid var(--color-border)', minHeight: '36px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '12px', borderLeft: '1px solid var(--color-border)', paddingTop: '10px' }}>التواريخ المهمة</div>
                  <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
                    {viewingAnalysis.analysis.important_dates.map((d: string, i: number) => (
                      <span key={i} style={{ padding: '1px 8px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '12px', color: 'var(--color-text)' }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Case Relation */}
              {viewingAnalysis.analysis.case_relation?.case_summary && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: '1px solid var(--color-border)', minHeight: '36px' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '12px', borderLeft: '1px solid var(--color-border)', paddingTop: '10px' }}>علاقة بالقضية</div>
                  <div style={{ padding: '8px 12px', color: 'var(--color-text)', lineHeight: 1.6, fontSize: '13px' }}>
                    {viewingAnalysis.analysis.case_relation.case_summary}
                    {viewingAnalysis.analysis.case_relation.client_role && (
                      <div style={{ marginTop: '4px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        دور العميل: <strong style={{ color: 'var(--color-text)' }}>{viewingAnalysis.analysis.case_relation.client_role}</strong>
                        {' • '}
                        الصلة: <strong style={{ color: 'var(--color-text)' }}>{viewingAnalysis.analysis.case_relation.relevance}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setViewingAnalysis(null)}
                style={{
                  padding: '6px 18px',
                  backgroundColor: 'var(--color-primary)', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default CaseDocumentsModal;
