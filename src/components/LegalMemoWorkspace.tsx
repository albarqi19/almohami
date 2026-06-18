/**
 * LegalMemoWorkspace - واجهة إنشاء المذكرات القانونية بتصميم Notion
 * مكون متكامل يجمع بين محرر Yoopta المتقدم وأدوات المحامي الذكية
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Plus, Save, Brain, Upload, X, Check,
    ChevronLeft, ChevronRight, AlertCircle, Loader2,
    Clock, Cloud, CloudOff, Sparkles, Settings,
    FileUp, Trash2, Eye, Download, Link2, Zap, Info,
    HelpCircle
} from 'lucide-react';
import { useModalTour } from '../hooks/useModalTour';
import TiptapEditor from './TiptapEditor';
import type { TiptapEditorRef } from './TiptapEditor';
import LegalAIToolbarButton from './LegalAIToolbarButton';
import NotebookAssistantWidget from './NotebookAssistantWidget';
import AnalysisProgress from './AnalysisProgress';
import { LegalMemoService, type AnalysisStep } from '../services/legalMemoService';
import { runSingleAnalysis, ANALYSIS_ENGINES, type AnalysisEngineType, type MemoAnalysisResult } from '../services/memoAnalysisService';
import EngineResultView from './memo/EngineResultView';
import { isEngineResultV2 } from '../types/memoAnalysis';
import { convertToHTML, detectContentType } from '../utils/contentConverter';
import type { TextAnnotation } from '../types/textAnnotations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// تحديد المذكرات التي تتطلب وثائق مرفقة
const MEMO_DOCUMENT_REQUIREMENTS: Record<string, {
    required: boolean;
    description: string;
    suggestedDocs: string[];
}> = {
    // مذكرات تتطلب إرفاق الدعوى الأصلية للرد عليها
    response_to_claim: {
        required: true,
        description: 'يجب إرفاق صحيفة الدعوى للرد عليها',
        suggestedDocs: ['صحيفة الدعوى الأصلية', 'المستندات الداعمة للرد']
    },
    written_plea: {
        required: true,
        description: 'يجب إرفاق صحيفة الدعوى ومذكرات الخصم السابقة',
        suggestedDocs: ['صحيفة الدعوى', 'مذكرات الخصم', 'المستندات الداعمة']
    },
    counter_plea: {
        required: true,
        description: 'يجب إرفاق مذكرة الخصم التي ترد عليها',
        suggestedDocs: ['مذكرة الخصم السابقة', 'المستندات الجديدة']
    },

    // مذكرات الاستئناف والطعن - تتطلب الحكم المطعون عليه
    appeal_memo: {
        required: true,
        description: 'يجب إرفاق الحكم المستأنف وصحيفة الدعوى',
        suggestedDocs: ['صورة الحكم الابتدائي', 'صحيفة الدعوى', 'محاضر الجلسات']
    },
    reconsideration_request: {
        required: true,
        description: 'يجب إرفاق الحكم النهائي والمستندات الجديدة',
        suggestedDocs: ['الحكم النهائي', 'المستندات الجديدة الداعمة للالتماس']
    },
    cassation_appeal: {
        required: true,
        description: 'يجب إرفاق الحكم المطعون عليه وحكم الاستئناف',
        suggestedDocs: ['حكم الاستئناف', 'الحكم الابتدائي', 'صحيفة الدعوى']
    },

    // مذكرات التنفيذ - تتطلب السند التنفيذي
    execution_request: {
        required: true,
        description: 'يجب إرفاق السند التنفيذي (الحكم أو الورقة التجارية)',
        suggestedDocs: ['السند التنفيذي', 'إعلان السند للمنفذ ضده']
    },
    execution_objection: {
        required: true,
        description: 'يجب إرفاق أوراق التنفيذ وسبب الاعتراض',
        suggestedDocs: ['محضر التنفيذ', 'السند التنفيذي', 'مستندات الاعتراض']
    },
    execution_suspension: {
        required: true,
        description: 'يجب إرفاق السند التنفيذي وإثبات الضرر',
        suggestedDocs: ['السند التنفيذي', 'مستندات إثبات الضرر']
    },
    execution_dispute: {
        required: true,
        description: 'يجب إرفاق محضر التنفيذ ومستندات الإشكال',
        suggestedDocs: ['محضر التنفيذ', 'مستندات الإشكال']
    },

    // مذكرات لا تتطلب وثائق بالضرورة (ابتداء دعوى)
    claim_petition: {
        required: false,
        description: 'يفضل إرفاق المستندات الداعمة للدعوى',
        suggestedDocs: ['العقود', 'المستندات الداعمة للمطالبة']
    },
    formal_objection: {
        required: false,
        description: 'يفضل إرفاق ما يدعم الدفوع الشكلية',
        suggestedDocs: ['مستندات إثبات الدفع الشكلي']
    },
    substantive_objection: {
        required: false,
        description: 'يفضل إرفاق ما يدعم الدفوع الموضوعية',
        suggestedDocs: ['مستندات إثبات الدفع الموضوعي']
    },
    oath_request: {
        required: false,
        description: 'لا تتطلب مستندات، طلب توجيه اليمين للخصم',
        suggestedDocs: []
    },
    witness_hearing: {
        required: false,
        description: 'لا تتطلب مستندات، طلب سماع شهادة الشهود',
        suggestedDocs: []
    },
    expert_appointment: {
        required: false,
        description: 'يفضل إرفاق ما يوضح الحاجة للخبرة',
        suggestedDocs: ['مستندات فنية تحتاج لخبير']
    },
    party_intervention: {
        required: false,
        description: 'يفضل إرفاق ما يثبت علاقة الخصم الجديد',
        suggestedDocs: ['مستندات تثبت علاقة الخصم الجديد']
    },
    document_inspection: {
        required: false,
        description: 'لا تتطلب مستندات، طلب الاطلاع على مستندات الخصم',
        suggestedDocs: []
    },
    family_law_memo: {
        required: false,
        description: 'حسب نوع الدعوى قد تتطلب وثائق',
        suggestedDocs: ['عقد الزواج', 'شهادات الميلاد', 'المستندات ذات الصلة']
    },
    endowment_memo: {
        required: true,
        description: 'يجب إرفاق صك الوقف أو الوصية',
        suggestedDocs: ['صك الوقف', 'الوصية', 'حجج الإثبات']
    },
    criminal_law_memo: {
        required: true,
        description: 'يجب إرفاق قرار الاتهام والأدلة',
        suggestedDocs: ['قرار الاتهام', 'المحاضر', 'أدلة الدفاع']
    },
    commercial_memo: {
        required: false,
        description: 'يفضل إرفاق العقود والفواتير التجارية',
        suggestedDocs: ['العقود التجارية', 'الفواتير', 'المراسلات']
    },
    labor_memo: {
        required: false,
        description: 'يفضل إرفاق عقد العمل والمستندات ذات الصلة',
        suggestedDocs: ['عقد العمل', 'كشوف الراتب', 'قرارات الفصل']
    },
    other: {
        required: false,
        description: 'حسب نوع المذكرة',
        suggestedDocs: []
    }
};

// أنواع المذكرات مرتبة حسب الفئات
const MEMO_CATEGORIES = {
    opening: {
        name: 'مذكرات افتتاحية',
        icon: '📜',
        color: '#3b82f6',
        types: {
            claim_petition: 'صحيفة دعوى',
            response_to_claim: 'مذكرة رد على صحيفة دعوى',
        }
    },
    pleading: {
        name: 'مذكرات المرافعة',
        icon: '⚖️',
        color: '#8b5cf6',
        types: {
            written_plea: 'مذكرة جوابية (مرافعة مكتوبة)',
            counter_plea: 'مذكرة تعقيبية',
            formal_objection: 'مذكرة بدفوع شكلية',
            substantive_objection: 'مذكرة بدفوع موضوعية',
        }
    },
    evidence: {
        name: 'مذكرات الإثبات والطلبات',
        icon: '🔍',
        color: '#10b981',
        types: {
            oath_request: 'مذكرة بطلب توجيه اليمين',
            witness_hearing: 'مذكرة بطلب سماع شهادة الشهود',
            expert_appointment: 'مذكرة بطلب ندب خبير أو محاسب',
            party_intervention: 'مذكرة بطلب إدخال خصم جديد',
            document_inspection: 'مذكرة بطلب الاطلاع على المستندات',
        }
    },
    appeal: {
        name: 'مذكرات الأحكام والطعن',
        icon: '🏛️',
        color: '#f59e0b',
        types: {
            appeal_memo: 'مذكرة استئناف (لائحة اعتراضية)',
            reconsideration_request: 'مذكرة التماس إعادة النظر',
            cassation_appeal: 'مذكرة نقض (طعن أمام المحكمة العليا)',
        }
    },
    execution: {
        name: 'مذكرات التنفيذ',
        icon: '⚡',
        color: '#ef4444',
        types: {
            execution_request: 'مذكرة بطلب تنفيذ حكم أو سند تنفيذي',
            execution_objection: 'مذكرة اعتراض على إجراءات التنفيذ',
            execution_suspension: 'مذكرة بطلب وقف التنفيذ',
            execution_dispute: 'مذكرة إشكال في التنفيذ (إشكال وقتي)',
        }
    },
    specialized: {
        name: 'مذكرات خاصة',
        icon: '📋',
        color: '#6366f1',
        types: {
            family_law_memo: 'مذكرة في دعاوى الأحوال الشخصية',
            endowment_memo: 'مذكرة في دعاوى الوقف والوصايا',
            criminal_law_memo: 'مذكرة في دعاوى الحدود والتعزيرات',
            commercial_memo: 'مذكرة في القضايا التجارية',
            labor_memo: 'مذكرة في القضايا العمالية',
            other: 'مذكرة أخرى',
        }
    }
};

interface LegalMemoWorkspaceProps {
    isOpen: boolean;
    onClose: () => void;
    caseId?: string;
    caseTitle?: string;
    caseNumber?: string;
    onMemoCreated?: (memo: any) => void;
    editingMemo?: any;
}

const LegalMemoWorkspace: React.FC<LegalMemoWorkspaceProps> = ({
    isOpen,
    onClose,
    caseId,
    caseTitle,
    caseNumber,
    onMemoCreated,
    editingMemo
}) => {
    const { startTour, hasTour } = useModalTour('modal:legal-memo', isOpen);

    // الخطوة الحالية: اختيار النوع أو التحرير
    const [step, setStep] = useState<'select_type' | 'editor'>('select_type');

    // نوع المذكرة
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedMemoType, setSelectedMemoType] = useState<string>('');

    // بيانات المذكرة
    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    // حالة الحفظ
    const [saving, setSaving] = useState<boolean>(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [savedMemoId, setSavedMemoId] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // حالة التحليل الذكي
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [showAnalysisPanel, setShowAnalysisPanel] = useState<boolean>(false);
    const [showAnalysisMenu, setShowAnalysisMenu] = useState<boolean>(false);
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
    const [isAssistantVisible, setIsAssistantVisible] = useState(true);

    // الأخطاء والتحميل
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Sidebar
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

    // المراجع
    const editorRef = useRef<TiptapEditorRef>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingChangesRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const analysisMenuRef = useRef<HTMLDivElement>(null);
    const [editorKey, setEditorKey] = useState(0);

    // الحصول على متطلبات الوثائق للمذكرة الحالية
    const getDocumentRequirements = () => {
        return MEMO_DOCUMENT_REQUIREMENTS[selectedMemoType] || {
            required: false,
            description: '',
            suggestedDocs: []
        };
    };

    // تحميل بيانات المذكرة للتعديل
    useEffect(() => {
        if (isOpen && editingMemo) {
            loadMemoForEditing(editingMemo);
        }
    }, [isOpen, editingMemo]);

    // تنظيف عند الإغلاق
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    // تنظيف المؤقت عند إلغاء المكون
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Debug: track textAnnotations state changes
    useEffect(() => {
        console.log('[LegalMemoWorkspace] textAnnotations state changed, count:', textAnnotations.length);
    }, [textAnnotations]);

    // الحفظ التلقائي - ينشئ مسودة أولاً ثم يحدثها
    const performAutoSave = useCallback(async () => {
        if (!pendingChangesRef.current) return;
        if (!selectedMemoType || !selectedCategory) return;

        const editorContent = editorRef.current?.getContent();
        const contentText = editorRef.current?.getAllText?.() || '';
        const contentHtml = editorRef.current?.getHTML?.() || '';

        // لا نحفظ إذا المحتوى فارغ تماماً
        if (!contentText.trim() && !title.trim()) return;

        setSaving(true);
        try {
            if (savedMemoId) {
                // تحديث مذكرة موجودة - الحفظ التلقائي يحفظ المحتوى فقط
                await LegalMemoService.autoSaveMemo(savedMemoId.toString(), {
                    content: contentHtml,
                    formatting_data: editorContent
                });
            } else {
                // إنشاء مسودة جديدة تلقائياً
                const memoData = {
                    title: title.trim() || `مسودة - ${getMemoTypeName()}`,
                    content: contentHtml,
                    memo_type: selectedMemoType,
                    category: selectedCategory,
                    case_id: caseId || undefined,
                    formatting_data: editorContent,
                    is_draft: true
                };
                const newMemo = await LegalMemoService.createMemo(memoData);
                setSavedMemoId(Number(newMemo.id));
            }
            setLastSaved(new Date());
            pendingChangesRef.current = false;
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Auto-save failed:', error);
        } finally {
            setSaving(false);
        }
    }, [savedMemoId, selectedMemoType, selectedCategory, title, caseId]);

    // تشغيل الحفظ التلقائي - يعمل دائماً (يُنشئ مسودة إذا لم تكن موجودة)
    const triggerAutoSave = useCallback(() => {
        pendingChangesRef.current = true;
        setHasUnsavedChanges(true);

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // الحفظ التلقائي بعد ثانيتين من آخر تغيير
        autoSaveTimerRef.current = setTimeout(() => {
            performAutoSave();
        }, 2000);
    }, [performAutoSave]);

    // إعادة تعيين النموذج
    const resetForm = () => {
        setStep('select_type');
        setSelectedCategory('');
        setSelectedMemoType('');
        setTitle('');
        setContent('');
        setUploadedFiles([]);
        setSavedMemoId(null);
        setLastSaved(null);
        setHasUnsavedChanges(false);
        setAnalysisResult(null);
        setShowAnalysisPanel(false);
        setError(null);
        setTextAnnotations([]);
        setIsAssistantVisible(true);
        setEditorKey(prev => prev + 1);
    };

    // تحميل مذكرة للتعديل - مع دعم المحتوى القديم (Yoopta) والجديد (HTML)
    const loadMemoForEditing = (memo: any) => {
        setSelectedCategory(memo.category);
        setSelectedMemoType(memo.memo_type);
        setTitle(memo.title);
        setSavedMemoId(memo.id);
        setLastSaved(memo.updated_at ? new Date(memo.updated_at) : null);

        // تحويل المحتوى - يدعم Yoopta القديم و HTML الجديد
        let htmlContent = '';
        try {
            // أولاً: حاول استخدام formatting_data (قد يكون Yoopta JSON قديم)
            if (memo.formatting_data) {
                const rawContent = typeof memo.formatting_data === 'string'
                    ? memo.formatting_data
                    : JSON.stringify(memo.formatting_data);

                const contentType = detectContentType(rawContent);
                console.log('[LegalMemoWorkspace] formatting_data content type:', contentType);

                if (contentType === 'yoopta') {
                    htmlContent = convertToHTML(rawContent);
                    console.log('[LegalMemoWorkspace] Converted from Yoopta formatting_data to HTML');
                } else if (contentType === 'html') {
                    htmlContent = rawContent;
                } else {
                    // fallback to content field
                    htmlContent = convertToHTML(memo.content || '');
                }
            } else if (memo.content) {
                // استخدم content field مباشرة
                const contentType = detectContentType(memo.content);
                console.log('[LegalMemoWorkspace] content field type:', contentType);

                if (contentType === 'yoopta') {
                    htmlContent = convertToHTML(memo.content);
                    console.log('[LegalMemoWorkspace] Converted from Yoopta content to HTML');
                } else if (contentType === 'html') {
                    htmlContent = memo.content;
                } else {
                    // نص عادي
                    htmlContent = `<p dir="rtl" style="text-align: right">${memo.content}</p>`;
                }
            }
        } catch (e) {
            console.error('[LegalMemoWorkspace] Error parsing memo content:', e);
            htmlContent = `<p dir="rtl" style="text-align: right">${memo.content || ''}</p>`;
        }

        setContent(htmlContent);
        setEditorKey(prev => prev + 1);
        setTextAnnotations([]);
        setIsAssistantVisible(true);

        if (memo.analysis_result) {
            const savedAnalysis = typeof memo.analysis_result === 'string'
                ? JSON.parse(memo.analysis_result)
                : memo.analysis_result;
            setAnalysisResult(savedAnalysis);
            if (savedAnalysis.analyzedAt) {
                setLastAnalyzedAt(new Date(savedAnalysis.analyzedAt));
            }
        }

        setStep('editor');
    };

    // اختيار نوع المذكرة
    const handleMemoTypeSelect = (category: string, memoType: string) => {
        setSelectedCategory(category);
        setSelectedMemoType(memoType);

        // تعيين عنوان افتراضي
        const categoryData = MEMO_CATEGORIES[category as keyof typeof MEMO_CATEGORIES];
        const typeName = categoryData?.types[memoType as keyof typeof categoryData.types];
        setTitle(`${typeName}${caseTitle ? ` - ${caseTitle}` : ''}`);

        setStep('editor');
        setTextAnnotations([]);
        setIsAssistantVisible(true);
    };

    // حفظ المذكرة
    const handleSave = async () => {
        if (!title.trim()) {
            setError('يرجى إدخال عنوان للمذكرة');
            return;
        }

        // التحقق من الوثائق المطلوبة
        const docReqs = getDocumentRequirements();
        if (docReqs.required && uploadedFiles.length === 0) {
            setError(`⚠️ ${docReqs.description}`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const editorContent = editorRef.current?.getContent();
            const contentHtml = editorRef.current?.getHTML() || '';

            let memo;

            if (uploadedFiles.length > 0) {
                const formData = new FormData();
                uploadedFiles.forEach(file => {
                    formData.append('files[]', file);
                });
                formData.append('case_id', caseId || '');
                formData.append('title', title.trim());
                formData.append('content', contentHtml);
                formData.append('memo_type', selectedMemoType);
                formData.append('category', selectedCategory);
                formData.append('formatting_data', JSON.stringify(editorContent));

                if (savedMemoId && editingMemo) {
                    memo = await LegalMemoService.updateMemoWithFiles(savedMemoId.toString(), formData);
                } else {
                    memo = await LegalMemoService.createMemoWithFiles(formData);
                    setSavedMemoId(Number(memo.id));
                }
            } else {
                const memoData = {
                    title: title.trim(),
                    content: contentHtml,
                    memo_type: selectedMemoType,
                    category: selectedCategory,
                    case_id: caseId || undefined,
                    formatting_data: editorContent
                };

                if (savedMemoId && editingMemo) {
                    memo = await LegalMemoService.updateMemo(savedMemoId.toString(), memoData);
                } else {
                    memo = await LegalMemoService.createMemo(memoData);
                    setSavedMemoId(Number(memo.id));
                }
            }

            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            pendingChangesRef.current = false;

            if (onMemoCreated) {
                onMemoCreated(memo);
            }
        } catch (error: any) {
            setError(error.message || 'فشل في حفظ المذكرة');
        } finally {
            setLoading(false);
        }
    };

    // التحليل الذكي - تحليل واحد حسب الاختيار
    const handleSingleAnalysis = async (engineType: AnalysisEngineType) => {
        const memoContent = editorRef.current?.getAllText?.() || '';

        if (!memoContent.trim()) {
            setError('يرجى كتابة محتوى في المذكرة قبل التحليل');
            return;
        }

        setShowAnalysisMenu(false);
        setIsAnalyzing(true);
        setShowAnalysisPanel(true);
        setError(null);

        const engineInfo = ANALYSIS_ENGINES[engineType];
        setAnalysisSteps([{
            id: engineType,
            title: `${engineInfo.icon} ${engineInfo.name}`,
            status: 'loading',
            message: 'جاري التحليل...'
        }]);

        try {
            const result = await runSingleAnalysis(
                selectedMemoType,
                memoContent,
                engineType
            );

            // تحديث الخطوة النهائية
            setAnalysisSteps([{
                id: engineType,
                title: `${result.icon} ${result.engineName}`,
                status: result.success ? 'completed' : 'error',
                message: result.success ? 'تم التحليل بنجاح' : 'حدث خطأ'
            }]);

            const now = new Date();
            const newAnalysisResult = {
                ...analysisResult,
                [engineType]: result,
                memoType: selectedMemoType,
                memoTypeName: getMemoTypeName(),
                analyzedAt: now.toISOString(),
                lastEngine: engineType
            };

            setAnalysisResult(newAnalysisResult);
            setLastAnalyzedAt(now);

            // حفظ التحليل مع المذكرة
            if (savedMemoId) {
                try {
                    await LegalMemoService.updateMemo(savedMemoId.toString(), {
                        analysis_result: newAnalysisResult
                    });
                } catch (e) {
                    console.warn('Failed to save analysis result:', e);
                }
            }
        } catch (error: any) {
            setError(error.message || 'فشل في إجراء التحليل');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // إغلاق قائمة التحليل عند النقر خارجها
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (analysisMenuRef.current && !analysisMenuRef.current.contains(event.target as Node)) {
                setShowAnalysisMenu(false);
            }
        };
        if (showAnalysisMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAnalysisMenu]);

    // رفع الملفات
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setUploadedFiles(prev => [...prev, ...Array.from(files)]);
            setHasUnsavedChanges(true);
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // تغيير المحتوى - الآن يستقبل HTML string
    const handleContentChange = (value: string) => {
        setContent(value);
        triggerAutoSave();
    };

    // تغيير العنوان
    const handleTitleChange = (value: string) => {
        setTitle(value);
        triggerAutoSave();
    };

    // الحصول على اسم النوع
    const getMemoTypeName = () => {
        if (!selectedCategory || !selectedMemoType) return '';
        const category = MEMO_CATEGORIES[selectedCategory as keyof typeof MEMO_CATEGORIES];
        return category?.types[selectedMemoType as keyof typeof category.types] || '';
    };

    // تنسيق وقت الحفظ
    const formatLastSaved = () => {
        if (!lastSaved) return '';
        return lastSaved.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    const docReqs = getDocumentRequirements();

    return (
        <AnimatePresence>
            <motion.div
                className="legal-memo-workspace-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={`legal-memo-workspace ${step === 'select_type' ? 'erp-mode' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* شريط الأدوات العلوي */}
                    <header className="lmw-header">
                        <div className="lmw-header-right">
                            <button className="lmw-close-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                            {hasTour && (
                                <button
                                    data-tour="memo-help-btn"
                                    className="lmw-close-btn"
                                    onClick={startTour}
                                    title="جولة تعريفية"
                                    aria-label="جولة تعريفية"
                                >
                                    <HelpCircle size={20} />
                                </button>
                            )}
                            <div className="lmw-breadcrumb">
                                <span className="lmw-breadcrumb-case">{caseNumber || 'قضية'}</span>
                                <ChevronLeft size={14} />
                                <span className="lmw-breadcrumb-current">
                                    {editingMemo ? 'تعديل مذكرة' : 'إنشاء مذكرة'}
                                </span>
                            </div>
                            {step === 'editor' && (
                                <input
                                    type="text"
                                    data-tour="memo-title"
                                    className="lmw-title-input-header"
                                    placeholder="عنوان المذكرة..."
                                    value={title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                />
                            )}
                        </div>

                        <div className="lmw-header-left">
                            {/* حالة الحفظ */}
                            <div className="lmw-save-status">
                                {saving ? (
                                    <>
                                        <div className="lmw-spinner" />
                                        <span>جاري الحفظ...</span>
                                    </>
                                ) : lastSaved ? (
                                    <>
                                        <Cloud size={14} />
                                        <span>تم الحفظ {formatLastSaved()}</span>
                                    </>
                                ) : hasUnsavedChanges ? (
                                    <>
                                        <CloudOff size={14} />
                                        <span>غير محفوظ</span>
                                    </>
                                ) : null}
                            </div>

                            {step === 'editor' && (
                                <>
                                    {/* أدوات المحامي - داخل div بـ position relative */}
                                    <div className="lmw-ai-tools-wrapper">
                                        <LegalAIToolbarButton
                                            onSelectText={() => {
                                                const selection = window.getSelection();
                                                if (selection && selection.toString().trim()) {
                                                    return selection.toString().trim();
                                                }
                                                return null;
                                            }}
                                            onGetAllText={() => {
                                                return editorRef.current?.getAllText?.() || null;
                                            }}
                                            onReplaceText={(newText: string) => {
                                                editorRef.current?.replaceSelectedText?.(newText);
                                            }}
                                            onReplaceAllText={(newText: string) => {
                                                editorRef.current?.replaceAllText?.(newText);
                                            }}
                                            onSetTextAnnotations={(annotations) => {
                                                console.log('[LegalMemoWorkspace] setTextAnnotations called with', annotations.length, 'annotations');
                                                setTextAnnotations(annotations);
                                            }}
                                            source="memo"
                                            memoType={selectedMemoType || undefined}
                                        />
                                    </div>

                                    {/* قائمة التحليل الذكي */}
                                    <div className="lmw-analysis-dropdown-wrapper" ref={analysisMenuRef} data-tour="memo-analysis">
                                        <button
                                            className={`lmw-btn lmw-btn-analysis ${showAnalysisMenu ? 'active' : ''}`}
                                            onClick={() => setShowAnalysisMenu(!showAnalysisMenu)}
                                            disabled={isAnalyzing}
                                            title="اختر نوع التحليل"
                                        >
                                            {isAnalyzing ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Zap size={16} />
                                            )}
                                            <span>التحليل الذكي</span>
                                            <ChevronRight size={12} className={showAnalysisMenu ? 'rotated' : ''} />
                                        </button>

                                        {showAnalysisMenu && (
                                            <div className="lmw-analysis-menu">
                                                <div className="lmw-analysis-menu-header">اختر نوع التحليل</div>
                                                {Object.entries(ANALYSIS_ENGINES).map(([key, engine]) => (
                                                    <button
                                                        key={key}
                                                        className="lmw-analysis-menu-item"
                                                        onClick={() => handleSingleAnalysis(key as AnalysisEngineType)}
                                                    >
                                                        <span className="lmw-analysis-icon">{engine.icon}</span>
                                                        <div className="lmw-analysis-info">
                                                            <div className="lmw-analysis-name">{engine.name}</div>
                                                            <div className="lmw-analysis-desc">{engine.description}</div>
                                                        </div>
                                                        {analysisResult?.[key] && (
                                                            <Check size={14} className="lmw-analysis-done" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* زر الحفظ */}
                                    <button
                                        data-tour="memo-save"
                                        className={`lmw-btn lmw-btn-save ${hasUnsavedChanges ? 'has-changes' : ''}`}
                                        onClick={handleSave}
                                        disabled={loading || !title.trim()}
                                    >
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : savedMemoId && !hasUnsavedChanges ? (
                                            <Check size={16} />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        <span>
                                            {loading ? 'جاري الحفظ...' :
                                                savedMemoId && !hasUnsavedChanges ? 'تم الحفظ' :
                                                    'حفظ'}
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    {/* المحتوى الرئيسي */}
                    <div className="lmw-content">
                        {step === 'select_type' ? (
                            /* اختيار نوع المذكرة */
                            <div className="lmw-type-selector" data-tour="memo-types">
                                <div className="lmw-type-header">
                                    <FileText size={32} />
                                    <h2>إنشاء مذكرة قانونية</h2>
                                    <p>اختر نوع المذكرة التي تريد إنشاءها</p>
                                    {caseTitle && (
                                        <div className="lmw-case-badge">
                                            <Link2 size={14} />
                                            <span>مرتبطة بقضية: {caseTitle}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="lmw-categories-grid">
                                    {Object.entries(MEMO_CATEGORIES).map(([key, category]) => (
                                        <div key={key} className="lmw-category-card">
                                            <div
                                                className="lmw-category-header"
                                                style={{ borderColor: category.color }}
                                            >
                                                <span className="lmw-category-icon">{category.icon}</span>
                                                <span className="lmw-category-name">{category.name}</span>
                                            </div>
                                            <div className="lmw-category-types">
                                                {Object.entries(category.types).map(([typeKey, typeName]) => (
                                                    <button
                                                        key={typeKey}
                                                        className="lmw-type-btn"
                                                        onClick={() => handleMemoTypeSelect(key, typeKey)}
                                                    >
                                                        <ChevronLeft size={14} />
                                                        <span>{typeName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* المحرر */
                            <div className="lmw-editor-layout">
                                {/* Sidebar */}
                                <aside className={`lmw-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} data-tour="memo-sidebar">
                                    <button
                                        className="lmw-sidebar-toggle"
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    >
                                        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                    </button>

                                    {!sidebarCollapsed && (
                                        <>
                                            {/* معلومات المذكرة */}
                                            <div className="lmw-sidebar-section">
                                                <h4>نوع المذكرة</h4>
                                                <div className="lmw-memo-type-badge">
                                                    <span>{MEMO_CATEGORIES[selectedCategory as keyof typeof MEMO_CATEGORIES]?.icon}</span>
                                                    <span>{getMemoTypeName()}</span>
                                                </div>
                                                <button
                                                    className="lmw-change-type-btn"
                                                    onClick={() => setStep('select_type')}
                                                >
                                                    تغيير النوع
                                                </button>
                                            </div>

                                            {/* متطلبات الوثائق */}
                                            <div className={`lmw-sidebar-section lmw-doc-requirements ${docReqs.required ? 'required' : 'optional'}`}>
                                                <h4>
                                                    <FileUp size={14} />
                                                    الوثائق المطلوبة
                                                    {docReqs.required && <span className="lmw-required-badge">إلزامي</span>}
                                                </h4>

                                                {/* توضيح المتطلبات */}
                                                <div className="lmw-doc-hint">
                                                    <Info size={14} />
                                                    <span>{docReqs.description}</span>
                                                </div>

                                                {/* الوثائق المقترحة */}
                                                {docReqs.suggestedDocs.length > 0 && (
                                                    <div className="lmw-suggested-docs">
                                                        <small>الوثائق المقترحة:</small>
                                                        <ul>
                                                            {docReqs.suggestedDocs.map((doc, i) => (
                                                                <li key={i}>{doc}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div
                                                    className="lmw-upload-zone"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Upload size={20} />
                                                    <span>اضغط لرفع الملفات</span>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                                        onChange={handleFileUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                </div>

                                                {uploadedFiles.length > 0 && (
                                                    <div className="lmw-files-list">
                                                        {uploadedFiles.map((file, index) => (
                                                            <div key={index} className="lmw-file-item">
                                                                <FileText size={14} />
                                                                <span className="lmw-file-name">{file.name}</span>
                                                                <button
                                                                    className="lmw-file-remove"
                                                                    onClick={() => removeFile(index)}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {docReqs.required && uploadedFiles.length === 0 && (
                                                    <div className="lmw-doc-warning">
                                                        <AlertCircle size={14} />
                                                        <span>لم ترفق الوثائق المطلوبة بعد</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* نتائج التحليل المحفوظة */}
                                            {analysisResult && Object.keys(analysisResult).some(k =>
                                                ['gatekeeper', 'brain', 'opponent', 'polish', 'compliance'].includes(k)
                                            ) && (
                                                    <div className="lmw-sidebar-section lmw-analysis-section">
                                                        <h4>
                                                            <Sparkles size={14} />
                                                            نتائج التحليل
                                                        </h4>

                                                        {/* قائمة التحليلات المكتملة */}
                                                        <div className="lmw-saved-analyses">
                                                            {Object.entries(ANALYSIS_ENGINES).map(([key, engine]) => {
                                                                const savedEngine = analysisResult[key];
                                                                if (!savedEngine) return null;
                                                                return (
                                                                    <div key={key} className="lmw-saved-analysis-item">
                                                                        <span className="lmw-saved-icon">{engine.icon}</span>
                                                                        <span className="lmw-saved-name">{engine.name}</span>
                                                                        <Check size={12} className="lmw-saved-check" />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* آخر تحليل */}
                                                        {lastAnalyzedAt && (
                                                            <div className="lmw-last-analyzed">
                                                                <Clock size={12} />
                                                                <span>آخر تحليل: {lastAnalyzedAt.toLocaleDateString('ar-SA')} {lastAnalyzedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        )}

                                                        <button
                                                            className="lmw-view-full-analysis"
                                                            onClick={() => setShowAnalysisPanel(true)}
                                                        >
                                                            <Eye size={14} />
                                                            عرض التحليل الكامل
                                                        </button>
                                                    </div>
                                                )}
                                        </>
                                    )}
                                </aside>

                                {/* منطقة المحرر */}
                                <div className="lmw-main-editor-wrapper">
                                    <main className="lmw-main-editor">
                                        {/* رسائل الخطأ */}
                                        {error && (
                                            <div className="lmw-error-banner">
                                                <AlertCircle size={16} />
                                                <span>{error}</span>
                                                <button onClick={() => setError(null)}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {/* المحرر - TiptapEditor */}
                                        <div className="lmw-editor-container">
                                            <TiptapEditor
                                                key={editorKey}
                                                ref={editorRef}
                                                content={content}
                                                onChange={handleContentChange}
                                                autoFocus={true}
                                                placeholder="اكتب محتوى المذكرة هنا..."
                                                minHeight="calc(100vh - 300px)"
                                                textAnnotations={textAnnotations}
                                                onApplyAnnotation={(annotationId) => {
                                                    // Remove the applied annotation from the list
                                                    setTextAnnotations(prev => prev.filter(a => a.id !== annotationId));
                                                }}
                                            />
                                        </div>
                                    </main>

                                    {/* شريط اسألني - ثابت أسفل المحرر */}
                                    <NotebookAssistantWidget
                                        isVisible={isAssistantVisible}
                                        getDocumentText={() => editorRef.current?.getAllText?.() || null}
                                        getDocumentBlocksJson={() => editorRef.current?.getContent?.() || null}
                                        onSetTextAnnotations={(annotations) => {
                                            setTextAnnotations(annotations);
                                        }}
                                        onRequestClose={() => setIsAssistantVisible(false)}
                                    />
                                </div>

                                {/* لوحة التحليل الكامل */}
                                <AnimatePresence>
                                    {showAnalysisPanel && analysisResult && (
                                        <motion.aside
                                            className="lmw-analysis-panel"
                                            initial={{ x: -320, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -320, opacity: 0 }}
                                        >
                                            <div className="lmw-analysis-header">
                                                <h3>
                                                    <Zap size={18} />
                                                    نتائج التحليل
                                                </h3>
                                                <button onClick={() => setShowAnalysisPanel(false)}>
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="lmw-analysis-content">
                                                {/* معلومات المذكرة */}
                                                <div className="lmw-analysis-meta">
                                                    <span className="lmw-analysis-badge">
                                                        📄 {analysisResult.memoTypeName || getMemoTypeName()}
                                                    </span>
                                                    {lastAnalyzedAt && (
                                                        <span className="lmw-analysis-time">
                                                            🕐 {lastAnalyzedAt.toLocaleDateString('ar-SA')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* نتائج المحركات المحفوظة */}
                                                {Object.entries(ANALYSIS_ENGINES).map(([key, engine]) => {
                                                    const savedResult = analysisResult[key];
                                                    if (!savedResult) return null;
                                                    return (
                                                        <details
                                                            key={key}
                                                            className={`lmw-engine-block ${savedResult.success ? 'success' : 'error'}`}
                                                            open={analysisResult.lastEngine === key}
                                                        >
                                                            <summary className="lmw-engine-header">
                                                                <span className="lmw-engine-icon">{engine.icon}</span>
                                                                <span className="lmw-engine-name">{engine.name}</span>
                                                                <span className={`lmw-engine-status ${savedResult.success ? 'success' : 'error'}`}>
                                                                    {savedResult.success ? '✓' : '✗'}
                                                                </span>
                                                            </summary>
                                                            <div className="lmw-engine-content">
                                                                {/* عرض v2 المنظّم إن توفّر؛ وإلا fallback عكوس لـMarkdown (التحاليل القديمة/الطوارئ) */}
                                                                {isEngineResultV2(savedResult.data) ? (
                                                                    <EngineResultView
                                                                        result={savedResult.data}
                                                                        onApplySuggestion={(suggested, original) => {
                                                                            if (!suggested) return;
                                                                            setTextAnnotations(prev => [
                                                                                ...prev,
                                                                                {
                                                                                    id: `mev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                                                                    original_text: original ?? '',
                                                                                    suggested_text: suggested,
                                                                                },
                                                                            ]);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="lmw-markdown-content" dir="rtl">
                                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                            {savedResult.result}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    );
                                                })}

                                                {/* رسالة إذا لا توجد تحليلات */}
                                                {!Object.keys(analysisResult).some(k =>
                                                    ['gatekeeper', 'brain', 'opponent', 'polish', 'compliance'].includes(k)
                                                ) && (
                                                        <div className="lmw-no-analysis">
                                                            <p>لا توجد تحليلات بعد. اختر نوع التحليل من القائمة 🧠</p>
                                                        </div>
                                                    )}
                                            </div>
                                        </motion.aside>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* واجهة خطوات التحليل */}
                    <AnalysisProgress steps={analysisSteps} isVisible={isAnalyzing} />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LegalMemoWorkspace;
