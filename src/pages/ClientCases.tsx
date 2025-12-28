import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Eye,
  Search,
  User,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CaseService } from '../services/caseService';
import type { Case } from '../types';
import '../styles/client-cases.css';

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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'نشطة',
      pending: 'قيد الانتظار',
      closed: 'مغلقة',
      settled: 'مسوية',
      appealed: 'مستأنفة',
      dismissed: 'مرفوضة'
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      urgent: 'عاجلة'
    };
    return priorityMap[priority] || priority;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'غير محدد';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'غير محدد';
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj);
    } catch {
      return 'غير محدد';
    }
  };

  if (isLoading) {
    return (
      <div className="client-cases">
        <div className="client-cases__loading">
          <div className="client-cases__spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-cases">
      {/* Header */}
      <div className="client-cases__header">
        <div className="client-cases__title-section">
          <div className="client-cases__icon">
            <FileText size={20} />
          </div>
          <h1 className="client-cases__title">قضاياي</h1>
          <span className="client-cases__count">{filteredCases.length} قضية</span>
        </div>

        {/* Filters */}
        <div className="client-cases__filters">
          <div className="client-cases__search">
            <Search size={18} className="client-cases__search-icon" />
            <input
              type="text"
              placeholder="البحث في القضايا..."
              className="client-cases__search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="client-cases__filter-select"
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

      {/* Content */}
      <div className="client-cases__content">
        {filteredCases.length === 0 ? (
          <div className="client-cases__empty">
            <div className="client-cases__empty-icon">
              <FileText size={28} />
            </div>
            <h3 className="client-cases__empty-title">لا توجد قضايا</h3>
            <p className="client-cases__empty-text">
              {searchTerm || statusFilter !== 'all'
                ? 'لا توجد قضايا تطابق معايير البحث'
                : 'لم يتم العثور على أي قضايا مرتبطة بحسابك'
              }
            </p>
          </div>
        ) : (
          <div className="client-cases__grid">
            {filteredCases.map((case_) => (
              <div
                key={case_.id}
                className="case-card"
                onClick={() => window.location.href = `/my-cases/${case_.id}`}
              >
                {/* Header */}
                <div className="case-card__header">
                  <div>
                    <h3 className="case-card__title">{case_.title}</h3>
                    <p className="case-card__number">رقم الملف: {case_.file_number}</p>
                  </div>
                  <div className="case-card__badges">
                    <span className={`case-badge case-badge--${case_.status}`}>
                      {getStatusText(case_.status)}
                    </span>
                    <span className={`case-badge case-badge--${case_.priority}`}>
                      {getPriorityText(case_.priority)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="case-card__details">
                  {case_.opponent_name && (
                    <div className="case-card__detail">
                      <User size={16} />
                      <span>الطرف الآخر: {case_.opponent_name}</span>
                    </div>
                  )}

                  {case_.court && (
                    <div className="case-card__detail">
                      <FileText size={16} />
                      <span>المحكمة: {case_.court}</span>
                    </div>
                  )}

                  {case_.next_hearing && (
                    <div className="case-card__detail">
                      <Calendar size={16} />
                      <span>الجلسة القادمة: {formatDate(case_.next_hearing)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="case-card__footer">
                  <span className="case-card__updated">
                    آخر تحديث: {formatDate(case_.updated_at)}
                  </span>
                  <button className="case-card__action">
                    <Eye size={16} />
                    <span>عرض التفاصيل</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientCases;
