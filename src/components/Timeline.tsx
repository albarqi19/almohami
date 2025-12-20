import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  FileText, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  Scale
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  type: 'case_created' | 'document_added' | 'hearing_scheduled' | 'task_completed' | 'note_added' | 'status_changed' | 'call_made' | 'email_sent' | 'meeting_held';
  title: string;
  description: string;
  date: Date;
  user: string;
  metadata?: {
    documentName?: string;
    oldStatus?: string;
    newStatus?: string;
    taskTitle?: string;
    hearingDate?: Date;
    contactInfo?: string;
  };
}

interface TimelineProps {
  events: TimelineEvent[];
  caseId?: string;
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'case_created': return Scale;
      case 'document_added': return FileText;
      case 'hearing_scheduled': return Calendar;
      case 'task_completed': return CheckCircle;
      case 'note_added': return MessageSquare;
      case 'status_changed': return AlertCircle;
      case 'call_made': return Phone;
      case 'email_sent': return Mail;
      case 'meeting_held': return User;
      default: return Clock;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'case_created': return 'var(--color-primary)';
      case 'document_added': return 'var(--color-info)';
      case 'hearing_scheduled': return 'var(--color-warning)';
      case 'task_completed': return 'var(--color-success)';
      case 'note_added': return 'var(--color-purple-500)';
      case 'status_changed': return 'var(--color-orange-500)';
      case 'call_made': return 'var(--color-blue-500)';
      case 'email_sent': return 'var(--color-teal-500)';
      case 'meeting_held': return 'var(--color-indigo-500)';
      default: return 'var(--color-secondary)';
    }
  };

  const getEventTypeLabel = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'case_created': return 'إنشاء القضية';
      case 'document_added': return 'إضافة وثيقة';
      case 'hearing_scheduled': return 'جدولة جلسة';
      case 'task_completed': return 'إنجاز مهمة';
      case 'note_added': return 'إضافة ملاحظة';
      case 'status_changed': return 'تغيير الحالة';
      case 'call_made': return 'مكالمة هاتفية';
      case 'email_sent': return 'إرسال بريد إلكتروني';
      case 'meeting_held': return 'اجتماع';
      default: return 'حدث';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)'
      }}>
        <Clock size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }} />
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-text)',
          marginBottom: '8px'
        }}>
          لا توجد أحداث بعد
        </h3>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          margin: 0
        }}>
          ستظهر جميع الأحداث والإجراءات المتعلقة بهذه القضية هنا
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      padding: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <Clock size={24} style={{ color: 'var(--color-primary)' }} />
        <h2 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
          margin: 0
        }}>
          الجدول الزمني للقضية
        </h2>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          right: '24px',
          top: '0',
          bottom: '0',
          width: '2px',
          backgroundColor: 'var(--color-border)',
          zIndex: 1
        }} />

        {/* Timeline events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sortedEvents.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const eventColor = getEventColor(event.type);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  position: 'relative',
                  paddingRight: '60px'
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  right: '15px',
                  top: '4px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: eventColor,
                  borderRadius: '50%',
                  border: '3px solid var(--color-surface)',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={10} style={{ color: 'white' }} />
                </div>

                {/* Event content */}
                <div style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  {/* Event header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: eventColor,
                          backgroundColor: `${eventColor}15`,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <h3 style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        {event.title}
                      </h3>
                    </div>
                    
                    <div style={{
                      textAlign: 'left',
                      flexShrink: 0
                    }}>
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '2px'
                      }}>
                        {formatDate(event.date)}
                      </div>
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <User size={12} />
                        {event.user}
                      </div>
                    </div>
                  </div>

                  {/* Event description */}
                  <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                    marginBottom: event.metadata ? '12px' : '0'
                  }}>
                    {event.description}
                  </p>

                  {/* Event metadata */}
                  {event.metadata && (
                    <div style={{
                      backgroundColor: 'var(--color-surface)',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {event.metadata.documentName && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>اسم الوثيقة:</strong> {event.metadata.documentName}
                        </div>
                      )}
                      {event.metadata.oldStatus && event.metadata.newStatus && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>تغيير الحالة:</strong> من "{event.metadata.oldStatus}" إلى "{event.metadata.newStatus}"
                        </div>
                      )}
                      {event.metadata.taskTitle && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>المهمة:</strong> {event.metadata.taskTitle}
                        </div>
                      )}
                      {event.metadata.hearingDate && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>موعد الجلسة:</strong> {formatDate(event.metadata.hearingDate)}
                        </div>
                      )}
                      {event.metadata.contactInfo && (
                        <div>
                          <strong>معلومات الاتصال:</strong> {event.metadata.contactInfo}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
