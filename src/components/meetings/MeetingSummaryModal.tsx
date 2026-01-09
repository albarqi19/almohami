import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle,
  ListChecks,
  Target,
  Plus,
  Trash2,
  User,
  Calendar,
  Save,
  ChevronDown,
  Sparkles,
  Check
} from 'lucide-react';
import {
  internalMeetingService,
  type InternalMeeting,
  type SaveSummaryData,
  type SummaryTask
} from '../../services/meetingService';
import { apiClient } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  meeting: InternalMeeting;
  onClose: () => void;
  onSave: () => void;
}

interface UserOption {
  id: number;
  name: string;
}

const MeetingSummaryModal: React.FC<Props> = ({ meeting, onClose, onSave }) => {
  const { user } = useAuth();

  // Check if user can edit
  const canEdit =
    meeting.status !== 'cancelled' &&
    (meeting.summary_permission === 'all_attendees' ||
      Number(meeting.created_by) === Number(user?.id));

  // State
  const [summary, setSummary] = useState(meeting.summary || '');
  const [points, setPoints] = useState<string[]>(meeting.summary_points || ['']);
  const [decisions, setDecisions] = useState<string[]>(meeting.summary_decisions || ['']);
  const [tasks, setTasks] = useState<SummaryTask[]>(
    meeting.summary_tasks || [{ title: '', assignee_id: undefined, due_date: '' }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [activeTab, setActiveTab] = useState<'points' | 'decisions' | 'tasks' | 'summary'>('points');

  // Fetch users for task assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get<any>('/users?roles=admin,lawyer,legal_assistant');
        let usersData: UserOption[] = [];
        // Fix for pagination structure
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          usersData = response.data.data;
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

  // Handlers
  const addPoint = () => setPoints([...points, '']);
  const updatePoint = (index: number, value: string) => {
    const newPoints = [...points];
    newPoints[index] = value;
    setPoints(newPoints);
  };
  const removePoint = (index: number) => {
    if (points.length > 1) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  const addDecision = () => setDecisions([...decisions, '']);
  const updateDecision = (index: number, value: string) => {
    const newDecisions = [...decisions];
    newDecisions[index] = value;
    setDecisions(newDecisions);
  };
  const removeDecision = (index: number) => {
    if (decisions.length > 1) {
      setDecisions(decisions.filter((_, i) => i !== index));
    }
  };

  const addTask = () => setTasks([...tasks, { title: '', assignee_id: undefined, due_date: '' }]);
  const updateTask = (index: number, field: keyof SummaryTask, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    if (field === 'assignee_id') {
      const assignee = users.find(u => u.id === value);
      newTasks[index].assignee_name = assignee?.name;
    }
    setTasks(newTasks);
  };
  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setError(null);
    const filteredPoints = points.filter(p => p.trim());
    const filteredDecisions = decisions.filter(d => d.trim());
    const filteredTasks = tasks.filter(t => t.title.trim());

    try {
      setLoading(true);
      const data: SaveSummaryData = {
        summary: summary || undefined,
        summary_points: filteredPoints.length > 0 ? filteredPoints : undefined,
        summary_decisions: filteredDecisions.length > 0 ? filteredDecisions : undefined,
        summary_tasks: filteredTasks.length > 0 ? filteredTasks : undefined,
      };

      await internalMeetingService.saveSummary(meeting.id, data);
      onSave();
    } catch (err: any) {
      console.error('Error saving summary:', err);
      setError(err.message || 'حدث خطأ في حفظ الملخص');
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon, count }: any) => (
    <button
      className={`notion-tab ${activeTab === id ? 'notion-tab--active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={14} />
      <span>{label}</span>
      {count > 0 && <span className="notion-badge">{count}</span>}
      {activeTab === id && <div className="notion-tab-indicator" />}
    </button>
  );

  return (
    <div className="notion-modal-overlay" onClick={onClose}>
      <div className="notion-modal notion-modal--wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notion-modal__header">
          <div className="notion-modal__icon">
            <Sparkles size={20} />
          </div>
          <div className="notion-modal__title-group">
            <h2 className="notion-modal__title">ملخص الاجتماع</h2>
            <span className="notion-modal__subtitle">{meeting.title}</span>
          </div>
          <button className="notion-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="notion-tabs">
          <TabButton
            id="points"
            label="النقاط الرئيسية"
            icon={ListChecks}
            count={points.filter(p => p.trim()).length}
          />
          <TabButton
            id="decisions"
            label="القرارات"
            icon={CheckCircle}
            count={decisions.filter(d => d.trim()).length}
          />
          <TabButton
            id="tasks"
            label="المهام"
            icon={Target}
            count={tasks.filter(t => t.title.trim()).length}
          />
          <TabButton
            id="summary"
            label="ملخص عام"
            icon={FileText}
            count={summary ? 1 : 0}
          />
        </div>

        {/* Body */}
        <div className="notion-modal__body">
          {error && <div className="notion-error">{error}</div>}

          <div className="notion-content">
            {activeTab === 'points' && (
              <div className="notion-list">
                {points.map((point, index) => (
                  <div key={index} className="notion-list-item">
                    <span className="notion-item-number">{index + 1}</span>
                    <input
                      type="text"
                      className="notion-input"
                      value={point}
                      onChange={(e) => updatePoint(index, e.target.value)}
                      placeholder="أضف نقطة رئيسية..."
                      disabled={!canEdit}
                      autoFocus={index === points.length - 1 && index > 0}
                    />
                    {canEdit && (
                      <button className="notion-icon-btn text-red" onClick={() => removePoint(index)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button className="notion-add-btn" onClick={addPoint}>
                    <Plus size={14} /> إضافة نقطة
                  </button>
                )}
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="notion-list">
                {decisions.map((decision, index) => (
                  <div key={index} className="notion-list-item notion-list-item--decision">
                    <div className="notion-checkbox">
                      <Check size={12} />
                    </div>
                    <input
                      type="text"
                      className="notion-input"
                      value={decision}
                      onChange={(e) => updateDecision(index, e.target.value)}
                      placeholder="أضف قراراً..."
                      disabled={!canEdit}
                      autoFocus={index === decisions.length - 1 && index > 0}
                    />
                    {canEdit && (
                      <button className="notion-icon-btn text-red" onClick={() => removeDecision(index)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button className="notion-add-btn" onClick={addDecision}>
                    <Plus size={14} /> إضافة قرار
                  </button>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="notion-list">
                {tasks.map((task, index) => (
                  <div key={index} className="notion-task-card">
                    <div className="notion-task-header">
                      <input
                        type="text"
                        className="notion-input font-medium"
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        placeholder="عنوان المهمة..."
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <button className="notion-icon-btn text-red" onClick={() => removeTask(index)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="notion-task-meta">
                      <div className="notion-meta-item">
                        <User size={12} />
                        <select
                          value={task.assignee_id || ''}
                          onChange={(e) => updateTask(index, 'assignee_id', e.target.value ? Number(e.target.value) : undefined)}
                          disabled={!canEdit}
                        >
                          <option value="">تعيين لمسؤول...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="notion-meta-item">
                        <Calendar size={12} />
                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={(e) => updateTask(index, 'due_date', e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <button className="notion-add-btn" onClick={addTask}>
                    <Plus size={14} /> إضافة مهمة
                  </button>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <textarea
                className="notion-textarea"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اكتب ملخصاً عاماً للاجتماع..."
                disabled={!canEdit}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="notion-modal__footer">
          <button className="notion-btn notion-btn--secondary" onClick={onClose}>
            إلغاء
          </button>
          {canEdit && (
            <button
              className="notion-btn notion-btn--primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          )}
        </div>

        <style>{`
          .notion-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            z-index: 1000;
            padding: 40px 20px;
            overflow-y: auto;
          }

          .notion-modal {
            background: var(--color-surface);
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid var(--color-border, #e5e7eb);
            animation: slideUp 0.2s ease-out;
            display: flex;
            flex-direction: column;
            max-height: 85vh;
          }

          .notion-modal--wide {
            max-width: 700px;
          }

          .notion-modal__header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
          }

          .notion-modal__icon {
            width: 36px; height: 36px;
            border-radius: 6px;
            background: var(--color-accent-soft, rgba(197, 165, 114, 0.15));
            color: var(--color-accent, #C5A572);
            display: flex; align-items: center; justify-content: center;
          }

          .notion-modal__title-group {
            flex: 1;
          }

          .notion-modal__title {
            font-size: 16px;
            font-weight: 600;
            color: var(--color-text);
            margin: 0;
          }

          .notion-modal__subtitle {
            font-size: 13px;
            color: var(--color-text-secondary);
          }

          .notion-close-btn {
            background: transparent;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            padding: 4px; border-radius: 4px;
          }
          .notion-close-btn:hover { background: var(--color-surface-subtle); color: var(--color-text); }

          .notion-tabs {
            display: flex;
            gap: 20px;
            padding: 0 24px;
            border-bottom: 1px solid var(--color-border, #e5e7eb);
            background: var(--color-surface);
          }

          .notion-tab {
            background: none;
            border: none;
            padding: 12px 4px;
            font-size: 13px;
            color: var(--color-text-secondary);
            cursor: pointer;
            display: flex; align-items: center; gap: 6px;
            position: relative;
          }

          .notion-tab:hover { color: var(--color-text); }
          .notion-tab--active { color: var(--color-text); font-weight: 500; }

          .notion-tab-indicator {
            position: absolute;
            bottom: -1px; left: 0; right: 0;
            height: 2px;
            background: var(--color-text);
          }

          .notion-badge {
            background: var(--color-surface-subtle);
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 10px;
            border: 1px solid var(--color-border);
          }

          .notion-modal__body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background: var(--color-surface-subtle);
          }

          .notion-content {
            background: var(--color-surface);
            border-radius: 8px;
            border: 1px solid var(--color-border, #e5e7eb);
            padding: 20px;
            min-height: 300px;
          }

          .notion-error {
            background: #FEF2F2; color: #DC2626; padding: 10px;
            border-radius: 6px; font-size: 13px; margin-bottom: 16px;
          }

          .notion-list {
            display: flex; flex-direction: column; gap: 8px;
          }

          .notion-list-item {
            display: flex; align-items: flex-start; gap: 8px;
            padding: 4px 0;
            transition: opacity 0.2s;
          }
          .notion-list-item:hover .notion-icon-btn { opacity: 1; }

          .notion-item-number {
            font-size: 12px; color: var(--color-text-secondary);
            width: 20px; padding-top: 8px;
          }

          .notion-input {
            flex: 1;
            border: none; background: transparent;
            padding: 6px 0;
            font-size: 14px; color: var(--color-text);
            outline: none;
            border-bottom: 1px solid transparent;
          }
          .notion-input:focus { border-bottom-color: var(--color-border); }
          .notion-input:disabled { color: var(--color-text-secondary); }

          .notion-icon-btn {
            background: none; border: none;
            color: var(--color-text-secondary);
            cursor: pointer; padding: 6px;
            opacity: 0; transition: all 0.2s;
          }
          .notion-icon-btn.text-red:hover { color: #EF4444; background: #FEF2F2; border-radius: 4px; }

          .notion-add-btn {
            background: none; border: none;
            color: var(--color-text-secondary);
            font-size: 13px;
            display: flex; align-items: center; gap: 6px;
            cursor: pointer; padding: 8px 0; margin-top: 4px;
          }
          .notion-add-btn:hover { color: var(--color-text); }

          .notion-checkbox {
            width: 18px; height: 18px;
            border: 1px solid var(--color-text-secondary);
            border-radius: 3px;
            display: flex; align-items: center; justify-content: center;
            margin-top: 6px;
            color: transparent;
          }
          .notion-list-item--decision .notion-checkbox { border-color: var(--color-success, #10B981); color: var(--color-success, #10B981); background: rgba(16, 185, 129, 0.1); }

          .notion-task-card {
            background: var(--color-surface-subtle);
            border: 1px solid var(--color-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
          }

          .notion-task-header {
            display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;
          }

          .notion-task-meta {
            display: flex; gap: 16px;
            padding-top: 8px; border-top: 1px solid var(--color-border);
          }

          .notion-meta-item {
            display: flex; align-items: center; gap: 6px;
            font-size: 12px; color: var(--color-text-secondary);
          }
          .notion-meta-item select, .notion-meta-item input {
            border: none; background: transparent;
            font-size: 12px; color: var(--color-text);
            outline: none; cursor: pointer;
          }

          .notion-textarea {
            width: 100%; height: 300px;
            border: none; background: transparent;
            font-size: 14px; line-height: 1.6; color: var(--color-text);
            outline: none; resize: none;
          }

          .notion-modal__footer {
            padding: 16px 24px;
            border-top: 1px solid var(--color-border, #e5e7eb);
            display: flex; justify-content: flex-end; gap: 12px;
            background: var(--color-surface);
            border-radius: 0 0 8px 8px;
          }

          .notion-btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px; font-weight: 500;
            cursor: pointer; transition: all 0.2s;
            border: 1px solid transparent;
          }
          .notion-btn--secondary {
            background: transparent; color: var(--color-text);
            border: 1px solid var(--color-border);
          }
          .notion-btn--secondary:hover { background: var(--color-surface-subtle); }
          .notion-btn--primary {
            background: var(--color-primary, #0A192F); color: white;
          }
          .notion-btn--primary:hover { opacity: 0.9; }
          .notion-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          
          .font-medium { font-weight: 500; }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default MeetingSummaryModal;
