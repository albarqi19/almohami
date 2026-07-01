import React, { useState } from 'react';
import { Send, X, Loader2, MessageCircle, Languages } from 'lucide-react';
import Modal from './Modal';
import ClientManagementService, { clientLanguageLabel, type ClientCommunication } from '../services/clientManagementService';
import { formatPhoneDisplay } from '../utils/phone';

interface WhatsAppSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  preferredLanguage?: string | null;
  onSent: (entry: ClientCommunication) => void;
}

const MAX_LEN = 3500;

/**
 * إرسال واتساب للعميل من داخل النظام (لا wa.me): الباك يرسل عبر قناة المكتب
 * ويدوّن الرسالة تلقائياً في سجل التواصل. العميل غير العربي تصله ترجمة آلية أيضاً.
 */
const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  isOpen, onClose, clientId, clientName, clientPhone, preferredLanguage, onSent,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translated = preferredLanguage && preferredLanguage !== 'ar';

  const handleSend = async () => {
    const text = message.trim();
    if (!text) { setError('اكتب نص الرسالة أولاً'); return; }
    setError(null);
    setSending(true);
    try {
      const entry = await ClientManagementService.sendWhatsapp(clientId, { message: text });
      onSent(entry);
      setMessage('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذّر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إرسال واتساب للعميل" size="md">
      <div className="log-comm-modal">
        {error && <div className="log-comm-modal__error">{error}</div>}

        <div className="wa-send__recipient">
          <MessageCircle size={14} />
          <span className="wa-send__recipient-name">{clientName}</span>
          <span className="wa-send__recipient-phone" dir="ltr">{formatPhoneDisplay(clientPhone)}</span>
        </div>

        <div className="log-comm-modal__group">
          <label>نص الرسالة</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            rows={5}
            placeholder="اكتب رسالتك للعميل..."
            autoFocus
          />
          <div className="wa-send__meta">
            <span className="wa-send__counter">{message.length} / {MAX_LEN}</span>
            {translated && (
              <span className="wa-send__translate-hint">
                <Languages size={11} /> سترافق الرسالةَ ترجمةٌ آلية ({clientLanguageLabel(preferredLanguage)})
              </span>
            )}
          </div>
        </div>

        <div className="wa-send__note">تُرسَل عبر قناة المكتب وتُدوَّن تلقائياً في سجل التواصل.</div>

        <div className="log-comm-modal__actions">
          <button type="button" className="log-comm-modal__btn" onClick={onClose} disabled={sending}>
            <X size={14} /> إلغاء
          </button>
          <button
            type="button"
            className="log-comm-modal__btn log-comm-modal__btn--primary"
            onClick={handleSend}
            disabled={sending || !message.trim() || !clientPhone}
            title={!clientPhone ? 'لا يوجد جوال مسجل للعميل' : undefined}
          >
            {sending ? <Loader2 size={14} className="spinning" /> : <Send size={14} />}
            {sending ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppSendModal;
