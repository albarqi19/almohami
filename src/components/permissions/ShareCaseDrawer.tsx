import React, { useState } from 'react';
import recordGrantService from '../../services/recordGrantService';
import { Drawer } from './ui/Drawer';
import { Field } from './ui/DensePanel';
import '../../styles/erp-permissions.css';

interface ShareCaseDrawerProps {
  open: boolean;
  onClose: () => void;
  caseId: number;
  caseTitle?: string;
  onGranted?: () => void;
}

type Duration = '1h' | '1d' | '7d' | '30d' | 'permanent';

const durationToISO = (d: Duration): string | null => {
  if (d === 'permanent') return null;
  const map = { '1h': 3600, '1d': 86400, '7d': 86400 * 7, '30d': 86400 * 30 };
  return new Date(Date.now() + map[d] * 1000).toISOString();
};

/**
 * Drawer يُستخدم من داخل صفحة القضية لمنح وصول مؤقت لمستخدم آخر على هذه القضية.
 */
export const ShareCaseDrawer: React.FC<ShareCaseDrawerProps> = ({
  open,
  onClose,
  caseId,
  caseTitle,
  onGranted,
}) => {
  const [userId, setUserId] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [duration, setDuration] = useState<Duration>('7d');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUserId('');
    setPermission('view');
    setDuration('7d');
    setReason('');
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!userId.trim()) return;
    setSaving(true);
    try {
      await recordGrantService.create({
        user_id: parseInt(userId, 10),
        resource_type: 'case',
        resource_id: caseId,
        permission,
        expires_at: durationToISO(duration),
        reason: reason.trim() || null,
      });
      onGranted?.();
      handleClose();
    } catch (e: any) {
      alert(e?.message || 'فشل المنح');
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="مشاركة القضية"
      subtitle={caseTitle ? `قضية: ${caseTitle}` : `قضية #${caseId}`}
      width={400}
      footer={
        <>
          <button className="erp-btn" onClick={handleClose} disabled={saving}>
            إلغاء
          </button>
          <button className="erp-btn erp-btn--primary" onClick={handleSubmit} disabled={saving || !userId.trim()}>
            {saving ? 'جاري المنح...' : 'منح الوصول'}
          </button>
        </>
      }
    >
      <Field label="معرّف المستخدم">
        <input
          type="number"
          className="erp-input"
          style={{ width: '100%' }}
          placeholder="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </Field>

      <Field label="مستوى الوصول">
        <div style={{ display: 'flex', gap: 6 }}>
          <label className={`erp-chip${permission === 'view' ? ' erp-chip--active' : ''}`} style={{ cursor: 'pointer' }}>
            <input type="radio" checked={permission === 'view'} onChange={() => setPermission('view')} style={{ display: 'none' }} />
            عرض فقط
          </label>
          <label className={`erp-chip${permission === 'edit' ? ' erp-chip--active' : ''}`} style={{ cursor: 'pointer' }}>
            <input type="radio" checked={permission === 'edit'} onChange={() => setPermission('edit')} style={{ display: 'none' }} />
            عرض وتعديل
          </label>
        </div>
      </Field>

      <Field label="المدة">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            ['1h', 'ساعة'],
            ['1d', 'يوم'],
            ['7d', 'أسبوع'],
            ['30d', 'شهر'],
            ['permanent', 'دائم'],
          ] as const).map(([k, l]) => (
            <label
              key={k}
              className={`erp-chip${duration === k ? ' erp-chip--active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <input type="radio" checked={duration === k} onChange={() => setDuration(k)} style={{ display: 'none' }} />
              {l}
            </label>
          ))}
        </div>
      </Field>

      <Field label="السبب (اختياري)">
        <textarea
          className="erp-input"
          style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
          placeholder="مثال: تدقيق مالي مؤقت"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </Drawer>
  );
};
