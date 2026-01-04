import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, X } from 'lucide-react';

import type { TextAnnotation, TextAnnotationSeverity } from '../types/textAnnotations';
import {
  askDocumentAssistant,
  type DocumentAssistantResponse,
  type DocumentAssistantHighlight,
} from '../services/legalAIService';

interface NotebookAssistantWidgetProps {
  isVisible: boolean;
  getDocumentText: () => string | null;
  getDocumentBlocksJson?: () => unknown | null;
  onSetTextAnnotations: (annotations: TextAnnotation[]) => void;
}

const mapColorToSeverity = (color: DocumentAssistantHighlight['color_code']): TextAnnotationSeverity => {
  if (color === 'red') return 'high';
  if (color === 'yellow') return 'medium';
  return 'low';
};

const toTextAnnotations = (resp: DocumentAssistantResponse): TextAnnotation[] => {
  return (resp.highlights || []).map((h, idx) => {
    const suggestion = (h.suggestion ?? '').trim();
    const original = (h.exact_text ?? '').trim();

    return {
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`,
      original_text: original,
      // suggested_text is required by the existing overlay system.
      // If no suggestion provided, keep it equal to original and we hide the apply button in the tooltip.
      suggested_text: suggestion || original,
      reason: h.comment,
      severity: mapColorToSeverity(h.color_code),
    };
  });
};

const NotebookAssistantWidget: React.FC<NotebookAssistantWidgetProps> = ({
  isVisible,
  getDocumentText,
  getDocumentBlocksJson,
  onSetTextAnnotations,
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => !loading && question.trim().length > 0, [loading, question]);

  const handleClear = useCallback(() => {
    setQuestion('');
    setAnswer(null);
    setError(null);
    onSetTextAnnotations([]);
  }, [onSetTextAnnotations]);

  const handleAsk = useCallback(async () => {
    if (!canSend) return;

    const docText = getDocumentText() ?? '';
    const blocksJson = getDocumentBlocksJson ? getDocumentBlocksJson() ?? undefined : undefined;

    setLoading(true);
    setError(null);

    try {
      const resp = await askDocumentAssistant({
        question: question.trim(),
        documentText: docText,
        documentBlocksJson: blocksJson,
      });

      setAnswer(resp.answer);
      onSetTextAnnotations(toTextAnnotations(resp));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [canSend, getDocumentBlocksJson, getDocumentText, onSetTextAnnotations, question]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="notebook-ai-widget"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="notebook-ai-widget-row">
            <input
              className="notebook-ai-widget-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسألني"
              disabled={loading}
            />

            <button
              type="button"
              className="notebook-ai-widget-btn"
              onClick={handleAsk}
              disabled={!canSend}
              title="إرسال"
            >
              {loading ? <Loader2 size={16} className="notebook-ai-widget-spin" /> : <Send size={16} />}
            </button>

            <button
              type="button"
              className="notebook-ai-widget-btn subtle"
              onClick={handleClear}
              disabled={loading && !answer && !error}
              title="مسح"
            >
              <X size={16} />
            </button>
          </div>

          {loading && (
            <motion.div
              className="notebook-ai-widget-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div className="notebook-ai-widget-pulse" />
              <span>جارٍ التحليل…</span>
            </motion.div>
          )}

          {error && !loading && <div className="notebook-ai-widget-error">{error}</div>}

          {answer && !loading && (
            <div className="notebook-ai-widget-answer">
              <div className="notebook-ai-widget-answer-label">الإجابة</div>
              <div className="notebook-ai-widget-answer-text">{answer}</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotebookAssistantWidget;
