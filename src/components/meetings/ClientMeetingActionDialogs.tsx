import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../erp/Modal';
import { clientMeetingService, type ClientMeeting } from '../../services/meetingService';
import { fmtDualAr, fmtTimeAr } from '../../utils/dateAr';
import { getApiErrorMessage } from '../../utils/apiError';
import { clientDisplayName } from './clientMeetingHelpers';

interface DialogProps {
  meeting: ClientMeeting;
  onClose: () => void;
  /** message: ما يُعرض فوق القائمة بعد النجاح */
  onDone: (message: string) => void;
}

const When: React.FC<{ meeting: ClientMeeting }> = ({ meeting }) => (
  <div className="cmo-summary">
    <span>{clientDisplayName(meeting)}</span>
    <em>
      {fmtDualAr(meeting.scheduled_at)} — {fmtTimeAr(meeting.scheduled_at)} · {meeting.duration_minutes} دقيقة
      {' · '}
      {meeting.meeting_type === 'remote' ? 'عن بُعد' : 'حضوري'}
    </em>
  </div>
);

/**
 * اعتماد طلب موعد من بوابة العميل.
 *
 * طلب البوابة «عن بُعد» يصل بلا رابط، وكان الاعتماد يُرسل تأكيداً يَعِد بأن «سيصلكم
 * الرابط قبل الموعد». الحقل هنا يجعل الرابط جزءاً من رسالة التأكيد نفسها — اختيارياً،
 * فمن لا يملكه الآن يضيفه لاحقاً من «تعديل» فيصل العميلَ فور حفظه.
 */
export const ApproveClientMeetingDialog: React.FC<DialogProps> = ({ meeting, onClose, onDone }) => {
  const needsLink = meeting.meeting_type === 'remote' && !meeting.video_meeting_url;
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = videoUrl.trim();
      await clientMeetingService.confirm(meeting.id, needsLink && url ? url : undefined);
      onDone(
        needsLink && !url
          ? 'اعتُمد الموعد وأُبلغ العميل — أضف رابط الاجتماع قبل موعده'
          : 'اعتُمد الموعد وأُبلغ العميل'
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'تعذّر اعتماد الموعد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="narrow"
      icon={CheckCircle}
      title="اعتماد طلب الموعد"
      footerAlign="end"
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="fin-btn" onClick={onClose} disabled={saving}>تراجع</button>
          <button type="button" className="fin-btn fin-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الاعتماد…' : 'اعتماد وإبلاغ العميل'}
          </button>
        </>
      }
    >
      {error && (
        <div className="cmo-alert cmo-alert--error cmo-form-alert" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span className="cmo-alert__text">{error}</span>
        </div>
      )}

      <When meeting={meeting} />

      {needsLink && (
        <div className="fin-field cmo-dialog-field">
          <label className="fin-field__label">رابط الاجتماع (اختياري)</label>
          <input
            className="fin-input"
            dir="ltr"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://zoom.us/j/..."
            maxLength={255}
            autoFocus
          />
          <p className="mfm-note">يصل مع رسالة التأكيد. وبدونه تَعِد الرسالةُ العميلَ برابطٍ قبل الموعد.</p>
        </div>
      )}

      <p className="mfm-note">تصل العميلَ رسالة التأكيد بالواتساب والبريد، ويُجرَس في بوابته.</p>
    </Modal>
  );
};

/**
 * إلغاء موعد — بديل prompt(): السبب يصل العميلَ في رسالة الإلغاء، فيُكتب في حقلٍ يُرى
 * قبل الإرسال لا في نافذة متصفّح تُغلق بخطأ.
 */
export const CancelClientMeetingDialog: React.FC<DialogProps> = ({ meeting, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('اكتب سبب الإلغاء — يصل العميلَ مع رسالة الإلغاء');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await clientMeetingService.cancel(meeting.id, trimmed);
      onDone('أُلغي الموعد وأُبلغ العميل');
    } catch (err) {
      setError(getApiErrorMessage(err, 'تعذّر إلغاء الموعد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="narrow"
      icon={XCircle}
      title="إلغاء الموعد"
      footerAlign="end"
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="fin-btn" onClick={onClose} disabled={saving}>تراجع</button>
          <button type="button" className="fin-btn fin-btn--danger" onClick={submit} disabled={saving}>
            {saving ? 'جارٍ الإلغاء…' : 'إلغاء الموعد'}
          </button>
        </>
      }
    >
      {error && (
        <div className="cmo-alert cmo-alert--error cmo-form-alert" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span className="cmo-alert__text">{error}</span>
        </div>
      )}

      <When meeting={meeting} />

      <div className="fin-field cmo-dialog-field">
        <label className="fin-field__label">سبب الإلغاء <span className="req">*</span></label>
        <textarea
          className="fin-textarea"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثال: اعتذار المحامي لظرف طارئ — نقترح موعداً بديلاً"
          maxLength={500}
          autoFocus
        />
        <p className="mfm-note">يصل العميلَ بالواتساب والبريد.</p>
      </div>
    </Modal>
  );
};
