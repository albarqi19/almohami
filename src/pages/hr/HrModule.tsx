import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, ShieldCheck, Clock, Plus, Search, FileSignature, FileText, Calendar, BarChart3,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { LawyerVerifiedBadge } from '../../components/hr/LawyerVerifiedBadge';
import { AddEmployeeModal } from '../../components/hr/AddEmployeeModal';
import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS } from '../../types/hr';
import type { EmployeeFilters } from '../../types/hr';

const PAGE_TABS = [
  { key: 'employees', label: 'الموظفون', icon: Users },
  { key: 'contracts', label: 'العقود', icon: FileSignature },
  { key: 'letters', label: 'الخطابات', icon: FileText },
  { key: 'leave', label: 'الإجازات', icon: Calendar },
  { key: 'performance', label: 'مؤشرات النشاط', icon: BarChart3 },
];

const STATUS_DOT: Record<string, string> = {
  active: 'var(--status-green)',
  on_leave: 'var(--status-blue)',
  suspended: 'var(--color-text-secondary)',
  terminated: 'var(--status-red)',
};

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

const Kpi: React.FC<{ cls: string; icon: React.ReactNode; v: React.ReactNode; l: string }> = ({ cls, icon, v, l }) => (
  <div className={`hr-kpi hr-kpi--${cls}`}>
    <div className="hr-kpi__icon">{icon}</div>
    <div><div className="hr-kpi__v">{v}</div><div className="hr-kpi__l">{l}</div></div>
  </div>
);

const HrModule: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = usePermission('hr.manage');

  const [activeTab, setActiveTab] = useState('employees');
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, per_page: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['hr', 'stats'], queryFn: () => hrService.getStats() });
  const { data: list, isLoading } = useQuery({
    queryKey: ['hr', 'employees', filters],
    queryFn: () => hrService.getEmployees(filters),
  });

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput, page: 1 }));

  return (
    <div className="hr-page">
      <div className="hr-head">
        <div className="hr-head__title">
          <div className="hr-head__mark"><Users size={20} /></div>
          <div>
            <h1>الموارد البشرية</h1>
            <div className="hr-head__sub">إدارة منسوبي المكتب · التوثيق المهني</div>
          </div>
        </div>
        <div className="hr-head__spacer" />
        {canManage && (
          <button className="hr-btn hr-btn--primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> إضافة منسوب
          </button>
        )}
      </div>

      <div className="hr-kpis">
        <Kpi cls="navy" icon={<Users size={18} />} v={stats?.total ?? '—'} l="إجمالي المنسوبين" />
        <Kpi cls="green" icon={<ShieldCheck size={18} />} v={stats?.verified ?? '—'} l="محامون موثّقون" />
        <Kpi cls="gold" icon={<Clock size={18} />} v={stats?.expiring_soon ?? '—'} l="رخص/هويات تنتهي قريباً" />
        <Kpi cls="blue" icon={<Users size={18} />} v={stats?.active ?? '—'} l="نشطون" />
      </div>

      <div className="hr-tabs">
        {PAGE_TABS.map((t) => (
          <button
            key={t.key}
            className={`hr-tab ${activeTab === t.key ? 'hr-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={16} /> {t.label}
            {t.key !== 'employees' && <span className="hr-tab__soon">قريباً</span>}
          </button>
        ))}
      </div>

      {activeTab !== 'employees' ? (
        <div className="hr-soon-pane">
          <h3>قيد التطوير</h3>
          <p>هذه الوحدة ضمن المراحل القادمة من نظام الموارد البشرية.</p>
        </div>
      ) : (
        <>
          <div className="hr-toolbar">
            <div className="hr-search">
              <Search size={15} />
              <input
                placeholder="ابحث باسم، رقم وظيفي، أو جوال…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                onBlur={applySearch}
              />
            </div>
            <select
              className="hr-select"
              value={filters.status || ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as EmployeeFilters['status'], page: 1 }))}
            >
              <option value="">كل الحالات</option>
              {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              className="hr-select"
              value={filters.sba_status || ''}
              onChange={(e) => setFilters((f) => ({ ...f, sba_status: e.target.value as EmployeeFilters['sba_status'], page: 1 }))}
            >
              <option value="">كل حالات التوثيق</option>
              <option value="verified_same_firm">موثّق · مكتبك</option>
              <option value="verified_other_firm">موثّق · منشأة أخرى</option>
              <option value="pending">قيد التحقق</option>
              <option value="needs_national_id">بحاجة هوية</option>
              <option value="expired">رخصة منتهية</option>
            </select>
          </div>

          <div className="hr-table-wrap">
            {isLoading ? (
              <div className="hr-state">جارٍ التحميل…</div>
            ) : !list || list.data.length === 0 ? (
              <div className="hr-state"><Users /><div>لا يوجد منسوبون مطابقون</div></div>
            ) : (
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>القسم / المسمى</th>
                    <th>التعاقد</th>
                    <th>التوثيق</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((emp) => {
                    const isLawyer = !!emp.sba_license_number || emp.sba_verification_status !== 'pending';
                    return (
                      <tr key={emp.id} onClick={() => navigate(`/hr/employees/${emp.id}`)}>
                        <td>
                          <div className="hr-person">
                            <div className="hr-avatar">{initials(emp.user?.name)}</div>
                            <div>
                              <div className="hr-person__nm">{emp.user?.name || '—'}</div>
                              <div className="hr-person__rl">{emp.employee_number ? `رقم ${emp.employee_number}` : (emp.user?.role || '')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{emp.department || '—'}</div>
                          <div className="hr-person__rl">{emp.job_title || ''}</div>
                        </td>
                        <td className="hr-muted">{emp.employment_type ? EMPLOYMENT_TYPE_LABELS[emp.employment_type] : '—'}</td>
                        <td>
                          {isLawyer
                            ? <LawyerVerifiedBadge status={emp.sba_verification_status} remainingDays={remainingDays(emp.sba_license_expiry_gregorian)} />
                            : <span className="hr-badge hr-badge--gray">غير محامٍ</span>}
                        </td>
                        <td>
                          <span className="hr-pill">
                            <span className="hr-dot" style={{ background: STATUS_DOT[emp.status] || 'var(--color-text-secondary)' }} />
                            {EMPLOYEE_STATUS_LABELS[emp.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {list && list.last_page > 1 && (
            <div className="hr-pagination">
              <span>صفحة {list.current_page} من {list.last_page} · {list.total} منسوب</span>
              <div className="hr-pagination__actions">
                <button className="hr-btn hr-btn--sm" disabled={list.current_page <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}>السابق</button>
                <button className="hr-btn hr-btn--sm" disabled={list.current_page >= list.last_page} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}>التالي</button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['hr'] })}
        />
      )}
    </div>
  );
};

export default HrModule;
