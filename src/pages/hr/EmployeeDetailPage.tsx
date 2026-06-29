import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, User, ShieldCheck, Briefcase, Calendar, FileText, Wallet, Lock, FileCheck,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { LawyerVerifiedBadge } from '../../components/hr/LawyerVerifiedBadge';
import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS } from '../../types/hr';

const ITABS = [
  { key: 'overview', label: 'نظرة عامة', icon: User },
  { key: 'compensation', label: 'التعويضات', icon: Wallet },
  { key: 'documents', label: 'المستندات', icon: FileText },
];

function initials(name?: string): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')) || '؟';
}

function remainingDays(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

const fmt = (v: unknown): React.ReactNode => (v === null || v === undefined || v === '' ? '—' : (v as React.ReactNode));

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="hr-card">
    <div className="hr-card__h"><div className="hr-card__t">{icon} {title}</div></div>
    <div className="hr-card__b">{children}</div>
  </div>
);

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const empId = Number(id);
  const canComp = usePermission('hr.compensation.view');
  const canDocs = usePermission('hr.documents.view');
  const [tab, setTab] = useState('overview');

  const { data: emp, isLoading, isError } = useQuery({
    queryKey: ['hr', 'employee', empId],
    queryFn: () => hrService.getEmployee(empId),
    enabled: !Number.isNaN(empId),
  });

  if (isLoading) return <div className="hr-profile"><div className="hr-state">جارٍ تحميل الملف…</div></div>;
  if (isError || !emp) return <div className="hr-profile"><div className="hr-state">تعذّر جلب ملف الموظف</div></div>;

  const rem = remainingDays(emp.sba_license_expiry_gregorian);
  const isLawyer = !!emp.sba_license_number || emp.sba_verification_status !== 'pending';
  const sameFirm = emp.sba_verification_status === 'verified_same_firm';

  return (
    <div className="hr-profile">
      <button className="hr-back" onClick={() => navigate('/hr')}><ChevronRight size={15} /> القائمة</button>

      <div className="hr-phead">
        <div className="hr-avatar hr-phead__av">{initials(emp.user?.name)}</div>
        <div>
          <div className="hr-phead__nm">{emp.user?.name || '—'}</div>
          <div className="hr-phead__rl">
            {emp.job_title || '—'}
            {emp.department ? ` · ${emp.department}` : ''}
            {emp.employee_number ? ` · رقم ${emp.employee_number}` : ''}
          </div>
          <div className="hr-phead__badges">
            {isLawyer && <LawyerVerifiedBadge status={emp.sba_verification_status} remainingDays={rem} />}
            {emp.employment_type && <span className="hr-badge hr-badge--gray">{EMPLOYMENT_TYPE_LABELS[emp.employment_type]}</span>}
            <span className="hr-badge hr-badge--gray">{EMPLOYEE_STATUS_LABELS[emp.status]}</span>
          </div>
        </div>
      </div>

      <div className="hr-itabs">
        {ITABS.map((t) => (
          <button key={t.key} className={`hr-itab ${tab === t.key ? 'hr-itab--active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="hr-cards">
          <Card title="البيانات الأساسية" icon={<User size={15} />}>
            <dl className="hr-kv">
              <dt>الاسم</dt><dd>{fmt(emp.user?.name)}</dd>
              <dt>الجوال</dt><dd dir="ltr">{fmt(emp.user?.phone)}</dd>
              <dt>الإيميل</dt><dd dir="ltr">{fmt(emp.user?.email)}</dd>
              <dt>الجنسية</dt><dd>{fmt(emp.nationality)}</dd>
              <dt>المدير المباشر</dt><dd>{fmt(emp.manager?.name)}</dd>
            </dl>
          </Card>

          {isLawyer && (
            <Card title="التوثيق المهني" icon={<ShieldCheck size={15} />}>
              <div className={`hr-strip ${sameFirm ? 'hr-strip--g' : 'hr-strip--y'}`}>
                <div>
                  <div className="hr-strip__big">{rem != null ? (rem > 0 ? `${rem} يوم` : 'منتهية') : '—'}</div>
                  <div className="hr-strip__l">على انتهاء الرخصة {emp.sba_license_number || ''}</div>
                </div>
                <ShieldCheck size={28} style={{ color: sameFirm ? 'var(--status-green)' : 'var(--law-gold)' }} />
              </div>
              <dl className="hr-kv">
                <dt>رقم الرخصة</dt><dd>{fmt(emp.sba_license_number)}</dd>
                <dt>المنشأة</dt><dd>{sameFirm ? 'مكتبك ✓' : (emp.sba_firm_id ? 'منشأة أخرى' : '—')}</dd>
                <dt>تنتهي في</dt><dd>{fmt(emp.sba_license_expiry_raw || emp.sba_license_expiry_gregorian)}</dd>
                <dt>آخر تحقّق</dt><dd>{emp.sba_last_checked_at ? new Date(emp.sba_last_checked_at).toLocaleDateString('ar') : '—'}</dd>
              </dl>
            </Card>
          )}

          <Card title="بيانات التوظيف" icon={<Briefcase size={15} />}>
            <dl className="hr-kv">
              <dt>المسمى الوظيفي</dt><dd>{fmt(emp.job_title)}</dd>
              <dt>القسم</dt><dd>{fmt(emp.department)}</dd>
              <dt>نوع التعاقد</dt><dd>{emp.employment_type ? EMPLOYMENT_TYPE_LABELS[emp.employment_type] : '—'}</dd>
              <dt>تاريخ المباشرة</dt><dd>{fmt(emp.hire_date)}</dd>
            </dl>
          </Card>

          <Card title="رصيد الإجازة" icon={<Calendar size={15} />}>
            <dl className="hr-kv">
              <dt>الرصيد المتبقّي</dt><dd>{emp.annual_leave_balance != null ? `${emp.annual_leave_balance} يوم` : '—'}</dd>
              <dt>الاستحقاق السنوي</dt><dd>{emp.annual_leave_entitlement != null ? `${emp.annual_leave_entitlement} يوم` : '—'}</dd>
            </dl>
          </Card>
        </div>
      )}

      {tab === 'compensation' && (
        <div className="hr-cards">
          <Card title="التعويضات" icon={<Wallet size={15} />}>
            {emp.current_compensation ? (
              <dl className="hr-kv">
                <dt>الراتب الأساسي</dt><dd>{fmt(emp.current_compensation.basic_salary)}</dd>
                <dt>بدل سكن</dt><dd>{fmt(emp.current_compensation.housing_allowance)}</dd>
                <dt>بدل نقل</dt><dd>{fmt(emp.current_compensation.transport_allowance)}</dd>
                <dt>الإجمالي</dt><dd>{fmt(emp.current_compensation.total_salary)} {emp.current_compensation.currency || 'SAR'}</dd>
                <dt>الآيبان</dt><dd dir="ltr">{fmt(emp.current_compensation.iban)}</dd>
                <dt>البنك</dt><dd>{fmt(emp.current_compensation.bank_name)}</dd>
              </dl>
            ) : (
              <div className="hr-locked">
                <Lock size={16} />
                {canComp ? 'لا توجد بيانات تعويضات مسجّلة بعد.' : 'بيانات الرواتب والآيبان محميّة — تتطلب صلاحية «عرض رواتب الموظفين».'}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <div className="hr-cards">
          <Card title="مستندات الموظف" icon={<FileText size={15} />}>
            {!canDocs ? (
              <div className="hr-locked"><Lock size={16} /> المستندات محميّة — تتطلب صلاحية «عرض مستندات الموظفين».</div>
            ) : !emp.documents || emp.documents.length === 0 ? (
              <div className="hr-locked"><FileText size={16} /> لا توجد مستندات مرفوعة بعد.</div>
            ) : (
              emp.documents.map((d) => (
                <div className="hr-doc" key={d.id}>
                  <div className="hr-doc__ic"><FileCheck size={18} /></div>
                  <div>
                    <div className="hr-doc__nm">{d.title}</div>
                    <div className="hr-doc__m">{d.expiry_date_gregorian ? `تنتهي ${d.expiry_date_gregorian}` : (d.status || '')}</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetailPage;
