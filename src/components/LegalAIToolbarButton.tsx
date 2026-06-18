/**
 * أدوات المحامي — قائمة منسدلة + مودال نتيجة منظّم (العقد v2).
 *
 * تغيّر معماري (2026-06-18): النداء انتقل للباك إند الآمن (POST /lawyer-tools/run) بدل
 * النداء المتصفحي المباشر لـ OpenRouter. المخرج صار LawyerToolResult منظّمًا يُعرض عبر
 * LawyerToolResultView المثيّم (report/replacement)، أو يُحقن في المحرّر (annotations).
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
// كلاسات legal-ai-* (القائمة) و ltv-* (المودال) تُحمَّل مركزياً عبر styles/appStyles.ts.
import { Sparkles, ChevronDown, ChevronLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { LAWYER_TOOLS } from '../types/lawyerTool';
import type { LawyerToolInfo, LawyerToolResult, LawyerToolAnnotation } from '../types/lawyerTool';
import { runLawyerTool } from '../services/lawyerToolService';
import LawyerToolResultView from './LawyerToolResultView';
import type { TextAnnotation, TextAnnotationSeverity } from '../types/textAnnotations';

interface LegalAIToolbarButtonProps {
  onSelectText: () => string | null;
  onGetAllText: () => string | null;
  onReplaceText: (newText: string) => void;
  onReplaceAllText?: (newText: string) => void;
  /** إدراج (إلحاق) نصّ — لخيارات الشرط الجزائي؛ يسقط لـ onReplaceText إن غاب. */
  onInsertText?: (newText: string) => void;
  disabled?: boolean;
  onSetTextAnnotations?: (annotations: TextAnnotation[]) => void;
  /** سياق التأريض/الكاش (اختياري — تمرير محدود من السطح المستضيف). */
  caseId?: number;
  source?: 'memo' | 'notebook';
  memoType?: string;
}

const CATEGORIES: { key: LawyerToolInfo['category']; nameAr: string; icon: string }[] = [
  { key: 'formalization', nameAr: 'تحسين الصياغة', icon: '✍️' },
  { key: 'analysis', nameAr: 'التحليل القانوني', icon: '🔬' },
  { key: 'summary', nameAr: 'التلخيص', icon: '📄' },
  { key: 'creative', nameAr: 'الدعم الابتكاري', icon: '💡' },
];

const SEVERITY_FOLD: Record<string, TextAnnotationSeverity> = {
  critical: 'high', high: 'high', medium: 'medium', low: 'low', info: 'low',
};

/** يطوي تمييزات الأداة إلى TextAnnotation (يُسقط ما لا اقتباس/بديل له، يطوي الشدّة لثلاثية المحرّر). */
function annotationsToTextAnnotations(anns: LawyerToolAnnotation[]): TextAnnotation[] {
  const seen = new Set<string>();
  return anns
    .filter((a) => a.original_text && a.suggested_text && !seen.has(a.original_text) && seen.add(a.original_text) !== undefined)
    .map((a) => ({
      id: a.id || `lt-${a.original_text.slice(0, 8)}`,
      original_text: a.original_text,
      suggested_text: a.suggested_text as string,
      reason: a.reason || undefined,
      severity: SEVERITY_FOLD[a.severity] ?? 'medium',
      legal_reference: a.legal_reference ?? undefined,
      citation_index: a.citation_index,
      grounded: a.citation_index != null,
      color_code: a.color_code,
    }));
}

const LegalAIToolbarButton: React.FC<LegalAIToolbarButtonProps> = ({
  onSelectText,
  onGetAllText,
  onReplaceText,
  onReplaceAllText,
  onInsertText,
  disabled = false,
  onSetTextAnnotations,
  caseId,
  source = 'notebook',
  memoType,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LawyerToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<LawyerToolInfo | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isFullContent, setIsFullContent] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
        setExpandedCategory(null);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isMenuOpen]);

  const execute = async (tool: LawyerToolInfo, text: string, fullDoc: boolean) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await runLawyerTool(tool.id, text, { source, caseId, memoType });

      // النمط ج/د: تمييزات تُحقن في المحرّر مباشرة (لا مودال).
      if (res.output_mode === 'annotations') {
        const anns = annotationsToTextAnnotations(res.annotations ?? []);
        if (anns.length && onSetTextAnnotations) {
          onSetTextAnnotations(anns);
          setIsModalOpen(false);
        } else {
          setError('لم تُرصد ملاحظات تستحق التمييز في النص.');
        }
        setIsLoading(false);
        return;
      }

      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
    void fullDoc;
  };

  const handleToolClick = async (tool: LawyerToolInfo) => {
    let text = onSelectText();
    const fullDoc = !text?.trim();
    if (fullDoc) text = onGetAllText();
    if (!text?.trim()) {
      alert('المحرّر فارغ. اكتب نصاً أولاً.');
      return;
    }

    setSelectedText(text);
    setIsFullContent(fullDoc);
    setCurrentTool(tool);
    setIsMenuOpen(false);
    setIsModalOpen(true);
    await execute(tool, text, fullDoc);
  };

  const handleRetry = () => {
    if (currentTool && selectedText) void execute(currentTool, selectedText, isFullContent);
  };

  // ── معالجات النتيجة → المحرّر ──
  const handleReplace = (text: string) => {
    if (isFullContent && onReplaceAllText) onReplaceAllText(text);
    else onReplaceText(text);
    setIsModalOpen(false);
  };
  const handleInsert = (text: string) => {
    (onInsertText ?? onReplaceText)(text);
    setIsModalOpen(false);
  };
  const handleApply = (suggested: string, original?: string) => {
    if (!onSetTextAnnotations) return;
    onSetTextAnnotations([{
      id: `lt-apply-${original?.slice(0, 8) ?? 'x'}`,
      original_text: original ?? '',
      suggested_text: suggested,
    }]);
  };

  const asOf = result?.meta?.as_of_date?.hijri;

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
          {CATEGORIES.map((cat) => {
            const tools = LAWYER_TOOLS.filter((t) => t.category === cat.key);
            return (
              <div key={cat.key} className="legal-ai-group">
                <button
                  className={`legal-ai-group-btn ${expandedCategory === cat.key ? 'expanded' : ''}`}
                  onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.nameAr}</span>
                  <ChevronLeft size={12} className={expandedCategory === cat.key ? 'rotated' : ''} />
                </button>
                {expandedCategory === cat.key && (
                  <div className="legal-ai-items">
                    {tools.map((tool) => (
                      <button key={tool.id} className="legal-ai-item" onClick={() => handleToolClick(tool)}>
                        <span>{tool.icon}</span>
                        <span>{tool.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="ltv-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="ltv-modal" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="ltv-modal-head">
              {currentTool && <span className="ltv-modal-icon">{currentTool.icon}</span>}
              <span className="ltv-modal-title">{currentTool?.label || 'معالجة ذكية'}</span>
              {asOf && <span className="ltv-modal-date">⏱ {asOf}</span>}
              <button className="ltv-modal-x" onClick={() => setIsModalOpen(false)} aria-label="إغلاق">✕</button>
            </div>

            <div className="ltv-modal-body">
              {isLoading && (
                <div className="ltv-loading"><Loader2 className="ltv-spin" size={20} /><span>جارٍ المعالجة…</span></div>
              )}
              {!isLoading && error && (
                <div className="ltv-error"><AlertCircle size={18} /><span>{error}</span></div>
              )}
              {!isLoading && !error && result && (
                <LawyerToolResultView
                  result={result}
                  onApply={handleApply}
                  onReplace={handleReplace}
                  onInsert={handleInsert}
                />
              )}
            </div>

            <div className="ltv-modal-foot">
              {!isLoading && (
                <button className="ltv-btn" onClick={handleRetry}><RefreshCw size={13} /> إعادة</button>
              )}
              <button className="ltv-btn" onClick={() => setIsModalOpen(false)} style={{ marginInlineStart: 'auto' }}>إغلاق</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default LegalAIToolbarButton;
export type { LegalAIToolbarButtonProps };
