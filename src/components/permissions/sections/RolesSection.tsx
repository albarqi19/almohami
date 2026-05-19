import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Lock, Shield, Users as UsersIcon } from 'lucide-react';
import RoleService, { type Role } from '../../../services/roleService';
import PermissionService, { type GroupedPermission } from '../../../services/permissionService';
import { Drawer } from '../ui/Drawer';
import { Field } from '../ui/DensePanel';

interface EditRoleState {
  open: boolean;
  mode: 'create' | 'edit';
  role: Role | null;
  name: string;
  displayName: string;
  description: string;
  selectedPermissions: Set<string>;
  saving: boolean;
}

const initialEditState: EditRoleState = {
  open: false,
  mode: 'create',
  role: null,
  name: '',
  displayName: '',
  description: '',
  selectedPermissions: new Set(),
  saving: false,
};

export const RolesSection: React.FC<{
  selectedRoleId: string | number | null;
  onSelectRole: (id: string | number | null) => void;
}> = ({ selectedRoleId, onSelectRole }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [groupedPerms, setGroupedPerms] = useState<GroupedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<EditRoleState>(initialEditState);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesResp, groupedResp] = await Promise.all([
        RoleService.getAllRoles({ per_page: 100 }),
        PermissionService.getGroupedPermissions(),
      ]);
      const rolesData = (rolesResp as any)?.data?.data ?? (rolesResp as any)?.data ?? [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      const grouped = (groupedResp as any)?.data ?? [];
      setGroupedPerms(Array.isArray(grouped) ? grouped : []);
    } catch (e) {
      console.error('RolesSection load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = roles.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.display_name || '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEdit({
      ...initialEditState,
      open: true,
      mode: 'create',
      selectedPermissions: new Set(),
    });
  };

  const openEdit = (role: Role) => {
    setEdit({
      open: true,
      mode: 'edit',
      role,
      name: role.name,
      displayName: role.display_name,
      description: role.description || '',
      selectedPermissions: new Set(role.permissions || []),
      saving: false,
    });
  };

  const togglePerm = (name: string) => {
    setEdit((s) => {
      const next = new Set(s.selectedPermissions);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...s, selectedPermissions: next };
    });
  };

  const handleSave = async () => {
    if (!edit.displayName.trim()) return;
    setEdit((s) => ({ ...s, saving: true }));
    try {
      const permissions = Array.from(edit.selectedPermissions);
      if (edit.mode === 'create') {
        await RoleService.createRole({
          name: edit.name.trim(),
          display_name: edit.displayName.trim(),
          description: edit.description.trim() || undefined,
          permissions,
        });
      } else if (edit.role) {
        await RoleService.updateRole(edit.role.id, {
          display_name: edit.displayName.trim(),
          description: edit.description.trim() || undefined,
          permissions,
        });
      }
      setEdit(initialEditState);
      await load();
    } catch (e: any) {
      alert(e?.message || 'فشل الحفظ');
      setEdit((s) => ({ ...s, saving: false }));
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) return;
    if (!confirm(`حذف الدور "${role.display_name}"؟`)) return;
    try {
      await RoleService.deleteRole(role.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'تعذر الحذف');
    }
  };

  return (
    <>
      <div className="erp-toolbar">
        <h2 className="erp-toolbar__title">الأدوار</h2>
        <span className="erp-toolbar__count">{filtered.length} دور</span>
        <div className="erp-toolbar__spacer" />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-text-faint)' }} />
          <input
            className="erp-input"
            style={{ paddingInlineStart: 26 }}
            placeholder="بحث في الأدوار..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="erp-btn erp-btn--primary" onClick={openCreate}>
          <Plus size={14} /> دور جديد
        </button>
      </div>

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="erp-empty">لا توجد أدوار مطابقة.</div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>الاسم</th>
                <th>المعرّف</th>
                <th>النوع</th>
                <th style={{ textAlign: 'center' }}>المستخدمون</th>
                <th style={{ textAlign: 'center' }}>الصلاحيات</th>
                <th style={{ width: 100, textAlign: 'end' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((role) => {
                const isSel = selectedRoleId === role.id;
                return (
                  <tr
                    key={role.id}
                    className={`${isSel ? 'erp-row--selected' : ''} ${role.is_system ? 'erp-row--system' : ''}`.trim()}
                    onClick={() => onSelectRole(role.id)}
                  >
                    <td>
                      {role.is_system ? (
                        <Lock size={12} style={{ color: 'var(--erp-text-faint)' }} />
                      ) : (
                        <Shield size={12} style={{ color: 'var(--erp-accent)' }} />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{role.display_name}</div>
                      {role.description && (
                        <div style={{ fontSize: 'var(--erp-text-xs)', color: 'var(--erp-text-muted)', marginTop: 2 }}>
                          {role.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: 11, color: 'var(--erp-text-muted)' }}>{role.name}</code>
                    </td>
                    <td>
                      {role.is_system ? (
                        <span className="erp-badge erp-badge--neutral">
                          <Lock size={9} /> نظامي
                        </span>
                      ) : (
                        <span className="erp-badge erp-badge--info">مخصص</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <UsersIcon size={11} style={{ color: 'var(--erp-text-faint)' }} />
                        {role.users_count ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{role.permissions_count ?? role.permissions?.length ?? 0}</td>
                    <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                      <button
                        className="erp-btn erp-btn--sm erp-btn--ghost"
                        title={role.is_system ? 'دور نظامي — للعرض فقط' : 'تعديل الدور'}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(role);
                        }}
                        disabled={role.is_system}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="erp-btn erp-btn--sm erp-btn--ghost erp-btn--danger"
                        title="حذف"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(role);
                        }}
                        disabled={role.is_system}
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
        open={edit.open}
        onClose={() => setEdit(initialEditState)}
        title={edit.mode === 'create' ? 'إنشاء دور جديد' : `تعديل: ${edit.displayName}`}
        subtitle={edit.role?.is_system ? 'دور نظامي — يمكن تعديل الصلاحيات فقط' : undefined}
        width={520}
        footer={
          <>
            <button className="erp-btn" onClick={() => setEdit(initialEditState)} disabled={edit.saving}>
              إلغاء
            </button>
            <button
              className="erp-btn erp-btn--primary"
              onClick={handleSave}
              disabled={edit.saving || !edit.displayName.trim() || (edit.mode === 'create' && !edit.name.trim())}
            >
              {edit.saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </>
        }
      >
        <Field label="المعرّف (name)">
          {edit.mode === 'create' ? (
            <input
              className="erp-input"
              style={{ width: '100%' }}
              placeholder="مثال: criminal_lawyer"
              value={edit.name}
              onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
            />
          ) : (
            <code style={{ fontSize: 11 }}>{edit.role?.name}</code>
          )}
        </Field>

        <Field label="الاسم المعروض">
          <input
            className="erp-input"
            style={{ width: '100%' }}
            placeholder="مثال: محامي قسم جزائي"
            value={edit.displayName}
            onChange={(e) => setEdit((s) => ({ ...s, displayName: e.target.value }))}
          />
        </Field>

        <Field label="الوصف">
          <textarea
            className="erp-input"
            style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
            placeholder="وصف اختياري للدور..."
            value={edit.description}
            onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
          />
        </Field>

        <Field label={`الصلاحيات (${edit.selectedPermissions.size} مفعّلة)`}>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--erp-border)', borderRadius: 4 }}>
            {groupedPerms.map((group) => (
              <div key={group.category}>
                <div
                  style={{
                    padding: '4px 8px',
                    background: 'var(--erp-bg-alt)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--erp-text-muted)',
                    borderBottom: '1px solid var(--erp-border)',
                  }}
                >
                  {group.category_display || group.category}
                </div>
                {group.permissions.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--erp-border)',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={edit.selectedPermissions.has(p.name)}
                      onChange={() => togglePerm(p.name)}
                      style={{ width: 14, height: 14, accentColor: 'var(--erp-accent)' }}
                    />
                    <span style={{ flex: 1 }}>{p.display_name || p.name}</span>
                    <code style={{ fontSize: 10, color: 'var(--erp-text-faint)' }}>{p.name}</code>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Field>
      </Drawer>
    </>
  );
};
