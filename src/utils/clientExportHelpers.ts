/**
 * Client Detail — Export Builder
 *
 * «ملف العميل» — يُبنى **نموذج تقرير** محايد مرة واحدة (أقسام: حقول / جدول / نص) من البيانات التي تعرضها
 * صفحة العميل، ثم يخرج منه:
 *   • PDF  — يُرسل النموذج للخادم (`POST reports/render-pdf`) فيُطبع على ورقة المكتب الرسمية. هو الافتراضي.
 *   • Excel / Word — HTML من النموذج نفسه لمن يريد ملفاً يعدّل عليه.
 * الأقسام اختيارية عبر ClientExportConfig.
 */

import { getPrimaryLawyerName } from './lawyerHelpers';
import { API_BASE_URL } from './api';
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

/** خدمة قانونية / استشارة مرتبطة بالعميل مباشرةً (legal_services.client_id). */
export interface ClientService {
  id: number;
  service_number?: string | null;
  service_type?: string | null;
  service_type_arabic?: string | null;
  title?: string | null;
  status?: string | null;
  status_arabic?: string | null;
  agreed_amount?: number | string | null;
  due_date?: string | null;
  assigned_lawyer?: { id: number; name: string } | null;
  case_model?: { id: number; file_number?: string | null; title?: string | null } | null;
}

/** خطاب صادر حرّ (خطاب/إنذار/إشعار) موجّه للعميل مباشرةً (outgoing_letters.client_id). */
export interface ClientLetter {
  id: number;
  document_type?: string | null;
  type_label?: string | null;
  title?: string | null;
  outgoing_number?: string | null;
  status?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  case_id?: number | null;
  case?: { id?: number; file_number?: string | null; title?: string | null } | null;
}

export interface ClientReportData {
  client: Client;
  stats: ClientStats;
  cases: ClientCase[];
  upcoming_sessions: ClientUpcomingSession[];
  tasks: ClientTask[];
  services: ClientService[];
  letters: ClientLetter[];
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
  legalServices: { enabled: boolean };
  letters: { enabled: boolean };
  documentsWekalat: { enabled: boolean };
  communicationsActivities: { enabled: boolean; limit: number };
  notes: { enabled: boolean };
  format: 'pdf' | 'excel' | 'word';
}

export const DEFAULT_CLIENT_EXPORT_CONFIG: ClientExportConfig = {
  clientInfo: { enabled: true },
  stats: { enabled: true },
  cases: { enabled: true, scope: 'active' },
  upcomingSessions: { enabled: false, limit: 10 },
  tasks: { enabled: false, scope: 'open' },
  legalServices: { enabled: false },
  letters: { enabled: false },
  documentsWekalat: { enabled: false },
  communicationsActivities: { enabled: false, limit: 30 },
  notes: { enabled: false },
  // PDF على ورقة المكتب هو الافتراضي: التقرير يُرسل للعميل أو يُطبع. Excel/Word لمن يريد التعديل.
  format: 'pdf',
};

// --- نموذج التقرير ---------------------------------------------------------

/** قسم في التقرير — البنية نفسها التي يتحقق منها الخادم في ReportPdfController */
export type ReportSection =
  | { title: string; kind: 'fields'; note?: string; fields: Array<[string, string]> }
  | { title: string; kind: 'table'; note?: string; columns: string[]; rows: string[][] }
  | { title: string; kind: 'text'; note?: string; text: string };

export interface ReportModel {
  title: string;
  subtitle?: string;
  filename: string;
  sections: ReportSection[];
}

/** حد الخادم لكل قسم — ما زاد يُقصّ مع تنبيه في القسم بدل رفض التقرير كله */
const MAX_ROWS = 400;

// --- Public API -----------------------------------------------------------

export function buildClientReportModel(data: ClientReportData, config: ClientExportConfig): ReportModel {
  const sections: ReportSection[] = [];

  if (config.clientInfo.enabled) sections.push(clientInfoSection(data.client));
  if (config.stats.enabled) sections.push(statsSection(data));
  if (config.cases.enabled) sections.push(casesSection(data.cases, config.cases.scope));
  if (config.upcomingSessions.enabled) sections.push(sessionsSection(data.upcoming_sessions, config.upcomingSessions.limit));
  if (config.tasks.enabled) sections.push(tasksSection(data.tasks, config.tasks.scope));
  if (config.legalServices.enabled) sections.push(servicesSection(data.services));
  if (config.letters.enabled) sections.push(lettersSection(data.letters));
  if (config.documentsWekalat.enabled) {
    sections.push(documentsSection(data.documents));
    sections.push(wekalatSection(data.wekalat));
  }
  if (config.communicationsActivities.enabled) {
    sections.push(communicationsSection(data.communications, config.communicationsActivities.limit));
    sections.push(activitiesSection(data.activities, config.communicationsActivities.limit));
  }
  if (config.notes.enabled) {
    sections.push({ title: 'الملاحظات الداخلية', kind: 'text', text: (data.internal_notes || '').trim() || 'لا توجد ملاحظات.' });
  }

  const safeName = data.client.name.replace(/[\\/:*?"<>|]/g, '_');
  return {
    title: `ملف العميل: ${data.client.name}`,
    filename: `ملف_${safeName}_${new Date().toISOString().split('T')[0]}`,
    sections: sections.map(capRows),
  };
}

/** PDF يمرّ بالخادم (غير متزامن)؛ Excel/Word يُبنيان محلياً. يرمي خطأً برسالة عربية عند الفشل. */
export async function buildClientReport(data: ClientReportData, config: ClientExportConfig): Promise<void> {
  const model = buildClientReportModel(data, config);
  if (model.sections.length === 0) throw new Error('التقرير فارغ — اختر قسماً واحداً على الأقل');

  if (config.format === 'pdf') {
    await downloadPdf(model);
    return;
  }
  downloadBlob(renderHtml(model), model.filename, config.format);
}

export function quickExportClientCases(data: ClientReportData): Promise<void> {
  return buildClientReport(data, DEFAULT_CLIENT_EXPORT_CONFIG);
}

// --- بناة الأقسام ------------------------------------------------------------

const dash = (v: string | number | null | undefined): string => {
  const text = v == null ? '' : String(v).trim();
  return text === '' ? '—' : text;
};

function capRows(section: ReportSection): ReportSection {
  if (section.kind !== 'table' || section.rows.length <= MAX_ROWS) return section;
  return {
    ...section,
    rows: section.rows.slice(0, MAX_ROWS),
    note: `يعرض أول ${MAX_ROWS} من ${section.rows.length} سجل — ضيّق النطاق لعرض البقية.`,
  };
}

function clientInfoSection(c: Client): ReportSection {
  const fields: Array<[string, string]> = [
    ['الاسم', dash(c.name)],
    ['نوع العميل', entityTypeLabel(c.entity_type ?? null)],
    ['رقم الهوية / السجل', dash(c.national_id)],
    ['الجوال', dash(c.phone)],
    ['البريد الإلكتروني', dash(c.email)],
  ];

  if (c.entity_type && c.entity_type !== 'individual') {
    fields.push(
      ['السجل التجاري', dash(c.commercial_registration)],
      ['الرقم الضريبي', dash(c.vat_number)],
      ['العنوان الوطني', dash(c.national_address)],
      ['الصناعة', dash(c.industry)],
      ['الممثل القانوني', dash(c.legal_representative)],
    );
    if (c.point_of_contact_name || c.point_of_contact_phone || c.point_of_contact_email) {
      fields.push(
        ['جهة الاتصال', dash(c.point_of_contact_name)],
        ['جوال جهة الاتصال', dash(c.point_of_contact_phone)],
        ['بريد جهة الاتصال', dash(c.point_of_contact_email)],
      );
    }
  }

  if (c.relationship_manager) fields.push(['مدير الحساب', dash(c.relationship_manager.name)]);

  return { title: 'معلومات العميل', kind: 'fields', fields };
}

function statsSection(data: ClientReportData): ReportSection {
  const totalRevenue = data.cases.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0);
  return {
    title: 'الإحصائيات',
    kind: 'table',
    columns: ['إجمالي القضايا', 'القضايا النشطة', 'قيد النظر', 'المغلقة', 'إجمالي قيمة العقود (ر.س)'],
    rows: [[
      String(data.stats.total_cases), String(data.stats.active_cases),
      String(data.stats.pending_cases), String(data.stats.closed_cases), formatNumber(totalRevenue),
    ]],
  };
}

function casesSection(cases: ClientCase[], scope: CaseScope): ReportSection {
  const filtered = filterCasesByScope(cases, scope);
  const title = scope === 'active' ? 'القضايا النشطة' : scope === 'closed' ? 'القضايا المغلقة' : 'كل القضايا';
  const totalValue = filtered.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0);

  return {
    title,
    kind: 'table',
    note: filtered.length ? `${filtered.length} قضية · إجمالي القيمة ${formatNumber(totalValue)} ر.س` : undefined,
    columns: ['#', 'رقم الملف', 'القضية', 'المحامي المسؤول', 'الحالة', 'الأولوية', 'القيمة (ر.س)', 'الجلسة القادمة'],
    rows: filtered.map((c, i) => [
      String(i + 1),
      dash(c.file_number || c.case_number),
      dash(c.title),
      dash(getPrimaryLawyerName(c as never, '—')),
      caseStatusLabel(c.status),
      priorityLabel(c.priority),
      formatNumber(c.contract_value),
      formatDate(c.next_hearing),
    ]),
  };
}

function sessionsSection(sessions: ClientUpcomingSession[], limit: number): ReportSection {
  return {
    title: 'الجلسات القادمة',
    kind: 'table',
    columns: ['#', 'التاريخ', 'الوقت', 'القضية', 'المحكمة', 'المحامي المسؤول'],
    rows: sessions.slice(0, limit).map((s, i) => [
      String(i + 1),
      formatDate(s.session_date_gregorian || s.session_date),
      dash(s.session_time),
      dash([s.case?.title, s.case?.file_number].filter(Boolean).join(' · ')),
      dash(s.court),
      dash(getPrimaryLawyerName(s.case as never, '—')),
    ]),
  };
}

function tasksSection(tasks: ClientTask[], scope: TaskScope): ReportSection {
  const title = scope === 'overdue' ? 'المهام المتأخرة'
    : scope === 'open' ? 'المهام المفتوحة'
    : scope === 'completed' ? 'المهام المنجزة'
    : 'كل المهام';
  return {
    title,
    kind: 'table',
    columns: ['#', 'المهمة', 'القضية المرتبطة', 'الأولوية', 'الموعد', 'الحالة'],
    rows: filterTasksByScope(tasks, scope).map((t, i) => [
      String(i + 1),
      dash(t.title),
      t.case ? dash(`${t.case.file_number || ''} ${t.case.title || ''}`) : '—',
      priorityLabel(t.priority),
      formatDate(t.due_date),
      taskStatusLabel(t.status),
    ]),
  };
}

function servicesSection(services: ClientService[]): ReportSection {
  return {
    title: 'الخدمات القانونية والاستشارات',
    kind: 'table',
    columns: ['#', 'النوع', 'العنوان', 'الحالة', 'القضية المرتبطة', 'المحامي المسؤول', 'المبلغ (ر.س)'],
    rows: services.map((s, i) => [
      String(i + 1),
      dash(s.service_type_arabic || s.service_type),
      dash(s.title),
      dash(s.status_arabic || s.status),
      s.case_model ? dash(s.case_model.file_number) : 'غير مرتبطة بقضية',
      dash(s.assigned_lawyer?.name),
      formatNumber(s.agreed_amount != null ? Number(s.agreed_amount) : null),
    ]),
  };
}

function lettersSection(letters: ClientLetter[]): ReportSection {
  return {
    title: 'الخطابات والمراسلات الصادرة',
    kind: 'table',
    columns: ['#', 'النوع', 'العنوان', 'رقم الصادر', 'القضية', 'الحالة', 'التاريخ'],
    rows: letters.map((l, i) => [
      String(i + 1),
      dash(l.type_label || l.document_type),
      dash(l.title),
      dash(l.outgoing_number),
      l.case_id ? dash(l.case?.file_number || 'قضية') : 'عام',
      letterStatusLabel(l.status),
      formatDate(l.sent_at || l.created_at),
    ]),
  };
}

function documentsSection(docs: ClientDocument[]): ReportSection {
  return {
    title: `المستندات (${docs.length})`,
    kind: 'table',
    columns: ['#', 'الاسم', 'القضية المرتبطة', 'تاريخ الرفع'],
    rows: docs.map((d, i) => [
      String(i + 1),
      dash(d.name),
      d.case ? dash(`${d.case.file_number || ''} ${d.case.title || ''}`) : '—',
      formatDate(d.created_at),
    ]),
  };
}

function wekalatSection(wekalat: ClientWekala[]): ReportSection {
  return {
    title: `الوكالات (${wekalat.length})`,
    kind: 'table',
    columns: ['رقم الوكالة', 'النوع', 'الحالة', 'تاريخ الإصدار', 'تاريخ الانتهاء'],
    rows: wekalat.map((w) => [
      dash(w.number), dash(w.type), dash(w.status),
      formatDate(w.issue_date_gregorian), formatDate(w.expiry_date_gregorian),
    ]),
  };
}

function communicationsSection(list: ClientCommunication[], limit: number): ReportSection {
  return {
    title: 'سجل التواصل',
    kind: 'table',
    columns: ['#', 'التاريخ', 'النوع', 'الاتجاه', 'الموضوع', 'الملاحظات', 'المسجِّل'],
    rows: list.slice(0, limit).map((c, i) => [
      String(i + 1),
      formatDateTime(c.occurred_at),
      communicationTypeLabel(c.type),
      c.direction === 'inbound' ? 'وارد' : 'صادر',
      dash(c.subject),
      dash(c.notes),
      dash((c.loggedBy?.name || c.logged_by?.name) ?? null),
    ]),
  };
}

function activitiesSection(list: ClientActivity[], limit: number): ReportSection {
  return {
    title: 'النشاطات',
    kind: 'table',
    columns: ['#', 'التاريخ', 'الوصف', 'المنفّذ', 'القضية'],
    rows: list.slice(0, limit).map((a, i) => [
      String(i + 1),
      formatDateTime(a.created_at),
      dash(a.description),
      dash(a.performer?.name),
      dash(a.case?.title),
    ]),
  };
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

// --- الإخراج ---------------------------------------------------------------

// خط الهوية أولاً ثم بدائل متاحة في Office (الملف يُفتح خارج المتصفح فقد لا يكون الخط مثبّتاً)
const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif";
const TABLE_STYLE = `width:100%; border-collapse:collapse; margin:6px 0; direction:rtl; font-family:${FONT};`;
const TH_STYLE = 'background:#1E3A5F; color:white; padding:8px 10px; text-align:right; border:1px solid #d4d8de; font-weight:bold; font-size:12px;';
const TD_STYLE = 'padding:7px 10px; border:1px solid #e2e8f0; text-align:right; font-size:12px;';
const KEY_STYLE = `${TD_STYLE} background:#f3f4f6; font-weight:bold; width:200px;`;

/** Excel/Word: HTML من النموذج نفسه. عنوان القسم بخط سفلي — لا شريط لوني جانبي (قاعدة الهوية). */
function renderHtml(model: ReportModel): string {
  const today = new Date().toLocaleDateString(DATE_LOCALE, { year: 'numeric', month: 'long', day: 'numeric' });

  const body = model.sections.map((section) => {
    let content: string;
    if (section.kind === 'fields') {
      content = `<table style="${TABLE_STYLE}"><tbody>${section.fields
        .map(([k, v]) => `<tr><td style="${KEY_STYLE}">${esc(k)}</td><td style="${TD_STYLE}">${esc(v)}</td></tr>`)
        .join('')}</tbody></table>`;
    } else if (section.kind === 'table') {
      content = section.rows.length === 0
        ? '<p style="color:#64748b; font-size:12px;">لا توجد بيانات.</p>'
        : `<table style="${TABLE_STYLE}"><thead><tr>${section.columns
            .map((col) => `<th style="${TH_STYLE}">${esc(col)}</th>`)
            .join('')}</tr></thead><tbody>${section.rows
            .map((row) => `<tr>${row.map((cell) => `<td style="${TD_STYLE}">${esc(cell)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`;
    } else {
      content = `<p style="white-space:pre-wrap; font-size:13px; line-height:1.8;">${esc(section.text)}</p>`;
    }

    return `
    <div style="margin-bottom:22px;">
      <h2 style="margin:0 0 6px; padding:0 0 5px; border-bottom:2px solid #1E3A5F; font-size:15px; color:#1E3A5F;">${esc(section.title)}</h2>
      ${section.note ? `<p style="margin:0 0 4px; color:#64748b; font-size:11px;">${esc(section.note)}</p>` : ''}
      ${content}
    </div>`;
  }).join('\n');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(model.title)}</title></head>
<body style="font-family:${FONT}; direction:rtl; padding:16px;">
  <div style="text-align:center; margin-bottom:22px;">
    <h1 style="color:#1E3A5F; margin:0; font-size:21px;">${esc(model.title)}</h1>
    <p style="color:#64748b; margin:6px 0 0; font-size:12px;">تاريخ الإصدار: ${esc(today)}</p>
  </div>
  ${body}
</body></html>`;
}

function saveBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

function downloadBlob(html: string, filename: string, format: 'excel' | 'word'): void {
  const mime = format === 'excel' ? 'application/vnd.ms-excel' : 'application/msword';
  saveBlob(new Blob(['﻿', html], { type: mime }), `${filename}.${format === 'excel' ? 'xls' : 'doc'}`);
}

/** PDF على ورقة المكتب: الخادم يطبع النموذج بالكليشة الافتراضية (ترويسة/تذييل/ترقيم صفحات). */
async function downloadPdf(model: ReportModel): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/reports/render-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf, application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(model),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || (response.status === 429 ? 'طلبات كثيرة — انتظر لحظات ثم أعد المحاولة' : 'تعذّر توليد ملف PDF'));
  }

  saveBlob(await response.blob(), `${model.filename}.pdf`);
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

// تقويم ميلادي وأرقام لاتينية صراحةً: `ar-SA` وحدها تعطي هجرياً وأرقاماً هندية في بعض المتصفحات،
// فيخرج التقرير بتقويمين ونظامَي أرقام بحسب جهاز من صدّره.
const DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(DATE_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(DATE_LOCALE, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function letterStatusLabel(s: string | null | undefined): string {
  if (!s) return '-';
  return ({
    draft: 'مسودة', sent: 'مُرسَل', printed: 'طباعة (دون إرسال)', cancelled: 'ملغى',
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
