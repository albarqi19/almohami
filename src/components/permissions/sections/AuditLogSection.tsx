import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Plus as PlusIcon, Minus as MinusIcon, ChevronDown, ChevronLeft } from 'lucide-react';
import auditLogService, { type AuditLogEntry } from '../../../services/auditLogService';
import { Drawer } from '../ui/Drawer';
import { Field } from '../ui/DensePanel';
import { usePermissionContext } from '../../../contexts/PermissionContext';

const eventLabel: Record<string, string> = {
  role_created: 'إنشاء دور',
  role_updated: 'تعديل دور',
  role_deleted: 'حذف دور',
  permission_granted_to_role: 'منح صلاحية لدور',
  permission_revoked_from_role: 'سحب صلاحية من دور',
  role_assigned_to_user: 'إسناد دور لمستخدم',
  role_revoked_from_user: 'سحب دور من مستخدم',
  permission_granted_to_user: 'منح صلاحية مباشرة',
  permission_revoked_from_user: 'سحب صلاحية مباشرة',
  record_grant_created: 'منح وصول لسجل',
  record_grant_revoked: 'سحب وصول من سجل',
};

const eventBadgeKind = (e: string): string => {
  if (e.includes('deleted') || e.includes('revoked')) return 'erp-badge--danger';
  if (e.includes('created') || e.includes('granted') || e.includes('assigned')) return 'erp-badge--success';
  if (e.includes('updated')) return 'erp-badge--info';
  return 'erp-badge--neutral';
};

const formatRelative = (s: string): string => {
  try {
    const d = new Date(s);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `قبل ${h} ساعة`;
    const days = Math.floor(h / 24);
    if (days < 30) return `قبل ${days} يوم`;
    return d.toLocaleDateString('ar-SA');
  } catch {
    return s;
  }
};

const formatAbsolute = (s: string): string => {
  try {
    return new Date(s).toLocaleString('ar-SA');
  } catch {
    return s;
  }
};

/** قاموس عربي لأسماء الصلاحيات الشائعة — يُعرض بدل {resource}.{action} */
const permissionArabic: Record<string, string> = {
  // cases
  'cases.view': 'عرض القضايا', 'cases.create': 'إضافة قضية', 'cases.edit': 'تعديل قضية',
  'cases.delete': 'حذف قضية', 'cases.export': 'تصدير القضايا', 'cases.assign': 'إسناد قضية',
  'cases.archive': 'أرشفة قضية',
  // sessions
  'sessions.view': 'عرض الجلسات', 'sessions.create': 'إضافة جلسة', 'sessions.edit': 'تعديل جلسة',
  'sessions.delete': 'حذف جلسة', 'sessions.attend': 'تسجيل حضور جلسة',
  'sessions.briefs.view': 'عرض إيجاز الجلسة', 'sessions.briefs.generate': 'توليد إيجاز الجلسة',
  'sessions.motions.manage': 'إدارة المذكرات',
  // clients
  'clients.view': 'عرض الموكلين', 'clients.create': 'إضافة موكل', 'clients.edit': 'تعديل موكل',
  'clients.delete': 'حذف موكل', 'clients.export': 'تصدير الموكلين',
  'clients.financial.view': 'عرض الجانب المالي للموكل',
  // tasks
  'tasks.view': 'عرض المهام', 'tasks.create': 'إضافة مهمة', 'tasks.edit': 'تعديل مهمة',
  'tasks.delete': 'حذف مهمة', 'tasks.assign': 'إسناد مهمة',
  // documents
  'documents.view': 'عرض الوثائق', 'documents.upload': 'رفع وثيقة',
  'documents.edit': 'تعديل وثيقة', 'documents.delete': 'حذف وثيقة',
  'documents.download': 'تحميل وثيقة', 'documents.share': 'مشاركة وثيقة',
  // billing
  'billing.view': 'عرض الفوترة', 'billing.invoices.manage': 'إدارة الفواتير',
  'billing.payments.manage': 'إدارة المدفوعات', 'billing.reports.view': 'عرض التقارير المالية',
  'billing.reports.export': 'تصدير التقارير المالية', 'billing.expenses.manage': 'إدارة المصروفات',
  // contracts
  'contracts.view': 'عرض العقود', 'contracts.create': 'إضافة عقد',
  'contracts.edit': 'تعديل عقد', 'contracts.delete': 'حذف عقد',
  'contracts.templates.manage': 'إدارة قوالب العقود',
  // memos
  'memos.view': 'عرض المذكرات', 'memos.create': 'إضافة مذكرة',
  'memos.edit': 'تعديل مذكرة', 'memos.delete': 'حذف مذكرة',
  // consultations
  'consultations.view': 'عرض الاستشارات', 'consultations.create': 'إضافة استشارة',
  'consultations.edit': 'تعديل استشارة',
  // meetings
  'meetings.view': 'عرض الاجتماعات', 'meetings.create': 'إضافة اجتماع',
  'meetings.edit': 'تعديل اجتماع', 'meetings.delete': 'حذف اجتماع',
  // reports / dashboard / notifications
  'reports.view': 'عرض التقارير', 'reports.export': 'تصدير التقارير',
  'dashboard.kpis.view': 'عرض المؤشرات',
  'notifications.view': 'عرض الإشعارات', 'notifications.manage': 'إدارة الإشعارات',
  // integrations
  'ai.use': 'استخدام الذكاء الاصطناعي', 'whatsapp.send': 'إرسال واتساب',
  'najiz.import': 'استيراد من ناجز', 'wekala.manage': 'إدارة الوكالات',
  // users
  'users.view': 'عرض المستخدمين', 'users.create': 'إضافة مستخدم',
  'users.edit': 'تعديل مستخدم', 'users.delete': 'حذف مستخدم',
  'users.toggle_status': 'تفعيل/تعطيل مستخدم',
  // admin
  'roles.view': 'عرض الأدوار', 'roles.manage': 'إدارة الأدوار',
  'permissions.view': 'عرض الصلاحيات', 'permissions.manage': 'إدارة الصلاحيات',
  'permissions.grant_record': 'منح صلاحية على سجل',
  'tenant.settings.manage': 'إدارة إعدادات الشركة', 'audit.view': 'عرض سجل التغييرات',
  'system.manage': 'إدارة النظام',
};

const permLabel = (p: string) => permissionArabic[p] || p;

/**
 * يستخرج diff عربي من old/new values — يُعرض بدل JSON خام.
 *
 * يدعم الحالات الشائعة:
 *  - { permissions: [...] } → فرق الصلاحيات بالأسماء العربية
 *  - { name, display_name, ... } → عرض الحقول مع تسميات عربية
 *  - record_grant snapshot → user_id / resource / permission
 */
const computeFriendlyDiff = (entry: AuditLogEntry): { added: string[]; removed: string[]; other: Array<[string, unknown]> } => {
  const added: string[] = [];
  const removed: string[] = [];
  const other: Array<[string, unknown]> = [];

  // متى يكون permissions الـ diff الأساسي؟ نستخدم metadata.added/removed لو موجود
  const meta = entry.metadata as { added?: string[]; removed?: string[] } | null;
  if (meta?.added?.length) added.push(...meta.added.map(permLabel));
  if (meta?.removed?.length) removed.push(...meta.removed.map(permLabel));

  // لو لم يأتِ من metadata، نحسبه من old/new
  if (!added.length && !removed.length && entry.old_values && entry.new_values) {
    const oldP = (entry.old_values.permissions as string[] | undefined) || [];
    const newP = (entry.new_values.permissions as string[] | undefined) || [];
    if (Array.isArray(oldP) && Array.isArray(newP)) {
      newP.filter((p) => !oldP.includes(p)).forEach((p) => added.push(permLabel(p)));
      oldP.filter((p) => !newP.includes(p)).forEach((p) => removed.push(permLabel(p)));
    }
  }

  // حقول إضافية (record_grant snapshot، اسم دور جديد، ...)
  const friendlyKeys: Record<string, string> = {
    name: 'المعرّف',
    display_name: 'الاسم',
    description: 'الوصف',
    user_id: 'المستخدم #',
    resource_type: 'نوع المورد',
    resource_id: 'رقم المورد',
    permission: 'الصلاحية',
    expires_at: 'تاريخ الانتهاء',
    reason: 'السبب',
  };
  const source = entry.new_values || entry.old_values || {};
  Object.entries(source).forEach(([k, v]) => {
    if (k === 'permissions') return; // عرضناه أعلاه
    if (friendlyKeys[k] && v !== null && v !== undefined && v !== '') {
      other.push([friendlyKeys[k], v]);
    }
  });

  return { added, removed, other };
};

export const AuditLogSection: React.FC = () => {
  const { has, isSuperAdmin } = usePermissionContext();
  const canSeeRaw = isSuperAdmin || has('system.manage');

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await auditLogService.list({
        per_page: 100,
        ...(eventFilter ? { event: eventFilter } : {}),
      });
      setEntries(resp.data.data || []);
    } catch (e) {
      console.error('AuditLogSection load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [eventFilter]);

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.actor?.name || '').toLowerCase().includes(q) ||
      (e.target_label || '').toLowerCase().includes(q) ||
      e.event.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="erp-toolbar">
        <h2 className="erp-toolbar__title">سجل التغييرات</h2>
        <span className="erp-toolbar__count">{filtered.length} حدث</span>
        <div className="erp-toolbar__spacer" />

        <select
          className="erp-select"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="">كل الأحداث</option>
          {Object.entries(eventLabel).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>

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

        <button className="erp-btn" onClick={load} title="تحديث">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="erp-empty">لا توجد سجلات تغييرات بعد.</div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 120 }}>الوقت</th>
                <th>الفاعل</th>
                <th>الحدث</th>
                <th>الهدف</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} onClick={() => setSelected(e)}>
                  <td title={formatAbsolute(e.created_at)} style={{ color: 'var(--erp-text-muted)' }}>
                    {formatRelative(e.created_at)}
                  </td>
                  <td>{e.actor?.name || (e.actor_id ? `#${e.actor_id}` : 'النظام')}</td>
                  <td>
                    <span className={`erp-badge ${eventBadgeKind(e.event)}`}>
                      {eventLabel[e.event] || e.event}
                    </span>
                  </td>
                  <td>
                    {e.target_label || (e.target_type && e.target_id ? `${e.target_type} #${e.target_id}` : '—')}
                  </td>
                  <td style={{ color: 'var(--erp-text-muted)', fontSize: 11 }}>{e.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => { setSelected(null); setRawExpanded(false); }}
        title="تفاصيل الحدث"
        subtitle={selected ? formatAbsolute(selected.created_at) : undefined}
        width={460}
      >
        {selected && (() => {
          const diff = computeFriendlyDiff(selected);
          const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.other.length > 0;
          return (
            <>
              <Field label="الفاعل">{selected.actor?.name || `#${selected.actor_id ?? '—'}`}</Field>
              <Field label="الحدث">
                <span className={`erp-badge ${eventBadgeKind(selected.event)}`}>
                  {eventLabel[selected.event] || selected.event}
                </span>
              </Field>
              <Field label="الهدف">
                {selected.target_label || `${selected.target_type ?? '—'} #${selected.target_id ?? '—'}`}
              </Field>
              {selected.ip_address && <Field label="IP">{selected.ip_address}</Field>}

              {/* التغييرات — diff عربي مفهوم */}
              {hasChanges && (
                <Field label="التغييرات">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {diff.added.map((p, i) => (
                      <div key={`a-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <PlusIcon size={11} style={{ color: 'var(--erp-success)' }} />
                        <span style={{ color: 'var(--erp-success)' }}>{p}</span>
                      </div>
                    ))}
                    {diff.removed.map((p, i) => (
                      <div key={`r-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <MinusIcon size={11} style={{ color: 'var(--erp-danger)' }} />
                        <span style={{ color: 'var(--erp-danger)' }}>{p}</span>
                      </div>
                    ))}
                    {diff.other.map(([k, v], i) => (
                      <div key={`o-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '2px 0' }}>
                        <span style={{ color: 'var(--erp-text-muted)' }}>{k}:</span>
                        <span style={{ color: 'var(--erp-text)', textAlign: 'end' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              {!hasChanges && (
                <Field label="التغييرات">
                  <span style={{ color: 'var(--erp-text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                    لا تفاصيل إضافية لهذا الحدث.
                  </span>
                </Field>
              )}

              {/* عرض البيانات الخام — فقط لمن لديه system.manage */}
              {canSeeRaw && (selected.old_values || selected.new_values || selected.metadata) && (
                <div style={{ marginTop: 8, borderTop: '1px dashed var(--erp-border)', paddingTop: 8 }}>
                  <button
                    type="button"
                    className="erp-btn erp-btn--sm erp-btn--ghost"
                    onClick={() => setRawExpanded((s) => !s)}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--erp-text-muted)' }}>
                      عرض البيانات الخام (للأدمن المتقدم)
                    </span>
                    {rawExpanded ? <ChevronDown size={11} /> : <ChevronLeft size={11} />}
                  </button>
                  {rawExpanded && (
                    <div style={{ marginTop: 8 }}>
                      {selected.old_values && (
                        <Field label="القيم القديمة">
                          <pre style={{ fontSize: 10, background: 'var(--erp-bg-alt)', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 160, margin: 0 }}>
                            {JSON.stringify(selected.old_values, null, 2)}
                          </pre>
                        </Field>
                      )}
                      {selected.new_values && (
                        <Field label="القيم الجديدة">
                          <pre style={{ fontSize: 10, background: 'var(--erp-bg-alt)', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 160, margin: 0 }}>
                            {JSON.stringify(selected.new_values, null, 2)}
                          </pre>
                        </Field>
                      )}
                      {selected.metadata && (
                        <Field label="metadata">
                          <pre style={{ fontSize: 10, background: 'var(--erp-bg-alt)', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 160, margin: 0 }}>
                            {JSON.stringify(selected.metadata, null, 2)}
                          </pre>
                        </Field>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </Drawer>
    </>
  );
};
