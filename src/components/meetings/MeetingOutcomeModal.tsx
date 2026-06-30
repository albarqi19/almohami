import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  FileText,
  Loader2,
} from 'lucide-react';
import { clientMeetingService, type ClientMeeting } from '../../services/meetingService';

interface Props {
  meeting: ClientMeeting;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * تسجيل/عرض «نتيجة الاجتماع» — يحل محل prompt() البدائي.
 * يعرض ملخص الموعد + حقل النتيجة، ويستدعي complete(id, outcome).
 * للاجتماعات المكتملة يعرض النتيجة الحالية قابلة للتعديل.
 */
const MeetingOutcomeModal: React.FC<Props> = ({ meeting, onClose, onSuccess }) => {
  const [outcome, setOutcome] = useState(meeting.outcome || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRemote = meeting.meeting_type === 'remote';
  const alreadyCompleted = meeting.status === 'completed';
  // موعد لم يحن وقته بعد — ننبّه قبل إنهائه حتى لا يُغلق عن طريق الخطأ
  const isFuture = !alreadyCompleted && new Date(meeting.scheduled_at).getTime() > Date.now();

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await clientMeetingService.complete(meeting.id, outcome.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      console.error('Error completing meeting:', err);
      setError(err.message || 'تعذّر حفظ نتيجة الاجتماع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="outcome-overlay" onClick={onClose}>
      <div className="outcome-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="outcome-header">
          <div className="outcome-header__icon">
            {alreadyCompleted ? <FileText size={20} /> : <CheckCircle size={20} />}
          </div>
          <div className="outcome-header__titles">
            <h2>{alreadyCompleted ? 'نتيجة الاجتماع' : 'إنهاء الاجتماع وتسجيل النتيجة'}</h2>
            <span>{meeting.client_name || meeting.client?.name || 'عميل'}</span>
          </div>
          <button className="outcome-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Meeting summary */}
        <div className="outcome-summary">
          <div className="outcome-summary__row">
            <span><Calendar size={13} /> {formatDate(meeting.scheduled_at)}</span>
            <span><Clock size={13} /> {formatTime(meeting.scheduled_at)} · {meeting.duration_minutes} دقيقة</span>
          </div>
          <div className="outcome-summary__row">
            <span>
              {isRemote ? <Video size={13} /> : <MapPin size={13} />}
              {isRemote ? 'عن بعد' : (meeting.location || 'حضوري')}
            </span>
            {meeting.case && <span><User size={13} /> {meeting.case.title}</span>}
          </div>
        </div>

        {/* Body */}
        <div className="outcome-body">
          {error && <div className="outcome-error">{error}</div>}

          {isFuture && (
            <div className="outcome-warn">
              ⚠️ هذا الموعد لم يحن وقته بعد. الحفظ سيُعلّمه «مكتمل».
            </div>
          )}

          <label className="outcome-label">نتيجة الاجتماع وملخصه</label>
          <textarea
            className="outcome-textarea"
            rows={6}
            autoFocus
            placeholder="ما الذي تم الاتفاق عليه؟ أبرز النقاط، القرارات، والخطوات التالية..."
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="outcome-footer">
          <button className="outcome-btn outcome-btn--secondary" onClick={onClose}>
            إلغاء
          </button>
          <button className="outcome-btn outcome-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
            {saving ? 'جاري الحفظ...' : (alreadyCompleted ? 'حفظ النتيجة' : 'إنهاء وحفظ النتيجة')}
          </button>
        </div>

        <style>{`
          .outcome-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
            display: flex; align-items: flex-start; justify-content: center; z-index: 1000;
            padding: 60px 20px 20px;
          }
          .outcome-modal {
            background: var(--color-surface, #fff); border-radius: 10px; width: 100%; max-width: 540px;
            border: 1px solid var(--color-border, #e5e7eb);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: outcomeUp 0.2s ease-out;
          }
          @keyframes outcomeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
          .outcome-header { display: flex; align-items: center; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--color-border, #e5e7eb); }
          .outcome-header__icon {
            width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0;
            background: #ECFDF5; color: #059669; display: flex; align-items: center; justify-content: center;
          }
          .outcome-header__titles h2 { font-size: 16px; font-weight: 600; margin: 0; color: var(--color-text); }
          .outcome-header__titles span { font-size: 12.5px; color: var(--color-text-secondary); }
          .outcome-close {
            margin-right: auto; width: 28px; height: 28px; border: none; background: transparent;
            color: var(--color-text-secondary); cursor: pointer; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
          }
          .outcome-close:hover { background: var(--color-surface-subtle, #f3f4f6); }
          .outcome-summary { padding: 12px 20px; background: var(--color-surface-subtle, #f9fafb); border-bottom: 1px solid var(--color-border, #e5e7eb); }
          .outcome-summary__row { display: flex; flex-wrap: wrap; gap: 16px; padding: 3px 0; }
          .outcome-summary__row span { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-text-secondary); }
          .outcome-body { padding: 18px 20px; }
          .outcome-error { padding: 9px 12px; border-radius: 6px; background: #FEF2F2; color: #DC2626; font-size: 13px; margin-bottom: 14px; }
          .outcome-warn { padding: 9px 12px; border-radius: 6px; background: #FFFBEB; color: #B45309; font-size: 13px; margin-bottom: 14px; line-height: 1.6; }
          .outcome-label { display: block; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
          .outcome-textarea {
            width: 100%; padding: 12px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 8px;
            font-family: inherit; font-size: 14px; line-height: 1.7; color: var(--color-text); resize: vertical; outline: none;
          }
          .outcome-textarea:focus { border-color: var(--law-navy, #1E3A5F); }
          .outcome-readonly { font-size: 14px; line-height: 1.8; color: var(--color-text); white-space: pre-wrap; }
          .outcome-empty { color: var(--color-text-secondary); font-style: italic; }
          .outcome-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--color-border, #e5e7eb); }
          .outcome-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
          .outcome-btn--secondary { border: 1px solid var(--color-border, #e5e7eb); background: var(--color-surface, #fff); color: var(--color-text); }
          .outcome-btn--secondary:hover { background: var(--color-surface-subtle, #f3f4f6); }
          .outcome-btn--primary { border: none; background: #059669; color: #fff; }
          .outcome-btn--primary:hover { background: #047857; }
          .outcome-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
};

export default MeetingOutcomeModal;
