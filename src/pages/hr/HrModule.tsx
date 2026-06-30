import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Users, ShieldCheck, Clock, Plus, Search, Printer, LayoutDashboard, User, Wallet,
  FileText, Calendar, Briefcase, IdCard, Lock, Phone, Mail, ChevronLeft,
  ChevronRight, AlertCircle, Award, Building2, FileSignature, ClipboardCheck, CalendarDays, Pencil,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import { AdminRequestService } from '../../services/adminRequestService';
import { usePermission } from '../../hooks/usePermission';
import { LawyerVerifiedBadge } from '../../components/hr/LawyerVerifiedBadge';
import { AddEmployeeModal } from '../../components/hr/AddEmployeeModal';
import ContractsTab from './ContractsTab';
import DocumentsTab from './DocumentsTab';
import OnboardingTab from './OnboardingTab';
import HolidaysModal from './HolidaysModal';
import EditEmployeeModal from './EditEmployeeModal';
import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS } from '../../types/hr';
import type { EmployeeProfile, EmployeeFilters, HrStats, SbaStatus } from '../../types/hr';

// ───────────────────────── أدوات مساعدة ─────────────────────────

const STATUS_DOT: Record<string, string> = {
  active: 'var(--status-green)',
  on_leave: 'var(--status-blue)',
  suspended: 'var(--color-text-secondary)',
  terminated: 'var(--status-red)',
};

/** تسميات الأدوار بالعربية (للعرض في القائمة الجانبية). */
const ROLE_LABELS: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير',
  partner: 'شريك',
  lawyer: 'محامٍ',
  senior_lawyer: 'محامٍ أول',
  legal_assistant: 'مساعد قانوني',
  accountant: 'محاسب',
  secretary: 'سكرتير',
  client: 'عميل',
};
const roleLabel = (r?: string | null): string => (r ? (ROLE_LABELS[r] || r) : '');

const LAWYER_SBA: SbaStatus[] = ['verified_same_firm', 'verified_other_firm', 'expired'];

function isLawyer(emp: Pick<EmployeeProfile, 'sba_license_number' | 'sba_verification_status'>): boolean {
  return !!emp.sba_license_number || LAWYER_SBA.includes(emp.sba_verification_status);
}

function initials(name?: string | null): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')) || '؟';
}

function remainingDays(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86400000);
}

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const fmt = (v: unknown): React.ReactNode => (v === null || v === undefined || v === '' ? '—' : (v as React.ReactNode));

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

// ───────────────────────── طباعة كشف المنسوبين ─────────────────────────

async function printRoster(): Promise<void> {
  let data: EmployeeProfile[] = [];
  try {
    const res = await hrService.getEmployees({ per_page: 100 });
    data = res.data;
  } catch {
    return;
  }
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const rows = data
    .map((e, i) => {
      const lawyer = isLawyer(e);
      const verify = lawyer
        ? (e.sba_verification_status === 'verified_same_firm' ? 'موثّق · مكتبك'
          : e.sba_verification_status === 'verified_other_firm' ? 'موثّق · منشأة أخرى'
          : e.sba_verification_status === 'expired' ? 'رخصة منتهية' : 'قيد التحقق')
        : '—';
      return `<tr>
        <td>${i + 1}</td>
        <td>${e.user?.name || '—'}</td>
        <td>${e.employee_number || '—'}</td>
        <td>${e.department || '—'}</td>
        <td>${e.job_title || '—'}</td>
        <td>${e.employment_type ? EMPLOYMENT_TYPE_LABELS[e.employment_type] : '—'}</td>
        <td>${EMPLOYEE_STATUS_LABELS[e.status] || '—'}</td>
        <td>${e.sba_license_number || '—'}</td>
        <td>${verify}</td>
      </tr>`;
    })
    .join('');
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <title>كشف المنسوبين</title>
    <style>
      * { font-family: 'Segoe UI', Tahoma, sans-serif; }
      body { padding: 28px; color: #1f2937; }
      h1 { font-size: 19px; margin: 0 0 4px; color: #1E3A5F; }
      .sub { font-size: 12px; color: #6b7280; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 7px 9px; text-align: right; }
      th { background: #1E3A5F; color: #fff; font-weight: 600; }
      tr:nth-child(even) td { background: #f8fafc; }
      .foot { margin-top: 16px; font-size: 11px; color: #9ca3af; }
    </style></head><body>
    <h1>كشف منسوبي المكتب</h1>
    <div class="sub">عدد المنسوبين: ${data.length} · صدر بتاريخ ${today}</div>
    <table>
      <thead><tr>
        <th>#</th><th>الاسم</th><th>الرقم الوظيفي</th><th>القسم</th><th>المسمى</th>
        <th>التعاقد</th><th>الحالة</th><th>رقم الرخصة</th><th>التوثيق</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">نظام الرائد — الموارد البشرية</div>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

// ───────────────────────── لوحة الإحصائيات العامة ─────────────────────────

const StatCard: React.FC<{ cls: string; icon: React.ReactNode; v: React.ReactNode; l: string }> = ({ cls, icon, v, l }) => (
  <div className={`hr-stat hr-stat--${cls}`}>
    <div className="hr-stat__icon">{icon}</div>
    <div className="hr-stat__info"><span className="hr-stat__num">{v}</span><span className="hr-stat__label">{l}</span></div>
  </div>
);

const HrOverview: React.FC<{
  stats?: HrStats;
  total: number;
  canManage: boolean;
  onAdd: () => void;
  onHolidays: () => void;
}> = ({ stats, total, canManage, onAdd, onHolidays }) => {
  const navy = cssVar('--law-navy', '#1E3A5F');
  const gold = cssVar('--law-gold', '#B8860B');
  const green = cssVar('--status-green', '#059669');
  const border = cssVar('--color-border', '#e2e8f0');

  const t = stats?.total ?? 0;
  const verified = stats?.verified ?? 0;
  const lawyers = stats?.lawyers ?? 0;
  const unverifiedLawyers = Math.max(0, lawyers - verified);
  const otherStaff = Math.max(0, t - lawyers);

  const segments = [
    { name: 'محامون موثّقون', value: verified, color: green },
    { name: 'محامون قيد التحقق', value: unverifiedLawyers, color: gold },
    { name: 'منسوبون آخرون', value: otherStaff, color: navy },
  ].filter((s) => s.value > 0);

  const hasData = t > 0;
  const chartData = hasData ? segments : [{ name: 'لا بيانات', value: 1, color: border }];

  return (
    <div className="hr-ov">
      {/* صف KPI علوي */}
      <div className="hr-ov__top">
        <StatCard cls="navy" icon={<Users size={17} />} v={stats?.total ?? '—'} l="إجمالي المنسوبين" />
        <StatCard cls="green" icon={<User size={17} />} v={stats?.active ?? '—'} l="على رأس العمل" />
        <StatCard cls="gold" icon={<ShieldCheck size={17} />} v={stats?.verified ?? '—'} l="محامون موثّقون" />
        <StatCard cls="orange" icon={<Clock size={17} />} v={stats?.expiring_soon ?? '—'} l="استحقاقات تنتهي قريباً" />
      </div>

      {/* الشبكة الرئيسية: 3 أعمدة */}
      <div className="hr-ov__grid">
        {/* العمود الأول: الرسم الدائري لتكوين القوى العاملة */}
        <div className="hr-panel">
          <div className="hr-panel__title"><Users size={14} /> تكوين المنسوبين</div>
          <div className="hr-chart-wrap">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={36} outerRadius={48} paddingAngle={hasData ? 3 : 0} dataKey="value" isAnimationActive={false} stroke="none">
                  {chartData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                {hasData && (
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{ background: 'var(--dashboard-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11, color: 'var(--color-text)', direction: 'rtl' }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="hr-chart-center">
              <span className="hr-chart-center__val">{t}</span>
              <span className="hr-chart-center__lbl">منسوب</span>
            </div>
          </div>
          <div className="hr-legend">
            {segments.length === 0
              ? <div className="hr-legend__row"><span className="hr-legend__name">لا يوجد منسوبون بعد</span></div>
              : segments.map((s) => (
                <div className="hr-legend__row" key={s.name}>
                  <span className="hr-legend__dot" style={{ background: s.color }} />
                  <span className="hr-legend__name">{s.name}</span>
                  <span className="hr-legend__val">{s.value}</span>
                </div>
              ))}
          </div>
        </div>

        {/* العمود الثاني: بيانات المكتب والتوثيق */}
        {stats?.office && (
          <div className="hr-panel">
            <div className="hr-panel__title"><Building2 size={14} /> بيانات المكتب والتوثيق</div>
            <div className="hr-office__head">
              <div className="hr-office__name">{stats.office.name || 'المكتب'}</div>
              <span className={`hr-badge ${stats.office.verified ? 'hr-badge--green' : 'hr-badge--gray'}`}>
                {stats.office.verified ? <><ShieldCheck size={12} /> منشأة موثّقة</> : 'غير موثّقة'}
              </span>
            </div>
            <dl className="hr-kv" style={{ gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px' }}>
              {stats.office.verified && stats.office.sba_license_number && (
                <><dt>ترخيص المنشأة</dt><dd>{stats.office.sba_license_number}</dd></>
              )}
              <dt>العنوان الوطني</dt><dd style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stats.office.national_address || undefined}>{stats.office.national_address || '—'}</dd>
              <dt><Mail size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> الإيميل الرسمي</dt>
              <dd dir="ltr" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stats.office.email || undefined}>{stats.office.email || '—'}</dd>
              {stats.office.phone && (<><dt>الهاتف</dt><dd dir="ltr">{stats.office.phone}</dd></>)}
            </dl>
          </div>
        )}

        {/* العمود الثالث: إحصائيات التوزيع + الخدمات والخيارات */}
        <div className="hr-ov__col">
          {/* لمحة وتوزيع النسب */}
          <div className="hr-panel">
            <div className="hr-panel__title"><Award size={14} /> التوزيع والنسب</div>
            <div className="hr-dist">
              <div className="hr-dist__row" style={{ gridTemplateColumns: '90px 1fr auto', gap: '8px' }}>
                <span className="hr-dist__name">المحامون</span>
                <span className="hr-dist__bar"><span className="hr-dist__fill" style={{ width: t ? `${(lawyers / t) * 100}%` : '0%' }} /></span>
                <span className="hr-dist__val">{lawyers}</span>
              </div>
              <div className="hr-dist__row" style={{ gridTemplateColumns: '90px 1fr auto', gap: '8px' }}>
                <span className="hr-dist__name">موثّقون هيئة</span>
                <span className="hr-dist__bar"><span className="hr-dist__fill" style={{ width: lawyers ? `${(verified / lawyers) * 100}%` : '0%', background: 'var(--status-green)' }} /></span>
                <span className="hr-dist__val">{verified}</span>
              </div>
              <div className="hr-dist__row" style={{ gridTemplateColumns: '90px 1fr auto', gap: '8px' }}>
                <span className="hr-dist__name">على رأس العمل</span>
                <span className="hr-dist__bar"><span className="hr-dist__fill" style={{ width: t ? `${((stats?.active ?? 0) / t) * 100}%` : '0%', background: 'var(--law-navy)' }} /></span>
                <span className="hr-dist__val">{stats?.active ?? 0}</span>
              </div>
            </div>
          </div>

          {/* الخدمات والأدوات السريعة */}
          <div className="hr-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="hr-panel__title" style={{ marginBottom: '6px' }}><Briefcase size={14} /> أدوات وإجراءات سريعة</div>
            <div className="hr-ov__services" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: 'auto' }}>
              <button className="hr-btn hr-btn--sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void printRoster()}><Printer size={14} /> طباعة كشف المنسوبين</button>
              {canManage && <button className="hr-btn hr-btn--sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onHolidays}><CalendarDays size={14} /> التقويم الرسمي</button>}
              {canManage && <button className="hr-btn hr-btn--sm hr-btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onAdd}><Plus size={14} /> إضافة منسوب جديد</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── ملف الموظف 360 ─────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({ title, icon, children, right }) => (
  <div className="hr-sec">
    <div className="hr-sec__h"><div className="hr-sec__t">{icon} {title}</div>{right}</div>
    <div className="hr-sec__b">{children}</div>
  </div>
);

const D_TABS = [
  { key: 'overview', label: 'نظرة عامة', icon: User },
  { key: 'contracts', label: 'العقود', icon: FileSignature },
  { key: 'onboarding', label: 'المباشرة', icon: ClipboardCheck },
  { key: 'identity', label: 'الهوية والتوثيق', icon: ShieldCheck },
  // { key: 'compensation', label: 'التعويضات', icon: Wallet },
  { key: 'documents', label: 'المستندات', icon: FileText },
  { key: 'leave', label: 'الإجازات', icon: Calendar },
];

const EmployeeDossier: React.FC<{ empId: number }> = ({ empId }) => {
  const qc = useQueryClient();
  const canComp = usePermission('hr.compensation.view');
  const canManage = usePermission('hr.manage');
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);

  const { data: emp, isLoading, isError } = useQuery({
    queryKey: ['hr', 'employee', empId],
    queryFn: () => hrService.getEmployee(empId),
    enabled: !Number.isNaN(empId),
  });

  const userId = emp?.user?.id ?? emp?.user_id;
  const { data: leaves, isLoading: leavesLoading, isError: leavesError } = useQuery({
    queryKey: ['hr', 'leaves', userId],
    queryFn: () => AdminRequestService.getRequests({ user_id: userId as number, per_page: 50 }),
    enabled: !!userId,
  });

  if (isLoading) return <div className="hr-state">جارٍ تحميل الملف…</div>;
  if (isError || !emp) return <div className="hr-state"><AlertCircle /><div className="hr-state__title">تعذّر جلب ملف الموظف</div></div>;

  const lawyer = isLawyer(emp);
  const rem = remainingDays(emp.sba_license_expiry_gregorian);
  const sameFirm = emp.sba_verification_status === 'verified_same_firm';
  const expired = emp.sba_verification_status === 'expired' || (rem != null && rem <= 0);
  const stripCls = expired ? 'hr-strip--r' : sameFirm ? 'hr-strip--g' : 'hr-strip--y';

  return (
    <div className="hr-dossier">
      {showEdit && (
        <EditEmployeeModal
          emp={emp}
          onClose={() => setShowEdit(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['hr', 'employee', empId] })}
        />
      )}
      {/* رأس الملف */}
      <div className="hr-dossier__head">
        <div className="hr-avatar hr-dossier__av">{initials(emp.user?.name)}</div>
        <div className="hr-dossier__id">
          <div className="hr-dossier__nm">{emp.user?.name || '—'}</div>
          <div className="hr-dossier__rl">
            {emp.job_title || '—'}
            {emp.department ? ` · ${emp.department}` : ''}
            {emp.employee_number ? ` · رقم ${emp.employee_number}` : ''}
          </div>
          <div className="hr-dossier__badges">
            {lawyer && <LawyerVerifiedBadge status={emp.sba_verification_status} remainingDays={rem} />}
            {emp.employment_type && <span className="hr-badge hr-badge--gray">{EMPLOYMENT_TYPE_LABELS[emp.employment_type]}</span>}
            <span className="hr-pill">
              <span className="hr-dot" style={{ background: STATUS_DOT[emp.status] || 'var(--color-text-secondary)' }} />
              {EMPLOYEE_STATUS_LABELS[emp.status]}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="hr-dossier__actions">
            <button className="hr-btn hr-btn--sm" onClick={() => setShowEdit(true)}><Pencil size={14} /> تعديل البيانات</button>
          </div>
        )}
      </div>

      {/* تبويبات الموبايل - تظهر فقط على الشاشات الصغيرة */}
      <div className="hr-dtabs">
        {D_TABS.map((tb) => (
          <button key={tb.key} className={`hr-dtab ${tab === tb.key ? 'hr-dtab--active' : ''}`} onClick={() => setTab(tb.key)}>
            <tb.icon size={15} /> {tb.label}
          </button>
        ))}
      </div>

      {/* وضع الموبايل: عرض شاشات التبويب الكلاسيكية */}
      <div className="hr-dossier__mobile-tabs">
        {/* نظرة عامة */}
        {tab === 'overview' && (
          <div className="hr-dbody">
            <Section title="البيانات الأساسية" icon={<User size={15} />}>
              <dl className="hr-kv">
                <dt>الاسم</dt><dd>{fmt(emp.user?.name)}</dd>
                <dt><Phone size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> الجوال</dt><dd dir="ltr">{fmt(emp.user?.phone)}</dd>
                <dt><Mail size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> الإيميل</dt><dd dir="ltr">{fmt(emp.user?.email)}</dd>
                <dt>الجنسية</dt><dd>{fmt(emp.nationality)}</dd>
                <dt>المدير المباشر</dt><dd>{fmt(emp.manager?.name)}</dd>
                <dt>جهة الطوارئ</dt><dd>{fmt(emp.emergency_contact_name)}{emp.emergency_contact_phone ? ` · ${emp.emergency_contact_phone}` : ''}</dd>
              </dl>
            </Section>

            <Section title="بيانات التوظيف" icon={<Briefcase size={15} />}>
              <dl className="hr-kv">
                <dt>الرقم الوظيفي</dt><dd>{fmt(emp.employee_number)}</dd>
                <dt>المسمى الوظيفي</dt><dd>{fmt(emp.job_title)}</dd>
                <dt>القسم</dt><dd>{fmt(emp.department)}</dd>
                <dt>نوع التعاقد</dt><dd>{emp.employment_type ? EMPLOYMENT_TYPE_LABELS[emp.employment_type] : '—'}</dd>
                <dt>تاريخ المباشرة</dt><dd>{fmtDate(emp.hire_date)}</dd>
                <dt>الحالة</dt><dd>{EMPLOYEE_STATUS_LABELS[emp.status]}</dd>
              </dl>
            </Section>
          </div>
        )}

        {/* العقود */}
        {tab === 'contracts' && <ContractsTab empId={empId} />}

        {/* المباشرة */}
        {tab === 'onboarding' && <OnboardingTab empId={empId} />}

        {/* الهوية والتوثيق */}
        {tab === 'identity' && (
          <div className="hr-dbody">
            {lawyer ? (
              <Section title="التوثيق المهني (الهيئة)" icon={<Award size={15} />}>
                <div className={`hr-strip ${stripCls}`}>
                  <div>
                    <div className="hr-strip__big">{rem != null ? (rem > 0 ? `${rem} يوم` : 'منتهية') : '—'}</div>
                    <div className="hr-strip__l">على انتهاء الرخصة {emp.sba_license_number || ''}</div>
                  </div>
                  <ShieldCheck size={30} style={{ color: expired ? 'var(--status-red)' : sameFirm ? 'var(--status-green)' : 'var(--law-gold)' }} />
                </div>
                <dl className="hr-kv">
                  <dt>رقم الرخصة</dt><dd>{fmt(emp.sba_license_number)}</dd>
                  <dt>تنتهي في</dt><dd>{fmt(emp.sba_license_expiry_raw || emp.sba_license_expiry_gregorian)}</dd>
                  <dt>آخر تحقّق</dt><dd>{emp.sba_last_checked_at ? fmtDate(emp.sba_last_checked_at) : 'لم يتم بعد'}</dd>
                </dl>
              </Section>
            ) : (
              <Section title="التوثيق المهني" icon={<ShieldCheck size={15} />}>
                <div className="hr-locked"><ShieldCheck size={16} /> هذا المنسوب غير مسجّل كمحامٍ — لا ينطبق التوثيق المهني من الهيئة.</div>
              </Section>
            )}

            <Section title="الهوية الوطنية" icon={<IdCard size={15} />}>
              <dl className="hr-kv">
                <dt>رقم الهوية</dt><dd dir="ltr">{fmt(emp.user?.national_id)}</dd>
                <dt>انتهاء الهوية</dt><dd>{fmtDate(emp.national_id_expiry_gregorian)}</dd>
              </dl>
              {(() => {
                const nrem = remainingDays(emp.national_id_expiry_gregorian);
                if (nrem == null) return null;
                return (
                  <div className={`hr-strip ${nrem <= 0 ? 'hr-strip--r' : nrem <= 60 ? 'hr-strip--y' : 'hr-strip--g'}`} style={{ marginTop: 12, marginBottom: 0 }}>
                    <div>
                      <div className="hr-strip__big">{nrem > 0 ? `${nrem} يوم` : 'منتهية'}</div>
                      <div className="hr-strip__l">على انتهاء الهوية الوطنية</div>
                    </div>
                    <IdCard size={28} style={{ color: nrem <= 0 ? 'var(--status-red)' : nrem <= 60 ? 'var(--law-gold)' : 'var(--status-green)' }} />
                  </div>
                );
              })()}
            </Section>
          </div>
        )}

        {/* التعويضات
        {tab === 'compensation' && (
          <div className="hr-dbody hr-dbody--single">
            <Section title="الراتب والتعويضات" icon={<Wallet size={15} />}>
              {emp.current_compensation ? (
                <dl className="hr-kv">
                  <dt>الراتب الأساسي</dt><dd>{fmt(emp.current_compensation.basic_salary)} {emp.current_compensation.currency || 'SAR'}</dd>
                  <dt>بدل سكن</dt><dd>{fmt(emp.current_compensation.housing_allowance)}</dd>
                  <dt>بدل نقل</dt><dd>{fmt(emp.current_compensation.transport_allowance)}</dd>
                  <dt>بدلات أخرى</dt><dd>{fmt(emp.current_compensation.other_allowances)}</dd>
                  <dt>الإجمالي</dt><dd>{fmt(emp.current_compensation.total_salary)} {emp.current_compensation.currency || 'SAR'}</dd>
                  <dt>الآيبان</dt><dd dir="ltr">{fmt(emp.current_compensation.iban)}</dd>
                  <dt>البنك</dt><dd>{fmt(emp.current_compensation.bank_name)}</dd>
                  <dt>رقم التأمينات</dt><dd>{fmt(emp.current_compensation.gosi_number)}</dd>
                </dl>
              ) : (
                <div className="hr-locked">
                  <Lock size={16} />
                  {canComp ? 'لا توجد بيانات تعويضات مسجّلة بعد.' : 'بيانات الرواتب والآيبان محميّة — تتطلب صلاحية «عرض رواتب الموظفين».'}
                </div>
              )}
            </Section>
          </div>
        )}
        */}

        {/* المستندات */}
        {tab === 'documents' && <DocumentsTab empId={empId} />}

        {/* الإجازات */}
        {tab === 'leave' && (
          <div className="hr-dbody hr-dbody--single">
            <Section title="رصيد الإجازات" icon={<Calendar size={15} />}>
              <div className="hr-balance">
                <div className="hr-balance__cell">
                  <div className="hr-balance__num">{emp.annual_leave_balance != null ? emp.annual_leave_balance : '—'}</div>
                  <div className="hr-balance__lbl">الرصيد المتبقّي (يوم)</div>
                </div>
                <div className="hr-balance__cell">
                  <div className="hr-balance__num">{emp.annual_leave_entitlement != null ? emp.annual_leave_entitlement : '—'}</div>
                  <div className="hr-balance__lbl">الاستحقاق السنوي (يوم)</div>
                </div>
              </div>

              <div className="hr-ov__section-label" style={{ marginBottom: 8 }}>سجلّ الطلبات والإجازات</div>
              {leavesLoading ? (
                <div className="hr-locked"><Clock size={16} /> جارٍ تحميل السجلّ…</div>
              ) : leavesError ? (
                <div className="hr-locked"><AlertCircle size={16} /> تعذّر جلب سجلّ الإجازات.</div>
              ) : !leaves || leaves.data.length === 0 ? (
                <div className="hr-locked"><Calendar size={16} /> لا توجد طلبات أو إجازات مسجّلة لهذا المنسوب.</div>
              ) : (
                leaves.data.map((r) => {
                  const cls = r.status === 'approved' ? 'hr-badge--green' : r.status === 'rejected' ? 'hr-badge--red' : 'hr-badge--gold';
                  const label = r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار';
                  return (
                    <div className="hr-leave" key={r.id}>
                      <div className="hr-leave__ic"><Calendar size={15} /></div>
                      <div className="hr-leave__main">
                        <div className="hr-leave__t">{r.request_type?.name || 'طلب'}</div>
                        <div className="hr-leave__m">
                          {r.start_date ? fmtDate(r.start_date) : fmtDate(r.created_at)}
                          {r.end_date && r.end_date !== r.start_date ? ` ← ${fmtDate(r.end_date)}` : ''}
                        </div>
                      </div>
                      <span className={`hr-badge ${cls}`}>{label}</span>
                    </div>
                  );
                })
              )}
            </Section>
          </div>
        )}
      </div>

      {/* وضع الديسكتوب: صفحة كاملة لكل البيانات مصفوفة بنظام ERP */}
      <div className="hr-dossier__desktop-grid">
        {/* العمود الأول: الهوية والتوثيق (في المقدمة) + البيانات الأساسية */}
        <div className="hr-dossier__desktop-col">
          {lawyer ? (
            <Section title="التوثيق المهني (الهيئة)" icon={<Award size={15} />}>
              <div className={`hr-strip ${stripCls}`} style={{ padding: '8px 12px', marginBottom: '8px' }}>
                <div>
                  <div className="hr-strip__big" style={{ fontSize: '16px' }}>{rem != null ? (rem > 0 ? `${rem} يوم` : 'منتهية') : '—'}</div>
                  <div className="hr-strip__l" style={{ fontSize: '10px' }}>على انتهاء الرخصة {emp.sba_license_number || ''}</div>
                </div>
                <ShieldCheck size={20} style={{ color: expired ? 'var(--status-red)' : sameFirm ? 'var(--status-green)' : 'var(--law-gold)' }} />
              </div>
              <dl className="hr-kv">
                <dt>رقم الرخصة</dt><dd>{fmt(emp.sba_license_number)}</dd>
                <dt>تنتهي في</dt><dd>{fmt(emp.sba_license_expiry_raw || emp.sba_license_expiry_gregorian)}</dd>
                <dt>آخر تحقّق</dt><dd>{emp.sba_last_checked_at ? fmtDate(emp.sba_last_checked_at) : 'لم يتم بعد'}</dd>
              </dl>
            </Section>
          ) : (
            <Section title="التوثيق المهني" icon={<ShieldCheck size={15} />}>
              <div className="hr-locked" style={{ padding: '12px' }}><ShieldCheck size={14} /> لا ينطبق التوثيق المهني (ليس محامياً).</div>
            </Section>
          )}

          <Section title="الهوية الوطنية" icon={<IdCard size={15} />}>
            <dl className="hr-kv">
              <dt>رقم الهوية</dt><dd dir="ltr">{fmt(emp.user?.national_id)}</dd>
              <dt>انتهاء الهوية</dt><dd>{fmtDate(emp.national_id_expiry_gregorian)}</dd>
            </dl>
            {(() => {
              const nrem = remainingDays(emp.national_id_expiry_gregorian);
              if (nrem == null) return null;
              return (
                <div className={`hr-strip ${nrem <= 0 ? 'hr-strip--r' : nrem <= 60 ? 'hr-strip--y' : 'hr-strip--g'}`} style={{ marginTop: 8, marginBottom: 0, padding: '8px 12px' }}>
                  <div>
                    <div className="hr-strip__big" style={{ fontSize: '16px' }}>{nrem > 0 ? `${nrem} يوم` : 'منتهية'}</div>
                    <div className="hr-strip__l" style={{ fontSize: '10px' }}>على انتهاء الهوية الوطنية</div>
                  </div>
                  <IdCard size={20} style={{ color: nrem <= 0 ? 'var(--status-red)' : nrem <= 60 ? 'var(--law-gold)' : 'var(--status-green)' }} />
                </div>
              );
            })()}
          </Section>

          <Section title="البيانات الأساسية" icon={<User size={15} />}>
            <dl className="hr-kv">
              <dt>الاسم</dt><dd>{fmt(emp.user?.name)}</dd>
              <dt><Phone size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> الجوال</dt><dd dir="ltr">{fmt(emp.user?.phone)}</dd>
              <dt><Mail size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> الإيميل</dt><dd dir="ltr">{fmt(emp.user?.email)}</dd>
              <dt>الجنسية</dt><dd>{fmt(emp.nationality)}</dd>
              <dt>المدير المباشر</dt><dd>{fmt(emp.manager?.name)}</dd>
              <dt>جهة الطوارئ</dt><dd>{fmt(emp.emergency_contact_name)}{emp.emergency_contact_phone ? ` · ${emp.emergency_contact_phone}` : ''}</dd>
            </dl>
          </Section>
        </div>

        {/* العمود الثاني: بيانات التوظيف + الإجازات والغياب + الرواتب والتعويضات */}
        <div className="hr-dossier__desktop-col">
          <Section title="بيانات التوظيف" icon={<Briefcase size={15} />}>
            <dl className="hr-kv">
              <dt>الرقم الوظيفي</dt><dd>{fmt(emp.employee_number)}</dd>
              <dt>المسمى الوظيفي</dt><dd>{fmt(emp.job_title)}</dd>
              <dt>القسم</dt><dd>{fmt(emp.department)}</dd>
              <dt>نوع التعاقد</dt><dd>{emp.employment_type ? EMPLOYMENT_TYPE_LABELS[emp.employment_type] : '—'}</dd>
              <dt>تاريخ المباشرة</dt><dd>{fmtDate(emp.hire_date)}</dd>
              <dt>الحالة</dt><dd>{EMPLOYEE_STATUS_LABELS[emp.status]}</dd>
            </dl>
          </Section>

          <Section title="الرصيد وسجل الإجازات" icon={<Calendar size={15} />}>
            <div className="hr-balance" style={{ marginBottom: '10px', gap: '8px' }}>
              <div className="hr-balance__cell" style={{ padding: '8px' }}>
                <div className="hr-balance__num" style={{ fontSize: '18px' }}>{emp.annual_leave_balance != null ? emp.annual_leave_balance : '—'}</div>
                <div className="hr-balance__lbl" style={{ fontSize: '10px' }}>الرصيد المتبقّي</div>
              </div>
              <div className="hr-balance__cell" style={{ padding: '8px' }}>
                <div className="hr-balance__num" style={{ fontSize: '18px' }}>{emp.annual_leave_entitlement != null ? emp.annual_leave_entitlement : '—'}</div>
                <div className="hr-balance__lbl" style={{ fontSize: '10px' }}>الاستحقاق السنوي</div>
              </div>
            </div>

            <div className="hr-ov__section-label" style={{ marginBottom: 6, fontSize: '11px' }}>سجلّ الطلبات والإجازات</div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {leavesLoading ? (
                <div className="hr-locked" style={{ padding: '10px' }}><Clock size={14} /> جارٍ تحميل السجلّ…</div>
              ) : leavesError ? (
                <div className="hr-locked" style={{ padding: '10px' }}><AlertCircle size={14} /> تعذّر جلب سجلّ الإجازات.</div>
              ) : !leaves || leaves.data.length === 0 ? (
                <div className="hr-locked" style={{ padding: '10px' }}><Calendar size={14} /> لا توجد طلبات إجازة مسجّلة.</div>
              ) : (
                leaves.data.map((r) => {
                  const cls = r.status === 'approved' ? 'hr-badge--green' : r.status === 'rejected' ? 'hr-badge--red' : 'hr-badge--gold';
                  const label = r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'انتظار';
                  return (
                    <div className="hr-leave" key={r.id} style={{ padding: '6px 0' }}>
                      <div className="hr-leave__ic" style={{ width: '28px', height: '28px' }}><Calendar size={13} /></div>
                      <div className="hr-leave__main">
                        <div className="hr-leave__t" style={{ fontSize: '12px' }}>{r.request_type?.name || 'طلب'}</div>
                        <div className="hr-leave__m" style={{ fontSize: '10px' }}>
                          {r.start_date ? fmtDate(r.start_date) : fmtDate(r.created_at)}
                          {r.end_date && r.end_date !== r.start_date ? ` ← ${fmtDate(r.end_date)}` : ''}
                        </div>
                      </div>
                      <span className={`hr-badge ${cls}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          {/* الراتب والتعويضات
          <Section title="الراتب والتعويضات" icon={<Wallet size={15} />}>
            {emp.current_compensation ? (
              <dl className="hr-kv">
                <dt>الراتب الأساسي</dt><dd>{fmt(emp.current_compensation.basic_salary)} {emp.current_compensation.currency || 'SAR'}</dd>
                <dt>بدل سكن</dt><dd>{fmt(emp.current_compensation.housing_allowance)}</dd>
                <dt>بدل نقل</dt><dd>{fmt(emp.current_compensation.transport_allowance)}</dd>
                <dt>بدلات أخرى</dt><dd>{fmt(emp.current_compensation.other_allowances)}</dd>
                <dt>إجمالي الراتب</dt><dd>{fmt(emp.current_compensation.total_salary)} {emp.current_compensation.currency || 'SAR'}</dd>
                <dt>الآيبان</dt><dd dir="ltr" style={{ fontSize: '11.5px', wordBreak: 'break-all' }}>{fmt(emp.current_compensation.iban)}</dd>
                <dt>البنك</dt><dd>{fmt(emp.current_compensation.bank_name)}</dd>
                <dt>رقم التأمينات</dt><dd>{fmt(emp.current_compensation.gosi_number)}</dd>
              </dl>
            ) : (
              <div className="hr-locked" style={{ padding: '20px 10px' }}>
                <Lock size={15} />
                {canComp ? 'لا توجد بيانات تعويضات مسجّلة.' : 'بيانات الرواتب والآيبان محمية.'}
              </div>
            )}
          </Section>
          */}
        </div>

        {/* العمود الثالث: العقود + المستندات والملفات + المباشرة */}
        <div className="hr-dossier__desktop-col">
          <ContractsTab empId={empId} />
          <DocumentsTab empId={empId} />
          <OnboardingTab empId={empId} />
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── الصفحة الرئيسية (قسمان) ─────────────────────────

const ROSTER_PER_PAGE = 25;

const HrModule: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = usePermission('hr.manage');

  const selectedId = id ? Number(id) : null;

  const [search, setSearch] = useState('');
  const [statusChip, setStatusChip] = useState<'all' | 'active' | 'terminated'>('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);

  const filters: EmployeeFilters = useMemo(() => ({
    search: search.trim() || undefined,
    status: statusChip === 'all' ? undefined : statusChip,
    page,
    per_page: ROSTER_PER_PAGE,
  }), [search, statusChip, page]);

  const { data: stats } = useQuery({ queryKey: ['hr', 'stats'], queryFn: () => hrService.getStats() });
  const { data: list, isLoading } = useQuery({
    queryKey: ['hr', 'employees', filters],
    queryFn: () => hrService.getEmployees(filters),
  });

  // الموثّقون (محامون موثّقون من الهيئة) أعلى القائمة — ترتيب ثابت يحفظ ترتيب الباقي.
  const employees = useMemo(() => {
    const data = list?.data ?? [];
    const isVerified = (e: EmployeeProfile) =>
      e.sba_verification_status === 'verified_same_firm' || e.sba_verification_status === 'verified_other_firm';
    return [...data].sort((a, b) => Number(isVerified(b)) - Number(isVerified(a)));
  }, [list]);
  const total = list?.total ?? 0;
  const lastPage = list?.last_page ?? 1;

  const select = (empId: number) => navigate(`/hr/employees/${empId}`);
  const showOverview = () => navigate('/hr');

  const setChip = (c: 'all' | 'active' | 'terminated') => { setStatusChip(c); setPage(1); };

  return (
    <div className="hr-page">
      <div className="hr-layout">
        {/* العمود اليمين: قائمة المنسوبين */}
        <aside className="hr-roster">
          <div className="hr-roster__head">
            <button
              className={`hr-roster__overview ${selectedId == null ? 'hr-roster__overview--active' : ''}`}
              onClick={showOverview}
            >
              <LayoutDashboard size={16} /> لوحة المكتب والإحصائيات
            </button>
            <div className="hr-roster__search">
              <Search size={15} />
              <input
                placeholder="ابحث باسم، رقم وظيفي، أو جوال…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="hr-roster__filter">
              <button className={`hr-chip ${statusChip === 'all' ? 'hr-chip--active' : ''}`} onClick={() => setChip('all')}>الكل</button>
              <button className={`hr-chip ${statusChip === 'active' ? 'hr-chip--active' : ''}`} onClick={() => setChip('active')}>على رأس العمل</button>
              <button className={`hr-chip ${statusChip === 'terminated' ? 'hr-chip--active' : ''}`} onClick={() => setChip('terminated')}>منتهون</button>
            </div>
          </div>

          <div className="hr-roster__list">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="hr-skeleton" />)
            ) : employees.length === 0 ? (
              <div className="hr-state" style={{ padding: '40px 16px' }}>
                <Users />
                <div className="hr-state__title">لا يوجد منسوبون</div>
              </div>
            ) : (
              employees.map((emp) => {
                const lawyer = isLawyer(emp);
                return (
                  <button
                    key={emp.id}
                    className={`hr-emp ${selectedId === emp.id ? 'hr-emp--active' : ''}`}
                    onClick={() => select(emp.id)}
                  >
                    <div className="hr-avatar">{initials(emp.user?.name)}</div>
                    <div className="hr-emp__main">
                      <div className="hr-emp__nm">{emp.user?.name || '—'}</div>
                      <div className="hr-emp__sub">{emp.job_title || emp.department || roleLabel(emp.user?.role)}</div>
                    </div>
                    <div className="hr-emp__side">
                      {lawyer && (
                        <ShieldCheck
                          size={15}
                          className="hr-emp__verify"
                          style={{
                            color: emp.sba_verification_status === 'verified_same_firm' ? 'var(--status-green)'
                              : emp.sba_verification_status === 'verified_other_firm' ? 'var(--law-gold)'
                              : emp.sba_verification_status === 'expired' ? 'var(--status-red)'
                              : 'var(--color-text-secondary)',
                          }}
                        />
                      )}
                      <span className="hr-dot" style={{ background: STATUS_DOT[emp.status] || 'var(--color-text-secondary)' }} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {lastPage > 1 && (
            <div className="hr-roster__pager">
              <button className="hr-pg-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="السابق"><ChevronRight size={15} /></button>
              <span>صفحة {page} من {lastPage}</span>
              <button className="hr-pg-btn" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} aria-label="التالي"><ChevronLeft size={15} /></button>
            </div>
          )}
        </aside>

        {/* العمود اليسار: المسرح */}
        <main className="hr-stage">
          {selectedId != null ? (
            <EmployeeDossier empId={selectedId} key={selectedId} />
          ) : (
            <>
              <div className="hr-stage__head">
                <div className="hr-stage__head-icon"><LayoutDashboard size={20} /></div>
                <div className="hr-stage__head-titles">
                  <div className="hr-stage__head-title">لوحة الموارد البشرية</div>
                  <div className="hr-stage__head-sub">إحصائيات المكتب وخدمات المنسوبين</div>
                </div>
              </div>
              <HrOverview stats={stats} total={total} canManage={canManage} onAdd={() => setShowAdd(true)} onHolidays={() => setShowHolidays(true)} />
            </>
          )}
        </main>
      </div>

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['hr'] })}
        />
      )}
      {showHolidays && <HolidaysModal onClose={() => setShowHolidays(false)} />}
    </div>
  );
};

export default HrModule;
