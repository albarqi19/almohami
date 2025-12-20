import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Calendar,
  User
} from 'lucide-react';

interface TaskNotification {
  id: string;
  type: 'overdue' | 'due_soon' | 'completed' | 'assigned';
  taskId: string;
  taskTitle: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface TaskNotificationsProps {
  tasks: any[];
  onMarkAsRead?: (notificationId: string) => void;
  onDismiss?: (notificationId: string) => void;
}

const TaskNotifications: React.FC<TaskNotificationsProps> = ({ 
  tasks, 
  onMarkAsRead,
  onDismiss 
}) => {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Generate notifications based on tasks
  useEffect(() => {
    const generateNotifications = () => {
      const now = new Date();
      const newNotifications: TaskNotification[] = [];

      tasks.forEach(task => {
        // Check for overdue tasks
        if (task.status !== 'completed' && task.dueDate && now > new Date(task.dueDate)) {
          const daysPastDue = Math.floor((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          newNotifications.push({
            id: `overdue-${task.id}`,
            type: 'overdue',
            taskId: task.id,
            taskTitle: task.title,
            message: `المهمة متأخرة بـ ${daysPastDue} ${daysPastDue === 1 ? 'يوم' : 'أيام'}`,
            timestamp: new Date(),
            isRead: false,
            priority: 'high'
          });
        }
        
        // Check for tasks due soon (within 2 days)
        else if (task.status !== 'completed' && task.dueDate) {
          const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue >= 0 && daysUntilDue <= 2) {
            newNotifications.push({
              id: `due-soon-${task.id}`,
              type: 'due_soon',
              taskId: task.id,
              taskTitle: task.title,
              message: daysUntilDue === 0 
                ? 'المهمة مستحقة اليوم' 
                : `المهمة مستحقة خلال ${daysUntilDue} ${daysUntilDue === 1 ? 'يوم' : 'أيام'}`,
              timestamp: new Date(),
              isRead: false,
              priority: daysUntilDue === 0 ? 'high' : 'medium'
            });
          }
        }

        // Check for recently completed tasks
        if (task.status === 'completed' && task.completedAt) {
          const hoursAgoCompleted = (now.getTime() - new Date(task.completedAt).getTime()) / (1000 * 60 * 60);
          if (hoursAgoCompleted <= 24) {
            newNotifications.push({
              id: `completed-${task.id}`,
              type: 'completed',
              taskId: task.id,
              taskTitle: task.title,
              message: 'تم إكمال المهمة بنجاح',
              timestamp: new Date(task.completedAt),
              isRead: false,
              priority: 'low'
            });
          }
        }
      });

      // Sort by priority and timestamp
      newNotifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(newNotifications);
    };

    generateNotifications();
    
    // Update notifications every minute
    const interval = setInterval(generateNotifications, 60000);
    
    return () => clearInterval(interval);
  }, [tasks]);

  const getNotificationIcon = (type: TaskNotification['type']) => {
    switch (type) {
      case 'overdue': return AlertTriangle;
      case 'due_soon': return Clock;
      case 'completed': return CheckCircle;
      case 'assigned': return User;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: TaskNotification['type']) => {
    switch (type) {
      case 'overdue': return 'var(--color-error)';
      case 'due_soon': return 'var(--color-warning)';
      case 'completed': return 'var(--color-success)';
      case 'assigned': return 'var(--color-primary)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    onMarkAsRead?.(notificationId);
  };

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    onDismiss?.(notificationId);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNotifications(!showNotifications)}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)'
        }}
      >
        <Bell style={{ height: '20px', width: '20px' }} />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '18px',
              height: '18px',
              backgroundColor: 'var(--color-error)',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              width: '400px',
              maxHeight: '500px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text)'
              }}>
                التنبيهات ({notifications.length})
              </h3>
              
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    setNotifications(prev => 
                      prev.map(notif => ({ ...notif, isRead: true }))
                    );
                  }}
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  قراءة الكل
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)'
                }}>
                  <Bell style={{ 
                    height: '48px', 
                    width: '48px', 
                    marginBottom: '16px',
                    opacity: 0.5
                  }} />
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                    لا توجد تنبيهات جديدة
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: notification.isRead 
                          ? 'transparent' 
                          : 'var(--color-background)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{
                          color: getNotificationColor(notification.type),
                          marginTop: '2px'
                        }}>
                          <IconComponent style={{ height: '18px', width: '18px' }} />
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            marginBottom: '4px',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text)',
                            lineHeight: '1.4'
                          }}>
                            {notification.taskTitle}
                          </h4>
                          
                          <p style={{
                            margin: 0,
                            marginBottom: '8px',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            lineHeight: '1.4'
                          }}>
                            {notification.message}
                          </p>
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            <Calendar style={{ height: '12px', width: '12px' }} />
                            {notification.timestamp.toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {/* Dismiss Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(notification.id);
                          }}
                          style={{
                            padding: '4px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            opacity: 0.7
                          }}
                        >
                          <X style={{ height: '14px', width: '14px' }} />
                        </motion.button>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '6px',
                          height: '6px',
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '50%'
                        }} />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskNotifications;
