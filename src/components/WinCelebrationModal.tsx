import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Sparkles, FileText, Calendar, Building2, Hash } from 'lucide-react';
import type { Case } from '../types';
import { apiClient } from '../utils/api';
import '../styles/win-celebration-modal.css';

interface Props {
  caseData: Case;
  isOpen: boolean;
  onClose: () => void;
  /**
   * إذا true → state-only (لا يستدعي mark-as-seen).
   * يُستخدم من ReplayCelebrationButton.
   */
  replayMode?: boolean;
}

const COLORS = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#3b82f6', '#ffffff'];

/**
 * Modal احتفالي يظهر مرة واحدة لكل (مستخدم، قضية) عند فوز موكلنا.
 *
 * شروط الظهور (تُفحص في CaseDetailPage):
 *   1) outcome === 'won'
 *   2) outcome_confidence === 'high'
 *   3) outcome_source !== 'manual'
 *   4) outcome_celebrated_by_current_user === false
 *   5) المستخدم محامٍ مخصص أو مدير tenant
 *
 * عند الإغلاق: POST /cases/{id}/outcome/mark-as-seen → يسجّل seen_at للمستخدم الحالي.
 */
const WinCelebrationModal: React.FC<Props> = ({ caseData, isOpen, onClose, replayMode = false }) => {
  // 4 موجات confetti بفاصل 600ms (مجموع ~2.4s)
  // zIndex: 10001 — فوق المودال (10000) كي يظهر أمامه لا خلفه
  useEffect(() => {
    if (!isOpen) return;

    const isMobile = window.innerWidth < 640;
    const count = isMobile ? 35 : 60;

    let cancelled = false;
    let timers: number[] = [];

    // تُحمّل canvas-confetti عند الطلب فقط (الاحتفال نادر) لتخفيف الحزمة الأولية
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return;

      const fire = () => {
        confetti({
          particleCount: count,
          spread: 70,
          startVelocity: 50,
          decay: 0.92,
          origin: { x: 0.05, y: 0.7 },
          angle: 60,
          colors: COLORS,
          ticks: 200,
          gravity: 1,
          zIndex: 10001,
        });
        confetti({
          particleCount: count,
          spread: 70,
          startVelocity: 50,
          decay: 0.92,
          origin: { x: 0.95, y: 0.7 },
          angle: 120,
          colors: COLORS,
          ticks: 200,
          gravity: 1,
          zIndex: 10001,
        });
      };

      const delays = [100, 700, 1300, 1900];
      timers = delays.map(d => window.setTimeout(fire, d));
    });

    return () => {
      cancelled = true;
      timers.forEach(t => window.clearTimeout(t));
      // لا نوقف confetti — الجسيمات تختفي طبيعياً
    };
  }, [isOpen]);

  // ESC لإغلاق
  const handleClose = useCallback(async () => {
    if (!replayMode) {
      try {
        await apiClient.post(`/cases/${caseData.id}/outcome/mark-as-seen`);
      } catch (e) {
        console.warn('mark-as-seen failed', e);
        // نُغلق ولا نمنع المستخدم — في الأسوأ سيُعرض مرة أخرى
      }
    }
    onClose();
  }, [caseData.id, onClose, replayMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const summaryText = caseData.outcome_summary
    || `صدر حكم لصالح موكلك في القضية "${caseData.title}"`;

  // محكمة + رقم الصك من آخر judgement لو متاح
  const judgement = caseData.judgements?.find(j => Number(j.id) === Number(caseData.outcome_judgement_id))
    || caseData.judgements?.[0];

  const courtName = judgement?.court_name || caseData.court || '—';
  const sakOrDecision = judgement?.sak_or_decision || '—';
  const sakDate = judgement?.sak_date
    ? new Date(judgement.sak_date).toLocaleDateString('ar-SA-u-ca-gregory')
    : (caseData.outcome_detected_at
      ? new Date(caseData.outcome_detected_at).toLocaleDateString('ar-SA-u-ca-gregory')
      : '—');

  const node = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="win-celebration-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          <motion.div
            className="win-celebration-modal"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="win-celebration-title"
          >
            <button
              className="win-celebration-close"
              onClick={handleClose}
              aria-label="إغلاق"
              type="button"
            >
              <X size={16} />
            </button>

            <div className="win-celebration-header">
              <div className="win-celebration-trophy">
                <Trophy size={36} />
              </div>
            </div>

            <div className="win-celebration-body">
              <h2 id="win-celebration-title" className="win-celebration-title">
                مبروك! حكم لصالحك
              </h2>

              <p className="win-celebration-summary">{summaryText}</p>

              <div className="win-celebration-info-card">
                <div className="win-celebration-info-row">
                  <span className="win-celebration-info-label">
                    <FileText size={14} />
                    القضية
                  </span>
                  <span className="win-celebration-info-value">
                    {caseData.title}
                    {caseData.file_number && (
                      <span className="win-celebration-info-meta"> ({caseData.file_number})</span>
                    )}
                  </span>
                </div>

                <div className="win-celebration-info-row">
                  <span className="win-celebration-info-label">
                    <Hash size={14} />
                    رقم الصك
                  </span>
                  <span className="win-celebration-info-value">{sakOrDecision}</span>
                </div>

                <div className="win-celebration-info-row">
                  <span className="win-celebration-info-label">
                    <Calendar size={14} />
                    تاريخ الحكم
                  </span>
                  <span className="win-celebration-info-value">{sakDate}</span>
                </div>

                <div className="win-celebration-info-row">
                  <span className="win-celebration-info-label">
                    <Building2 size={14} />
                    المحكمة
                  </span>
                  <span className="win-celebration-info-value">{courtName}</span>
                </div>
              </div>

              <div className="win-celebration-ai-badge">
                <Sparkles size={14} />
                <span>تم اكتشاف النتيجة تلقائياً</span>
              </div>
            </div>

            <div className="win-celebration-footer">
              <button
                type="button"
                className="win-celebration-primary-btn"
                onClick={handleClose}
              >
                شكراً، إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
};

export default WinCelebrationModal;
