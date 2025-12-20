import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  AlertCircle,
  Upload,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock data - في التطبيق الحقيقي سيتم جلبها من API
  const clientStats = {
    totalCases: 3,
    activeCases: 2,
    documentsUploaded: 5,
    upcomingHearings: 1
  };

  const recentActivities = [
    {
      id: '1',
      type: 'document_uploaded',
      title: 'تم رفع وثيقة جديدة',
      description: 'صك الملكية الأصلي',
      date: new Date('2024-03-15'),
      caseId: '1'
    },
    {
      id: '2',
      type: 'hearing_scheduled',
      title: 'تم تحديد موعد جلسة',
      description: 'الجلسة القادمة في 25 أكتوبر 2024',
      date: new Date('2024-03-10'),
      caseId: '1'
    },
    {
      id: '3',
      type: 'message_received',
      title: 'رسالة جديدة من المحامي',
      description: 'تحديث حول القضية العقارية',
      date: new Date('2024-03-08'),
      caseId: '1'
    }
  ];

  const upcomingEvents = [
    {
      id: '1',
      title: 'جلسة المحكمة - القضية العقارية',
      date: new Date('2024-10-25'),
      time: '10:00 ص',
      location: 'المحكمة العامة - الرياض',
      caseId: '1'
    }
  ];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    linkTo?: string;
  }> = ({ title, value, icon: Icon, color, linkTo }) => {
    const content = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon 
              className="h-6 w-6" 
              style={{ color: color }}
            />
          </div>
        </div>
      </motion.div>
    );

    return linkTo ? (
      <Link to={linkTo}>
        {content}
      </Link>
    ) : content;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          مرحباً {user?.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          تابع قضاياك وآخر التحديثات من هنا
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="إجمالي القضايا"
          value={clientStats.totalCases}
          icon={FileText}
          color="#3B82F6"
          linkTo="/my-cases"
        />
        <StatCard
          title="القضايا النشطة"
          value={clientStats.activeCases}
          icon={TrendingUp}
          color="#10B981"
          linkTo="/my-cases?status=active"
        />
        <StatCard
          title="الوثائق المرفوعة"
          value={clientStats.documentsUploaded}
          icon={Upload}
          color="#8B5CF6"
          linkTo="/documents"
        />
        <StatCard
          title="الجلسات القادمة"
          value={clientStats.upcomingHearings}
          icon={Calendar}
          color="#F59E0B"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                آخر الأنشطة
              </h2>
              <Link 
                to="/activities"
                className="text-primary hover:text-primary-dark font-medium text-sm"
              >
                عرض الكل
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/my-cases/${activity.caseId}`}
                >
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                      {activity.type === 'document_uploaded' && <Upload className="h-4 w-4 text-white" />}
                      {activity.type === 'hearing_scheduled' && <Calendar className="h-4 w-4 text-white" />}
                      {activity.type === 'message_received' && <MessageSquare className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              المواعيد القادمة
            </h2>
            
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  لا توجد مواعيد قادمة
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                    onClick={() => window.location.href = `/my-cases/${event.caseId}`}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(event.date)} - {event.time}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              إجراءات سريعة
            </h2>
            
            <div className="space-y-3">
              <Link
                to="/my-cases"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  عرض جميع القضايا
                </span>
              </Link>
              
              <button className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  رفع وثيقة جديدة
                </span>
              </button>
              
              <button className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <MessageSquare className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  إرسال رسالة للمحامي
                </span>
              </button>
            </div>
          </div>

          {/* Case Status Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              ملخص القضايا
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">نشطة</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {clientStats.activeCases}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">مسوية</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {clientStats.totalCases - clientStats.activeCases}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
