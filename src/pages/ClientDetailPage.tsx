import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatPhoneDisplay } from '../utils/phone';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, User, Phone, Mail, Star, Edit2, Download, FileSpreadsheet,
  Briefcase, Calendar, ListTodo, FolderOpen, FileSignature, MessageSquare,
  Activity, Building2, Hash, FileText, Clock, MapPin, ExternalLink, Save, Receipt,
} from 'lucide-react';
import ClientFeeProposalsTab from '../components/ClientFeeProposalsTab';
import ClientManagementService, { clientLanguageLabel, type Client, type ClientCommunication } from '../services/clientManagementService';
import { UserService, type User as UserType } from '../services/UserService';
import { getPrimaryLawyerName } from '../utils/lawyerHelpers';
import {
  quickExportClientCases,
  type ClientReportData,
  type CaseScope,
} from '../utils/clientExportHelpers';
import EditClientInfoModal from '../components/EditClientInfoModal';
import ClientExportModal from '../components/ClientExportModal';
import LogCommunicationModal from '../components/LogCommunicationModal';
import ClientQuickActionsBar from '../components/ClientQuickActionsBar';
import AddTaskModal from '../components/AddTaskModal';
import ClientDocumentsManager from '../components/ClientDocumentsManager';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

type TabKey = 'cases' | 'sessions' | 'tasks' | 'documents' | 'wekalat' | 'fee_proposals' | 'communications' | 'activities';

const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('cases');
  const [casesScope, setCasesScope] = useState<CaseScope>('all');
  const [tasksFilter, setTasksFilter] = useState<'all' | 'open' | 'overdue' | 'completed'>('open');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLogCommModalOpen, setIsLogCommModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // ===== Parallel queries =====
  const detailsQuery = useQuery({
    queryKey: ['client-details', clientId],
    queryFn: () => ClientManagementService.getClientDetails(clientId!),
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });

  const casesQuery = useQuery({
    queryKey: ['client-cases', clientId],
    queryFn: () => ClientManagementService.getClientCases(clientId!, { per_page: 100 }),
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });

  const sessionsQuery = useQuery({
    queryKey: ['client-upcoming-sessions', clientId],
    queryFn: () => ClientManagementService.getClientUpcomingSessions(clientId!, 20),
    enabled: !!clientId && activeTab === 'sessions',
    staleTime: 30 * 1000,
  });

  const tasksQuery = useQuery({
    queryKey: ['client-tasks', clientId],
    queryFn: () => ClientManagementService.getClientTasks(clientId!, { per_page: 100 }),
    enabled: !!clientId && (activeTab === 'tasks' || activeTab === 'cases'),
    staleTime: 30 * 1000,
  });

  const documentsQuery = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: () => ClientManagementService.getClientDocuments(clientId!, { per_page: 100 }),
    enabled: !!clientId && activeTab === 'documents',
    staleTime: 30 * 1000,
  });

  const wekalatQuery = useQuery({
    queryKey: ['client-wekalat', clientId],
    queryFn: () => ClientManagementService.getClientWekalat(clientId!),
    enabled: !!clientId && activeTab === 'wekalat',
    staleTime: 30 * 1000,
  });

  const communicationsQuery = useQuery({
    queryKey: ['client-communications', clientId],
    queryFn: () => ClientManagementService.getClientCommunications(clientId!, { per_page: 50 }),
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });

  const activitiesQuery = useQuery({
    queryKey: ['client-activities', clientId],
    queryFn: () => ClientManagementService.getClientActivities(clientId!, { per_page: 50 }),
    enabled: !!clientId && activeTab === 'activities',
    staleTime: 30 * 1000,
  });

  const lawyersQuery = useQuery({
    queryKey: ['lawyers-list-for-client'],
    queryFn: () => UserService.getLawyers(),
    staleTime: 5 * 60 * 1000,
  });

  // ===== Derived data =====
  const client: Client | null = detailsQuery.data?.client || null;
  const stats = detailsQuery.data?.statistics;
  const upcomingSession = detailsQuery.data?.upcoming_session;
  const cases = useMemo(() => {
    const raw = casesQuery.data?.data;
    return Array.isArray(raw) ? raw : ((raw as any)?.data || []);
  }, [casesQuery.data]);

  const upcomingSessions = sessionsQuery.data || [];
  const tasks = useMemo(() => {
    const raw = tasksQuery.data?.data;
    return Array.isArray(raw) ? raw : ((raw as any)?.data || []);
  }, [tasksQuery.data]);
  const documents = useMemo(() => {
    const raw = documentsQuery.data?.data;
    return Array.isArray(raw) ? raw : ((raw as any)?.data || []);
  }, [documentsQuery.data]);
  const wekalat = wekalatQuery.data || [];
  const communications = useMemo(() => {
    const raw = communicationsQuery.data?.data;
    return Array.isArray(raw) ? raw : ((raw as any)?.data || []);
  }, [communicationsQuery.data]);
  const activities = useMemo(() => {
    const raw = activitiesQuery.data?.data;
    return Array.isArray(raw) ? raw : ((raw as any)?.data || []);
  }, [activitiesQuery.data]);

  const totalRevenue = useMemo(
    () => cases.reduce((s: number, c: any) => s + (Number(c.contract_value) || 0), 0),
    [cases]
  );

  const taskCounts = useMemo(() => ({
    open: tasks.filter((t: any) => t.status !== 'completed').length,
    overdue: tasks.filter((t: any) => t.status === 'overdue').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
    all: tasks.length,
  }), [tasks]);

  const visibleCases = useMemo(() => {
    if (casesScope === 'all') return cases;
    if (casesScope === 'active') return cases.filter((c: any) => c.status === 'active' || c.status === 'pending');
    return cases.filter((c: any) => c.status === 'closed' || c.status === 'settled' || c.status === 'dismissed');
  }, [cases, casesScope]);

  const visibleTasks = useMemo(() => {
    if (tasksFilter === 'all') return tasks;
    if (tasksFilter === 'overdue') return tasks.filter((t: any) => t.status === 'overdue');
    if (tasksFilter === 'completed') return tasks.filter((t: any) => t.status === 'completed');
    return tasks.filter((t: any) => t.status !== 'completed');
  }, [tasks, tasksFilter]);

  // Build the full data shape used by the export builder.
  const reportData: ClientReportData | null = client ? {
    client,
    stats: stats || { total_cases: 0, active_cases: 0, pending_cases: 0, closed_cases: 0 },
    cases,
    upcoming_sessions: upcomingSessions,
    tasks,
    communications,
    documents,
    wekalat,
    activities,
  } : null;

  // ===== Handlers =====
  const handleSaveClient = (updated: Client) => {
    queryClient.setQueryData(['client-details', clientId], (old: any) => old ? { ...old, client: updated } : old);
  };

  const handleRating = async (star: number) => {
    if (!client) return;
    try {
      const updated = await ClientManagementService.updateClient(client.id, { rating: star });
      queryClient.setQueryData(['client-details', clientId], (old: any) => old ? { ...old, client: { ...old.client, ...updated } } : old);
    } catch { /* swallow — non-critical */ }
  };

  const handleSaveNotes = async () => {
    if (!client) return;
    setNotesSaving(true);
    try {
      await ClientManagementService.updateClient(client.id, { internal_notes: notesDraft });
    } finally {
      setNotesSaving(false);
    }
  };

  const handleAssignManager = async (managerId: number | null) => {
    if (!client) return;
    try {
      const updated = await ClientManagementService.updateClient(client.id, {
        relationship_manager_id: managerId,
      });
      queryClient.setQueryData(['client-details', clientId], (old: any) => old ? { ...old, client: { ...old.client, ...updated } } : old);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickExport = () => {
    if (reportData) quickExportClientCases(reportData);
  };

  const handleLogged = (entry: ClientCommunication) => {
    queryClient.setQueryData(['client-communications', clientId], (old: any) => {
      if (!old) return { data: [entry] };
      const list = Array.isArray(old.data) ? old.data : (old.data?.data || []);
      const newList = [entry, ...list];
      return Array.isArray(old.data) ? { ...old, data: newList } : { ...old, data: { ...old.data, data: newList } };
    });
  };

  // ===== Render =====
  if (detailsQuery.isLoading) {
    return (
      <div className="client-detail">
        <div className="client-detail__skeleton">
          <div className="skeleton-block skeleton-hero" />
          <div className="skeleton-block skeleton-actions" />
          <div className="skeleton-block skeleton-kpis" />
        </div>
      </div>
    );
  }

  if (detailsQuery.isError || !client) {
    return (
      <div className="client-detail">
        <div className="client-detail__error">
          <p>تعذّر تحميل بيانات العميل</p>
          <button onClick={() => navigate('/clients')}>العودة لقائمة العملاء</button>
        </div>
      </div>
    );
  }

  const isCompany = client.entity_type === 'company' || client.entity_type === 'organization';
  const rating = (client as any).rating || 0;

  return (
    <div className="client-detail">
      {/* === Hero === */}
      <header className="client-hero">
        <button className="client-hero__back" onClick={() => navigate('/clients')}>
          <ArrowRight size={14} /> العملاء
        </button>

        <div className="client-hero__avatar">{client.name?.charAt(0) || '؟'}</div>

        <div className="client-hero__main">
          <div className="client-hero__title-row">
            <h1>{client.name}</h1>
            {isCompany && <span className="client-hero__badge">{entityTypeLabel(client.entity_type)}</span>}
          </div>
          <div className="client-hero__meta">
            {client.national_id && <span><Hash size={11} /> {client.national_id}</span>}
            {client.phone && <span><Phone size={11} /> <span dir="ltr">{formatPhoneDisplay(client.phone)}</span></span>}
            {client.email && <span><Mail size={11} /> <span dir="ltr">{client.email}</span></span>}
            {client.industry && <span><Building2 size={11} /> {client.industry}</span>}
          </div>
          {client.relationship_manager?.name && (
            <div className="client-hero__manager">
              مدير الحساب: <strong>{client.relationship_manager.name}</strong>
            </div>
          )}
        </div>

        {upcomingSession && (
          <button
            type="button"
            className="client-hero__session"
            onClick={() => navigate(`/cases/${upcomingSession.case_id}`)}
            title="افتح القضية"
          >
            <div className="client-hero__session-icon"><Calendar size={20} /></div>
            <div className="client-hero__session-body">
              <div className="client-hero__session-when">
                {(() => {
                  const days = Math.ceil((new Date(upcomingSession.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (days < 0) return 'فاتت';
                  if (days === 0) return 'اليوم';
                  if (days === 1) return 'غداً';
                  return `بعد ${days} يوم`;
                })()}
              </div>
              <div className="client-hero__session-meta">
                <span>{formatDate(upcomingSession.date)}</span>
                <span className="client-hero__session-sep">·</span>
                <span className="client-hero__session-case">{upcomingSession.case_title}</span>
              </div>
            </div>
          </button>
        )}

        <div className="client-hero__actions">
          <div className="client-hero__rating">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                className={star <= rating ? 'is-active' : ''}
                onClick={() => handleRating(star)}
                title={`${star} نجوم`}
              >
                <Star size={14} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <button className="client-hero__btn" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 size={13} /> تعديل
          </button>
          <button className="client-hero__btn client-hero__btn--quick" onClick={handleQuickExport} title="تصدير القضايا النشطة فوراً">
            <FileSpreadsheet size={13} /> تصدير سريع
          </button>
          <button className="client-hero__btn client-hero__btn--primary" onClick={() => setIsExportModalOpen(true)}>
            <Download size={13} /> تخصيص...
          </button>
        </div>
      </header>

      {/* === Quick Actions === */}
      <ClientQuickActionsBar
        clientPhone={client.phone}
        onCreateCase={() => navigate(`/cases?new=1&client_id=${client.id}`)}
        onCreateTask={() => setIsAddTaskModalOpen(true)}
        onCreateAppointment={() => navigate(`/meetings/client?new=1&client_id=${client.id}`)}
        onUploadDocument={() => setActiveTab('documents')}
        onCreateWekala={() => navigate('/wekalat')}
        onLogCommunication={() => setIsLogCommModalOpen(true)}
      />

      {/* === KPI Stats Strip (compact horizontal) === */}
      <div className="client-stats-strip">
        <div className="client-stat client-stat--primary">
          <Briefcase size={13} />
          <span className="client-stat__value">{stats?.total_cases ?? 0}</span>
          <span className="client-stat__label">إجمالي</span>
        </div>
        <div className="client-stat client-stat--info">
          <FolderOpen size={13} />
          <span className="client-stat__value">{stats?.active_cases ?? 0}</span>
          <span className="client-stat__label">نشطة</span>
        </div>
        <div className="client-stat client-stat--warning">
          <Clock size={13} />
          <span className="client-stat__value">{stats?.pending_cases ?? 0}</span>
          <span className="client-stat__label">قيد النظر</span>
        </div>
        <div className="client-stat client-stat--success">
          <FolderOpen size={13} />
          <span className="client-stat__value">{stats?.closed_cases ?? 0}</span>
          <span className="client-stat__label">مغلقة</span>
        </div>
        <div className="client-stat client-stat--success">
          <FileText size={13} />
          <span className="client-stat__value">{formatNumber(totalRevenue)}</span>
          <span className="client-stat__label">قيمة العقود (SAR)</span>
        </div>
      </div>

      {/* === Main grid (right tabs + left side panel) === */}
      <div className="client-grid">
        <div className="client-grid__main">
          <div className="client-tabs">
            <TabBtn active={activeTab === 'cases'} onClick={() => setActiveTab('cases')} icon={<Briefcase size={13} />}
              count={cases.length}>القضايا</TabBtn>
            <TabBtn active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={<Calendar size={13} />}>الجلسات</TabBtn>
            <TabBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<ListTodo size={13} />}
              count={tasks.length} hint={taskCounts.overdue > 0 ? `${taskCounts.overdue} متأخرة` : undefined}>المهام</TabBtn>
            <TabBtn active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={13} />}>المستندات</TabBtn>
            <TabBtn active={activeTab === 'wekalat'} onClick={() => setActiveTab('wekalat')} icon={<FileSignature size={13} />}>الوكالات</TabBtn>
            <TabBtn active={activeTab === 'fee_proposals'} onClick={() => setActiveTab('fee_proposals')} icon={<Receipt size={13} />}>عروض الأتعاب</TabBtn>
            <TabBtn active={activeTab === 'communications'} onClick={() => setActiveTab('communications')} icon={<MessageSquare size={13} />}
              count={communications.length}>التواصل</TabBtn>
            <TabBtn active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<Activity size={13} />}>النشاطات</TabBtn>
          </div>

          <div className="client-tab-content">
            {activeTab === 'cases' && (
              <CasesTab
                cases={visibleCases}
                allCases={cases}
                scope={casesScope}
                setScope={setCasesScope}
                onCaseClick={(id) => navigate(`/cases/${id}`)}
              />
            )}
            {activeTab === 'sessions' && (
              <SessionsTab sessions={upcomingSessions} loading={sessionsQuery.isLoading} onCaseClick={(id) => navigate(`/cases/${id}`)} />
            )}
            {activeTab === 'tasks' && (
              <TasksTab tasks={visibleTasks} counts={taskCounts} filter={tasksFilter} setFilter={setTasksFilter} loading={tasksQuery.isLoading}
                onTaskClick={(id) => navigate(`/tasks/${id}`)} />
            )}
            {activeTab === 'documents' && clientId && (
              <ClientDocumentsManager
                clientId={clientId}
                clientName={client.name}
                caseDocuments={documents}
                caseDocsLoading={documentsQuery.isLoading}
              />
            )}
            {activeTab === 'wekalat' && <WekalatTab wekalat={wekalat} loading={wekalatQuery.isLoading} />}
            {activeTab === 'fee_proposals' && clientId && (
              <ClientFeeProposalsTab
                clientId={Number(clientId)}
                clientName={client?.name}
                cases={cases.map((c: any) => ({ id: c.id, title: c.title, file_number: c.file_number }))}
              />
            )}
            {activeTab === 'communications' && (
              <CommunicationsTab
                items={communications}
                loading={communicationsQuery.isLoading}
                onAdd={() => setIsLogCommModalOpen(true)}
              />
            )}
            {activeTab === 'activities' && <ActivitiesTab items={activities} loading={activitiesQuery.isLoading} />}
          </div>
        </div>

        <aside className="client-grid__side">
          <SideCard title="معلومات العميل" action={<button onClick={() => setIsEditModalOpen(true)}><Edit2 size={12} /></button>}>
            <InfoRow label="الاسم" value={client.name} />
            <InfoRow label="النوع" value={entityTypeLabel(client.entity_type)} />
            <InfoRow label="الجوال" value={formatPhoneDisplay(client.phone)} dir="ltr" />
            <InfoRow label="الهوية" value={client.national_id} />
            <InfoRow label="البريد الإلكتروني" value={client.email} dir="ltr" />
            <InfoRow label="لغة العميل" value={clientLanguageLabel(client.preferred_language)} />
            {isCompany && (
              <>
                <div className="client-side__divider" />
                <InfoRow label="السجل التجاري" value={client.commercial_registration} />
                <InfoRow label="الرقم الضريبي" value={client.vat_number} />
                <InfoRow label="العنوان الوطني" value={client.national_address} />
                <InfoRow label="الصناعة" value={client.industry} />
                <InfoRow label="الممثل القانوني" value={client.legal_representative} />
                <InfoRow label="هوية الممثل" value={client.legal_representative_nid} dir="ltr" />
              </>
            )}
          </SideCard>

          {isCompany && (client.point_of_contact_name || client.point_of_contact_phone || client.point_of_contact_email) && (
            <SideCard title="جهة الاتصال">
              <InfoRow label="الاسم" value={client.point_of_contact_name} />
              <InfoRow label="الجوال" value={client.point_of_contact_phone} dir="ltr" />
              <InfoRow label="البريد" value={client.point_of_contact_email} dir="ltr" />
            </SideCard>
          )}

          <SideCard title="مدير الحساب">
            <select
              className="client-side__select"
              value={client.relationship_manager_id || ''}
              onChange={(e) => handleAssignManager(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— غير محدد —</option>
              {(lawyersQuery.data || []).map((l: UserType) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </SideCard>

          <SideCard title="آخر التواصل" action={<button onClick={() => setIsLogCommModalOpen(true)} title="تسجيل تواصل">+</button>}>
            {communications.slice(0, 3).length === 0 ? (
              <div className="client-side__empty">لا توجد سجلات</div>
            ) : (
              communications.slice(0, 3).map((c: any) => (
                <div key={c.id} className="client-side__comm">
                  <span className="client-side__comm-type">{communicationTypeLabel(c.type)}</span>
                  <span className="client-side__comm-subject">{c.subject || c.notes?.slice(0, 30) || '—'}</span>
                  <span className="client-side__comm-date">{formatDate(c.occurred_at)}</span>
                </div>
              ))
            )}
          </SideCard>

          <SideCard title="ملاحظات داخلية">
            <textarea
              className="client-side__notes"
              placeholder="ملاحظات خاصة بالمكتب..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
            />
            <button className="client-side__notes-save" onClick={handleSaveNotes} disabled={notesSaving}>
              <Save size={11} /> {notesSaving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </SideCard>
        </aside>
      </div>

      {/* === Modals === */}
      {client && (
        <EditClientInfoModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          client={client}
          onSaved={handleSaveClient}
        />
      )}
      {reportData && (
        <ClientExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          data={reportData}
        />
      )}
      {client && (
        <LogCommunicationModal
          isOpen={isLogCommModalOpen}
          onClose={() => setIsLogCommModalOpen(false)}
          clientId={client.id}
          onLogged={handleLogged}
        />
      )}
      {client && (
        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          clientId={String(client.id)}
          clientName={client.name}
          onTaskAdded={() => {
            setIsAddTaskModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['client-tasks', clientId] });
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
          }}
        />
      )}
    </div>
  );
};

// ============== Sub-components ==============

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count?: number;
  hint?: string;
  children: React.ReactNode;
}> = ({ active, onClick, icon, count, hint, children }) => (
  <button className={`client-tab ${active ? 'is-active' : ''}`} onClick={onClick}>
    {icon}
    <span>{children}</span>
    {count != null && <span className="client-tab__count">{count}</span>}
    {hint && <span className="client-tab__hint">{hint}</span>}
  </button>
);

const SideCard: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="client-side-card">
    <div className="client-side-card__header">
      <h3>{title}</h3>
      {action}
    </div>
    <div className="client-side-card__body">{children}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string | null | undefined; dir?: 'ltr' | 'rtl' }> = ({ label, value, dir }) => (
  <div className="client-side__row">
    <span className="client-side__row-label">{label}</span>
    <span className="client-side__row-value" dir={dir}>{value || '—'}</span>
  </div>
);

// ---- Tabs ----
const CasesTab: React.FC<{
  cases: any[];
  allCases: any[];
  scope: CaseScope;
  setScope: (s: CaseScope) => void;
  onCaseClick: (id: number) => void;
}> = ({ cases, allCases, scope, setScope, onCaseClick }) => {
  const counts = {
    all: allCases.length,
    active: allCases.filter(c => c.status === 'active' || c.status === 'pending').length,
    closed: allCases.filter(c => c.status === 'closed' || c.status === 'settled' || c.status === 'dismissed').length,
  };
  return (
    <div>
      <div className="client-table-toolbar">
        <div className="client-scope-pills">
          <button className={`client-scope-pill ${scope === 'all' ? 'is-active' : ''}`} onClick={() => setScope('all')}>كل القضايا <span>{counts.all}</span></button>
          <button className={`client-scope-pill ${scope === 'active' ? 'is-active' : ''}`} onClick={() => setScope('active')}>النشطة <span>{counts.active}</span></button>
          <button className={`client-scope-pill ${scope === 'closed' ? 'is-active' : ''}`} onClick={() => setScope('closed')}>المغلقة <span>{counts.closed}</span></button>
        </div>
      </div>

      {cases.length === 0 ? (
        <EmptyState icon={<Briefcase size={28} />} text="لا توجد قضايا ضمن هذا النطاق" />
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>#</th><th>رقم الملف</th><th>القضية</th><th>المحامي المسؤول</th>
                <th>الحالة</th><th>الأولوية</th><th>القيمة (SAR)</th><th>الجلسة القادمة</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c: any, i: number) => (
                <tr key={c.id} onClick={() => onCaseClick(c.id)} className="client-table__row">
                  <td>{i + 1}</td>
                  <td className="client-table__mono">{c.file_number || c.case_number || '-'}</td>
                  <td className="client-table__title">{c.title || '-'}</td>
                  <td>{getPrimaryLawyerName(c as never, '—')}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>{priorityBadge(c.priority)}</td>
                  <td className="client-table__num">{c.contract_value ? formatNumber(c.contract_value) : '—'}</td>
                  <td className="client-table__date">{formatDate(c.next_hearing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SessionsTab: React.FC<{ sessions: any[]; loading: boolean; onCaseClick: (id: number) => void }> = ({ sessions, loading, onCaseClick }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  if (sessions.length === 0) return <EmptyState icon={<Calendar size={28} />} text="لا توجد جلسات قادمة" />;
  return (
    <div className="client-table-wrap">
      <table className="client-table">
        <thead>
          <tr>
            <th>#</th><th>التاريخ</th><th>الوقت</th><th>القضية</th><th>المحكمة</th><th>المحامي المسؤول</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s: any, i: number) => (
            <tr key={s.id} onClick={() => s.case?.id && onCaseClick(s.case.id)} className="client-table__row">
              <td>{i + 1}</td>
              <td className="client-table__date">{formatDate(s.session_date_gregorian || s.session_date)}</td>
              <td>{s.session_time || '—'}</td>
              <td className="client-table__title">{s.case?.title || '—'}</td>
              <td>{s.court || s.case?.court || '—'}</td>
              <td>{getPrimaryLawyerName(s.case as never, '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TasksTab: React.FC<{
  tasks: any[];
  counts: { open: number; overdue: number; completed: number; all: number };
  filter: 'all' | 'open' | 'overdue' | 'completed';
  setFilter: (f: 'all' | 'open' | 'overdue' | 'completed') => void;
  loading: boolean;
  onTaskClick: (id: number) => void;
}> = ({ tasks, counts, filter, setFilter, loading, onTaskClick }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  return (
    <div>
      <div className="client-table-toolbar">
        <div className="client-scope-pills">
          <button className={`client-scope-pill ${filter === 'open' ? 'is-active' : ''}`} onClick={() => setFilter('open')}>المفتوحة <span>{counts.open}</span></button>
          <button className={`client-scope-pill ${filter === 'overdue' ? 'is-active' : ''}`} onClick={() => setFilter('overdue')}>المتأخرة <span>{counts.overdue}</span></button>
          <button className={`client-scope-pill ${filter === 'completed' ? 'is-active' : ''}`} onClick={() => setFilter('completed')}>المنجَزة <span>{counts.completed}</span></button>
          <button className={`client-scope-pill ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>الكل <span>{counts.all}</span></button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={<ListTodo size={28} />} text="لا توجد مهام" />
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr><th>#</th><th>المهمة</th><th>القضية / العميل</th><th>الأولوية</th><th>الموعد</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {tasks.map((t: any, i: number) => (
                <tr key={t.id} onClick={() => onTaskClick(t.id)} className="client-table__row">
                  <td>{i + 1}</td>
                  <td className="client-table__title">{t.title || '-'}</td>
                  <td>
                    {t.case
                      ? `${t.case.file_number || ''} ${t.case.title || ''}`.trim()
                      : t.client
                        ? <span className="client-task-badge">العميل: {t.client.name}</span>
                        : '—'}
                  </td>
                  <td>{priorityBadge(t.priority)}</td>
                  <td className="client-table__date">{formatDate(t.due_date)}</td>
                  <td>{taskStatusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DocumentsTab: React.FC<{ documents: any[]; loading: boolean }> = ({ documents, loading }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  if (documents.length === 0) return <EmptyState icon={<FileText size={28} />} text="لا توجد مستندات" />;
  return (
    <div className="client-table-wrap">
      <table className="client-table">
        <thead><tr><th>#</th><th>الاسم</th><th>القضية المرتبطة</th><th>تاريخ الرفع</th></tr></thead>
        <tbody>
          {documents.map((d: any, i: number) => (
            <tr key={d.id}>
              <td>{i + 1}</td>
              <td>{d.name || d.original_name || '-'}</td>
              <td>{d.case ? `${d.case.file_number || ''} ${d.case.title || ''}`.trim() : '—'}</td>
              <td className="client-table__date">{formatDate(d.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const WekalatTab: React.FC<{ wekalat: any[]; loading: boolean }> = ({ wekalat, loading }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  if (wekalat.length === 0) return <EmptyState icon={<FileSignature size={28} />} text="لا توجد وكالات لهذا العميل" />;
  return (
    <div className="client-table-wrap">
      <table className="client-table">
        <thead><tr><th>رقم الوكالة</th><th>النوع</th><th>الحالة</th><th>تاريخ الإصدار</th><th>تاريخ الانتهاء</th></tr></thead>
        <tbody>
          {wekalat.map((w: any) => (
            <tr key={w.id}>
              <td className="client-table__mono">{w.number || '-'}</td>
              <td>{w.type || '—'}</td>
              <td>{w.status || '—'}</td>
              <td className="client-table__date">{formatDate(w.issue_date_gregorian)}</td>
              <td className="client-table__date">{formatDate(w.expiry_date_gregorian)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CommunicationsTab: React.FC<{ items: any[]; loading: boolean; onAdd: () => void }> = ({ items, loading, onAdd }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  return (
    <div>
      <div className="client-table-toolbar">
        <button className="client-btn client-btn--primary" onClick={onAdd}>
          + تسجيل تواصل
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<MessageSquare size={28} />} text="لا توجد سجلات تواصل" />
      ) : (
        <div className="client-comm-list">
          {items.map((c: any) => (
            <div key={c.id} className={`client-comm client-comm--${c.direction}`}>
              <div className="client-comm__header">
                <span className="client-comm__type">{communicationTypeLabel(c.type)}</span>
                <span className="client-comm__direction">{c.direction === 'inbound' ? 'وارد' : 'صادر'}</span>
                <span className="client-comm__date">{formatDateTime(c.occurred_at)}</span>
                <span className="client-comm__by">{(c.loggedBy?.name || c.logged_by?.name) ?? ''}</span>
              </div>
              {c.subject && <div className="client-comm__subject">{c.subject}</div>}
              {c.notes && <div className="client-comm__notes">{c.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivitiesTab: React.FC<{ items: any[]; loading: boolean }> = ({ items, loading }) => {
  if (loading) return <div className="client-loading">جاري التحميل...</div>;
  if (items.length === 0) return <EmptyState icon={<Activity size={28} />} text="لا توجد نشاطات" />;
  return (
    <div className="client-timeline">
      {items.map((a: any) => (
        <div key={a.id} className="client-timeline__item">
          <div className="client-timeline__dot" />
          <div className="client-timeline__content">
            <div className="client-timeline__desc">{a.description || a.type}</div>
            <div className="client-timeline__meta">
              {a.performer?.name && <span>{a.performer.name}</span>}
              {a.case?.title && <Link to={`/cases/${a.case.id}`} className="client-timeline__case"><ExternalLink size={10} /> {a.case.title}</Link>}
              <span>{formatDateTime(a.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="client-empty">{icon}<p>{text}</p></div>
);

// ============== Helpers ==============

function statusBadge(s: string | null | undefined) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'نشطة', cls: 'badge-blue' },
    pending: { label: 'قيد النظر', cls: 'badge-orange' },
    closed: { label: 'مغلقة', cls: 'badge-gray' },
    settled: { label: 'مصالحة', cls: 'badge-blue' },
    appealed: { label: 'مستأنفة', cls: 'badge-orange' },
    dismissed: { label: 'مرفوضة', cls: 'badge-red' },
  };
  const c = s ? (map[s] || { label: s, cls: 'badge-gray' }) : { label: '—', cls: 'badge-gray' };
  return <span className={`notion-badge ${c.cls}`}>{c.label}</span>;
}

function priorityBadge(p: string | null | undefined) {
  if (!p) return <span className="notion-badge badge-gray">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    urgent: { label: 'عاجلة', cls: 'lawyer-priority--urgent' },
    high: { label: 'عالية', cls: 'lawyer-priority--high' },
    medium: { label: 'متوسطة', cls: 'lawyer-priority--medium' },
    low: { label: 'منخفضة', cls: 'lawyer-priority--low' },
  };
  const c = map[p] || { label: p, cls: 'lawyer-priority--medium' };
  return <span className={`lawyer-priority ${c.cls}`}>{c.label}</span>;
}

function taskStatusBadge(s: string | null | undefined) {
  if (!s) return <span className="notion-badge badge-gray">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'في الانتظار', cls: 'badge-gray' },
    in_progress: { label: 'قيد التنفيذ', cls: 'badge-orange' },
    completed: { label: 'منجَزة', cls: 'badge-green' },
    overdue: { label: 'متأخرة', cls: 'badge-red' },
    paused: { label: 'معلَّقة', cls: 'badge-gray' },
  };
  const c = map[s] || { label: s, cls: 'badge-gray' };
  return <span className={`notion-badge ${c.cls}`}>{c.label}</span>;
}

function entityTypeLabel(t: string | null | undefined): string {
  if (!t) return 'فرد';
  return ({ individual: 'فرد', company: 'شركة', organization: 'مؤسسة' } as Record<string, string>)[t] || t;
}

function communicationTypeLabel(t: string): string {
  return ({ call: '📞 مكالمة', whatsapp: '💬 واتساب', email: '✉️ بريد', meeting: '🤝 اجتماع', sms: '📱 SMS', other: 'أخرى' } as Record<string, string>)[t] || t;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (!isFinite(num)) return '—';
  return num.toLocaleString('en-US');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default ClientDetailPage;
