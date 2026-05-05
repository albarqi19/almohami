/**
 * Client Detail — Export Builder
 *
 * Multi-section HTML→Blob exporter for the redesigned ClientDetailPage.
 * Sections opt-in via ClientExportConfig. Excel (.xls) or Word (.doc).
 *
 * Pattern matches lawyerExportHelpers.ts.
 */

import { getPrimaryLawyerName } from './lawyerHelpers';
import type { Client, ClientCommunication } from '../services/clientManagementService';

// --- Types ----------------------------------------------------------------

export interface ClientCase {
  id: number;
  file_number?: string | null;
  case_number?: string | null;
  title?: string | null;
  status?: string | null;
  outcome?: string | null;
  case_type?: string | null;
  priority?: string | null;
  next_hearing?: string | null;
  contract_value?: number | null;
  primaryLawyer?: { id: number; name: string }[] | null;
  primary_lawyer?: { id: number; name: string }[] | null;
  lawyers?: { id: number; name: string; pivot?: { is_primary?: boolean | number | null } }[] | null;
}

export interface ClientStats {
  total_cases: number;
  active_cases: number;
  pending_cases: number;
  closed_cases: number;
}

export interface ClientUpcomingSession {
  id: number;
  session_date?: string | null;
  session_date_gregorian?: string | null;
  session_time?: string | null;
  court?: string | null;
  case?: {
    id?: number;
    file_number?: string | null;
    title?: string | null;
    primaryLawyer?: { id: number; name: string }[] | null;
    primary_lawyer?: { id: number; name: string }[] | null;
  } | null;
}

export interface ClientTask {
  id: number;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  case?: { id?: number; file_number?: string | null; title?: string | null } | null;
}

export interface ClientActivity {
  id: number;
  description?: string | null;
  created_at?: string | null;
  performer?: { id: number; name: string } | null;
  case?: { id?: number; title?: string | null; file_number?: string | null } | null;
}

export interface ClientWekala {
  id: number;
  number?: string | null;
  type?: string | null;
  status?: string | null;
  issue_date_gregorian?: string | null;
  expiry_date_gregorian?: string | null;
}

export interface ClientDocument {
  id: number;
  name?: string | null;
  description?: string | null;
  created_at?: string | null;
  case?: { id?: number; file_number?: string | null; title?: string | null } | null;
}

export interface ClientReportData {
  client: Client;
  stats: ClientStats;
  cases: ClientCase[];
  upcoming_sessions: ClientUpcomingSession[];
  tasks: ClientTask[];
  communications: ClientCommunication[];
  documents: ClientDocument[];
  wekalat: ClientWekala[];
  activities: ClientActivity[];
  internal_notes?: string;
}

export type CaseScope = 'all' | 'active' | 'closed';
export type TaskScope = 'all' | 'open' | 'overdue' | 'completed';

export interface ClientExportConfig {
  clientInfo: { enabled: boolean };
  stats: { enabled: boolean };
  cases: { enabled: boolean; scope: CaseScope };
  upcomingSessions: { enabled: boolean; limit: number };
  tasks: { enabled: boolean; scope: TaskScope };
  documentsWekalat: { enabled: boolean };
  communicationsActivities: { enabled: boolean; limit: number };
  notes: { enabled: boolean };
  format: 'excel' | 'word';
}

export const DEFAULT_CLIENT_EXPORT_CONFIG: ClientExportConfig = {
  clientInfo: { enabled: true },
  stats: { enabled: true },
  cases: { enabled: true, scope: 'active' },
  upcomingSessions: { enabled: false, limit: 10 },
  tasks: { enabled: false, scope: 'open' },
  documentsWekalat: { enabled: false },
  communicationsActivities: { enabled: false, limit: 30 },
  notes: { enabled: false },
  format: 'excel',
};

// --- Public API -----------------------------------------------------------

export function buildClientReport(data: ClientReportData, config: ClientExportConfig): void {
  const sections: string[] = [];

  if (config.clientInfo.enabled) sections.push(renderClientInfoSection(data.client));
  if (config.stats.enabled) sections.push(renderStatsSection(data));
  if (config.cases.enabled) sections.push(renderCasesSection(data.cases, config.cases.scope));
  if (config.upcomingSessions.enabled) sections.push(renderSessionsSection(data.upcoming_sessions, config.upcomingSessions.limit));
  if (config.tasks.enabled) sections.push(renderTasksSection(data.tasks, config.tasks.scope));
  if (config.documentsWekalat.enabled) sections.push(renderDocumentsAndWekalatSection(data.documents, data.wekalat));
  if (config.communicationsActivities.enabled) {
    sections.push(renderCommunicationsSection(data.communications, config.communicationsActivities.limit));
    sections.push(renderActivitiesSection(data.activities, config.communicationsActivities.limit));
  }
  if (config.notes.enabled) sections.push(renderNotesSection(data.internal_notes || ''));

  const html = wrapDocument(data.client, sections.join('\n<br/><br/>\n'));
  downloadBlob(html, data.client.name, config.format);
}

export function quickExportClientCases(data: ClientReportData): void {
  buildClientReport(data, DEFAULT_CLIENT_EXPORT_CONFIG);
}

// --- Section renderers ----------------------------------------------------

function renderClientInfoSection(c: Client): string {
  const rows: [string, string][] = [
    ['الاسم', esc(c.name)],
    ['نوع العميل', esc(entityTypeLabel(c.entity_type ?? null))],
    ['رقم الهوية / السجل', esc(c.national_id || '-')],
    ['الجوال', esc(c.phone || '-')],
    ['البريد الإلكتروني', esc(c.email || '-')],
  ];

  if (c.entity_type && c.entity_type !== 'individual') {
    rows.push(
      ['السجل التجاري', esc(c.commercial_registration || '-')],
      ['الرقم الضريبي', esc(c.vat_number || '-')],
      ['العنوان الوطني', esc(c.national_address || '-')],
      ['الصناعة', esc(c.industry || '-')],
      ['الممثل القانوني', esc(c.legal_representative || '-')],
    );
    if (c.point_of_contact_name || c.point_of_contact_phone || c.point_of_contact_email) {
      rows.push(
        ['جهة الاتصال', esc(c.point_of_contact_name || '-')],
        ['جوال جهة الاتصال', esc(c.point_of_contact_phone || '-')],
        ['بريد جهة الاتصال', esc(c.point_of_contact_email || '-')],
      );
    }
  }

  if (c.relationship_manager) {
    rows.push(['مدير الحساب', esc(c.relationship_manager.name)]);
  }

  const body = rows.map(([k, v]) => `
    <tr>
      <td style="${TH_STYLE}; width: 200px;">${k}</td>
      <td style="${TD_STYLE}">${v}</td>
    </tr>
  `).join('');

  return sectionWrap('معلومات العميل', `<table style="${TABLE_STYLE}"><tbody>${body}</tbody></table>`);
}

function renderStatsSection(data: ClientReportData): string {
  const totalRevenue = data.cases.reduce((s, c) => s + (Number(c.contract_value) || 0), 0);
  return sectionWrap('الإحصائيات', `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">إجمالي القضايا</th>
          <th style="${TH_STYLE}">القضايا النشطة</th>
          <th style="${TH_STYLE}">قيد النظر</th>
          <th style="${TH_STYLE}">المغلقة</th>
          <th style="${TH_STYLE}">إجمالي قيمة العقود (SAR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${TD_STYLE}">${data.stats.total_cases}</td>
          <td style="${TD_STYLE}">${data.stats.active_cases}</td>
          <td style="${TD_STYLE}">${data.stats.pending_cases}</td>
          <td style="${TD_STYLE}">${data.stats.closed_cases}</td>
          <td style="${TD_STYLE}">${formatNumber(totalRevenue)}</td>
        </tr>
      </tbody>
    </table>
  `);
}

function renderCasesSection(cases: ClientCase[], scope: CaseScope): string {
  const filtered = filterCasesByScope(cases, scope);
  const scopeLabel = scope === 'active' ? 'القضايا النشطة'
                    : scope === 'closed' ? 'القضايا المغلقة'
                    : 'كل القضايا';

  if (filtered.length === 0) {
    return sectionWrap(scopeLabel, `<p style="color:#64748b;">لا توجد قضايا ضمن هذا النطاق.</p>`);
  }

  const totalValue = filtered.reduce((s, c) => s + (Number(c.contract_value) || 0), 0);
  const rows = filtered.map((c, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${esc(c.file_number || c.case_number || '-')}</td>
      <td style="${TD_STYLE}">${esc(c.title || '-')}</td>
      <td style="${TD_STYLE}">${esc(getPrimaryLawyerName(c as never, '-'))}</td>
      <td style="${TD_STYLE}">${esc(caseStatusLabel(c.status))}</td>
      <td style="${TD_STYLE}">${esc(priorityLabel(c.priority))}</td>
      <td style="${TD_STYLE}">${formatNumber(c.contract_value)}</td>
      <td style="${TD_STYLE}">${formatDate(c.next_hearing)}</td>
    </tr>
  `).join('');

  const summary = `
    <tr style="background:#f8fafc; font-weight:bold;">
      <td colspan="6" style="${TD_STYLE}">الإجمالي (${filtered.length} قضية)</td>
      <td style="${TD_STYLE}">${formatNumber(totalValue)}</td>
      <td style="${TD_STYLE}"></td>
    </tr>
  `;

  return sectionWrap(scopeLabel, `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">رقم الملف</th>
          <th style="${TH_STYLE}">القضية</th>
          <th style="${TH_STYLE}">المحامي المسؤول</th>
          <th style="${TH_STYLE}">الحالة</th>
          <th style="${TH_STYLE}">الأولوية</th>
          <th style="${TH_STYLE}">القيمة (SAR)</th>
          <th style="${TH_STYLE}">الجلسة القادمة</th>
        </tr>
      </thead>
      <tbody>${rows}${summary}</tbody>
    </table>
  `);
}

function renderSessionsSection(sessions: ClientUpcomingSession[], limit: number): string {
  const list = sessions.slice(0, limit);
  if (list.length === 0) {
    return sectionWrap('الجلسات القادمة', `<p style="color:#64748b;">لا توجد جلسات قادمة.</p>`);
  }
  const rows = list.map((s, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${formatDate(s.session_date_gregorian || s.session_date)}</td>
      <td style="${TD_STYLE}">${esc(s.session_time || '-')}</td>
      <td style="${TD_STYLE}">${esc(s.case?.title || '-')} ${s.case?.file_number ? `· ${esc(s.case.file_number)}` : ''}</td>
      <td style="${TD_STYLE}">${esc(s.court || '-')}</td>
      <td style="${TD_STYLE}">${esc(getPrimaryLawyerName(s.case as never, '-'))}</td>
    </tr>
  `).join('');
  return sectionWrap('الجلسات القادمة', `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">التاريخ</th>
          <th style="${TH_STYLE}">الوقت</th>
          <th style="${TH_STYLE}">القضية</th>
          <th style="${TH_STYLE}">المحكمة</th>
          <th style="${TH_STYLE}">المحامي المسؤول</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function renderTasksSection(tasks: ClientTask[], scope: TaskScope): string {
  const filtered = filterTasksByScope(tasks, scope);
  const scopeLabel = scope === 'overdue' ? 'المهام المتأخرة'
                    : scope === 'open' ? 'المهام المفتوحة'
                    : scope === 'completed' ? 'المهام المنجَزة'
                    : 'كل المهام';

  if (filtered.length === 0) {
    return sectionWrap(scopeLabel, `<p style="color:#64748b;">لا توجد مهام ضمن هذا النطاق.</p>`);
  }

  const rows = filtered.map((t, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${esc(t.title || '-')}</td>
      <td style="${TD_STYLE}">${t.case ? esc(`${t.case.file_number || ''} ${t.case.title || ''}`.trim()) : '-'}</td>
      <td style="${TD_STYLE}">${esc(priorityLabel(t.priority))}</td>
      <td style="${TD_STYLE}">${formatDate(t.due_date)}</td>
      <td style="${TD_STYLE}">${esc(taskStatusLabel(t.status))}</td>
    </tr>
  `).join('');
  return sectionWrap(scopeLabel, `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">المهمة</th>
          <th style="${TH_STYLE}">القضية المرتبطة</th>
          <th style="${TH_STYLE}">الأولوية</th>
          <th style="${TH_STYLE}">الموعد</th>
          <th style="${TH_STYLE}">الحالة</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function renderDocumentsAndWekalatSection(docs: ClientDocument[], wekalat: ClientWekala[]): string {
  const docsTable = docs.length === 0
    ? `<p style="color:#64748b;">لا توجد مستندات.</p>`
    : `<table style="${TABLE_STYLE}">
        <thead>
          <tr>
            <th style="${TH_STYLE}">#</th>
            <th style="${TH_STYLE}">الاسم</th>
            <th style="${TH_STYLE}">القضية المرتبطة</th>
            <th style="${TH_STYLE}">تاريخ الرفع</th>
          </tr>
        </thead>
        <tbody>
          ${docs.map((d, i) => `
            <tr>
              <td style="${TD_STYLE}">${i + 1}</td>
              <td style="${TD_STYLE}">${esc(d.name || '-')}</td>
              <td style="${TD_STYLE}">${d.case ? esc(`${d.case.file_number || ''} ${d.case.title || ''}`.trim()) : '-'}</td>
              <td style="${TD_STYLE}">${formatDate(d.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  const wekalatTable = wekalat.length === 0
    ? `<p style="color:#64748b;">لا توجد وكالات.</p>`
    : `<table style="${TABLE_STYLE}">
        <thead>
          <tr>
            <th style="${TH_STYLE}">رقم الوكالة</th>
            <th style="${TH_STYLE}">النوع</th>
            <th style="${TH_STYLE}">الحالة</th>
            <th style="${TH_STYLE}">تاريخ الإصدار</th>
            <th style="${TH_STYLE}">تاريخ الانتهاء</th>
          </tr>
        </thead>
        <tbody>
          ${wekalat.map(w => `
            <tr>
              <td style="${TD_STYLE}">${esc(w.number || '-')}</td>
              <td style="${TD_STYLE}">${esc(w.type || '-')}</td>
              <td style="${TD_STYLE}">${esc(w.status || '-')}</td>
              <td style="${TD_STYLE}">${formatDate(w.issue_date_gregorian)}</td>
              <td style="${TD_STYLE}">${formatDate(w.expiry_date_gregorian)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  return sectionWrap('المستندات والوكالات', `
    <h3 style="margin: 12px 0 6px; font-size:14px; color:#1E3A5F;">المستندات (${docs.length})</h3>
    ${docsTable}
    <h3 style="margin: 16px 0 6px; font-size:14px; color:#1E3A5F;">الوكالات (${wekalat.length})</h3>
    ${wekalatTable}
  `);
}

function renderCommunicationsSection(list: ClientCommunication[], limit: number): string {
  const items = list.slice(0, limit);
  if (items.length === 0) {
    return sectionWrap('سجل التواصل', `<p style="color:#64748b;">لا توجد سجلات تواصل.</p>`);
  }
  const rows = items.map((c, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${formatDateTime(c.occurred_at)}</td>
      <td style="${TD_STYLE}">${esc(communicationTypeLabel(c.type))}</td>
      <td style="${TD_STYLE}">${esc(c.direction === 'inbound' ? 'وارد' : 'صادر')}</td>
      <td style="${TD_STYLE}">${esc(c.subject || '-')}</td>
      <td style="${TD_STYLE}">${esc(c.notes || '-')}</td>
      <td style="${TD_STYLE}">${esc((c.loggedBy?.name || c.logged_by?.name) ?? '-')}</td>
    </tr>
  `).join('');
  return sectionWrap('سجل التواصل', `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">التاريخ</th>
          <th style="${TH_STYLE}">النوع</th>
          <th style="${TH_STYLE}">الاتجاه</th>
          <th style="${TH_STYLE}">الموضوع</th>
          <th style="${TH_STYLE}">الملاحظات</th>
          <th style="${TH_STYLE}">المسجِّل</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function renderActivitiesSection(list: ClientActivity[], limit: number): string {
  const items = list.slice(0, limit);
  if (items.length === 0) {
    return sectionWrap('النشاطات', `<p style="color:#64748b;">لا توجد نشاطات.</p>`);
  }
  const rows = items.map((a, i) => `
    <tr>
      <td style="${TD_STYLE}">${i + 1}</td>
      <td style="${TD_STYLE}">${formatDateTime(a.created_at)}</td>
      <td style="${TD_STYLE}">${esc(a.description || '-')}</td>
      <td style="${TD_STYLE}">${esc(a.performer?.name || '-')}</td>
      <td style="${TD_STYLE}">${esc(a.case?.title || '-')}</td>
    </tr>
  `).join('');
  return sectionWrap('النشاطات', `
    <table style="${TABLE_STYLE}">
      <thead>
        <tr>
          <th style="${TH_STYLE}">#</th>
          <th style="${TH_STYLE}">التاريخ</th>
          <th style="${TH_STYLE}">الوصف</th>
          <th style="${TH_STYLE}">المنفّذ</th>
          <th style="${TH_STYLE}">القضية</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

function renderNotesSection(notes: string): string {
  if (!notes.trim()) {
    return sectionWrap('الملاحظات الداخلية', `<p style="color:#64748b;">لا توجد ملاحظات.</p>`);
  }
  return sectionWrap('الملاحظات الداخلية', `<p style="white-space:pre-wrap; font-size:13px;">${esc(notes)}</p>`);
}

// --- Filters --------------------------------------------------------------

export function filterCasesByScope(cases: ClientCase[], scope: CaseScope): ClientCase[] {
  if (scope === 'all') return cases;
  if (scope === 'active') return cases.filter(c => c.status === 'active' || c.status === 'pending');
  return cases.filter(c => c.status === 'closed' || c.status === 'settled' || c.status === 'dismissed');
}

export function filterTasksByScope(tasks: ClientTask[], scope: TaskScope): ClientTask[] {
  if (scope === 'all') return tasks;
  if (scope === 'overdue') return tasks.filter(t => t.status === 'overdue');
  if (scope === 'completed') return tasks.filter(t => t.status === 'completed');
  return tasks.filter(t => t.status !== 'completed');
}

// --- Helpers --------------------------------------------------------------

const TABLE_STYLE = 'width:100%; border-collapse:collapse; margin:8px 0; direction:rtl; font-family:Tahoma, Arial, sans-serif;';
const TH_STYLE = 'background:#1E3A5F; color:white; padding:10px; text-align:right; border:1px solid #ddd; font-weight:bold;';
const TD_STYLE = 'padding:8px 10px; border:1px solid #e2e8f0; text-align:right; font-size:12px;';

function sectionWrap(title: string, body: string): string {
  return `
    <div style="margin-bottom:24px;">
      <h2 style="background:#f1f5f9; padding:10px 14px; border-right:4px solid #1E3A5F; font-size:16px; color:#1E3A5F; margin:0 0 8px;">${esc(title)}</h2>
      ${body}
    </div>
  `;
}

function wrapDocument(client: Client, body: string): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>تقرير ${esc(client.name)}</title></head>
<body style="font-family:Tahoma, Arial, sans-serif; direction:rtl; padding:16px;">
  <div style="text-align:center; margin-bottom:24px;">
    <h1 style="color:#1E3A5F; margin:0; font-size:22px;">ملف العميل: ${esc(client.name)}</h1>
    <p style="color:#64748b; margin:6px 0 0; font-size:13px;">تاريخ الإنشاء: ${esc(dateStr)}</p>
  </div>
  ${body}
</body></html>`;
}

function downloadBlob(html: string, clientName: string, format: 'excel' | 'word'): void {
  const mime = format === 'excel' ? 'application/vnd.ms-excel' : 'application/msword';
  const ext = format === 'excel' ? 'xls' : 'doc';
  const blob = new Blob(['﻿', html], { type: mime });
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `ملف_${safeName}_${dateStr}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// --- Formatters & label maps ----------------------------------------------

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function caseStatusLabel(s: string | null | undefined): string {
  if (!s) return '-';
  return ({
    active: 'نشطة', pending: 'قيد النظر', closed: 'مغلقة',
    settled: 'مصالحة', appealed: 'مستأنفة', dismissed: 'مرفوضة',
  } as Record<string, string>)[s] || s;
}

function priorityLabel(p: string | null | undefined): string {
  if (!p) return '-';
  return ({ urgent: 'عاجلة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' } as Record<string, string>)[p] || p;
}

function taskStatusLabel(s: string | null | undefined): string {
  if (!s) return '-';
  return ({
    pending: 'في الانتظار', in_progress: 'قيد التنفيذ', completed: 'منجَزة',
    overdue: 'متأخرة', paused: 'معلَّقة',
  } as Record<string, string>)[s] || s;
}

function entityTypeLabel(t: string | null | undefined): string {
  if (!t) return 'فرد';
  return ({ individual: 'فرد', company: 'شركة', organization: 'مؤسسة' } as Record<string, string>)[t] || t;
}

function communicationTypeLabel(t: string | null | undefined): string {
  if (!t) return '-';
  return ({
    call: 'مكالمة', whatsapp: 'واتساب', email: 'بريد إلكتروني',
    meeting: 'اجتماع', sms: 'رسالة نصية', other: 'أخرى',
  } as Record<string, string>)[t] || t;
}
