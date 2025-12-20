import { useEffect } from 'react';
import { useTaskNotifications } from '../hooks/useNotificationService';
import type { Task } from '../types';

interface TaskNotificationManagerProps {
  tasks: Task[];
}

const TaskNotificationManager: React.FC<TaskNotificationManagerProps> = ({ tasks }) => {
  const { notifyTaskDue, notifyCourtSession } = useTaskNotifications();

  useEffect(() => {
    const checkTaskNotifications = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
          return;
        }

        const dueDate = new Date(task.dueDate);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // إشعارات للمهام المتأخرة أو التي تستحق قريباً
        if (hoursUntilDue <= 24 && hoursUntilDue >= -24) {
          const lastNotified = localStorage.getItem(`task_notification_${task.id}`);
          const lastNotifiedTime = lastNotified ? new Date(lastNotified) : null;
          
          // تجنب الإشعارات المكررة (مرة كل ساعة على الأقل)
          if (!lastNotifiedTime || (now.getTime() - lastNotifiedTime.getTime()) > 60 * 60 * 1000) {
            notifyTaskDue(task.title, task.id, Math.round(hoursUntilDue));
            localStorage.setItem(`task_notification_${task.id}`, now.toISOString());
          }
        }

        // إشعارات خاصة لجلسات المحكمة
        if (task.type === 'court') {
          const minutesUntilSession = (dueDate.getTime() - now.getTime()) / (1000 * 60);
          
          if (minutesUntilSession <= 120 && minutesUntilSession > 0) {
            const lastCourtNotified = localStorage.getItem(`court_notification_${task.id}`);
            const lastCourtNotifiedTime = lastCourtNotified ? new Date(lastCourtNotified) : null;
            
            // إشعار مرة واحدة قبل جلسة المحكمة بساعتين أو أقل
            if (!lastCourtNotifiedTime) {
              notifyCourtSession(task.title, task.id, Math.round(minutesUntilSession));
              localStorage.setItem(`court_notification_${task.id}`, now.toISOString());
            }
          }
        }
      });
    };

    // فحص فوري
    checkTaskNotifications();

    // فحص كل 15 دقيقة
    const interval = setInterval(checkTaskNotifications, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tasks, notifyTaskDue, notifyCourtSession]);

  // هذا المكون لا يعرض أي واجهة، فقط يدير الإشعارات
  return null;
};

export default TaskNotificationManager;
