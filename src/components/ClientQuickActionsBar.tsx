import React from 'react';
import { ListTodo, MessageCircle, FileUp, MessageSquare, FileOutput } from 'lucide-react';

/**
 * شريط عمل العميل الموحّد (ERP): إجراءات فعلية تفتح مودالات داخل الصفحة —
 * لا أزرار تنقّل — وعلى الطرف المقابل مؤشرات القضايا/العقود مضغوطة في السطر نفسه.
 */
interface ClientWorkbarStats {
  total: number;
  active: number;
  pending: number;
  closed: number;
  contractsValue: string;
}

interface ClientQuickActionsBarProps {
  clientPhone: string | null;
  stats: ClientWorkbarStats;
  onSendWhatsApp: () => void;
  /** غير ممرَّر = ميزة الصادر غير مفعّلة للمكتب فلا يظهر الزر */
  onComposeLetter?: () => void;
  onLogCommunication: () => void;
  onCreateTask: () => void;
  onUploadDocument: () => void;
}

const ClientQuickActionsBar: React.FC<ClientQuickActionsBarProps> = ({
  clientPhone,
  stats,
  onSendWhatsApp,
  onComposeLetter,
  onLogCommunication,
  onCreateTask,
  onUploadDocument,
}) => (
  <div className="client-workbar">
    <div className="client-workbar__actions">
      <ActionBtn
        icon={<MessageCircle size={14} />}
        label="واتساب"
        onClick={onSendWhatsApp}
        accent="success"
        disabled={!clientPhone}
        title={!clientPhone ? 'لا يوجد جوال مسجل' : 'إرسال رسالة من داخل النظام — تُدوَّن في التواصل'}
      />
      {onComposeLetter && (
        <ActionBtn
          icon={<FileOutput size={14} />}
          label="صادر جديد"
          onClick={onComposeLetter}
          accent="primary"
          title="خطاب PDF بالكليشة يُرسَل للعميل ويُسجَّل في الصادر"
        />
      )}
      <ActionBtn icon={<MessageSquare size={14} />} label="تسجيل تواصل" onClick={onLogCommunication} />
      <ActionBtn icon={<ListTodo size={14} />} label="مهمة جديدة" onClick={onCreateTask} />
      <ActionBtn icon={<FileUp size={14} />} label="رفع مستند" onClick={onUploadDocument} />
    </div>

    <div className="client-workbar__stats">
      <Stat value={String(stats.total)} label="إجمالي" tone="primary" />
      <Stat value={String(stats.active)} label="نشطة" tone="info" />
      <Stat value={String(stats.pending)} label="قيد النظر" tone="warning" />
      <Stat value={String(stats.closed)} label="مغلقة" tone="muted" />
      <Stat value={stats.contractsValue} label="عقود (SAR)" tone="success" wide />
    </div>
  </div>
);

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: 'primary' | 'success';
  disabled?: boolean;
  title?: string;
}> = ({ icon, label, onClick, accent, disabled, title }) => (
  <button
    type="button"
    className={`client-quick-action ${accent ? `client-quick-action--${accent}` : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Stat: React.FC<{ value: string; label: string; tone: 'primary' | 'info' | 'warning' | 'muted' | 'success'; wide?: boolean }> = ({ value, label, tone, wide }) => (
  <div className={`client-workbar-stat client-workbar-stat--${tone} ${wide ? 'client-workbar-stat--wide' : ''}`}>
    <span className="client-workbar-stat__value">{value}</span>
    <span className="client-workbar-stat__label">{label}</span>
  </div>
);

export default ClientQuickActionsBar;
