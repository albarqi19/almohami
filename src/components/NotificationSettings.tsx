import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Smartphone, Clock } from 'lucide-react';
import { useTaskNotifications } from '../hooks/useNotificationService';

const NotificationSettings: React.FC = () => {
  const {
    requestPermission,
    isSupported,
    getPermissionStatus,
    showNotification
  } = useTaskNotifications();

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState({
    taskReminders: true,
    dueDateAlerts: true,
    courtSessionReminders: true,
    newTaskNotifications: true,
    taskCompletionNotifications: false,
    reminderInterval: 60, // minutes
    workingHours: {
      enabled: true,
      start: '09:00',
      end: '18:00'
    }
  });

  useEffect(() => {
    if (isSupported()) {
      setPermissionStatus(getPermissionStatus());
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []); // إزالة dependencies التي تتغير في كل render

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const handleWorkingHoursChange = (key: string, value: any) => {
    const newWorkingHours = { ...settings.workingHours, [key]: value };
    const newSettings = { ...settings, workingHours: newWorkingHours };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const testNotification = () => {
    showNotification(
      '🔔 اختبار الإشعارات',
      {
        body: 'تعمل الإشعارات بشكل صحيح! ستتلقى تنبيهات للمهام والمواعيد المهمة.',
        requireInteraction: false
      }
    );
  };

  if (!isSupported()) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <BellOff style={{ height: '24px', width: '24px', color: 'var(--color-error)' }} />
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
            الإشعارات غير مدعومة
          </h3>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          متصفحك لا يدعم الإشعارات. يُرجى استخدام متصفح حديث للاستفادة من هذه الميزة.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Bell style={{ height: '24px', width: '24px', color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
            إعدادات الإشعارات
          </h3>
        </div>

        {/* Permission Status */}
        <div style={{
          padding: '16px',
          backgroundColor: permissionStatus === 'granted' ? 'var(--color-success-light)' : 
                          permissionStatus === 'denied' ? 'var(--color-error-light)' : 'var(--color-warning-light)',
          border: `1px solid ${permissionStatus === 'granted' ? 'var(--color-success)' : 
                                permissionStatus === 'denied' ? 'var(--color-error)' : 'var(--color-warning)'}`,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: 0, marginBottom: '4px', fontSize: 'var(--font-size-base)' }}>
                {permissionStatus === 'granted' ? '✅ الإشعارات مفعلة' :
                 permissionStatus === 'denied' ? '❌ الإشعارات مرفوضة' : '⚠️ الإشعارات غير مفعلة'}
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {permissionStatus === 'granted' ? 'ستتلقى إشعارات للمهام والمواعيد المهمة' :
                 permissionStatus === 'denied' ? 'تم رفض الإشعارات. يُرجى تفعيلها من إعدادات المتصفح' : 
                 'اسمح بالإشعارات لتلقي التنبيهات المهمة'}
              </p>
            </div>
            
            {permissionStatus !== 'granted' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePermissionRequest}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer'
                }}
              >
                تفعيل الإشعارات
              </motion.button>
            )}

            {permissionStatus === 'granted' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={testNotification}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-secondary)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer'
                }}
              >
                اختبار الإشعار
              </motion.button>
            )}
          </div>
        </div>

        {permissionStatus === 'granted' && (
          <>
            {/* Notification Types */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                أنواع الإشعارات
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'taskReminders', label: 'تذكير بالمهام', description: 'تنبيهات للمهام المقررة' },
                  { key: 'dueDateAlerts', label: 'تنبيهات المواعيد النهائية', description: 'إشعارات عند اقتراب موعد انتهاء المهام' },
                  { key: 'courtSessionReminders', label: 'تذكير بجلسات المحكمة', description: 'تنبيهات قبل جلسات المحكمة' },
                  { key: 'newTaskNotifications', label: 'المهام الجديدة', description: 'إشعار عند تعيين مهام جديدة' },
                  { key: 'taskCompletionNotifications', label: 'إنجاز المهام', description: 'إشعار عند إنجاز المهام' }
                ].map((setting) => (
                  <div key={setting.key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px'
                  }}>
                    <div>
                      <h5 style={{ margin: 0, marginBottom: '2px', fontSize: 'var(--font-size-sm)' }}>
                        {setting.label}
                      </h5>
                      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {setting.description}
                      </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings[setting.key as keyof typeof settings] as boolean}
                        onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                        style={{ margin: 0, marginLeft: '8px' }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminder Interval */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                فترة التذكير
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px'
              }}>
                <Clock style={{ height: '20px', width: '20px', color: 'var(--color-text-secondary)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)' }}>تذكير كل</span>
                <select
                  value={settings.reminderInterval}
                  onChange={(e) => handleSettingChange('reminderInterval', parseInt(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={60}>ساعة واحدة</option>
                  <option value={120}>ساعتين</option>
                  <option value={240}>4 ساعات</option>
                </select>
              </div>
            </div>

            {/* Working Hours */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                ساعات العمل
              </h4>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>تقييد الإشعارات حسب ساعات العمل</span>
                  <input
                    type="checkbox"
                    checked={settings.workingHours.enabled}
                    onChange={(e) => handleWorkingHoursChange('enabled', e.target.checked)}
                  />
                </div>
                
                {settings.workingHours.enabled && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)' }}>من</span>
                      <input
                        type="time"
                        value={settings.workingHours.start}
                        onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)' }}>إلى</span>
                      <input
                        type="time"
                        value={settings.workingHours.end}
                        onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                        style={{
                          padding: '6px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PWA Instructions */}
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--color-info-light)',
              border: '1px solid var(--color-info)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Smartphone style={{ height: '20px', width: '20px', color: 'var(--color-info)', marginTop: '2px' }} />
                <div>
                  <h5 style={{ margin: 0, marginBottom: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                    تثبيت التطبيق على الجوال
                  </h5>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    لتلقي الإشعارات بشكل أفضل، يُنصح بتثبيت التطبيق على شاشتك الرئيسية. اضغط على "إضافة إلى الشاشة الرئيسية" في قائمة المتصفح.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;
