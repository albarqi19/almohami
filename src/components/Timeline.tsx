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
  Scale,
  PlusCircle,
  History,
  Activity
} from 'lucide-react';
import '../styles/timeline.css';

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
      case 'case_created': return PlusCircle;
      case 'document_added': return FileText;
      case 'hearing_scheduled': return Calendar;
      case 'task_completed': return CheckCircle;
      case 'note_added': return MessageSquare;
      case 'status_changed': return History;
      case 'call_made': return Phone;
      case 'email_sent': return Mail;
      case 'meeting_held': return User;
      default: return Activity;
    }
  };

  const getActionText = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'case_created': return 'قام بإنشاء القضية';
      case 'document_added': return 'أضاف وثيقة جديدة';
      case 'hearing_scheduled': return 'قام بجدولة جلسة';
      case 'task_completed': return 'أتمّ المهمة';
      case 'note_added': return 'أضاف ملاحظة';
      case 'status_changed': return 'قام بتغيير الحالة إلى';
      case 'call_made': return 'أجرى مكالمة هاتفية مع';
      case 'email_sent': return 'أرسل بريداً إلكترونياً إلى';
      case 'meeting_held': return 'عقد اجتماعاً';
      default: return 'قام بإجراء';
    }
  };

  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;

    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div className="notion-timeline--empty">
        <Clock size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
        <h3>لا توجد أحداث بعد</h3>
        <p>سيتم تسجيل جميع النشاطات هنا تلقائياً</p>
      </div>
    );
  }

  return (
    <div className="notion-timeline">
      <div className="notion-timeline__container">
        <div className="notion-timeline__line"></div>

        {sortedEvents.map((event, index) => {
          const Icon = getEventIcon(event.type);
          const actionText = getActionText(event.type);

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="notion-timeline__event"
            >
              <div className="notion-timeline__marker">
                <div className="notion-timeline__icon-wrapper">
                  <Icon size={14} />
                </div>
              </div>

              <div className="notion-timeline__content">
                <div className="notion-timeline__event-header">
                  <div className="notion-timeline__title-row">
                    <span className="notion-timeline__user">{event.user}</span>
                    <span className="notion-timeline__action-text">{actionText}</span>
                    <span className="notion-timeline__object">
                      {event.type === 'status_changed' ? event.metadata?.newStatus : event.title}
                    </span>
                  </div>
                  <span className="notion-timeline__date">
                    {formatRelativeDate(event.date)}
                  </span>
                </div>

                {event.description && (
                  <p className="notion-timeline__description">
                    {event.description}
                  </p>
                )}

                {event.metadata && (Object.keys(event.metadata).length > 0) && (
                  <div className="notion-timeline__details">
                    {event.metadata.documentName && (
                      <div className="notion-timeline__detail-item">
                        <span className="notion-timeline__detail-label">الوثيقة:</span>
                        {event.metadata.documentName}
                      </div>
                    )}
                    {event.metadata.oldStatus && (
                      <div className="notion-timeline__detail-item">
                        <span className="notion-timeline__detail-label">الحالة السابقة:</span>
                        {event.metadata.oldStatus}
                      </div>
                    )}
                    {event.metadata.hearingDate && (
                      <div className="notion-timeline__detail-item">
                        <span className="notion-timeline__detail-label">موعد الجلسة:</span>
                        {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full' }).format(new Date(event.metadata.hearingDate))}
                      </div>
                    )}
                    {event.metadata.contactInfo && (
                      <div className="notion-timeline__detail-item">
                        <span className="notion-timeline__detail-label">تواصل مع:</span>
                        {event.metadata.contactInfo}
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
  );
};

export default Timeline;
