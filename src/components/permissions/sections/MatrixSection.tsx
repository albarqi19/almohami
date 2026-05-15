import React, { useEffect, useMemo, useState } from 'react';
import { Save, Undo2, Search, Lock, AlertCircle, CheckSquare, Square } from 'lucide-react';
import RoleService, { type Role } from '../../../services/roleService';
import PermissionService, { type GroupedPermission } from '../../../services/permissionService';

/**
 * Permissions Matrix بنمط draft → save:
 *  - الصفوف: الصلاحيات (مجمّعة بفئات)
 *  - الأعمدة: الأدوار
 *  - الخلايا: checkboxes
 *  - تغييرات في state محلي فقط حتى ضغط "حفظ"
 *  - "تجاهل" يعيد كل شيء للأصل
 *  - الأدوار النظامية تظهر بخلفية رمادية لكن لا تُمنع التعديل (لأن المستخدم قد يحتاج لذلك)
 */
export const MatrixSection: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [grouped, setGrouped] = useState<GroupedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // الحالة الأصلية (server): map[roleId] = Set<permission name>
  const [original, setOriginal] = useState<Record<string, Set<string>>>({});
  // الحالة الحالية (draft): map[roleId] = Set<permission name>
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});

  const cloneState = (s: Record<string, Set<string>>): Record<string, Set<string>> => {
    const out: Record<string, Set<string>> = {};
    Object.entries(s).forEach(([k, v]) => (out[k] = new Set(v)));
    return out;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [rolesResp, groupedResp] = await Promise.all([
        RoleService.getAllRoles({ per_page: 100 }),
        PermissionService.getGroupedPermissions(),
      ]);
      const rolesData = ((rolesResp as any)?.data?.data ?? (rolesResp as any)?.data ?? []) as Role[];
      setRoles(rolesData);
      const groupedData = ((groupedResp as any)?.data ?? []) as GroupedPermission[];
      setGrouped(groupedData);

      // بناء الـ original من بيانات الأدوار
      const orig: Record<string, Set<string>> = {};
      rolesData.forEach((r) => {
        orig[String(r.id)] = new Set(r.permissions || []);
      });
      setOriginal(orig);
      setDraft(cloneState(orig));
    } catch (e) {
      console.error('MatrixSection load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleCell = (roleId: string | number, permName: string) => {
    setDraft((s) => {
      const key = String(roleId);
      const next = cloneState(s);
      const set = next[key] || new Set();
      if (set.has(permName)) set.delete(permName);
      else set.add(permName);
      next[key] = set;
      return next;
    });
  };

  const toggleColumnAll = (roleId: string | number, allPermNames: string[]) => {
    setDraft((s) => {
      const key = String(roleId);
      const next = cloneState(s);
      const current = next[key] || new Set();
      const allChecked = allPermNames.every((p) => current.has(p));
      if (allChecked) {
        allPermNames.forEach((p) => current.delete(p));
      } else {
        allPermNames.forEach((p) => current.add(p));
      }
      next[key] = current;
      return next;
    });
  };

  // حساب التغييرات
  const changes = useMemo(() => {
    const out: { roleId: string; added: string[]; removed: string[] }[] = [];
    Object.keys(original).forEach((roleId) => {
      const orig = original[roleId] || new Set();
      const cur = draft[roleId] || new Set();
      const added: string[] = [];
      const removed: string[] = [];
      cur.forEach((p) => {
        if (!orig.has(p)) added.push(p);
      });
      orig.forEach((p) => {
        if (!cur.has(p)) removed.push(p);
      });
      if (added.length || removed.length) {
        out.push({ roleId, added, removed });
      }
    });
    return out;
  }, [original, draft]);

  const totalChanges = changes.reduce((sum, c) => sum + c.added.length + c.removed.length, 0);

  const handleSave = async () => {
    if (totalChanges === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        changes.map((c) => {
          const role = roles.find((r) => String(r.id) === c.roleId);
          if (!role) return null;
          const next = Array.from(draft[c.roleId] || new Set());
          return RoleService.syncPermissions(role.id, next);
        })
      );
      await load();
    } catch (e: any) {
      alert(e?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(cloneState(original));
  };

  // فلترة الفئات حسب البحث
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.display_name || '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [grouped, search]);

  if (loading) {
    return <div className="erp-empty">جاري التحميل...</div>;
  }

  return (
    <>
      <div className="erp-toolbar">
        <h2 className="erp-toolbar__title">مصفوفة الصلاحيات</h2>
        <span className="erp-toolbar__count">
          {grouped.reduce((s, g) => s + g.permissions.length, 0)} صلاحية × {roles.length} دور
        </span>
        <div className="erp-toolbar__spacer" />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-text-faint)' }} />
          <input
            className="erp-input"
            style={{ paddingInlineStart: 26 }}
            placeholder="بحث في الصلاحيات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {totalChanges > 0 && (
        <div className="erp-matrix-bar">
          <AlertCircle size={14} />
          <span style={{ flex: 1 }}>
            {totalChanges} تغيير معلّق على {changes.length} دور — لم يُحفظ بعد
          </span>
          <button className="erp-btn erp-btn--sm" onClick={handleDiscard} disabled={saving}>
            <Undo2 size={12} /> تجاهل
          </button>
          <button className="erp-btn erp-btn--sm erp-btn--primary" onClick={handleSave} disabled={saving}>
            <Save size={12} /> {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      )}

      <div className="erp-matrix-wrap">
        <table className="erp-matrix-table">
          <thead>
            <tr>
              <th className="erp-matrix-th--sticky-left" style={{ minWidth: 220 }}>الصلاحية</th>
              {roles.map((r) => {
                const allNames = grouped.flatMap((g) => g.permissions.map((p) => p.name));
                const current = draft[String(r.id)] || new Set();
                const allChecked = allNames.length > 0 && allNames.every((n) => current.has(n));
                return (
                  <th key={r.id} style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {r.is_system && <Lock size={9} style={{ color: 'var(--erp-text-faint)' }} />}
                        {r.display_name}
                      </span>
                      <button
                        className="erp-btn erp-btn--sm erp-btn--ghost"
                        title="تحديد/إلغاء الكل"
                        onClick={() => toggleColumnAll(r.id, allNames)}
                        style={{ padding: 2 }}
                      >
                        {allChecked ? <CheckSquare size={11} /> : <Square size={11} />}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredGrouped.map((group) => (
              <React.Fragment key={group.category}>
                <tr>
                  <th className="erp-matrix-group erp-matrix-th--sticky-left" colSpan={roles.length + 1}>
                    {group.category_display || group.category} · {group.permissions.length}
                  </th>
                </tr>
                {group.permissions.map((perm) => (
                  <tr key={perm.id}>
                    <th>
                      <div>{perm.display_name || perm.name}</div>
                      <code style={{ fontSize: 10, color: 'var(--erp-text-faint)' }}>{perm.name}</code>
                    </th>
                    {roles.map((r) => {
                      const checked = draft[String(r.id)]?.has(perm.name) ?? false;
                      const origChecked = original[String(r.id)]?.has(perm.name) ?? false;
                      const isDirty = checked !== origChecked;
                      return (
                        <td
                          key={r.id}
                          className={`erp-matrix-cell ${r.is_system ? 'erp-matrix-cell--system' : ''}`.trim()}
                          style={isDirty ? { boxShadow: 'inset 0 0 0 2px var(--erp-warn)' } : undefined}
                        >
                          <input
                            type="checkbox"
                            className="erp-matrix-cell__check"
                            checked={checked}
                            onChange={() => toggleCell(r.id, perm.name)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
