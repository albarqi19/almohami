import React from 'react';
import { Plus, ListTodo, Calendar, MessageCircle, FileUp, FileSignature, MessageSquare } from 'lucide-react';

interface ClientQuickActionsBarProps {
  clientPhone: string | null;
  onCreateCase: () => void;
  onCreateTask: () => void;
  onCreateAppointment: () => void;
  onUploadDocument: () => void;
  onCreateWekala: () => void;
  onLogCommunication: () => void;
}

const ClientQuickActionsBar: React.FC<ClientQuickActionsBarProps> = ({
  clientPhone,
  onCreateCase,
  onCreateTask,
  onCreateAppointment,
  onUploadDocument,
  onCreateWekala,
  onLogCommunication,
}) => {
  const handleWhatsApp = () => {
    if (!clientPhone) return;
    // Saudi convention: 05xxxxxxxx → 9665xxxxxxxx
    const digits = clientPhone.replace(/\D/g, '');
    const intl = digits.startsWith('0') ? `966${digits.slice(1)}` : digits;
    window.open(`https://wa.me/${intl}`, '_blank', 'noopener');
  };

  return (
    <div className="client-quick-actions">
      <ActionBtn icon={<Plus size={14} />} label="قضية جديدة" onClick={onCreateCase} accent="primary" />
      <ActionBtn icon={<ListTodo size={14} />} label="مهمة جديدة" onClick={onCreateTask} />
      <ActionBtn icon={<Calendar size={14} />} label="موعد جديد" onClick={onCreateAppointment} />
      <ActionBtn
        icon={<MessageCircle size={14} />}
        label="واتساب"
        onClick={handleWhatsApp}
        accent="success"
        disabled={!clientPhone}
        title={!clientPhone ? 'لا يوجد جوال مسجل' : `إرسال للعميل عبر واتساب`}
      />
      <ActionBtn icon={<FileUp size={14} />} label="رفع مستند" onClick={onUploadDocument} />
      <ActionBtn icon={<FileSignature size={14} />} label="إضافة وكالة" onClick={onCreateWekala} />
      <ActionBtn icon={<MessageSquare size={14} />} label="تسجيل تواصل" onClick={onLogCommunication} />
    </div>
  );
};

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

export default ClientQuickActionsBar;
