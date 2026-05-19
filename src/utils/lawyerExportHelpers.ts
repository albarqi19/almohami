/**
 * Lawyer Report — Export Builder
 *
 * Builds a multi-section report (HTML-blob → .xls / .doc) from the
 * LawyerDetailData payload. Sections are opt-in via ExportConfig.
 *
 * Pattern matches UpcomingSessions.tsx export functions: HTML with inline
 * styles wrapped in office namespaces, BOM-prefixed for correct encoding.
 */

import { apiClient } from './api';

// --- Types --------------------------------------------------------------

export interface LawyerCase {
  id: number;
  file_number: string;
  title: string;
  status: string;
  outcome: string | null;
  client_name: string;
  case_type: string;
  priority: string | null;
  filing_date: string | null;
  next_hearing: string | null;
  contract_value: number | null;
  /** Legacy alias for is_responsible — kept for old export helpers. */
  is_primary: boolean;
  /** New per-case bucket flags (2026-05-18). */
  is_responsible?: boolean;
  is_party?: boolean;
  is_shared?: boolean;
}

export interface LawyerTask {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  completed_at: string | null;
  case: { id: number; file_number: string; title: string } | null;
}

export interface MonthlyPerformance {
  month: string;
  cases: number;
  tasks_completed: number;
}

export interface BucketCounts {
  active: number;
  closed: number;
  total: number;
}

export interface PerformanceBreakdown {
  responsible: BucketCounts;
  party: BucketCounts;
  shared: BucketCounts;
}

export interface LawyerReportData {
  lawyer: { id: number; name: string; email: string | null; avatar: string | null; role: string };
  cases: LawyerCase[];
  active_cases: LawyerCase[];
  responsible_cases: LawyerCase[];
  responsible_cases_count: number;
  task_stats: { total: number; completed: number; in_progress: number; overdue: number; completion_rate: number };
  tasks: LawyerTask[];
  win_rate: { percentage: number; won: number; lost: number; settled: number; total_closed: number };
  monthly_performance: MonthlyPerformance[];
  breakdown: PerformanceBreakdown;
  is_self?: boolean;
}

export interface PresenceLogData {
  user: { id: number; name: string };
  total_active_hours: number;
  total_idle_hours: number;
  total_hours: number;
  daily_breakdown: { date: string; active_hours: number; idle_hours: number; total_hours: number }[];
}

export type CasesScope = 'active' | 'responsible' | 'all';
export type TasksScope = 'overdue' | 'unfinished' | 'completed' | 'all';

/** Bucket dimension used by the new two-level cases filter (2026-05-18). */
export type BucketScope = 'responsible' | 'party' | 'shared';
/** Status sub-filter used within a bucket. */
export type StatusScope = 'all' | 'active' | 'closed';

export interface ExportConfig {
  cases: { enabled: boolean; scope: CasesScope };
  tasks: { enabled: boolean; scope: TasksScope };
  presence: { enabled: boolean; startDate?: string; endDate?: string };
  performance: { enabled: boolean };
  lawyerInfo: { enabled: boolean };
  format: 'excel' | 'word';
}

// --- Defaults -----------------------------------------------------------

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  cases: { enabled: true, scope: 'active' },
  tasks: { enabled: false, scope: 'overdue' },
  presence: { enabled: false },
  performance: { enabled: false },
  lawyerInfo: { enabled: false },
  format: 'excel',
};

// --- Public API ---------------------------------------------------------

export async function buildLawyerReport(
  data: LawyerReportData,
  config: ExportConfig
): Promise<void> {
  const sections: string[] = [];

  if (config.lawyerInfo.enabled) sections.push(renderLawyerInfoSection(data));
  if (config.performance.enabled) sections.push(renderPerformanceSection(data));
  if (config.cases.enabled) sections.push(renderCasesSection(data, config.cases.scope));
  if (config.tasks.enabled) sections.push(renderTasksSection(data, config.tasks.scope));

  if (config.presence.enabled) {
    const presence = await fetchPresenceForExport(data.lawyer.id, config.presence.startDate, config.presence.endDate);
    if (presence) sections.push(renderPresenceSection(presence));
  }

  const html = wrapDocument(data, sections.join('\n<br/><br/>\n'));
  downloadBlob(html, data.lawyer.name, config.format);
}

export async function quickExportActiveCases(data: LawyerReportData): Promise<void> {
  await buildLawyerReport(data, DEFAULT_EXPORT_CONFIG);
}

// --- Section renderers --------------------------------------------------

function renderLawyerInfoSection(data: LawyerReportData): string {
  const l = data.lawyer;
  return sectionWrap('معلومات المحامي', `
    <table style="${TABLE_STYLE}">
      <tbody>
        <tr><td style="${TH_STYLE}">الاسم</td><td style="${TD_STYLE}">${esc(l.name)}</td></tr>
        <tr><td style="${TH_STYLE}">الدور</td><td style="${TD_STYLE}">${esc(roleLabel(l.role))}</td></tr>
        <tr><td style="${TH_STYLE}">البريد الإلكتروني</td><td style="${TD_STYLE}">${esc(l.email || '-')}</td></tr>
      </tbody>
    </table>
  `);
}

function renderPerformanceSection(data: LawyerReportData): string {
  const totalRevenue = data.cases.reduce((s, c) => s + (Number(c.contract_value) || 0), 0);
  const kpis = `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">إجمالي القضايا</th>
          <th style="${TH_STYLE}">المسؤول عنها</th>
          <th style="${TH_STYLE}">القضايا النشطة</th>
          <th style="${TH_STYLE}">معدل الفوز</th>
          <th style="${TH_STYLE}">إنجاز المهام</th>
          <th style="${TH_STYLE}">إجمالي قيمة العقود (SAR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${TD_STYLE}">${data.cases.length}</td>
          <td style="${TD_STYLE}">${data.responsible_cases_count}</td>
          <td style="${TD_STYLE}">${data.active_cases.length}</td>
          <td style="${TD_STYLE}">${data.win_rate.percentage}%</td>
          <td style="${TD_STYLE}">${data.task_stats.completion_rate}%</td>
          <td style="${TD_STYLE}">${formatNumber(totalRevenue)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const monthlyRows = data.monthly_performance.map(m => `
    <tr>
      <td style="${TD_STYLE}">${esc(m.month)}</td>
      <td style="${TD_STYLE}">${m.cases}</td>
      <td style="${TD_STYLE}">${m.tasks_completed}</td>
    </tr>
  `).join('');

  const monthly = `
    <h3 style="margin: 16px 0 8px; font-size: 14px; color: #1E3A5F;">الأداء الشهري (آخر 6 أشهر)</h3>
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">الشهر</th>
          <th style="${TH_STYLE}">قضايا جديدة</th>
          <th style="${TH_STYLE}">مهام منجَزة</th>
        </tr>
      </thead>
      <tbody>${monthlyRows}</tbody>
    </table>
  `;

  return sectionWrap('ملخص الأداء', kpis + monthly);
}

function renderCasesSection(data: LawyerReportData, scope: CasesScope): string {
  const list = scope === 'active' ? data.active_cases
             : scope === 'responsible' ? data.responsible_cases
             : data.cases;

  const scopeLabel = scope === 'active' ? 'القضايا النشطة'
                    : scope === 'responsible' ? 'القضايا المسؤول عنها'
                    : 'كل القضايا المكلف بها';

  if (list.length === 0) {
    return sectionWrap(scopeLabel, `<p style="color: #64748b;">لا توجد قضايا ضمن هذا النطاق.</p>`);
  }

  const totalValue = list.reduce((s, c) => s + (Number(c.contract_value) || 0), 0);

  const rows = list.map((c, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${esc(c.file_number || '-')}</td>
      <td style="${TD_STYLE}">${esc(c.title || '-')}</td>
      <td style="${TD_STYLE}">${esc(c.client_name || '-')}</td>
      <td style="${TD_STYLE}">${esc(caseTypeLabel(c.case_type))}</td>
      <td style="${TD_STYLE}">${esc(priorityLabel(c.priority))}</td>
      <td style="${TD_STYLE}">${c.is_primary ? '★ مسؤول' : 'مكلف'}</td>
      <td style="${TD_STYLE}">${esc(statusLabel(c.status))}</td>
      <td style="${TD_STYLE}">${esc(outcomeLabel(c.outcome))}</td>
      <td style="${TD_STYLE}">${formatNumber(c.contract_value)}</td>
      <td style="${TD_STYLE}">${formatDate(c.next_hearing)}</td>
    </tr>
  `).join('');

  const summary = `
    <tr style="background: #f8fafc; font-weight: bold;">
      <td colspan="9" style="${TD_STYLE}">الإجمالي (${list.length} قضية)</td>
      <td style="${TD_STYLE}">${formatNumber(totalValue)}</td>
      <td style="${TD_STYLE}"></td>
    </tr>
  `;

  const table = `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">رقم الملف</th>
          <th style="${TH_STYLE}">القضية</th>
          <th style="${TH_STYLE}">العميل</th>
          <th style="${TH_STYLE}">النوع</th>
          <th style="${TH_STYLE}">الأولوية</th>
          <th style="${TH_STYLE}">الدور</th>
          <th style="${TH_STYLE}">الحالة</th>
          <th style="${TH_STYLE}">النتيجة</th>
          <th style="${TH_STYLE}">القيمة (SAR)</th>
          <th style="${TH_STYLE}">الجلسة القادمة</th>
        </tr>
      </thead>
      <tbody>${rows}${summary}</tbody>
    </table>
  `;

  return sectionWrap(scopeLabel, table);
}

function renderTasksSection(data: LawyerReportData, scope: TasksScope): string {
  const list = filterTasksByScope(data.tasks, scope);

  const scopeLabel = scope === 'overdue' ? 'المهام المتأخرة'
                   : scope === 'unfinished' ? 'المهام غير المنجَزة'
                   : scope === 'completed' ? 'المهام المنجَزة'
                   : 'كل المهام';

  if (list.length === 0) {
    return sectionWrap(scopeLabel, `<p style="color: #64748b;">لا توجد مهام ضمن هذا النطاق.</p>`);
  }

  const rows = list.map((t, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${esc(t.title || '-')}</td>
      <td style="${TD_STYLE}">${t.case ? esc(`${t.case.file_number} — ${t.case.title}`) : '-'}</td>
      <td style="${TD_STYLE}">${esc(priorityLabel(t.priority))}</td>
      <td style="${TD_STYLE}">${formatDate(t.due_date)}</td>
      <td style="${TD_STYLE}">${esc(taskStatusLabel(t.status))}</td>
      <td style="${TD_STYLE}">${formatDate(t.completed_at)}</td>
    </tr>
  `).join('');

  const table = `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">المهمة</th>
          <th style="${TH_STYLE}">القضية المرتبطة</th>
          <th style="${TH_STYLE}">الأولوية</th>
          <th style="${TH_STYLE}">الموعد</th>
          <th style="${TH_STYLE}">الحالة</th>
          <th style="${TH_STYLE}">تاريخ الإنجاز</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return sectionWrap(scopeLabel, table);
}

function renderPresenceSection(presence: PresenceLogData): string {
  const summary = `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">إجمالي ساعات النشاط</th>
          <th style="${TH_STYLE}">إجمالي ساعات الخمول</th>
          <th style="${TH_STYLE}">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${TD_STYLE}">${formatHours(presence.total_active_hours)}</td>
          <td style="${TD_STYLE}">${formatHours(presence.total_idle_hours)}</td>
          <td style="${TD_STYLE}">${formatHours(presence.total_hours)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const dailyRows = presence.daily_breakdown.map(d => `
    <tr>
      <td style="${TD_STYLE}">${formatDate(d.date)}</td>
      <td style="${TD_STYLE}">${formatHours(d.active_hours)}</td>
      <td style="${TD_STYLE}">${formatHours(d.idle_hours)}</td>
      <td style="${TD_STYLE}">${formatHours(d.total_hours)}</td>
    </tr>
  `).join('');

  const daily = `
    <h3 style="margin: 16px 0 8px; font-size: 14px; color: #1E3A5F;">التفصيل اليومي</h3>
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">التاريخ</th>
          <th style="${TH_STYLE}">نشط</th>
          <th style="${TH_STYLE}">خامل</th>
          <th style="${TH_STYLE}">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${dailyRows}</tbody>
    </table>
  `;

  return sectionWrap('سجل الحضور', summary + daily);
}

// --- Helpers ------------------------------------------------------------

export function filterTasksByScope(tasks: LawyerTask[], scope: TasksScope): LawyerTask[] {
  if (scope === 'all') return tasks;
  if (scope === 'overdue') return tasks.filter(t => t.status === 'overdue');
  if (scope === 'completed') return tasks.filter(t => t.status === 'completed');
  // unfinished = anything except completed
  return tasks.filter(t => t.status !== 'completed');
}

async function fetchPresenceForExport(
  lawyerId: number,
  startDate?: string,
  endDate?: string
): Promise<PresenceLogData | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
    const response: any = await apiClient.get(`/presence/report?user_id=${lawyerId}&start_date=${start}&end_date=${end}`);
    if (response?.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch presence for export:', err);
    return null;
  }
}

const TABLE_STYLE = 'width: 100%; border-collapse: collapse; margin: 8px 0; direction: rtl; font-family: Tahoma, Arial, sans-serif;';
const TH_STYLE = 'background: #1E3A5F; color: white; padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;';
const TD_STYLE = 'padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px;';

function sectionWrap(title: string, body: string): string {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="background: #f1f5f9; padding: 10px 14px; border-right: 4px solid #1E3A5F; font-size: 16px; color: #1E3A5F; margin: 0 0 8px;">${esc(title)}</h2>
      ${body}
    </div>
  `;
}

function wrapDocument(data: LawyerReportData, body: string): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>تقرير ${esc(data.lawyer.name)}</title>
</head>
<body style="font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #1E3A5F; margin: 0; font-size: 22px;">تقرير المحامي: ${esc(data.lawyer.name)}</h1>
    <p style="color: #64748b; margin: 6px 0 0; font-size: 13px;">تاريخ الإنشاء: ${esc(dateStr)}</p>
  </div>
  ${body}
</body>
</html>`;
}

function downloadBlob(html: string, lawyerName: string, format: 'excel' | 'word'): void {
  const mime = format === 'excel' ? 'application/vnd.ms-excel' : 'application/msword';
  const ext = format === 'excel' ? 'xls' : 'doc';
  const blob = new Blob(['﻿', html], { type: mime });
  const safeName = lawyerName.replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `تقرير_${safeName}_${dateStr}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// --- Formatters & label maps -------------------------------------------

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '-';
  const num = Number(n);
  if (!isFinite(num)) return '-';
  return num.toLocaleString('en-US');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0';
  if (h === 0) return `${m} د`;
  return `${h} س ${m} د`;
}

function statusLabel(s: string): string {
  return ({ active: 'نشطة', pending: 'قيد النظر', closed: 'مغلقة', appealed: 'مستأنفة', settled: 'مصالحة', dismissed: 'مرفوضة' } as Record<string, string>)[s] || s || '-';
}

function outcomeLabel(o: string | null): string {
  if (!o) return '-';
  return ({ won: 'كسب', lost: 'خسارة', settled: 'تسوية', appealed: 'مستأنفة', dismissed: 'مرفوضة' } as Record<string, string>)[o] || o;
}

function priorityLabel(p: string | null): string {
  if (!p) return '-';
  return ({ urgent: 'عاجلة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' } as Record<string, string>)[p] || p;
}

function caseTypeLabel(t: string | null): string {
  if (!t) return '-';
  return ({ civil: 'مدنية', criminal: 'جنائية', commercial: 'تجارية', family: 'أسرية', labor: 'عمالية', administrative: 'إدارية', real_estate: 'عقارية', intellectual_property: 'ملكية فكرية', other: 'أخرى' } as Record<string, string>)[t] || t;
}

function taskStatusLabel(s: string): string {
  return ({ pending: 'في الانتظار', in_progress: 'قيد التنفيذ', completed: 'منجَزة', overdue: 'متأخرة', paused: 'معلَّقة' } as Record<string, string>)[s] || s || '-';
}

function roleLabel(r: string): string {
  return ({ admin: 'مدير النظام', partner: 'شريك', senior_lawyer: 'محامي أول', lawyer: 'محامي', legal_assistant: 'مساعد قانوني', assistant: 'مساعد', client: 'عميل' } as Record<string, string>)[r] || r;
}
