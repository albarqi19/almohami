import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientDashboard from './ClientDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    // If user is a client, show the client dashboard
    if (user?.role === 'client') {
        return <ClientDashboard />;
    }

    // For other roles (admin, lawyer, legal_assistant), show the new ClickUp-style dashboard
    return <AdminDashboard />;
};

export default Dashboard;
