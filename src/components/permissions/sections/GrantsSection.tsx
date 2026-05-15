import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, FileText, Calendar, FileCheck, ListChecks } from 'lucide-react';
import recordGrantService, {
  type RecordGrant,
  type RecordGrantResourceType,
} from '../../../services/recordGrantService';
import { Drawer } from '../ui/Drawer';
import { Field } from '../ui/DensePanel';

const resourceIcon: Record<RecordGrantResourceType, React.ComponentType<{ size?: number }>> = {
  case: FileText,
  session: Calendar,
  document: FileCheck,
  task: ListChecks,
};

const resourceLabel: Record<RecordGrantResourceType, string> = {
  case: 'قضية',
  session: 'جلسة',
  document: 'وثيقة',
  task: 'مهمة',
};

const permLabel: Record<string, string> = {
  view: 'عرض',
  edit: 'تعديل',
  comment: 'تعليق',
};

const statusBadge = (g: RecordGrant): React.ReactElement => {
  if (g.expires_at) {
    const exp = new Date(g.expires_at);
    if (exp < new Date()) {
      return <span className="erp-badge erp-badge--neutral">منتهٍ</span>;
    }
    const hoursLeft = (exp.getTime() - Date.now()) / 36e5;
    if (hoursLeft < 24) {
      return <span className="erp-badge erp-badge--warn">ينتهي قريبًا</span>;
    }
  }
  return <span className="erp-badge erp-badge--success">ساري</span>;
};

const formatDate = (s: string | null) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
};

interface NewGrantState {
  open: boolean;
  userId: string;
  resourceType: RecordGrantResourceType;
  resourceId: string;
  permission: 'view' | 'edit' | 'comment';
  duration: '1h' | '1d' | '7d' | '30d' | 'permanent';
  reason: string;
  saving: boolean;
}

const initialNewGrant: NewGrantState = {
  open: false,
  userId: '',
  resourceType: 'case',
  resourceId: '',
  permission: 'view',
  duration: '7d',
  reason: '',
  saving: false,
};

const durationToISO = (d: NewGrantState['duration']): string | null => {
  if (d === 'permanent') return null;
  const map = { '1h': 3600, '1d': 86400, '7d': 86400 * 7, '30d': 86400 * 30 };
  return new Date(Date.now() + map[d] * 1000).toISOString();
};

export const GrantsSection: React.FC = () => {
  const [grants, setGrants] = useState<RecordGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RecordGrantResourceType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [newGrant, setNewGrant] = useState<NewGrantState>(initialNewGrant);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await recordGrantService.list({
        per_page: 100,
        ...(filter !== 'all' ? { resource_type: filter } : {}),
      });
      setGrants(resp.data.data || []);
    } catch (e) {
      console.error('GrantsSection load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const filtered = grants.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (g.user?.name || '').toLowerCase().includes(q) ||
      String(g.resource_id).includes(q) ||
      (g.reason || '').toLowerCase().includes(q)
    );
  });

  const handleRevoke = async (g: RecordGrant) => {
    if (!confirm(`سحب الوصول من ${g.user?.name || 'المستخدم'}؟`)) return;
    try {
      await recordGrantService.revoke(g.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'فشل السحب');
    }
  };

  const handleCreate = async () => {
    if (!newGrant.userId || !newGrant.resourceId) {
      alert('الرجاء إدخال user_id و resource_id');
      return;
    }
    setNewGrant((s) => ({ ...s, saving: true }));
    try {
      await recordGrantService.create({
        user_id: parseInt(newGrant.userId, 10),
        resource_type: newGrant.resourceType,
        resource_id: parseInt(newGrant.resourceId, 10),
        permission: newGrant.permission,
        expires_at: durationToISO(newGrant.duration),
        reason: newGrant.reason || null,
      });
      setNewGrant(initialNewGrant);
      await load();
    } catch (e: any) {
      alert(e?.message || 'فشل المنح');
      setNewGrant((s) => ({ ...s, saving: false }));
    }
  };

  return (
    <>
      <div className="erp-toolbar">
        <h2 className="erp-toolbar__title">منح الوصول للسجلات</h2>
        <span className="erp-toolbar__count">{filtered.length} منحة</span>
        <div className="erp-toolbar__spacer" />

        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'case', 'session', 'document', 'task'] as const).map((f) => (
            <button
              key={f}
              className={`erp-chip${filter === f ? ' erp-chip--active' : ''}`}
              onClick={() => setFilter(f)}
              style={{ cursor: 'pointer' }}
            >
              {f === 'all' ? 'الكل' : resourceLabel[f]}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-text-faint)' }} />
          <input
            className="erp-input"
            style={{ paddingInlineStart: 26 }}
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="erp-btn erp-btn--primary" onClick={() => setNewGrant({ ...initialNewGrant, open: true })}>
          <Plus size={14} /> منح جديد
        </button>
      </div>

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="erp-empty">لا توجد منح حالية.</div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>المورد</th>
                <th>الصلاحية</th>
                <th>مُنحت من</th>
                <th>التاريخ</th>
                <th>الانتهاء</th>
                <th>الحالة</th>
                <th>السبب</th>
                <th style={{ width: 60, textAlign: 'end' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const Icon = resourceIcon[g.resource_type];
                return (
                  <tr key={g.id}>
                    <td>{g.user?.name || `#${g.user_id}`}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon size={12} />
                        {resourceLabel[g.resource_type]} #{g.resource_id}
                      </span>
                    </td>
                    <td>
                      <span className="erp-badge erp-badge--accent">{permLabel[g.permission] || g.permission}</span>
                    </td>
                    <td>{g.grantor?.name || `#${g.granted_by}`}</td>
                    <td style={{ color: 'var(--erp-text-muted)' }}>{formatDate(g.granted_at)}</td>
                    <td style={{ color: 'var(--erp-text-muted)' }}>
                      {g.expires_at ? formatDate(g.expires_at) : <span style={{ fontStyle: 'italic' }}>دائم</span>}
                    </td>
                    <td>{statusBadge(g)}</td>
                    <td style={{ color: 'var(--erp-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.reason || ''}>
                      {g.reason || '—'}
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <button
                        className="erp-btn erp-btn--sm erp-btn--ghost erp-btn--danger"
                        title="سحب الوصول"
                        onClick={() => handleRevoke(g)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Drawer
        open={newGrant.open}
        onClose={() => setNewGrant(initialNewGrant)}
        title="منح وصول جديد"
        width={420}
        footer={
          <>
            <button className="erp-btn" onClick={() => setNewGrant(initialNewGrant)} disabled={newGrant.saving}>
              إلغاء
            </button>
            <button
              className="erp-btn erp-btn--primary"
              onClick={handleCreate}
              disabled={newGrant.saving || !newGrant.userId || !newGrant.resourceId}
            >
              {newGrant.saving ? 'جاري المنح...' : 'منح'}
            </button>
          </>
        }
      >
        <Field label="معرّف المستخدم (user_id)">
          <input
            type="number"
            className="erp-input"
            style={{ width: '100%' }}
            placeholder="مثال: 1234"
            value={newGrant.userId}
            onChange={(e) => setNewGrant((s) => ({ ...s, userId: e.target.value }))}
          />
        </Field>

        <Field label="نوع المورد">
          <select
            className="erp-select"
            style={{ width: '100%' }}
            value={newGrant.resourceType}
            onChange={(e) => setNewGrant((s) => ({ ...s, resourceType: e.target.value as RecordGrantResourceType }))}
          >
            <option value="case">قضية</option>
            <option value="session">جلسة</option>
            <option value="document">وثيقة</option>
            <option value="task">مهمة</option>
          </select>
        </Field>

        <Field label="معرّف المورد">
          <input
            type="number"
            className="erp-input"
            style={{ width: '100%' }}
            placeholder="مثال: 5678"
            value={newGrant.resourceId}
            onChange={(e) => setNewGrant((s) => ({ ...s, resourceId: e.target.value }))}
          />
        </Field>

        <Field label="مستوى الوصول">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['view', 'edit', 'comment'] as const).map((p) => (
              <label
                key={p}
                className={`erp-chip${newGrant.permission === p ? ' erp-chip--active' : ''}`}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <input
                  type="radio"
                  name="perm"
                  checked={newGrant.permission === p}
                  onChange={() => setNewGrant((s) => ({ ...s, permission: p }))}
                  style={{ display: 'none' }}
                />
                {permLabel[p]}
              </label>
            ))}
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
                className={`erp-chip${newGrant.duration === k ? ' erp-chip--active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="dur"
                  checked={newGrant.duration === k}
                  onChange={() => setNewGrant((s) => ({ ...s, duration: k }))}
                  style={{ display: 'none' }}
                />
                {l}
              </label>
            ))}
          </div>
        </Field>

        <Field label="السبب (اختياري)">
          <textarea
            className="erp-input"
            style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
            placeholder="مثال: مراجعة مالية لقضية محددة"
            value={newGrant.reason}
            onChange={(e) => setNewGrant((s) => ({ ...s, reason: e.target.value }))}
          />
        </Field>
      </Drawer>
    </>
  );
};
