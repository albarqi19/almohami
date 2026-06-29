import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UpdateBanner from './components/UpdateBanner';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { TimerProvider } from './contexts/TimerContext';
import { AnnouncementProvider } from './contexts/AnnouncementContext';
import { ZatcaStatusProvider } from './contexts/ZatcaStatusContext';
import ProtectedRoute from './components/ProtectedRoute';
import Forbidden from './pages/Forbidden';
import LegacyRedirect from './components/LegacyRedirect';
import PageLoader from './components/PageLoader';
import { lazyWithRetry } from './utils/lazyWithRetry';

/* ============================================================
   الحزمة الأولى (eager) — نقاط الدخول العامة فقط:
   صفحات الهبوط الثلاث (الرسمية + الموحّدة للشركات + المخصصة
   التي تُحمَّل كسولاً داخل TenantLandingPage) وصفحات المصادقة.
   كل ما عداها مؤجل (lazy) فلا يدفع زائر الهبوط ثمن التطبيق كاملاً.
   ============================================================ */
import AuthLayout from './components/AuthLayout';
import LoginContent from './pages/LoginContent';
import RegisterChoiceContent from './pages/RegisterChoiceContent';
import RegisterTenantContent from './pages/RegisterTenantContent';
import LandingPage from './pages/LandingPage';
import TenantLandingPage from './pages/TenantLandingPage';

/* ============================================================
   أجزاء مؤجلة (code-splitting) — تُجلب عند أول زيارة لمسارها
   عبر lazyWithRetry الذي يعيد تحميل الصفحة مرة واحدة لو فشل
   جلب chunk بعد نشر جديد (اختفاء ملفات الإصدار القديم).
   ============================================================ */
const Layout = lazyWithRetry(() => import('./components/Layout'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Cases = lazyWithRetry(() => import('./pages/Cases'));
const CaseDetailPage = lazyWithRetry(() => import('./pages/CaseDetailPage'));
const UpcomingSessions = lazyWithRetry(() => import('./pages/UpcomingSessions'));
const LegalDeadlines = lazyWithRetry(() => import('./pages/LegalDeadlines'));
const SessionPrep = lazyWithRetry(() => import('./pages/SessionPrep'));
const ClientCases = lazyWithRetry(() => import('./pages/ClientCases'));
const ClientCaseDetail = lazyWithRetry(() => import('./pages/ClientCaseDetail'));
const ClientDocumentsRequired = lazyWithRetry(() => import('./pages/ClientDocumentsRequired'));
const Tasks = lazyWithRetry(() => import('./pages/Tasks'));
const TaskDetail = lazyWithRetry(() => import('./pages/TaskDetail'));
const Documents = lazyWithRetry(() => import('./pages/Documents'));
const Activities = lazyWithRetry(() => import('./pages/Activities'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const LawyersReport = lazyWithRetry(() => import('./pages/LawyersReport'));
const FirmReport = lazyWithRetry(() => import('./pages/FirmReport'));
const MyPerformance = lazyWithRetry(() => import('./pages/MyPerformance'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const Statistics = lazyWithRetry(() => import('./pages/Statistics'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const WhatsappSettings = lazyWithRetry(() => import('./pages/WhatsappSettings'));
const Wekalat = lazyWithRetry(() => import('./pages/Wekalat'));
const ExecutionRequests = lazyWithRetry(() => import('./pages/ExecutionRequests'));
const AccountStatus = lazyWithRetry(() => import('./pages/AccountStatus'));
const SubscriptionPaymentResult = lazyWithRetry(() => import('./pages/SubscriptionPaymentResult'));
const LawyerSuspended = lazyWithRetry(() => import('./pages/LawyerSuspended'));
const Clients = lazyWithRetry(() => import('./pages/Clients'));
const ClientDetailPage = lazyWithRetry(() => import('./pages/ClientDetailPage'));
const HrModule = lazyWithRetry(() => import('./pages/hr/HrModule'));
const EmployeeDetailPage = lazyWithRetry(() => import('./pages/hr/EmployeeDetailPage'));
const AdminRequests = lazyWithRetry(() => import('./pages/AdminRequests'));
const Feedback = lazyWithRetry(() => import('./pages/Feedback'));
const WathqInquiryPage = lazyWithRetry(() => import('./pages/WathqInquiry'));
const LawsPage = lazyWithRetry(() => import('./pages/laws/LawsPage'));
const CorrespondenceRegisterPage = lazyWithRetry(() => import('./pages/CorrespondenceRegisterPage'));
const MemoApprovals = lazyWithRetry(() => import('./pages/MemoApprovals'));
const ClientMessages = lazyWithRetry(() => import('./pages/ClientMessages'));
const PersonalNotebook = lazyWithRetry(() => import('./pages/NotebookWorkspace'));

// Legal Services Pages
const LegalServices = lazyWithRetry(() => import('./pages/legal-services/LegalServices'));
const LegalServiceDetail = lazyWithRetry(() => import('./pages/legal-services/LegalServiceDetail'));

// Contracts Pages
const ContractTemplates = lazyWithRetry(() => import('./pages/contracts/ContractTemplates'));
const ContractTemplateEditorPage = lazyWithRetry(() => import('./pages/contracts/ContractTemplateEditorPage'));
const ContractBuilder = lazyWithRetry(() => import('./pages/contracts/ContractBuilder'));

// [P4·UX-01] وحدة «العقود والمالية» الموحّدة + تبويباتها
const ContractsFinanceModule = lazyWithRetry(() => import('./pages/finance/ContractsFinanceModule'));
const DashboardTab = lazyWithRetry(() => import('./pages/finance/tabs/DashboardTab'));
const ContractsTab = lazyWithRetry(() => import('./pages/finance/tabs/ContractsTab'));
const InvoicesTab = lazyWithRetry(() => import('./pages/finance/tabs/InvoicesTab'));
const PaymentsTab = lazyWithRetry(() => import('./pages/finance/tabs/PaymentsTab'));
const CollectionsTab = lazyWithRetry(() => import('./pages/finance/tabs/CollectionsTab'));
const ReportsTab = lazyWithRetry(() => import('./pages/finance/tabs/ReportsTab'));
const ContractDetailPage = lazyWithRetry(() => import('./pages/finance/ContractDetailPage'));
const InvoiceDetailPage = lazyWithRetry(() => import('./pages/finance/InvoiceDetailPage'));

// ZATCA E-Invoicing
const ZatcaCenter = lazyWithRetry(() => import('./pages/zatca/ZatcaCenter'));

// Meetings Pages
const InternalMeetings = lazyWithRetry(() => import('./pages/meetings/InternalMeetings'));
const ClientMeetings = lazyWithRetry(() => import('./pages/meetings/ClientMeetings'));
const MyAvailability = lazyWithRetry(() => import('./pages/meetings/MyAvailability'));

// Public Booking Page (no auth required)
const PublicBooking = lazyWithRetry(() => import('./pages/booking/PublicBooking'));
// Public Service Portal (White-Label, no auth required)
const ServicePortal = lazyWithRetry(() => import('./pages/portal/ServicePortal'));

// Component to choose between tenant and main landing page
const SmartLandingPage: React.FC = () => {
  const { isSubdomain } = useTenant();
  return isSubdomain ? <TenantLandingPage /> : <LandingPage />;
};

function App() {
  return (
    <ErrorBoundary>
    <TenantProvider>
      <AuthProvider>
        <PermissionProvider>
        <AnnouncementProvider>
        <SubscriptionProvider>
          <UpdateBanner />
          <Router>
            <Suspense fallback={<PageLoader full />}>
            <Routes>
              <Route path="/" element={<SmartLandingPage />} />
              {/* Auth routes with shared layout */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginContent />} />
                <Route path="/register" element={<RegisterChoiceContent />} />
                <Route path="/register/tenant" element={<RegisterTenantContent />} />
              </Route>
              {/* Account Status - For expired subscriptions */}
              <Route path="/account-status" element={<AccountStatus />} />
              {/* Subscription Payment Result - After StreamPay redirect */}
              <Route path="/subscription/payment/success" element={<SubscriptionPaymentResult />} />
              <Route path="/subscription/payment/failed" element={<SubscriptionPaymentResult />} />
              {/* Lawyer Suspended - For lawyers when subscription expired - NO TIMER */}
              <Route path="/lawyer-suspended" element={
                <ProtectedRoute allowedRoles={['lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <LawyerSuspended />
                </ProtectedRoute>
              } />
              {/* Public Booking Page - No auth required */}
              <Route path="/booking/:token" element={<PublicBooking />} />
              {/* Public Service Portal (White-Label) - No auth required */}
              <Route path="/portal/service/:token" element={<ServicePortal />} />

              {/* Forbidden page - Phase 3 */}
              <Route path="/forbidden" element={<Forbidden />} />

              {/* All routes below need TimerProvider */}
              <Route path="*" element={
                <TimerProvider>
                  <Routes>
            <Route element={
              <ProtectedRoute>
                <ZatcaStatusProvider>
                  <Layout />
                </ZatcaStatusProvider>
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />

              {/* Routes for all users except clients */}
              <Route path="cases" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <Cases />
                </ProtectedRoute>
              } />
              <Route path="cases/:caseId" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <CaseDetailPage />
                </ProtectedRoute>
              } />
              <Route path="sessions" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <UpcomingSessions />
                </ProtectedRoute>
              } />
              <Route path="sessions/:sessionId/prep" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <SessionPrep />
                </ProtectedRoute>
              } />
              {/* المهل النظامية — عدادات تنازلية لمهل الاعتراض والمدد (ملاحظتا عميل #21 و#23) */}
              <Route path="deadlines" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <LegalDeadlines />
                </ProtectedRoute>
              } />
              <Route path="wekalat" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <Wekalat />
                </ProtectedRoute>
              } />
              <Route path="execution-requests" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <ExecutionRequests />
                </ProtectedRoute>
              } />
              {/* مركز الملاحظات والاقتراحات — كل المستخدمين الداخليين عدا العميل */}
              <Route path="feedback" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant', 'accountant', 'secretary']}>
                  <Feedback />
                </ProtectedRoute>
              } />

              {/* الموارد البشرية — المدير فقط (requiredPermission: hr.view) + بوابة hr_enabled بالباك */}
              <Route path="hr" element={
                <ProtectedRoute requiredPermission="hr.view">
                  <HrModule />
                </ProtectedRoute>
              } />
              <Route path="hr/employees/:id" element={
                <ProtectedRoute requiredPermission="hr.view">
                  <EmployeeDetailPage />
                </ProtectedRoute>
              } />

              {/* Meetings routes */}
              <Route path="meetings/internal" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <InternalMeetings />
                </ProtectedRoute>
              } />
              <Route path="meetings/client" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <ClientMeetings />
                </ProtectedRoute>
              } />
              <Route path="meetings/availability" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer']}>
                  <MyAvailability />
                </ProtectedRoute>
              } />

              {/* Client-specific routes */}
              <Route path="my-cases" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientCases />
                </ProtectedRoute>
              } />
              <Route path="my-cases/:caseId" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientCaseDetail />
                </ProtectedRoute>
              } />
              <Route path="my-documents-required" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDocumentsRequired />
                </ProtectedRoute>
              } />
              <Route path="my-messages" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientMessages />
                </ProtectedRoute>
              } />

              <Route path="tasks" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="tasks/:taskId" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <TaskDetail />
                </ProtectedRoute>
              } />
              <Route path="documents" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <Documents />
                </ProtectedRoute>
              } />
              <Route path="activities" element={<Activities />} />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer']}>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="firm-report" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner']}>
                  <FirmReport />
                </ProtectedRoute>
              } />
              <Route path="lawyers-report" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner']}>
                  <LawyersReport />
                </ProtectedRoute>
              } />
              <Route path="my-performance" element={
                <ProtectedRoute allowedRoles={['lawyer', 'senior_lawyer', 'legal_assistant', 'partner', 'admin', 'owner']}>
                  <MyPerformance />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="admin/statistics" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Statistics />
                </ProtectedRoute>
              } />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="whatsapp-settings" element={<WhatsappSettings />} />
              {/* صفحة العملاء تُحمى بالصلاحية لا بأسماء الأدوار (المحاسب/السكرتير يملكان clients.view) */}
              <Route path="clients" element={
                <ProtectedRoute requiredPermission="clients.view">
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="clients/:clientId" element={
                <ProtectedRoute requiredPermission="clients.view">
                  <ClientDetailPage />
                </ProtectedRoute>
              } />
              <Route path="admin/requests" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <AdminRequests />
                </ProtectedRoute>
              } />
              <Route path="wathq" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'senior_lawyer', 'lawyer']}>
                  <WathqInquiryPage />
                </ProtectedRoute>
              } />
              <Route path="laws" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'senior_lawyer', 'lawyer', 'legal_assistant']}>
                  <LawsPage />
                </ProtectedRoute>
              } />
              <Route path="correspondence" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'senior_lawyer', 'lawyer', 'accountant']}>
                  <CorrespondenceRegisterPage />
                </ProtectedRoute>
              } />
              <Route path="memos/approvals" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'senior_lawyer', 'legal_assistant', 'lawyer']}>
                  <MemoApprovals />
                </ProtectedRoute>
              } />
              <Route path="notebook" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <PersonalNotebook />
                </ProtectedRoute>
              } />

              {/* [P4·UX-01 + UX-07] وحدة «العقود والمالية» الموحّدة — حراسة قائمة على الصلاحيات (لا allowedRoles) */}
              <Route path="finance" element={
                <ProtectedRoute anyOfPermissions={['billing.view', 'contracts.view']}>
                  <ContractsFinanceModule />
                </ProtectedRoute>
              }>
                <Route index element={
                  <ProtectedRoute requiredPermission="billing.view"><DashboardTab /></ProtectedRoute>
                } />
                <Route path="contracts" element={
                  <ProtectedRoute anyOfPermissions={['contracts.view', 'billing.view']}><ContractsTab /></ProtectedRoute>
                } />
                <Route path="contracts/:id" element={
                  <ProtectedRoute anyOfPermissions={['contracts.view', 'billing.view']}><ContractDetailPage /></ProtectedRoute>
                } />
                <Route path="invoices" element={
                  <ProtectedRoute requiredPermission="billing.view"><InvoicesTab /></ProtectedRoute>
                } />
                <Route path="invoices/:id" element={
                  <ProtectedRoute requiredPermission="billing.view"><InvoiceDetailPage /></ProtectedRoute>
                } />
                <Route path="payments" element={
                  <ProtectedRoute requiredPermission="billing.payments.manage"><PaymentsTab /></ProtectedRoute>
                } />
                {/* التحصيل العلوي المستقل: billing.view + قيد دور (يطابق إظهار التبويب في financeModule) */}
                <Route path="collections" element={
                  <ProtectedRoute requiredPermission="billing.view" allowedRoles={['admin', 'owner', 'accountant', 'super_admin']}><CollectionsTab /></ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute requiredPermission="billing.reports.view"><ReportsTab /></ProtectedRoute>
                } />
              </Route>
              {/* صفحة إنشاء العقد (Wizard) خارج حاوية التبويبات */}
              <Route path="finance/contracts/new" element={
                <ProtectedRoute requiredPermission="contracts.create"><ContractBuilder /></ProtectedRoute>
              } />

              {/* [P4·UX-09] قوالب العقود ضمن الإعدادات */}
              <Route path="settings/contract-templates" element={
                <ProtectedRoute requiredPermission="contracts.templates.manage"><ContractTemplates /></ProtectedRoute>
              } />
              <Route path="settings/contract-templates/new" element={
                <ProtectedRoute requiredPermission="contracts.templates.manage"><ContractTemplateEditorPage /></ProtectedRoute>
              } />
              <Route path="settings/contract-templates/:id" element={
                <ProtectedRoute requiredPermission="contracts.templates.manage"><ContractTemplateEditorPage /></ProtectedRoute>
              } />

              {/* [P4·UX-01] إعادة توجيه المسارات القديمة (لا روابط مكسورة) */}
              <Route path="contracts" element={<LegacyRedirect to={() => '/finance/contracts'} />} />
              <Route path="contracts/new" element={<LegacyRedirect to={() => '/finance/contracts/new'} />} />
              <Route path="contracts/:id" element={<LegacyRedirect to={(p) => `/finance/contracts/${p.id}`} />} />
              <Route path="invoices" element={<LegacyRedirect to={() => '/finance/invoices'} />} />
              <Route path="invoices/:id" element={<LegacyRedirect to={(p) => `/finance/invoices/${p.id}`} />} />
              <Route path="payments" element={<LegacyRedirect to={() => '/finance/payments'} />} />
              <Route path="billing" element={<LegacyRedirect to={() => '/finance/collections'} />} />
              <Route path="contract-templates" element={<LegacyRedirect to={() => '/settings/contract-templates'} />} />
              <Route path="contract-templates/new" element={<LegacyRedirect to={() => '/settings/contract-templates/new'} />} />
              <Route path="contract-templates/:id" element={<LegacyRedirect to={(p) => `/settings/contract-templates/${p.id}`} />} />

              {/* ZATCA E-Invoicing — قسم مستقل (الحماية الفعلية في الباك؛ حارس available/enabled داخل ZatcaCenter) */}
              <Route path="zatca" element={
                <ProtectedRoute allowedRoles={['admin', 'accountant', 'owner']}>
                  <ZatcaCenter />
                </ProtectedRoute>
              } />

              {/* Legal Services routes */}
              <Route path="legal-services" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <LegalServices />
                </ProtectedRoute>
              } />
              <Route path="legal-services/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <LegalServiceDetail />
                </ProtectedRoute>
              } />
            </Route>
            {/* 404 - catch-all خارج Layout (بدون sidebar وبدون auth) */}
            <Route path="*" element={<NotFound />} />
                  </Routes>
                </TimerProvider>
              } />
            </Routes>
            </Suspense>
          </Router>
          <ToastContainer position="bottom-left" rtl autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover theme="light" />
        </SubscriptionProvider>
        </AnnouncementProvider>
        </PermissionProvider>
      </AuthProvider>
    </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;
