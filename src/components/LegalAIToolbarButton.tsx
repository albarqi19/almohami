/**
 * قائمة أدوات الذكاء الاصطناعي للمحامي
 * Legal AI Tools Menu Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LegalAIToolInfo, LegalAIResponse } from '../services/legalAIService';
import {
  LEGAL_AI_TOOLS,
  processLegalAIRequest
} from '../services/legalAIService';

import type { TextAnnotation, TextAnnotationSeverity } from '../types/textAnnotations';

import { 
  Sparkles, 
  ChevronDown, 
  ChevronLeft,
  X,
  Loader2,
  Check,
  RefreshCw,
  Copy,
  Replace,
  AlertCircle
} from 'lucide-react';

interface LegalAIToolbarButtonProps {
  onSelectText: () => string | null;
  onGetAllText: () => string | null;
  onReplaceText: (newText: string) => void;
  onReplaceAllText?: (newText: string) => void; // إضافة دالة لاستبدال كل المحتوى
  disabled?: boolean;
  onSetTextAnnotations?: (annotations: TextAnnotation[]) => void;
}

interface AIResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: LegalAIResponse | null;
  selectedText: string;
  toolInfo: LegalAIToolInfo | null;
  isLoading: boolean;
  onReplace: (text: string) => void;
  onRetry: () => void;
  isFullContent: boolean; // إضافة flag لمعرفة إذا كان تحليل للمستند كامل
  onReplaceAllText?: (text: string) => void; // لاستبدال المستند كامل
}

// نافذة عرض نتائج AI
const AIResultModal: React.FC<AIResultModalProps> = ({
  isOpen,
  onClose,
  result,
  selectedText,
  toolInfo,
  isLoading,
  onReplace,
  isFullContent,
  onRetry,
  onReplaceAllText
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // دالة لتنظيف النص من رموز markdown
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // إزالة **bold**
      .replace(/\*(.*?)\*/g, '$1')     // إزالة *italic*
      .replace(/#{1,6}\s/g, '')         // إزالة headers
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // إزالة code blocks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // إزالة links
      .replace(/^\s*[-*+]\s/gm, '')     // إزالة bullet points
      .replace(/^\s*\d+\.\s/gm, '')     // إزالة numbered lists
      .trim();
  };

  const handleCopy = async () => {
    if (result?.result) {
      // نسخ النص نظيف بدون رموز markdown
      const cleanText = stripMarkdown(result.result);
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplace = () => {
    if (result?.result) {
      // استبدال النص نظيف
      const cleanText = stripMarkdown(result.result);
      if (isFullContent && onReplaceAllText) {
        onReplaceAllText(cleanText);
      } else {
        onReplace(cleanText);
      }
      onClose();
    }
  };

  return createPortal(
    <div className="legal-ai-modal-overlay" onClick={onClose}>
      <div 
        className="legal-ai-result-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="legal-ai-modal-header">
          <div className="legal-ai-modal-title">
            {toolInfo && <span>{toolInfo.icon}</span>}
            <span>{toolInfo?.nameAr || 'معالجة AI'}</span>
          </div>
          <button className="legal-ai-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="legal-ai-modal-body">
          {/* النص الأصلي */}
          <div className="legal-ai-section">
            <div className="legal-ai-label">النص الأصلي</div>
            <div className="legal-ai-original-box">
              {selectedText}
            </div>
          </div>

          {/* حالة التحميل */}
          {isLoading && (
            <div className="legal-ai-loading">
              <Loader2 className="legal-ai-spin" size={20} />
              <span>جارٍ المعالجة...</span>
            </div>
          )}

          {/* الخطأ */}
          {result && !result.success && !isLoading && (
            <div className="legal-ai-error">
              <AlertCircle size={16} />
              <span>{result.error}</span>
            </div>
          )}

          {/* النتيجة */}
          {result?.success && result.result && !isLoading && (
            <div className="legal-ai-section">
              <div className="legal-ai-label">النتيجة</div>
              <div className="legal-ai-result-box legal-ai-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.result}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="legal-ai-modal-footer">
          {result?.success && !isLoading && (
            <>
              <button className="legal-ai-action-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'تم' : 'نسخ'}</span>
              </button>
              <button className="legal-ai-action-btn" onClick={onRetry}>
                <RefreshCw size={14} />
                <span>إعادة</span>
              </button>
              <button className="legal-ai-action-btn primary" onClick={handleReplace}>
                <Replace size={14} />
                <span>{isFullContent ? 'استبدال الكل' : 'استبدال'}</span>
              </button>
            </>
          )}
          {result && !result.success && !isLoading && (
            <button className="legal-ai-action-btn primary" onClick={onRetry}>
              <RefreshCw size={14} />
              <span>إعادة المحاولة</span>
            </button>
          )}
          <button className="legal-ai-action-btn" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// المكون الرئيسي
const LegalAIToolbarButton: React.FC<LegalAIToolbarButtonProps> = ({
  onSelectText,
  onGetAllText,
  onReplaceText,
  onReplaceAllText,
  disabled = false,
  onSetTextAnnotations
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<LegalAIResponse | null>(null);
  const [currentTool, setCurrentTool] = useState<LegalAIToolInfo | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isFullContent, setIsFullContent] = useState(false); // تتبع ما إذا كان تحليل للمستند كامل
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
        setExpandedCategory(null);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const categories = {
    formalization: {
      nameAr: 'تحسين الصياغة',
      icon: '✍️',
      tools: LEGAL_AI_TOOLS.filter(t => t.category === 'formalization')
    },
    analysis: {
      nameAr: 'التحليل القانوني',
      icon: '🔬',
      tools: LEGAL_AI_TOOLS.filter(t => t.category === 'analysis')
    },
    summary: {
      nameAr: 'التلخيص',
      icon: '📄',
      tools: LEGAL_AI_TOOLS.filter(t => t.category === 'summary')
    },
    creative: {
      nameAr: 'الدعم الابتكاري',
      icon: '💡',
      tools: LEGAL_AI_TOOLS.filter(t => t.category === 'creative')
    }
  };

  const handleToolClick = async (tool: LegalAIToolInfo) => {
    // حاول الحصول على النص المحدد
    let text = onSelectText();
    const isFullDoc = !text?.trim();
    
    if (isFullDoc) {
      text = onGetAllText();
    }
    
    if (!text?.trim()) {
      alert('المحرر فارغ. يرجى كتابة نص أولاً');
      return;
    }

    const parseAnnotationsFromResult = (raw: string): TextAnnotation[] | null => {
      const isSeverity = (value: string): value is TextAnnotationSeverity => {
        return value === 'high' || value === 'medium' || value === 'low';
      };

      const trimmed = raw.trim();
      const unfenced = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(unfenced);
        if (!Array.isArray(parsed)) return null;

        const annotations: TextAnnotation[] = parsed
          .filter((x) => x && typeof x === 'object')
          .map((x, idx) => ({
            id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`,
            original_text: String((x as any).original_text ?? '').trim(),
            suggested_text: String((x as any).suggested_text ?? '').trim(),
            reason: (x as any).reason ? String((x as any).reason).trim() : undefined,
            severity: (() => {
              const raw = (x as any).severity ? String((x as any).severity).trim() : '';
              return isSeverity(raw) ? raw : undefined;
            })(),
            legal_reference: (x as any).legal_reference ? String((x as any).legal_reference).trim() : undefined,
          }))
          .filter((x) => x.original_text && x.suggested_text);

        return annotations;
      } catch {
        return null;
      }
    };

    setSelectedText(text);
    setIsFullContent(isFullDoc); // حفظ معلومة أن التحليل للمستند كامل
    setCurrentTool(tool);
    setCurrentResult(null);
    setIsLoading(true);
    setIsMenuOpen(false);

    try {
      const result = await processLegalAIRequest({
        tool: tool.id,
        selectedText: text
      });

      // Special case: annotation tool returns JSON for in-editor highlights.
      if (tool.id === 'legal_proofreading_annotations' && result.success && result.result) {
        const annotations = parseAnnotationsFromResult(result.result);
        if (annotations && annotations.length > 0) {
          onSetTextAnnotations?.(annotations);
          setIsResultModalOpen(false);
          setIsLoading(false);
          return;
        }
      }

      setCurrentResult(result);
      setIsResultModalOpen(true);
    } catch (error) {
      setCurrentResult({
        success: false,
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        toolUsed: tool.id
      });
      setIsResultModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!currentTool || !selectedText) return;

    setIsLoading(true);
    setCurrentResult(null);

    const result = await processLegalAIRequest({
      tool: currentTool.id,
      selectedText
    });

    setCurrentResult(result);
    setIsLoading(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={`legal-ai-btn-main ${isMenuOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsMenuOpen(!isMenuOpen)}
        disabled={disabled}
        title="أدوات المحامي"
      >
        <Sparkles size={14} />
        <span>أدوات المحامي</span>
        <ChevronDown size={12} className={isMenuOpen ? 'rotated' : ''} />
      </button>

      {isMenuOpen && (
        <div ref={menuRef} className="legal-ai-dropdown">
          <div className="legal-ai-dropdown-header">أدوات نظام الرائد الذكية</div>
          
          {Object.entries(categories).map(([key, category]) => (
            <div key={key} className="legal-ai-group">
              <button
                className={`legal-ai-group-btn ${expandedCategory === key ? 'expanded' : ''}`}
                onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
              >
                <span>{category.icon}</span>
                <span>{category.nameAr}</span>
                <ChevronLeft size={12} className={expandedCategory === key ? 'rotated' : ''} />
              </button>

              {expandedCategory === key && (
                <div className="legal-ai-items">
                  {category.tools.map((tool) => (
                    <button
                      key={tool.id}
                      className="legal-ai-item"
                      onClick={() => handleToolClick(tool)}
                    >
                      <span>{tool.icon}</span>
                      <span>{tool.nameAr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AIResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        result={currentResult}
        selectedText={selectedText}
        toolInfo={currentTool}
        isLoading={isLoading}
        onReplace={(text) => {
          if (isFullContent && onReplaceAllText) {
            onReplaceAllText(text); // استبدال كل المحتوى
          } else {
            onReplaceText(text); // استبدال النص المحدد
          }
        }}
        onRetry={handleRetry}
        isFullContent={isFullContent}
        onReplaceAllText={onReplaceAllText}
      />
    </>
  );
};

export default LegalAIToolbarButton;
export { AIResultModal };
export type { LegalAIToolbarButtonProps };
