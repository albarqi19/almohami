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
import AuthLayout from './components/AuthLayout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetailPage from './pages/CaseDetailPage';
import UpcomingSessions from './pages/UpcomingSessions';
import SessionPrep from './pages/SessionPrep';
import ClientCases from './pages/ClientCases';
import ClientCaseDetail from './pages/ClientCaseDetail';
import ClientDocumentsRequired from './pages/ClientDocumentsRequired';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Documents from './pages/Documents';
import Activities from './pages/Activities';
import Reports from './pages/Reports';
import LawyersReport from './pages/LawyersReport';
import MyPerformance from './pages/MyPerformance';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import WhatsappSettings from './pages/WhatsappSettings';
import LoginContent from './pages/LoginContent';
import RegisterChoiceContent from './pages/RegisterChoiceContent';
import RegisterTenantContent from './pages/RegisterTenantContent';
import LandingPage from './pages/LandingPage';
import TenantLandingPage from './pages/TenantLandingPage';
import Wekalat from './pages/Wekalat';
import ExecutionRequests from './pages/ExecutionRequests';
import AccountStatus from './pages/AccountStatus';
import SubscriptionPaymentResult from './pages/SubscriptionPaymentResult';
import LawyerSuspended from './pages/LawyerSuspended';
import Clients from './pages/Clients';
import ClientDetailPage from './pages/ClientDetailPage';
import AdminRequests from './pages/AdminRequests';
import WathqInquiryPage from './pages/WathqInquiry';
import ClientMessages from './pages/ClientMessages';
import PersonalNotebook from './pages/NotebookWorkspace';

// Legal Services Pages
import LegalServices from './pages/legal-services/LegalServices';
import LegalServiceDetail from './pages/legal-services/LegalServiceDetail';

// Contracts Pages
import ContractTemplates from './pages/contracts/ContractTemplates';
import ContractTemplateEditorPage from './pages/contracts/ContractTemplateEditorPage';
import ContractBuilder from './pages/contracts/ContractBuilder';

// [P4·UX-01] وحدة «العقود والمالية» الموحّدة + تبويباتها
import ContractsFinanceModule from './pages/finance/ContractsFinanceModule';
import DashboardTab from './pages/finance/tabs/DashboardTab';
import ContractsTab from './pages/finance/tabs/ContractsTab';
import InvoicesTab from './pages/finance/tabs/InvoicesTab';
import PaymentsTab from './pages/finance/tabs/PaymentsTab';
import CollectionsTab from './pages/finance/tabs/CollectionsTab';
import ReportsTab from './pages/finance/tabs/ReportsTab';
import ContractDetailPage from './pages/finance/ContractDetailPage';
import InvoiceDetailPage from './pages/finance/InvoiceDetailPage';
import LegacyRedirect from './components/LegacyRedirect';

// ZATCA E-Invoicing
import ZatcaCenter from './pages/zatca/ZatcaCenter';

// Meetings Pages
import InternalMeetings from './pages/meetings/InternalMeetings';
import ClientMeetings from './pages/meetings/ClientMeetings';
import MyAvailability from './pages/meetings/MyAvailability';

// Public Booking Page (no auth required)
import PublicBooking from './pages/booking/PublicBooking';
// Public Service Portal (White-Label, no auth required)
import ServicePortal from './pages/portal/ServicePortal';

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
              <Route path="clients" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="clients/:clientId" element={
                <ProtectedRoute allowedRoles={['admin', 'owner', 'partner', 'lawyer', 'senior_lawyer', 'legal_assistant']}>
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
