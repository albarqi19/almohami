import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarClock,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  EstablishmentAdminService,
  DATE_CATEGORY_LABELS,
  remainingLabel,
  type DatePayload,
  type EmployeePayload,
  type EstablishmentDate,
  type EstablishmentEmployee,
  type EstablishmentOverview,
  type ExpiryStatus,
} from '../../services/establishmentService';

/**
 * تبويب «بوابة المنشأة» في صفحة العميل بالمكتب — إدارة كاملة بالنمط الملتصق:
 * إعدادات البوابة والتنبيهات، موظفو المنشأة (إضافة سريعة ملتصقة + تعديل/حذف)،
 * المواعيد والاشتراكات، وأعلام ظهور/تنبيه مستندات العميل في البوابة.
 * (رفع المستندات نفسها يبقى من تبويب «المستندات» القائم.)
 */

interface Props {
  clientId: number;
  /** المكتب يملك clients.edit؟ بدونها تُعرض القراءة فقط. */
  canEdit: boolean;
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB');
};

const STATUS_META: Record<ExpiryStatus, { label: string; cls: string }> = {
  valid: { label: 'ساري', cls: 'est-chip--valid' },
  soon: { label: 'يقترب', cls: 'est-chip--soon' },
  critical: { label: 'حرِج', cls: 'est-chip--critical' },
  expired: { label: 'منتهٍ', cls: 'est-chip--expired' },
  none: { label: 'بلا تاريخ', cls: 'est-chip--none' },
};
const StatusChip = ({ status }: { status: ExpiryStatus }) => (
  <span className={`est-chip ${STATUS_META[status].cls}`}>{STATUS_META[status].label}</span>
);

const EMPTY_EMPLOYEE: EmployeePayload = {
  name: '',
  job_title: '',
  national_id: '',
  id_expiry_date: '',
  has_medical_insurance: false,
  insurance_expiry_date: '',
};

const EMPTY_DATE: DatePayload = { title: '', category: 'other', reference_number: '', due_date: '' };

export default function EstablishmentAdminTab({ clientId, canEdit }: Props) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client-establishment-admin', clientId] });

  const { data, isLoading, isError, error, refetch } = useQuery<EstablishmentOverview>({
    queryKey: ['client-establishment-admin', clientId],
    queryFn: () => EstablishmentAdminService.getOverview(clientId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const [empForm, setEmpForm] = useState<EmployeePayload>(EMPTY_EMPLOYEE);
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [dateForm, setDateForm] = useState<DatePayload>(EMPTY_DATE);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (e: any) => setActionError(e?.message || 'تعذّر تنفيذ العملية'),
  });

  const saveSettings = (patch: Record<string, unknown>) =>
    run.mutate(() => EstablishmentAdminService.updateSettings(clientId, patch));

  const submitEmployee = () => {
    if (!empForm.name?.trim()) return;
    const payload: EmployeePayload = {
      ...empForm,
      job_title: empForm.job_title || null,
      national_id: empForm.national_id || null,
      id_expiry_date: empForm.id_expiry_date || null,
      insurance_expiry_date: empForm.has_medical_insurance ? empForm.insurance_expiry_date || null : null,
    };
    run.mutate(async () => {
      if (editingEmpId) {
        await EstablishmentAdminService.updateEmployee(clientId, editingEmpId, payload);
      } else {
        await EstablishmentAdminService.createEmployee(clientId, payload);
      }
      setEmpForm(EMPTY_EMPLOYEE);
      setEditingEmpId(null);
    });
  };

  const startEditEmployee = (emp: EstablishmentEmployee) => {
    setEditingEmpId(emp.id);
    setEmpForm({
      name: emp.name,
      job_title: emp.job_title || '',
      national_id: emp.national_id || '',
      id_expiry_date: emp.id_expiry_date || '',
      has_medical_insurance: emp.has_medical_insurance,
      insurance_expiry_date: emp.insurance_expiry_date || '',
    });
  };

  const submitDate = () => {
    if (!dateForm.title?.trim() || !dateForm.due_date) return;
    const payload: DatePayload = { ...dateForm, reference_number: dateForm.reference_number || null };
    run.mutate(async () => {
      if (editingDateId) {
        await EstablishmentAdminService.updateDate(clientId, editingDateId, payload);
      } else {
        await EstablishmentAdminService.createDate(clientId, payload);
      }
      setDateForm(EMPTY_DATE);
      setEditingDateId(null);
    });
  };

  const startEditDate = (d: EstablishmentDate) => {
    setEditingDateId(d.id);
    setDateForm({
      title: d.title,
      category: d.category,
      reference_number: d.reference_number || '',
      due_date: d.due_date || '',
    });
  };

  if (isLoading) {
    return (
      <div className="est-state" style={{ minHeight: 220 }}>
        <div className="est-state__box">
          <Loader2 size={26} className="animate-spin" />
          <b>جارٍ تحميل بوابة المنشأة…</b>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="est-state" style={{ minHeight: 220 }}>
        <div className="est-state__box">
          <Landmark size={30} />
          <b>تعذّر التحميل</b>
          <span>{(error as Error)?.message || 'حدث خطأ غير متوقع'}</span>
          <button className="est-btn" onClick={() => refetch()}>
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const { settings, employees, dates, documents, stats } = data;

  const Toggle = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button
      className={`est-switch${on ? ' est-switch--on' : ''}`}
      onClick={onClick}
      disabled={disabled || !canEdit || run.isPending}
      aria-label="تبديل"
    />
  );

  return (
    <div className="est-admin" dir="rtl">
      {/* ═══ إعدادات البوابة والتنبيهات ═══ */}
      <div className="est-sec__head">
        <div className="est-sec__title">
          <Landmark size={14} /> بوابة المنشأة — إعدادات هذا العميل
        </div>
        <span className="est-sec__meta">
          {run.isPending ? 'جارٍ الحفظ…' : `يراها العميل في «منشأتي» · ${stats.documents_total} مستند / ${stats.employees_total} موظف`}
        </span>
      </div>
      {actionError && (
        <div className="est-sec__head" style={{ background: 'var(--status-red-light, #FEE2E2)' }}>
          <div className="est-sec__title" style={{ color: 'var(--status-red)' }}>{actionError}</div>
        </div>
      )}
      <div className="est-admin-settings">
        <div className="est-admin-settings__cell">
          <Eye size={14} /> إظهار البوابة للعميل
          <Toggle on={!!settings.portal_enabled} onClick={() => saveSettings({ portal_enabled: !settings.portal_enabled })} />
        </div>
        <div className="est-admin-settings__cell">
          <Bell size={14} /> التنبيهات
          <Toggle on={settings.alerts_enabled} onClick={() => saveSettings({ alerts_enabled: !settings.alerts_enabled })} />
        </div>
        <div className="est-admin-settings__cell">
          <FileText size={14} /> تنبيهات المستندات
          <Toggle on={settings.notify_documents} onClick={() => saveSettings({ notify_documents: !settings.notify_documents })} />
        </div>
        <div className="est-admin-settings__cell">
          <Users size={14} /> تنبيهات الموظفين
          <Toggle on={settings.notify_employees} onClick={() => saveSettings({ notify_employees: !settings.notify_employees })} />
        </div>
        <div className="est-admin-settings__cell">
          <ShieldCheck size={14} /> إشعار طاقم المكتب أيضاً
          <Toggle on={!!settings.notify_office} onClick={() => saveSettings({ notify_office: !settings.notify_office })} />
        </div>
        <div className="est-admin-settings__cell">
          أيام التنبيه:
          <b style={{ fontWeight: 700 }} className="est-num">
            {settings.alert_days.join(' / ')}
          </b>
          <span className="est-muted" style={{ fontSize: 11 }}>(يخصّصها العميل من بوابته أيضاً)</span>
        </div>
      </div>

      {/* ═══ موظفو المنشأة ═══ */}
      <section className="est-sec">
        <div className="est-sec__head">
          <div className="est-sec__title">
            <Users size={14} /> موظفو المنشأة
          </div>
          <span className="est-sec__meta">
            {employees.length} موظفاً · مؤمَّن {stats.employees_insured}
          </span>
        </div>

        {canEdit && (
          <div className="est-quickadd">
            <input
              style={{ flex: 2, minWidth: 140 }}
              placeholder="اسم الموظف *"
              value={empForm.name}
              onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
            />
            <input
              style={{ flex: 1.2, minWidth: 110 }}
              placeholder="المسمى الوظيفي"
              value={empForm.job_title ?? ''}
              onChange={(e) => setEmpForm({ ...empForm, job_title: e.target.value })}
            />
            <input
              style={{ flex: 1.2, minWidth: 120 }}
              placeholder="رقم الهوية/الإقامة"
              value={empForm.national_id ?? ''}
              onChange={(e) => setEmpForm({ ...empForm, national_id: e.target.value })}
            />
            <input
              type="date"
              title="تاريخ انتهاء الهوية/الإقامة"
              value={empForm.id_expiry_date ?? ''}
              onChange={(e) => setEmpForm({ ...empForm, id_expiry_date: e.target.value })}
            />
            <label className="est-qa-check">
              <input
                type="checkbox"
                checked={!!empForm.has_medical_insurance}
                onChange={(e) => setEmpForm({ ...empForm, has_medical_insurance: e.target.checked })}
              />
              تأمين طبي
            </label>
            {empForm.has_medical_insurance && (
              <input
                type="date"
                title="تاريخ انتهاء التأمين"
                value={empForm.insurance_expiry_date ?? ''}
                onChange={(e) => setEmpForm({ ...empForm, insurance_expiry_date: e.target.value })}
              />
            )}
            <button className="est-qa-submit" onClick={submitEmployee} disabled={run.isPending || !empForm.name?.trim()}>
              {editingEmpId ? <Save size={14} /> : <Plus size={14} />}
              {editingEmpId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            {editingEmpId && (
              <button
                className="est-qa-cancel"
                onClick={() => {
                  setEditingEmpId(null);
                  setEmpForm(EMPTY_EMPLOYEE);
                }}
              >
                <X size={13} /> إلغاء
              </button>
            )}
          </div>
        )}

        <div className="est-sec__body">
          {employees.length === 0 ? (
            <div className="est-empty">
              <Users size={26} />
              <b>لا موظفون بعد</b>
              <span>أضِف موظفي منشأة العميل من الشريط أعلاه — أسماء ووثائق فقط، لا علاقة لهم بمستخدمي النظام</span>
            </div>
          ) : (
            <div className="est-tbl-wrap" style={{ overflowX: 'auto' }}>
              <table className="est-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>الهوية/الإقامة</th>
                    <th>انتهاء الهوية</th>
                    <th>الحالة</th>
                    <th>التأمين</th>
                    <th>انتهاء التأمين</th>
                    <th>تنبيه</th>
                    {canEdit && <th style={{ width: 80 }} />}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className={emp.id_status === 'expired' ? 'est-row--expired' : undefined}>
                      <td>
                        <div className="est-cell-main">
                          <div className="est-cell-main__ico">
                            <CreditCard size={14} />
                          </div>
                          <div className="est-cell-main__txt">
                            <div className="est-cell-main__title">{emp.name}</div>
                            <div className="est-cell-main__sub">{emp.job_title || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="est-num">{emp.national_id || '—'}</td>
                      <td className="est-date">
                        {fmtDate(emp.id_expiry_date)}
                        <div className="est-cell-main__sub">{remainingLabel(emp.id_days_remaining)}</div>
                      </td>
                      <td>
                        <StatusChip status={emp.id_status} />
                      </td>
                      <td>
                        <span className={`est-chip ${emp.has_medical_insurance ? 'est-chip--yes' : 'est-chip--no'}`}>
                          {emp.has_medical_insurance ? 'نعم' : 'لا'}
                        </span>
                      </td>
                      <td className="est-date">{emp.has_medical_insurance ? fmtDate(emp.insurance_expiry_date) : '—'}</td>
                      <td>
                        <Toggle
                          on={emp.alerts_enabled}
                          onClick={() =>
                            run.mutate(() =>
                              EstablishmentAdminService.updateEmployee(clientId, emp.id, {
                                name: emp.name,
                                job_title: emp.job_title,
                                national_id: emp.national_id,
                                id_expiry_date: emp.id_expiry_date,
                                has_medical_insurance: emp.has_medical_insurance,
                                insurance_expiry_date: emp.insurance_expiry_date,
                                alerts_enabled: !emp.alerts_enabled,
                              })
                            )
                          }
                        />
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="est-icon-btn" title="تعديل" onClick={() => startEditEmployee(emp)}>
                              <Pencil size={13} />
                            </button>
                            <button
                              className="est-icon-btn est-icon-btn--danger"
                              title="حذف"
                              onClick={() => {
                                if (window.confirm(`حذف الموظف «${emp.name}» من بوابة المنشأة؟`)) {
                                  run.mutate(() => EstablishmentAdminService.deleteEmployee(clientId, emp.id));
                                }
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ═══ المواعيد والاشتراكات ═══ */}
      <section className="est-sec" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="est-sec__head">
          <div className="est-sec__title">
            <CalendarClock size={14} /> مواعيد واشتراكات المنشأة
          </div>
          <span className="est-sec__meta">{dates.length} عنصراً</span>
        </div>

        {canEdit && (
          <div className="est-quickadd">
            <input
              style={{ flex: 2, minWidth: 150 }}
              placeholder="العنوان (رخصة بلدية، اشتراك منصة…) *"
              value={dateForm.title}
              onChange={(e) => setDateForm({ ...dateForm, title: e.target.value })}
            />
            <select value={dateForm.category} onChange={(e) => setDateForm({ ...dateForm, category: e.target.value })}>
              {Object.entries(DATE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              style={{ flex: 1, minWidth: 110 }}
              placeholder="الرقم المرجعي"
              value={dateForm.reference_number ?? ''}
              onChange={(e) => setDateForm({ ...dateForm, reference_number: e.target.value })}
            />
            <input
              type="date"
              title="تاريخ الاستحقاق"
              value={dateForm.due_date}
              onChange={(e) => setDateForm({ ...dateForm, due_date: e.target.value })}
            />
            <button
              className="est-qa-submit"
              onClick={submitDate}
              disabled={run.isPending || !dateForm.title?.trim() || !dateForm.due_date}
            >
              {editingDateId ? <Save size={14} /> : <Plus size={14} />}
              {editingDateId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            {editingDateId && (
              <button
                className="est-qa-cancel"
                onClick={() => {
                  setEditingDateId(null);
                  setDateForm(EMPTY_DATE);
                }}
              >
                <X size={13} /> إلغاء
              </button>
            )}
          </div>
        )}

        <div className="est-sec__body">
          {dates.length === 0 ? (
            <div className="est-empty">
              <CalendarClock size={26} />
              <b>لا مواعيد بعد</b>
              <span>أي استحقاق بتاريخ (بلا ملف): رخص، اشتراكات، تجديدات — يظهر للعميل وتُرسل تنبيهاته آلياً</span>
            </div>
          ) : (
            <div className="est-tbl-wrap" style={{ overflowX: 'auto' }}>
              <table className="est-table">
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>التصنيف</th>
                    <th>الرقم</th>
                    <th>الاستحقاق</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>تنبيه</th>
                    {canEdit && <th style={{ width: 80 }} />}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((d) => (
                    <tr key={d.id} className={d.status === 'expired' ? 'est-row--expired' : undefined}>
                      <td>
                        <div className="est-cell-main__title">{d.title}</div>
                      </td>
                      <td>{DATE_CATEGORY_LABELS[d.category] ?? d.category}</td>
                      <td className="est-num">{d.reference_number || '—'}</td>
                      <td className="est-date">{fmtDate(d.due_date)}</td>
                      <td>{remainingLabel(d.days_remaining)}</td>
                      <td>
                        <StatusChip status={d.status} />
                      </td>
                      <td>
                        <Toggle
                          on={d.alerts_enabled}
                          onClick={() =>
                            run.mutate(() =>
                              EstablishmentAdminService.updateDate(clientId, d.id, {
                                title: d.title,
                                category: d.category,
                                reference_number: d.reference_number,
                                due_date: d.due_date || '',
                                alerts_enabled: !d.alerts_enabled,
                              })
                            )
                          }
                        />
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="est-icon-btn" title="تعديل" onClick={() => startEditDate(d)}>
                              <Pencil size={13} />
                            </button>
                            <button
                              className="est-icon-btn est-icon-btn--danger"
                              title="حذف"
                              onClick={() => {
                                if (window.confirm(`حذف «${d.title}»؟`)) {
                                  run.mutate(() => EstablishmentAdminService.deleteDate(clientId, d.id));
                                }
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ═══ مستندات العميل في البوابة (أعلام الظهور/التنبيه) ═══ */}
      <section className="est-sec" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="est-sec__head">
          <div className="est-sec__title">
            <FileText size={14} /> مستندات العميل في البوابة
          </div>
          <span className="est-sec__meta">الرفع من تبويب «المستندات» — هنا التحكّم بالظهور والتنبيه</span>
        </div>
        <div className="est-sec__body">
          {documents.length === 0 ? (
            <div className="est-empty">
              <FileText size={26} />
              <b>لا مستندات للعميل بعد</b>
              <span>ارفع مستندات المنشأة (سجل تجاري، رخص، عقود…) من تبويب المستندات وستظهر هنا وفي بوابة العميل</span>
            </div>
          ) : (
            <div className="est-tbl-wrap" style={{ overflowX: 'auto' }}>
              <table className="est-table">
                <thead>
                  <tr>
                    <th>المستند</th>
                    <th>الرقم</th>
                    <th>الانتهاء</th>
                    <th>الحالة</th>
                    <th>ظاهر للعميل</th>
                    <th>تنبيه الانتهاء</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className={doc.expiry_status === 'expired' ? 'est-row--expired' : undefined}>
                      <td>
                        <div className="est-cell-main">
                          <div className="est-cell-main__ico">
                            {doc.visible_to_client ? <Eye size={14} /> : <EyeOff size={14} />}
                          </div>
                          <div className="est-cell-main__txt">
                            <div className="est-cell-main__title">{doc.title}</div>
                            <div className="est-cell-main__sub">{doc.file_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="est-num">{doc.document_number || '—'}</td>
                      <td className="est-date">{fmtDate(doc.expiry_date)}</td>
                      <td>
                        <StatusChip status={doc.expiry_status} />
                      </td>
                      <td>
                        <Toggle
                          on={doc.visible_to_client}
                          onClick={() =>
                            run.mutate(() =>
                              EstablishmentAdminService.updateDocumentFlags(clientId, doc.id, {
                                visible_to_client: !doc.visible_to_client,
                              })
                            )
                          }
                        />
                      </td>
                      <td>
                        <Toggle
                          on={doc.alerts_enabled}
                          onClick={() =>
                            run.mutate(() =>
                              EstablishmentAdminService.updateDocumentFlags(clientId, doc.id, {
                                alerts_enabled: !doc.alerts_enabled,
                              })
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
