import React, { useState, useEffect } from 'react';
import { X, Briefcase, Search } from 'lucide-react';
import { clientMeetingService, type ClientMeeting } from '../../services/meetingService';
import { apiClient } from '../../utils/api';

interface Props {
  meeting: ClientMeeting;
  onClose: () => void;
  onSuccess: () => void;
}

interface Case {
  id: number;
  title: string;
  file_number: string;
  client_name: string | null;
  status: string;
}

const LinkToCaseModal: React.FC<Props> = ({ meeting, onClose, onSuccess }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: Case[] }>('/cases');
        setCases(response.data || []);
      } catch (err) {
        console.error('Error fetching cases:', err);
      }
    };
    fetchCases();
  }, []);

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.file_number.toLowerCase().includes(term) ||
      c.client_name?.toLowerCase().includes(term)
    );
  });

  // Submit
  const handleSubmit = async () => {
    if (!selectedCaseId) {
      setError('يرجى اختيار قضية');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await clientMeetingService.linkToCase(meeting.id, selectedCaseId);
      onSuccess();
    } catch (err: any) {
      console.error('Error linking case:', err);
      setError(err.message || 'حدث خطأ في ربط القضية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Briefcase size={18} />
            ربط بقضية
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="meeting-info">
            <span className="label">الموعد:</span>
            <span>{meeting.title || `موعد مع ${meeting.client_name}`}</span>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="بحث في القضايا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="cases-list">
            {filteredCases.length === 0 ? (
              <div className="empty">لا توجد قضايا</div>
            ) : (
              filteredCases.map(c => (
                <div
                  key={c.id}
                  className={`case-item ${selectedCaseId === c.id ? 'case-item--selected' : ''}`}
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  <div className="case-icon">
                    <Briefcase size={16} />
                  </div>
                  <div className="case-info">
                    <div className="case-title">{c.title}</div>
                    <div className="case-meta">
                      <span>{c.file_number}</span>
                      {c.client_name && <span>• {c.client_name}</span>}
                    </div>
                  </div>
                  <div className={`radio ${selectedCaseId === c.id ? 'radio--checked' : ''}`} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || !selectedCaseId}
          >
            {loading ? 'جاري الربط...' : 'ربط بالقضية'}
          </button>
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 480px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
          }

          .modal-header h2 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-secondary, #6b7280);
          }

          .close-btn:hover {
            background: var(--color-bg-tertiary, #f3f4f6);
          }

          .modal-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .error-message {
            padding: 12px;
            border-radius: 8px;
            background: #FEF2F2;
            color: #DC2626;
            font-size: 14px;
          }

          .meeting-info {
            padding: 12px;
            background: var(--color-bg-secondary, #f9fafb);
            border-radius: 8px;
            font-size: 14px;
          }

          .meeting-info .label {
            color: var(--color-text-secondary, #6b7280);
            margin-left: 8px;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid var(--color-border, #e5e7eb);
          }

          .search-box input {
            border: none;
            background: none;
            flex: 1;
            font-size: 14px;
            outline: none;
          }

          .search-box svg {
            color: var(--color-text-secondary, #6b7280);
          }

          .cases-list {
            border: 1px solid var(--color-border, #e5e7eb);
            border-radius: 8px;
            max-height: 300px;
            overflow-y: auto;
          }

          .empty {
            padding: 40px;
            text-align: center;
            color: var(--color-text-secondary, #6b7280);
          }

          .case-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
            transition: background 0.15s;
          }

          .case-item:last-child {
            border-bottom: none;
          }

          .case-item:hover {
            background: var(--color-bg-tertiary, #f3f4f6);
          }

          .case-item--selected {
            background: rgba(30, 58, 95, 0.08);
          }

          .case-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: var(--color-bg-tertiary, #f3f4f6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-text-secondary, #6b7280);
          }

          .case-item--selected .case-icon {
            background: var(--law-navy, #1E3A5F);
            color: white;
          }

          .case-info {
            flex: 1;
          }

          .case-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-text-primary, #111827);
          }

          .case-meta {
            font-size: 12px;
            color: var(--color-text-secondary, #6b7280);
            display: flex;
            gap: 4px;
          }

          .radio {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid var(--color-border, #e5e7eb);
          }

          .radio--checked {
            border-color: var(--law-navy, #1E3A5F);
            background: var(--law-navy, #1E3A5F);
            position: relative;
          }

          .radio--checked::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: white;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 16px 20px;
            border-top: 1px solid var(--color-border, #e5e7eb);
          }

          .btn-secondary,
          .btn-primary {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-secondary {
            border: 1px solid var(--color-border, #e5e7eb);
            background: white;
            color: var(--color-text-primary, #111827);
          }

          .btn-secondary:hover {
            background: var(--color-bg-tertiary, #f3f4f6);
          }

          .btn-primary {
            border: none;
            background: var(--law-navy, #1E3A5F);
            color: white;
          }

          .btn-primary:hover {
            background: #2d4a6f;
          }

          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default LinkToCaseModal;
