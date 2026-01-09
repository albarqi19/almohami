import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Briefcase,
  Send,
  Mail,
  MessageSquare,
  Link2,
  Check,
  Search,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { bookingLinkService, type CreateBookingLinkData } from '../../services/bookingService';
import { apiClient } from '../../utils/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Case {
  id: number;
  title: string;
  file_number: string;
  client_id: number | null;
}

const CreateBookingLinkModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  // Form State
  const [clientId, setClientId] = useState<number | undefined>();
  const [caseId, setCaseId] = useState<number | undefined>();
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'email' | 'both'>('both');

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [showClients, setShowClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch clients and cases
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, casesRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: { data: Client[] } | Client[] }>('/users/clients'),
          apiClient.get<{ success: boolean; data: { data: Case[] } | Case[] }>('/cases'),
        ]);

        let clientsData: Client[] = [];
        if (clientsRes.data && 'data' in clientsRes.data && Array.isArray((clientsRes.data as any).data)) {
          clientsData = (clientsRes.data as any).data;
        } else if (Array.isArray(clientsRes.data)) {
          clientsData = clientsRes.data;
        }
        setClients(clientsData);

        let casesData: Case[] = [];
        if (casesRes.data && 'data' in casesRes.data && Array.isArray((casesRes.data as any).data)) {
          casesData = (casesRes.data as any).data;
        } else if (Array.isArray(casesRes.data)) {
          casesData = casesRes.data;
        }
        setCases(casesData);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.includes(term)
    );
  });

  // Filter cases by selected client
  const filteredCases = clientId
    ? cases.filter(c => c.client_id === clientId)
    : cases;

  // Handle client selection - auto-select case if only one
  useEffect(() => {
    if (clientId) {
      const clientCases = cases.filter(c => c.client_id === clientId);
      if (clientCases.length === 1) {
        setCaseId(clientCases[0].id);
      } else {
        setCaseId(undefined);
      }
    }
  }, [clientId, cases]);

  // Submit
  const handleSubmit = async () => {
    if (!clientId) {
      setError('يرجى اختيار العميل');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateBookingLinkData = {
        client_id: clientId,
        case_id: caseId,
        send_notification: sendNotification,
        notification_channel: sendNotification ? notificationChannel : undefined
      };

      await bookingLinkService.create(data);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating link:', err);
      setError(err.message || 'حدث خطأ في إنشاء الرابط');
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div className="notion-modal-overlay" onClick={onClose}>
      <div className="notion-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-modal__header">
          <div className="notion-modal__icon">
            <Link2 size={20} />
          </div>
          <div className="notion-modal__title-wrapper">
            <h2>إنشاء رابط حجز جديد</h2>
            <span className="notion-modal__subtitle">إرسال رابط للعميل لحجز موعد</span>
          </div>
          <button className="notion-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="notion-modal__body">
          {error && (
            <div className="notion-error">{error}</div>
          )}

          <div className="notion-properties">
            {/* Client Selection */}
            <div className="notion-property notion-property--participants">
              <div className="notion-property__label">
                <User size={14} />
                <span>العميل</span>
              </div>
              <div
                className="notion-property__value notion-property__value--clickable"
                onClick={() => setShowClients(!showClients)}
              >
                {selectedClient ? (
                  <span className="notion-value-text">{selectedClient.name}</span>
                ) : (
                  <span className="notion-placeholder">اختر العميل...</span>
                )}
                <ChevronDown size={14} className={showClients ? 'rotated' : ''} />
              </div>

              {showClients && (
                <div className="notion-users-dropdown">
                  <div className="notion-users-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="بحث عن عميل..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="notion-users-list">
                    {filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="notion-user-option"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientId(client.id);
                          setShowClients(false);
                        }}
                      >
                        <div className="notion-user-avatar">{client.name.charAt(0)}</div>
                        <div className="notion-user-info">
                          <span className="notion-user-name">{client.name}</span>
                          {client.phone && <span className="notion-user-role">{client.phone}</span>}
                        </div>
                        {clientId === client.id && <Check size={14} className="notion-check" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Case Selection */}
            <div className="notion-property">
              <div className="notion-property__label">
                <Briefcase size={14} />
                <span>القضية</span>
              </div>
              <div className="notion-property__value">
                <select
                  value={caseId || ''}
                  onChange={(e) => setCaseId(Number(e.target.value) || undefined)}
                  disabled={!clientId}
                >
                  <option value="">(اختياري) اختر قضية...</option>
                  {filteredCases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.file_number ? `(${c.file_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Toggle */}
            <div className="notion-property">
              <div className="notion-property__label">
                <Send size={14} />
                <span>إشعار</span>
              </div>
              <div className="notion-property__value">
                <label className="notion-toggle">
                  <input
                    type="checkbox"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
                <span className="notion-toggle-label">
                  {sendNotification ? 'إرسال رابط الحجز للعميل' : 'إنشاء الرابط فقط'}
                </span>
              </div>
            </div>

            {/* Notification Channel */}
            {sendNotification && (
              <div className="notion-property">
                <div className="notion-property__label">
                  <MessageSquare size={14} />
                  <span>القناة</span>
                </div>
                <div className="notion-property__value notion-property__value--buttons">
                  <button
                    className={`notion-type-btn ${notificationChannel === 'whatsapp' ? 'notion-type-btn--active' : ''}`}
                    onClick={() => setNotificationChannel('whatsapp')}
                  >
                    <MessageSquare size={12} /> واتساب
                  </button>
                  <button
                    className={`notion-type-btn ${notificationChannel === 'email' ? 'notion-type-btn--active' : ''}`}
                    onClick={() => setNotificationChannel('email')}
                  >
                    <Mail size={12} /> بريد
                  </button>
                  <button
                    className={`notion-type-btn ${notificationChannel === 'both' ? 'notion-type-btn--active' : ''}`}
                    onClick={() => setNotificationChannel('both')}
                  >
                    <span>⚡</span> الكل
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="notion-modal__footer">
          <button className="notion-btn notion-btn--secondary" onClick={onClose}>
            إلغاء
          </button>
          <button
            className="notion-btn notion-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء وإرسال الرابط'}
          </button>
        </div>

        <style>{`
          .notion-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            z-index: 1000;
            padding: 60px 20px 20px;
          }

          .notion-modal {
            background: var(--color-surface);
            border-radius: 8px;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid var(--color-border, #e5e7eb);
            animation: slideUp 0.2s ease-out;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .notion-modal__header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px 20px 0;
          }

          .notion-modal__icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: var(--color-primary-soft, rgba(10, 25, 47, 0.1));
            color: var(--color-primary, #0A192F);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .notion-modal__title-wrapper h2 {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-text);
            margin: 0;
          }

          .notion-modal__subtitle {
            font-size: 13px;
            color: var(--color-text-secondary);
          }

          .notion-close-btn {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: none;
            background: transparent;
            color: var(--color-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            margin-right: auto;
          }

          .notion-close-btn:hover {
            background: var(--color-surface-subtle);
          }

          .notion-modal__body {
            padding: 20px;
          }

          .notion-error {
            padding: 10px 12px;
            border-radius: 6px;
            background: var(--color-error-soft, #FEF2F2);
            color: var(--color-error, #DC2626);
            font-size: 13px;
            margin-bottom: 16px;
          }

          .notion-properties {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .notion-property {
            display: flex;
            align-items: center;
            min-height: 34px;
            border-radius: 4px;
            transition: background 0.1s;
          }

          .notion-property:hover {
            background: var(--color-surface-subtle);
          }

          .notion-property__label {
            width: 120px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--color-text-secondary);
            padding: 0 8px;
            flex-shrink: 0;
          }

          .notion-property__value {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 8px;
          }

          .notion-property__value input,
          .notion-property__value select {
            width: 100%;
            border: none;
            background: transparent;
            font-size: 14px;
            color: var(--color-text);
            outline: none;
            padding: 6px 0;
          }

          .notion-property__value--buttons {
            gap: 6px;
          }

          .notion-type-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 4px;
            border: 1px solid var(--color-border, #e5e7eb);
            background: var(--color-surface);
            font-size: 12px;
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: all 0.15s;
          }

          .notion-type-btn:hover {
            background: var(--color-surface-subtle);
          }

          .notion-type-btn--active {
            background: var(--color-primary, #0A192F);
            color: white;
            border-color: var(--color-primary, #0A192F);
          }

          .notion-property__value--clickable {
            cursor: pointer;
            justify-content: space-between;
            min-height: 34px;
            padding: 8px;
            border-radius: 4px;
          }

          .notion-property__value--clickable:hover {
            background: var(--color-surface-subtle);
          }

          .notion-value-text {
            font-size: 14px;
            color: var(--color-text);
          }

          .notion-placeholder {
            color: var(--color-text-secondary);
            opacity: 0.6;
            font-size: 14px;
          }

          .rotated {
            transform: rotate(180deg);
          }
          
          .notion-property--participants {
            position: relative;
          }

          .notion-users-dropdown {
            position: absolute;
            top: 100%;
            right: 120px;
            left: 0;
            background: var(--color-surface);
            border: 1px solid var(--color-border, #e5e7eb);
            border-radius: 8px;
            margin-top: 4px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            max-height: 250px;
            display: flex;
            flex-direction: column;
            z-index: 100;
          }

          .notion-users-search {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
          }

          .notion-users-search input {
            flex: 1;
            border: none;
            background: none;
            font-size: 13px;
            outline: none;
            color: var(--color-text);
          }

          .notion-users-list {
            overflow-y: auto;
          }

          .notion-user-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.1s;
          }

          .notion-user-option:hover {
            background: var(--color-surface-subtle);
          }

          .notion-user-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--color-primary, #0A192F);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }

          .notion-user-info {
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .notion-user-name {
            font-size: 13px;
            color: var(--color-text);
          }

          .notion-user-role {
            font-size: 11px;
            color: var(--color-text-secondary);
          }

          .notion-check {
            color: var(--color-success, #10B981);
          }

          .notion-toggle {
            position: relative;
            display: inline-block;
            width: 32px;
            height: 18px;
          }

          .notion-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--color-border, #e5e7eb);
            transition: .4s;
            border-radius: 34px;
          }

          .slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
          }

          input:checked + .slider {
            background-color: var(--color-primary, #0A192F);
          }

          input:checked + .slider:before {
            transform: translateX(14px);
          }

          .notion-toggle-label {
            font-size: 13px;
            color: var(--color-text);
            margin-right: 8px;
          }

          .notion-modal__footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 16px 20px;
            border-top: 1px solid var(--color-border, #e5e7eb);
          }

          .notion-btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .notion-btn--secondary {
            border: 1px solid var(--color-border, #e5e7eb);
            background: var(--color-surface);
            color: var(--color-text);
          }

          .notion-btn--secondary:hover {
            background: var(--color-surface-subtle);
          }

          .notion-btn--primary {
            border: none;
            background: var(--color-primary, #0A192F);
            color: white;
          }

          .notion-btn--primary:hover {
            opacity: 0.9;
          }

          .notion-btn--primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreateBookingLinkModal;
