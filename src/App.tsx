import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetailPage from './pages/CaseDetailPage';
import UpcomingSessions from './pages/UpcomingSessions';
import ClientCases from './pages/ClientCases';
import ClientCaseDetail from './pages/ClientCaseDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Documents from './pages/Documents';
import Activities from './pages/Activities';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import WhatsappSettings from './pages/WhatsappSettings';
import LoginContent from './pages/LoginContent';
import RegisterChoiceContent from './pages/RegisterChoiceContent';
import RegisterTenantContent from './pages/RegisterTenantContent';
import LandingPage from './pages/LandingPage';
import Wekalat from './pages/Wekalat';
import AccountStatus from './pages/AccountStatus';
import Clients from './pages/Clients';
import ClientDetailPage from './pages/ClientDetailPage';
import AdminRequests from './pages/AdminRequests';

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            {/* Auth routes with shared layout */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginContent />} />
              <Route path="/register" element={<RegisterChoiceContent />} />
              <Route path="/register/tenant" element={<RegisterTenantContent />} />
            </Route>
            {/* Account Status - For expired subscriptions */}
            <Route path="/account-status" element={<AccountStatus />} />
            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />

              {/* Routes for all users except clients */}
              <Route path="cases" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <Cases />
                </ProtectedRoute>
              } />
              <Route path="cases/:caseId" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <CaseDetailPage />
                </ProtectedRoute>
              } />
              <Route path="sessions" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <UpcomingSessions />
                </ProtectedRoute>
              } />
              <Route path="wekalat" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <Wekalat />
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

              <Route path="tasks" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="tasks/:taskId" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <TaskDetail />
                </ProtectedRoute>
              } />
              <Route path="documents" element={<Documents />} />
              <Route path="activities" element={<Activities />} />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer']}>
                  <Reports />
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
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="clients/:clientId" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <ClientDetailPage />
                </ProtectedRoute>
              } />
              <Route path="admin/requests" element={
                <ProtectedRoute allowedRoles={['admin', 'lawyer', 'legal_assistant']}>
                  <AdminRequests />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;
