import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientDashboard from './ClientDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import CustomDashboard from '../components/dashboard/CustomDashboard';
import { useIsDesktop } from '../hooks/useIsDesktop';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const isDesktop = useIsDesktop();

    // If user is a client, show the client dashboard
    if (user?.role === 'client') {
        return <ClientDashboard />;
    }

    // ✨ اللوحة القابلة للتخصيص — للمكاتب المفعّلة (custom_dashboard_enabled)
    // وعلى الشاشات الكبيرة فقط؛ الجوال يبقى على الكلاسيكية (قرار المالك).
    if (user?.tenant?.custom_dashboard_enabled && isDesktop) {
        return <CustomDashboard />;
    }

    // For other roles (admin, lawyer, legal_assistant), show the new ClickUp-style dashboard
    return <AdminDashboard />;
};

export default Dashboard;
