import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UpdateBanner from './components/UpdateBanner';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { TimerProvider } from './contexts/TimerContext';
import { AnnouncementProvider } from './contexts/AnnouncementContext';
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
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractBuilder from './pages/contracts/ContractBuilder';

// Billing Pages
import Invoices from './pages/billing/Invoices';
import InvoiceDetail from './pages/billing/InvoiceDetail';
import Payments from './pages/billing/Payments';
import CollectionDashboard from './pages/billing/CollectionDashboard';

// Meetings Pages
import InternalMeetings from './pages/meetings/InternalMeetings';
import ClientMeetings from './pages/meetings/ClientMeetings';
import MyAvailability from './pages/meetings/MyAvailability';

// Public Booking Page (no auth required)
import PublicBooking from './pages/booking/PublicBooking';

// Component to choose between tenant and main landing page
const SmartLandingPage: React.FC = () => {
  const { isSubdomain } = useTenant();
  return isSubdomain ? <TenantLandingPage /> : <LandingPage />;
};

function App() {
  return (
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

              {/* Forbidden page - Phase 3 */}
              <Route path="/forbidden" element={<Forbidden />} />

              {/* All routes below need TimerProvider */}
              <Route path="*" element={
                <TimerProvider>
                  <Routes>
            <Route element={
              <ProtectedRoute>
                <Layout />
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
                <ProtectedRoute allowedRoles={['lawyer', 'senior_lawyer']}>
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

              {/* Contracts routes */}
              <Route path="contract-templates" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractTemplates />
                </ProtectedRoute>
              } />
              <Route path="contract-templates/new" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractTemplateEditorPage />
                </ProtectedRoute>
              } />
              <Route path="contract-templates/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractTemplateEditorPage />
                </ProtectedRoute>
              } />
              <Route path="contracts" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <Contracts />
                </ProtectedRoute>
              } />
              <Route path="contracts/new" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractBuilder />
                </ProtectedRoute>
              } />
              <Route path="contracts/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <ContractDetail />
                </ProtectedRoute>
              } />

              {/* Billing routes */}
              <Route path="invoices" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="invoices/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <InvoiceDetail />
                </ProtectedRoute>
              } />
              <Route path="payments" element={
                <ProtectedRoute allowedRoles={['admin', 'legal_assistant']}>
                  <Payments />
                </ProtectedRoute>
              } />
              <Route path="billing" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CollectionDashboard />
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
  );
}

export default App;
