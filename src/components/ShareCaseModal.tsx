import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle,
  Search,
  Trash2
} from 'lucide-react';
import { CaseService } from '../services/caseService';
import { UserService } from '../services/UserService';
import type { User } from '../types';
import '../styles/share-case-modal.css';

interface ShareCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number | string;
  caseTitle: string;
  onSuccess?: () => void;
}

interface SharedUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const ShareCaseModal: React.FC<ShareCaseModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, caseId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, sharesData] = await Promise.all([
        UserService.getAllUsers({ limit: 100 }),
        CaseService.getCaseShares(caseId)
      ]);

      // Get users from paginated response
      const usersData = usersResponse.data || [];

      // Filter to get only lawyers and assistants
      const filteredUsers = usersData.filter(
        (user: User) => ['lawyer', 'senior_lawyer', 'partner', 'legal_assistant', 'admin'].includes(user.role)
      );

      setAllUsers(filteredUsers);
      setSharedUsers(sharesData);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      setError('الرجاء اختيار مستخدم واحد على الأقل');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await CaseService.shareCase(caseId, selectedUserIds);
      setSuccess('تمت مشاركة القضية بنجاح');
      setSelectedUserIds([]);

      // Reload shares
      const sharesData = await CaseService.getCaseShares(caseId);
      setSharedUsers(sharesData);

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'فشل في مشاركة القضية');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveShare = async (userId: number) => {
    try {
      await CaseService.removeShare(caseId, userId);
      setSharedUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('تم إزالة المشاركة');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'فشل في إزالة المشاركة');
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setError('');
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'admin': 'مدير',
      'partner': 'شريك',
      'senior_lawyer': 'محامي أول',
      'lawyer': 'محامي',
      'legal_assistant': 'مساعد قانوني',
      'assistant': 'مساعد'
    };
    return roles[role] || role;
  };

  // Filter users that are not already shared
  const availableUsers = allUsers.filter(user =>
    !sharedUsers.some(shared => shared.id === user.id) &&
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <UserPlus size={20} /> مشاركة القضية
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="share-case-subtitle">
            مشاركة: <strong>{caseTitle}</strong>
          </div>

          {error && (
            <div className="modal-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div className="modal-success">
              <CheckCircle size={14} /> {success}
            </div>
          )}

          {loading ? (
            <div className="share-case-loading">جاري التحميل...</div>
          ) : (
            <>
              {/* Currently shared users */}
              {sharedUsers.length > 0 && (
                <div className="share-case-section">
                  <h3 className="share-case-section__title">
                    <Users size={16} /> المشاركين الحاليين ({sharedUsers.length})
                  </h3>
                  <div className="share-case-list">
                    {sharedUsers.map(user => (
                      <div key={user.id} className="share-user-item share-user-item--shared">
                        <div className="share-user-item__avatar">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="share-user-item__info">
                          <div className="share-user-item__name">{user.name}</div>
                          <div className="share-user-item__role">{getRoleLabel(user.role)}</div>
                        </div>
                        <button
                          className="share-user-item__remove"
                          onClick={() => handleRemoveShare(user.id)}
                          title="إزالة المشاركة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new users */}
              <div className="share-case-section">
                <h3 className="share-case-section__title">
                  <UserPlus size={16} /> إضافة مشاركين
                </h3>

                <div className="share-case-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="البحث عن مستخدم..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="share-case-list share-case-list--selectable">
                  {availableUsers.length === 0 ? (
                    <div className="share-case-empty">
                      {searchTerm ? 'لا يوجد نتائج' : 'لا يوجد مستخدمين متاحين'}
                    </div>
                  ) : (
                    availableUsers.map(user => (
                      <div
                        key={user.id}
                        className={`share-user-item ${selectedUserIds.includes(user.id) ? 'share-user-item--selected' : ''}`}
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <div className="share-user-item__checkbox">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => {}}
                          />
                        </div>
                        <div className="share-user-item__avatar">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="share-user-item__info">
                          <div className="share-user-item__name">{user.name}</div>
                          <div className="share-user-item__role">{getRoleLabel(user.role)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            إغلاق
          </button>
          <button
            className="btn-primary"
            onClick={handleShare}
            disabled={submitting || loading || selectedUserIds.length === 0}
          >
            <UserPlus size={16} />
            {submitting ? 'جاري المشاركة...' : `مشاركة (${selectedUserIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCaseModal;
