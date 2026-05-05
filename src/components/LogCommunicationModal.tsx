import React, { useState } from 'react';
import { Save, X, Loader2, Phone, MessageCircle, Mail, Users2, MessageSquare, MoreHorizontal } from 'lucide-react';
import Modal from './Modal';
import ClientManagementService, { type ClientCommunication, type LogCommunicationPayload } from '../services/clientManagementService';

interface LogCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  onLogged: (entry: ClientCommunication) => void;
}

type CommType = LogCommunicationPayload['type'];
type CommDirection = NonNullable<LogCommunicationPayload['direction']>;

const TYPE_OPTIONS: { value: CommType; label: string; icon: React.ReactNode }[] = [
  { value: 'call', label: 'مكالمة', icon: <Phone size={14} /> },
  { value: 'whatsapp', label: 'واتساب', icon: <MessageCircle size={14} /> },
  { value: 'email', label: 'بريد إلكتروني', icon: <Mail size={14} /> },
  { value: 'meeting', label: 'اجتماع', icon: <Users2 size={14} /> },
  { value: 'sms', label: 'رسالة نصية', icon: <MessageSquare size={14} /> },
  { value: 'other', label: 'أخرى', icon: <MoreHorizontal size={14} /> },
];

const LogCommunicationModal: React.FC<LogCommunicationModalProps> = ({ isOpen, onClose, clientId, onLogged }) => {
  const [type, setType] = useState<CommType>('call');
  const [direction, setDirection] = useState<CommDirection>('outbound');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => toLocalISOString(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const entry = await ClientManagementService.logCommunication(clientId, {
        type, direction, subject: subject || null, notes: notes || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      });
      onLogged(entry);
      // Reset for next entry
      setSubject('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل التواصل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل تواصل" size="md">
      <div className="log-comm-modal">
        {error && <div className="log-comm-modal__error">{error}</div>}

        <div className="log-comm-modal__group">
          <label>نوع التواصل</label>
          <div className="log-comm-modal__type-grid">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`log-comm-modal__type-btn ${type === opt.value ? 'is-active' : ''}`}
                onClick={() => setType(opt.value)}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="log-comm-modal__group">
          <label>الاتجاه</label>
          <div className="log-comm-modal__direction">
            <button type="button" className={direction === 'outbound' ? 'is-active' : ''} onClick={() => setDirection('outbound')}>صادر منا ←</button>
            <button type="button" className={direction === 'inbound' ? 'is-active' : ''} onClick={() => setDirection('inbound')}>→ وارد من العميل</button>
          </div>
        </div>

        <div className="log-comm-modal__group">
          <label>التاريخ والوقت</label>
          <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>

        <div className="log-comm-modal__group">
          <label>الموضوع</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: متابعة جلسة الإثنين" />
        </div>

        <div className="log-comm-modal__group">
          <label>الملاحظات</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="تفاصيل المحادثة، النقاط المتفق عليها..." />
        </div>

        <div className="log-comm-modal__actions">
          <button type="button" className="log-comm-modal__btn" onClick={onClose} disabled={saving}>
            <X size={14} /> إلغاء
          </button>
          <button type="button" className="log-comm-modal__btn log-comm-modal__btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spinning" /> : <Save size={14} />}
            {saving ? 'جاري الحفظ...' : 'تسجيل'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default LogCommunicationModal;
