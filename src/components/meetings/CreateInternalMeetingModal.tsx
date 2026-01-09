import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Check,
  Search,
  FileText,
  ChevronDown,
  Sparkles,
  Settings,
  Shield,
  Clock3
} from 'lucide-react';
import {
  internalMeetingService,
  type InternalMeeting,
  type CreateInternalMeetingData,
  type UpdateInternalMeetingData
} from '../../services/meetingService';
import { apiClient } from '../../utils/api';

interface Props {
  meeting?: InternalMeeting | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
  role: string;
}

const CreateInternalMeetingModal: React.FC<Props> = ({ meeting, onClose, onSuccess }) => {
  const isEditing = !!meeting;

  // Form State
  const [title, setTitle] = useState(meeting?.title || '');
  const [agenda, setAgenda] = useState(meeting?.agenda || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(meeting?.duration_minutes || 60);
  const [location, setLocation] = useState(meeting?.location || '');
  const [videoUrl, setVideoUrl] = useState(meeting?.video_meeting_url || '');
  const [meetingType, setMeetingType] = useState<'physical' | 'remote'>(
    meeting?.video_meeting_url ? 'remote' : 'physical'
  );
  const [participantIds, setParticipantIds] = useState<number[]>(
    meeting?.participants?.map(p => p.user_id) || []
  );

  // Advanced State
  const [joinBefore, setJoinBefore] = useState(meeting?.join_button_minutes_before || 15);
  const [joinAfter, setJoinAfter] = useState(meeting?.join_button_minutes_after || 30);
  const [summaryPermission, setSummaryPermission] = useState<'creator_only' | 'all_attendees'>(
    meeting?.summary_permission || 'creator_only'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);

  // Initialize date/time
  useEffect(() => {
    if (meeting?.scheduled_at) {
      const dt = new Date(meeting.scheduled_at);
      setDate(dt.toISOString().split('T')[0]);
      setTime(dt.toTimeString().slice(0, 5));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('10:00');
    }
  }, [meeting]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; data: { data: UserOption[] } | UserOption[] }>(
          '/users?roles=admin,lawyer,legal_assistant'
        );
        let usersData: UserOption[] = [];
        if (response.data && 'data' in response.data && Array.isArray((response.data as any).data)) {
          usersData = (response.data as any).data;
        } else if (Array.isArray(response.data)) {
          usersData = response.data;
        }
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
  });

  const toggleParticipant = (userId: number) => {
    if (participantIds.includes(userId)) {
      setParticipantIds(participantIds.filter(id => id !== userId));
    } else {
      setParticipantIds([...participantIds, userId]);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError('يرجى إدخال عنوان الاجتماع');
      return;
    }
    if (!date || !time) {
      setError('يرجى تحديد تاريخ ووقت الاجتماع');
      return;
    }
    if (participantIds.length === 0) {
      setError('يرجى اختيار مشارك واحد على الأقل');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    try {
      setLoading(true);

      const baseData = {
        title,
        agenda: agenda || undefined,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        location: meetingType === 'physical' ? location : undefined,
        video_meeting_url: meetingType === 'remote' ? videoUrl : undefined,
        video_provider: meetingType === 'remote' ? 'manual' : undefined,
        participants: participantIds,
        join_button_minutes_before: joinBefore,
        join_button_minutes_after: joinAfter,
        summary_permission: summaryPermission,
      };

      if (isEditing && meeting) {
        await internalMeetingService.update(meeting.id, baseData as UpdateInternalMeetingData);
      } else {
        await internalMeetingService.create(baseData as CreateInternalMeetingData);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      setError(err.message || 'حدث خطأ في حفظ الاجتماع');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: 'مدير', lawyer: 'محامي', legal_assistant: 'مساعد قانوني' };
    return labels[role] || role;
  };

  const selectedUsers = users.filter(u => participantIds.includes(u.id));

  return (
    <div className="notion-modal-overlay" onClick={onClose}>
      <div className="notion-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-modal__header">
          <div className="notion-modal__icon">
            <Sparkles size={20} />
          </div>
          <input
            type="text"
            className="notion-modal__title-input"
            placeholder="عنوان الاجتماع..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <button className="notion-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="notion-modal__body">
          {error && (
            <div className="notion-error">{error}</div>
          )}

          {/* Properties */}
          <div className="notion-properties">
            {/* Date & Time */}
            <div className="notion-property">
              <div className="notion-property__label">
                <Calendar size={14} />
                <span>التاريخ</span>
              </div>
              <div className="notion-property__value">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="notion-property">
              <div className="notion-property__label">
                <Clock size={14} />
                <span>الوقت</span>
              </div>
              <div className="notion-property__value">
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div className="notion-property">
              <div className="notion-property__label">
                <Clock size={14} />
                <span>المدة</span>
              </div>
              <div className="notion-property__value">
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>ساعة واحدة</option>
                  <option value={90}>ساعة ونصف</option>
                  <option value={120}>ساعتين</option>
                </select>
              </div>
            </div>

            {/* Meeting Type */}
            <div className="notion-property">
              <div className="notion-property__label">
                {meetingType === 'remote' ? <Video size={14} /> : <MapPin size={14} />}
                <span>النوع</span>
              </div>
              <div className="notion-property__value notion-property__value--buttons">
                <button
                  className={`notion-type-btn ${meetingType === 'physical' ? 'notion-type-btn--active' : ''}`}
                  onClick={() => setMeetingType('physical')}
                >
                  <MapPin size={12} /> حضوري
                </button>
                <button
                  className={`notion-type-btn ${meetingType === 'remote' ? 'notion-type-btn--active' : ''}`}
                  onClick={() => setMeetingType('remote')}
                >
                  <Video size={12} /> عن بعد
                </button>
              </div>
            </div>

            {/* Location or Video URL */}
            {meetingType === 'physical' ? (
              <div className="notion-property">
                <div className="notion-property__label">
                  <MapPin size={14} />
                  <span>المكان</span>
                </div>
                <div className="notion-property__value">
                  <input
                    type="text"
                    placeholder="أدخل مكان الاجتماع..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="notion-property">
                <div className="notion-property__label">
                  <Video size={14} />
                  <span>الرابط</span>
                </div>
                <div className="notion-property__value">
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="notion-property notion-property--participants">
              <div className="notion-property__label">
                <Users size={14} />
                <span>المشاركون</span>
              </div>
              <div
                className="notion-property__value notion-property__value--clickable"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                {selectedUsers.length > 0 ? (
                  <div className="notion-selected-users">
                    {selectedUsers.slice(0, 5).map(user => (
                      <span key={user.id} className="notion-user-chip">
                        {user.name}
                      </span>
                    ))}
                    {selectedUsers.length > 5 && (
                      <span className="notion-more">+{selectedUsers.length - 5}</span>
                    )}
                  </div>
                ) : (
                  <span className="notion-placeholder">اختر المشاركين...</span>
                )}
                <ChevronDown size={14} className={showParticipants ? 'rotated' : ''} />
              </div>

              {showParticipants && (
                <div className="notion-users-dropdown">
                  <div className="notion-users-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="بحث..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="notion-users-list">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="notion-user-option"
                        onClick={() => toggleParticipant(user.id)}
                      >
                        <div className="notion-user-avatar">{user.name.charAt(0)}</div>
                        <span className="notion-user-name">{user.name}</span>
                        {participantIds.includes(user.id) && (
                          <Check size={14} className="notion-check" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="notion-advanced-section">
            <div
              className="notion-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <div className="toggle-label">
                <Settings size={14} />
                <span>إعدادات متقدمة</span>
              </div>
              <ChevronDown size={14} className={`transform-transition ${showAdvanced ? 'rotate-180' : ''}`} />
            </div>

            {showAdvanced && (
              <div className="notion-advanced-content">
                {/* Smart Button Windows */}
                <div className="notion-property">
                  <div className="notion-property__label">
                    <Clock3 size={14} />
                    <span>ظهور الزر</span>
                  </div>
                  <div className="notion-property__value" style={{ gap: '12px' }}>
                    <div className="mini-input-group">
                      <label>قبل (دقيقة)</label>
                      <input
                        type="number"
                        min="0"
                        value={joinBefore}
                        onChange={(e) => setJoinBefore(Number(e.target.value))}
                      />
                    </div>
                    <div className="mini-input-group">
                      <label>بعد (دقيقة)</label>
                      <input
                        type="number"
                        min="0"
                        value={joinAfter}
                        onChange={(e) => setJoinAfter(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Permission */}
                <div className="notion-property">
                  <div className="notion-property__label">
                    <Shield size={14} />
                    <span>صلاحية الملخص</span>
                  </div>
                  <div className="notion-property__value">
                    <select
                      value={summaryPermission}
                      onChange={(e) => setSummaryPermission(e.target.value as any)}
                    >
                      <option value="creator_only">المنشئ فقط</option>
                      <option value="all_attendees">جميع المشاركين</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agenda */}
          <div className="notion-agenda">
            <div className="notion-agenda__label">
              <FileText size={14} />
              <span>جدول الأعمال</span>
            </div>
            <textarea
              placeholder="اكتب جدول الأعمال والنقاط المراد مناقشتها..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={4}
            />
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
            {loading ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء الاجتماع'}
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
            overflow-y: auto;
          }

          .notion-modal {
            background: var(--color-surface);
            border-radius: 8px;
            width: 100%;
            max-width: 560px;
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
            background: var(--color-accent-soft, rgba(197, 165, 114, 0.15));
            color: var(--color-accent, #C5A572);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .notion-modal__title-input {
            flex: 1;
            border: none;
            background: none;
            font-size: 24px;
            font-weight: 600;
            color: var(--color-text);
            outline: none;
          }

          .notion-modal__title-input::placeholder {
            color: var(--color-text-secondary);
            opacity: 0.5;
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
            margin-bottom: 20px;
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
            padding: 4px 8px;
            border-radius: 4px;
          }

          .notion-property__value--clickable:hover {
            background: var(--color-surface-subtle);
          }

          .notion-selected-users {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .notion-user-chip {
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--color-surface-subtle);
            font-size: 12px;
            color: var(--color-text);
          }

          .notion-more {
            padding: 2px 6px;
            font-size: 11px;
            color: var(--color-text-secondary);
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
            right: 120px; /* Align with value start */
            left: 0;
            background: var(--color-surface);
            border: 1px solid var(--color-border, #e5e7eb);
            border-radius: 8px;
            margin-top: 4px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

          .notion-users-search svg {
            color: var(--color-text-secondary);
          }

          .notion-users-list {
            max-height: 200px;
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

          .notion-user-option input {
            display: none;
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

          .notion-agenda {
            border-top: 1px solid var(--color-border, #e5e7eb);
            padding-top: 16px;
          }

          .notion-agenda__label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--color-text-secondary);
            margin-bottom: 8px;
          }

          .notion-agenda textarea {
            width: 100%;
            border: none;
            background: transparent;
            font-size: 14px;
            color: var(--color-text);
            outline: none;
            resize: vertical;
            min-height: 80px;
            line-height: 1.6;
          }

          .notion-agenda textarea::placeholder {
            color: var(--color-text-secondary);
            opacity: 0.5;
          }

          .notion-users-search svg {
            color: var(--color-text-secondary);
          }

          .notion-advanced-section {
            margin-top: 8px;
            border-top: 1px solid var(--color-border, #e5e7eb);
            padding-top: 8px;
          }

          .notion-advanced-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            color: var(--color-text-secondary);
            font-size: 13px;
            font-weight: 500;
          }

          .notion-advanced-toggle:hover {
            background: var(--color-surface-subtle);
            color: var(--color-text);
          }

          .toggle-label {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .transform-transition {
            transition: transform 0.2s;
          }

          .rotate-180 {
            transform: rotate(180deg);
          }

          .notion-advanced-content {
            padding-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .mini-input-group {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--color-surface-subtle);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--color-text-secondary);
          }

          .mini-input-group input {
            width: 40px !important;
            text-align: center;
            font-weight: 500;
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
    </div >
  );
};

export default CreateInternalMeetingModal;
