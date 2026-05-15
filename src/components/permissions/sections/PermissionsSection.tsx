import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronLeft } from 'lucide-react';
import PermissionService, { type GroupedPermission } from '../../../services/permissionService';

/**
 * عرض كل الصلاحيات مجمّعة حسب الفئة (read-only — Spatie default).
 * المستخدم العادي لا يقدر يحذف/يضيف صلاحيات (هذا يكون عبر Permissions Matrix على دور).
 */
export const PermissionsSection: React.FC = () => {
  const [grouped, setGrouped] = useState<GroupedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const resp = await PermissionService.getGroupedPermissions();
        const data = ((resp as any)?.data ?? []) as GroupedPermission[];
        setGrouped(data);
        // افتح كل الفئات افتراضيًا
        setExpanded(new Set(data.map((g) => g.category)));
      } catch (e) {
        console.error('PermissionsSection load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (cat: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = grouped
    .map((g) => ({
      ...g,
      permissions: g.permissions.filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.display_name || '').toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.permissions.length > 0);

  const total = filtered.reduce((s, g) => s + g.permissions.length, 0);

  return (
    <>
      <div className="erp-toolbar">
        <h2 className="erp-toolbar__title">الصلاحيات</h2>
        <span className="erp-toolbar__count">{total} صلاحية</span>
        <div className="erp-toolbar__spacer" />
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
      </div>

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="erp-empty">لا توجد صلاحيات مطابقة.</div>
        ) : (
          filtered.map((g) => {
            const isOpen = expanded.has(g.category);
            return (
              <div key={g.category} style={{ borderBottom: '1px solid var(--erp-border)' }}>
                <button
                  onClick={() => toggle(g.category)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--erp-bg-alt)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--erp-text-muted)',
                    textAlign: 'start',
                  }}
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
                  <span style={{ flex: 1 }}>{g.category_display || g.category}</span>
                  <span style={{ fontSize: 10, fontWeight: 400 }}>{g.permissions.length}</span>
                </button>
                {isOpen && (
                  <table className="erp-table">
                    <tbody>
                      {g.permissions.map((p) => (
                        <tr key={p.id} style={{ cursor: 'default' }}>
                          <td style={{ paddingInlineStart: 28 }}>
                            <code style={{ fontSize: 11, color: 'var(--erp-text-muted)' }}>{p.name}</code>
                          </td>
                          <td>{p.display_name}</td>
                          <td style={{ color: 'var(--erp-text-muted)' }}>{p.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
