import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  AlertCircle, 
  Eye,
  Search,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import type { Case } from '../types';

const ClientCases: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadClientCases = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        // جلب القضايا الخاصة بالعميل المسجل دخوله فقط
        const casesData = await CaseService.getCases({ client_id: user.id });
        setCases(casesData.data || []);
        setFilteredCases(casesData.data || []);
      } catch (error) {
        console.error('Error loading client cases:', error);
        setCases([]);
        setFilteredCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClientCases();
  }, [user?.id]);

  useEffect(() => {
    // تصفية القضايا حسب البحث والحالة
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(case_ =>
        case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.file_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.opponent_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [searchTerm, statusFilter, cases]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.1)', text: 'نشطة' },
      pending: { color: 'var(--color-warning)', bg: 'rgba(251, 191, 36, 0.1)', text: 'قيد الانتظار' },
      closed: { color: 'var(--color-text-secondary)', bg: 'rgba(107, 114, 128, 0.1)', text: 'مغلقة' },
      settled: { color: 'var(--color-primary)', bg: 'rgba(59, 130, 246, 0.1)', text: 'مسوية' },
      appealed: { color: 'var(--color-purple)', bg: 'rgba(147, 51, 234, 0.1)', text: 'مستأنفة' },
      dismissed: { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)', text: 'مرفوضة' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: config.color,
        backgroundColor: config.bg
      }}>
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'var(--color-text-secondary)', bg: 'rgba(107, 114, 128, 0.1)', text: 'منخفضة' },
      medium: { color: 'var(--color-warning)', bg: 'rgba(251, 191, 36, 0.1)', text: 'متوسطة' },
      high: { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)', text: 'عالية' },
      urgent: { color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.2)', text: 'عاجلة' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: config.color,
        backgroundColor: config.bg
      }}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          قضاياي
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          جميع القضايا المرتبطة بحسابك
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث في القضايا..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="sm:w-48">
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشطة</option>
            <option value="pending">قيد الانتظار</option>
            <option value="settled">مسوية</option>
            <option value="closed">مغلقة</option>
          </select>
        </div>
      </div>

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            لا توجد قضايا
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'لا توجد قضايا تطابق معايير البحث'
              : 'لم يتم العثور على أي قضايا مرتبطة بحسابك'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCases.map((case_, index) => (
            <motion.div
              key={case_.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/cases/${case_.id}`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                    {case_.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    رقم الملف: {case_.file_number}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {getStatusBadge(case_.status)}
                  {getPriorityBadge(case_.priority)}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                {case_.opponent_name && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4 mr-2" />
                    الطرف الآخر: {case_.opponent_name}
                  </div>
                )}

                {case_.court && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="h-4 w-4 mr-2" />
                    المحكمة: {case_.court}
                  </div>
                )}

                {case_.next_hearing && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    الجلسة القادمة: {formatDate(case_.next_hearing)}
                  </div>
                )}

                {case_.contract_value && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    القيمة المقدرة: {formatCurrency(case_.contract_value)}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  آخر تحديث: {formatDate(case_.updated_at)}
                </div>
                <button className="text-primary hover:text-primary-dark font-medium text-sm flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  عرض التفاصيل
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientCases;
