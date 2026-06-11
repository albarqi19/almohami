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
  Lock,
  Star,
  Briefcase
} from 'lucide-react';
import { CaseService } from '../services/caseService';
import { UserService } from '../services/UserService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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
  is_responsible?: boolean;
}

interface EligibleParty {
  party_id: number;
  name: string;
  national_id: string | null;
  role: string | null;
  represents: string | null;
  matched_user_id: number | null;
  is_staff: boolean;
  already_shared: boolean;
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
  const [eligibleParties, setEligibleParties] = useState<EligibleParty[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
        const [usersData, sharesData, partiesData] = await Promise.all([
          UserService.getLawyers(),
          CaseService.getCaseShares(caseId),
          CaseService.getEligibleParties(caseId).catch(() => []),
        ]);
        setAllUsers((usersData || []).map((u: any) => ({
          id: Number(u.id), name: u.name || '', email: u.email || '', role: u.role || ''
        })));
        setSharedUsers(sharesData);
        setEligibleParties(partiesData);
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

  const handleToggleResponsibility = async (userId: number) => {
    setTogglingId(userId);
    setError(''); setSuccess('');
    try {
      const newVal = await CaseService.toggleResponsibility(caseId, userId);
      // The toggle may have auto-created a share row (when starring a party-only
      // lawyer), so re-fetch the shares list to keep the UI in sync.
      const shares = await CaseService.getCaseShares(caseId);
      setSharedUsers(shares);
      setSuccess(newVal ? 'تم تعيينه كمسؤول' : 'تم إلغاء المسؤولية');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'فشل في تعديل المسؤولية');
    } finally {
      setTogglingId(null);
    }
  };

  const toggle = (id: number) => {
    setSelectedUserIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setError('');
  };

  // Build unified team list: explicit shares + lawyers from case parties who are staff.
  // A user appearing in BOTH is shown once with both badges.
  type TeamRow = {
    user_id: number;
    name: string;
    email?: string;
    role: string;
    is_responsible: boolean;
    is_share: boolean;       // explicit row in case_shares
    is_party: boolean;       // appears as a lawyer party in this case
    represents?: string | null;
  };

  const teamRows: TeamRow[] = (() => {
    const byUserId = new Map<number, TeamRow>();
    sharedUsers.forEach(u => {
      byUserId.set(u.id, {
        user_id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_responsible: !!u.is_responsible,
        is_share: true,
        is_party: false,
      });
    });
    eligibleParties.forEach(p => {
      if (!p.is_staff || !p.matched_user_id) return;
      const existing = byUserId.get(p.matched_user_id);
      if (existing) {
        existing.is_party = true;
        existing.represents = p.represents;
      } else {
        // Lawyer is a party + staff but not yet a share — show implicitly so admin
        // can star them without an extra "add" step.
        const staff = allUsers.find(s => s.id === p.matched_user_id);
        byUserId.set(p.matched_user_id, {
          user_id: p.matched_user_id,
          name: p.name || staff?.name || '',
          email: staff?.email,
          role: staff?.role || '',
          is_responsible: false,
          is_share: false,
          is_party: true,
          represents: p.represents,
        });
      }
    });
    // Responsibles first, then shares, then party-only.
    return Array.from(byUserId.values()).sort((a, b) => {
      if (a.is_responsible !== b.is_responsible) return a.is_responsible ? -1 : 1;
      if (a.is_share !== b.is_share) return a.is_share ? -1 : 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  })();

  // Users available to share with: not in shares, not already implicit via party.
  const teamUserIds = new Set(teamRows.map(r => r.user_id));
  const available = allUsers.filter(u =>
    !teamUserIds.has(u.id) &&
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
            <span className="sc-header__title">مسؤول القضية ومشاركتها</span>
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
          <span className="sc-header__title">مسؤول القضية ومشاركتها</span>
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
              {/* Left: Team (shares + lawyer parties who are staff) */}
              <div className="sc-panel">
                <div className="sc-panel__head">
                  <Users size={13} /> فريق القضية
                  <span className="sc-badge">{teamRows.length}</span>
                </div>
                <div className="sc-panel__body">
                  {teamRows.length === 0 ? (
                    <div className="sc-empty">لا يوجد أعضاء بعد</div>
                  ) : teamRows.map(r => (
                    <div
                      key={r.user_id}
                      className={`sc-user sc-user--shared ${r.is_responsible ? 'sc-user--responsible' : ''} ${!r.is_share && r.is_party ? 'sc-user--party-only' : ''}`}
                    >
                      <span className="sc-avatar">{r.name?.charAt(0)}</span>
                      <div className="sc-user__info">
                        <span className="sc-user__name">
                          {r.name}
                          {r.is_responsible && <span className="sc-resp-tag" title="مسؤول"><Star size={10} fill="currentColor" /> مسؤول</span>}
                          {r.is_party && <span className="sc-party-tag" title={r.represents ? `يمثل: ${r.represents}` : 'طرف في القضية'}><Briefcase size={9} /> كطرف</span>}
                        </span>
                        <span className="sc-user__role">{ROLE_LABELS[r.role] || r.role || '—'}</span>
                      </div>
                      <button
                        className={`sc-star ${r.is_responsible ? 'sc-star--active' : ''}`}
                        onClick={() => handleToggleResponsibility(r.user_id)}
                        disabled={togglingId === r.user_id}
                        title={r.is_responsible ? 'إلغاء المسؤولية' : 'تعيين كمسؤول'}
                      >
                        <Star size={13} fill={r.is_responsible ? 'currentColor' : 'none'} />
                      </button>
                      {r.is_share ? (
                        <button className="sc-remove" onClick={() => handleRemove(r.user_id)} title="إزالة المشاركة">
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="sc-remove sc-remove--placeholder" title="عضو تلقائي بحكم كونه طرفاً">
                          <Lock size={11} />
                        </span>
                      )}
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
