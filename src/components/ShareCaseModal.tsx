import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle,
  Search,
  Trash2,
  Shield,
  Lock
} from 'lucide-react';
import { CaseService } from '../services/caseService';
import { UserService } from '../services/UserService';
import '../styles/share-case-modal.css';

interface ShareCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number | string;
  caseTitle: string;
  onSuccess?: () => void;
}

interface SelectableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface SharedUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface SharingPermission {
  can_share: boolean;
  is_admin: boolean;
  allow_lawyer_sharing: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  'admin': 'مدير',
  'partner': 'شريك',
  'senior_lawyer': 'محامي أول',
  'lawyer': 'محامي',
  'legal_assistant': 'مساعد قانوني',
  'assistant': 'مساعد'
};

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
  const [permission, setPermission] = useState<SharingPermission | null>(null);
  const [allUsers, setAllUsers] = useState<SelectableUser[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allowLawyerSharing, setAllowLawyerSharing] = useState(false);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, caseId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const permissionData = await CaseService.canShare(caseId);
      setPermission(permissionData);
      setAllowLawyerSharing(permissionData.allow_lawyer_sharing);
      if (permissionData.can_share) {
        const [usersData, sharesData] = await Promise.all([
          UserService.getLawyers(),
          CaseService.getCaseShares(caseId)
        ]);
        setAllUsers((usersData || []).map((u: any) => ({
          id: Number(u.id), name: u.name || '', email: u.email || '', role: u.role || ''
        })));
        setSharedUsers(sharesData);
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) { setError('اختر مستخدم واحد على الأقل'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await CaseService.shareCase(caseId, selectedUserIds);
      setSuccess('تمت المشاركة بنجاح');
      setSelectedUserIds([]);
      setSharedUsers(await CaseService.getCaseShares(caseId));
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'فشل في المشاركة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await CaseService.removeShare(caseId, userId);
      setSharedUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('تم إزالة المشاركة');
      onSuccess?.();
    } catch (err: any) { setError(err.message || 'فشل في الإزالة'); }
  };

  const handleToggle = async () => {
    try {
      const v = !allowLawyerSharing;
      await CaseService.updateSharingPermission(caseId, v);
      setAllowLawyerSharing(v);
      setSuccess(v ? 'تم السماح للمحامين بالمشاركة' : 'تم إلغاء السماح');
    } catch (err: any) { setError(err.message || 'فشل في التحديث'); }
  };

  const toggle = (id: number) => {
    setSelectedUserIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setError('');
  };

  const available = allUsers.filter(u =>
    !sharedUsers.some(s => s.id === u.id) &&
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  // No permission state
  if (!loading && permission && !permission.can_share) {
    return (
      <div className="sc-overlay" onClick={onClose}>
        <div className="sc-modal sc-modal--sm" onClick={e => e.stopPropagation()}>
          <div className="sc-header">
            <Lock size={14} className="sc-header__icon" />
            <span className="sc-header__title">مشاركة القضية</span>
            <div className="sc-header__spacer" />
            <button className="sc-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="sc-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <Shield size={36} style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-heading)', marginBottom: 6 }}>غير مصرح لك</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>صلاحية المشاركة متاحة للمدير فقط</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-overlay" onClick={onClose}>
      <div className="sc-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sc-header">
          <UserPlus size={14} className="sc-header__icon" />
          <span className="sc-header__title">مشاركة القضية</span>
          <span className="sc-header__case">{caseTitle}</span>
          <div className="sc-header__spacer" />
          {selectedUserIds.length > 0 && (
            <button className="sc-share-btn" onClick={handleShare} disabled={submitting}>
              <UserPlus size={13} />
              {submitting ? 'جاري...' : `مشاركة (${selectedUserIds.length})`}
            </button>
          )}
          <button className="sc-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`sc-alert ${error ? 'sc-alert--error' : 'sc-alert--success'}`}>
            {error ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
            {error || success}
          </div>
        )}

        {/* Body */}
        <div className="sc-body">
          {loading ? (
            <div className="sc-loading">جاري التحميل...</div>
          ) : (
            <div className="sc-grid">
              {/* Left: Current shares */}
              <div className="sc-panel">
                <div className="sc-panel__head">
                  <Users size={13} /> المشاركين الحاليين
                  <span className="sc-badge">{sharedUsers.length}</span>
                </div>
                <div className="sc-panel__body">
                  {sharedUsers.length === 0 ? (
                    <div className="sc-empty">لم تتم مشاركة القضية</div>
                  ) : sharedUsers.map(u => (
                    <div key={u.id} className="sc-user sc-user--shared">
                      <span className="sc-avatar">{u.name?.charAt(0)}</span>
                      <div className="sc-user__info">
                        <span className="sc-user__name">{u.name}</span>
                        <span className="sc-user__role">{ROLE_LABELS[u.role] || u.role}</span>
                      </div>
                      <button className="sc-remove" onClick={() => handleRemove(u.id)} title="إزالة">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Admin toggle */}
                  {permission?.is_admin && (
                    <div className="sc-toggle-row">
                      <label className="sc-toggle">
                        <input type="checkbox" checked={allowLawyerSharing} onChange={handleToggle} />
                        <span className="sc-toggle__track" />
                      </label>
                      <span className="sc-toggle__text">السماح للمحامين بالمشاركة</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Add users */}
              <div className="sc-panel">
                <div className="sc-panel__head">
                  <UserPlus size={13} /> إضافة مشاركين
                  <span className="sc-badge">{available.length}</span>
                </div>
                <div className="sc-search">
                  <Search size={13} />
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="sc-panel__body">
                  {available.length === 0 ? (
                    <div className="sc-empty">{searchTerm ? 'لا نتائج' : 'لا يوجد مستخدمين'}</div>
                  ) : available.map(u => (
                    <div
                      key={u.id}
                      className={`sc-user sc-user--selectable ${selectedUserIds.includes(u.id) ? 'sc-user--selected' : ''}`}
                      onClick={() => toggle(u.id)}
                    >
                      <input
                        type="checkbox"
                        className="sc-checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => {}}
                      />
                      <span className="sc-avatar">{u.name?.charAt(0)}</span>
                      <div className="sc-user__info">
                        <span className="sc-user__name">{u.name}</span>
                        <span className="sc-user__role">{ROLE_LABELS[u.role] || u.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareCaseModal;
