import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  Users,
  BookOpen,
  FileSearch,
  Edit3,
  Eye,
  Building2,
  Calendar,
  FileText,
  Gavel,
  Settings,
  FileDown,
  ExternalLink,
  StickyNote,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';
import { ActivityService } from '../services/activityService';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  onActivityAdded?: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'communication' | 'legal' | 'court' | 'administrative';
  color: string;
  requiresDescription: boolean;
  placeholderText?: string;
}

const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  onActivityAdded
}) => {
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickActions: QuickAction[] = [
    // التواصل
    {
      id: 'call_client',
      title: 'اتصال بالعميل',
      description: 'مكالمة هاتفية مع العميل',
      icon: <Phone size={18} />,
      category: 'communication',
      color: '#10b981',
      requiresDescription: false,
      placeholderText: 'تفاصيل المكالمة (اختياري)...'
    },
    {
      id: 'message_client',
      title: 'رسالة للعميل',
      description: 'واتساب أو رسالة نصية',
      icon: <MessageSquare size={18} />,
      category: 'communication',
      color: '#06b6d4',
      requiresDescription: false,
      placeholderText: 'محتوى الرسالة (اختياري)...'
    },
    {
      id: 'client_meeting',
      title: 'اجتماع مع العميل',
      description: 'لقاء شخصي أو عبر الإنترنت',
      icon: <Users size={18} />,
      category: 'communication',
      color: '#8b5cf6',
      requiresDescription: false,
      placeholderText: 'تفاصيل الاجتماع (اختياري)...'
    },
    {
      id: 'internal_consultation',
      title: 'استشارة داخلية',
      description: 'مناقشة مع زميل أو مدير',
      icon: <Users size={18} />,
      category: 'communication',
      color: '#f59e0b',
      requiresDescription: false,
      placeholderText: 'موضوع الاستشارة (اختياري)...'
    },

    // المتابعة القانونية
    {
      id: 'case_review',
      title: 'مراجعة ملف القضية',
      description: 'دراسة وتحليل تفاصيل القضية',
      icon: <BookOpen size={18} />,
      category: 'legal',
      color: '#3b82f6',
      requiresDescription: false,
      placeholderText: 'ما تم مراجعته (اختياري)...'
    },
    {
      id: 'legal_research',
      title: 'البحث القانوني',
      description: 'بحث في السوابق والقوانين',
      icon: <FileSearch size={18} />,
      category: 'legal',
      color: '#6366f1',
      requiresDescription: true,
      placeholderText: 'موضوع البحث ونتائجه...'
    },
    {
      id: 'prepare_pleading',
      title: 'إعداد مرافعة',
      description: 'كتابة أو تحضير مرافعة',
      icon: <Edit3 size={18} />,
      category: 'legal',
      color: '#ec4899',
      requiresDescription: false,
      placeholderText: 'نوع المرافعة وتفاصيلها (اختياري)...'
    },
    {
      id: 'document_review',
      title: 'مراجعة وثائق',
      description: 'فحص ومراجعة المستندات',
      icon: <Eye size={18} />,
      category: 'legal',
      color: '#84cc16',
      requiresDescription: false,
      placeholderText: 'الوثائق التي تم مراجعتها (اختياري)...'
    },

    // المحكمة
    {
      id: 'court_hearing',
      title: 'حضور جلسة',
      description: 'متابعة جلسة المحكمة',
      icon: <Building2 size={18} />,
      category: 'court',
      color: '#dc2626',
      requiresDescription: false,
      placeholderText: 'ما حدث في الجلسة (اختياري)...'
    },
    {
      id: 'hearing_postponed',
      title: 'تأجيل جلسة',
      description: 'إشعار أو طلب تأجيل',
      icon: <Calendar size={18} />,
      category: 'court',
      color: '#f97316',
      requiresDescription: true,
      placeholderText: 'سبب التأجيل والتاريخ الجديد...'
    },
    {
      id: 'submit_document',
      title: 'تقديم مذكرة',
      description: 'تقديم مرافعة أو طلب للمحكمة',
      icon: <FileText size={18} />,
      category: 'court',
      color: '#7c3aed',
      requiresDescription: true,
      placeholderText: 'نوع المذكرة وتفاصيلها...'
    },
    {
      id: 'receive_judgment',
      title: 'استلام حكم',
      description: 'استلام قرار المحكمة',
      icon: <Gavel size={18} />,
      category: 'court',
      color: '#059669',
      requiresDescription: true,
      placeholderText: 'تفاصيل الحكم...'
    },

    // الإدارية
    {
      id: 'update_status',
      title: 'تحديث حالة القضية',
      description: 'تغيير وضع أو مرحلة القضية',
      icon: <Settings size={18} />,
      category: 'administrative',
      color: '#6b7280',
      requiresDescription: true,
      placeholderText: 'الحالة الجديدة وسبب التغيير...'
    },
    {
      id: 'request_documents',
      title: 'طلب مستندات',
      description: 'طلب وثائق من العميل أو جهة أخرى',
      icon: <FileDown size={18} />,
      category: 'administrative',
      color: '#0891b2',
      requiresDescription: true,
      placeholderText: 'المستندات المطلوبة ومن أين...'
    },
    {
      id: 'external_followup',
      title: 'متابعة خارجية',
      description: 'تواصل مع جهة خارجية',
      icon: <ExternalLink size={18} />,
      category: 'administrative',
      color: '#be185d',
      requiresDescription: true,
      placeholderText: 'الجهة وموضوع المتابعة...'
    },
    {
      id: 'update_notes',
      title: 'تحديث الملاحظات',
      description: 'إضافة تطورات أو ملاحظات مهمة',
      icon: <StickyNote size={18} />,
      category: 'administrative',
      color: '#facc15',
      requiresDescription: true,
      placeholderText: 'الملاحظات والتطورات الجديدة...'
    }
  ];

  const categoryNames = {
    communication: 'التواصل',
    legal: 'المتابعة القانونية',
    court: 'المحكمة',
    administrative: 'الإدارية'
  };

  const groupedActions = quickActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const handleActionClick = (action: QuickAction) => {
    setSelectedAction(action);
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!selectedAction) return;
    if (selectedAction.requiresDescription && !description.trim()) return;

    setIsSubmitting(true);
    try {
      await ActivityService.createActivity({
        title: selectedAction.title,
        action: selectedAction.id,
        description: description.trim() || selectedAction.title,
        case_id: caseId,
        metadata: {
          action_type: 'quick_action',
          action_title: selectedAction.title,
          action_category: selectedAction.category
        }
      });
      setSelectedAction(null);
      setDescription('');
      onClose();
      if (onActivityAdded) onActivityAdded();
    } catch (error) {
      console.error('Error creating activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="notion-modal-overlay" style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }} onClick={onClose}>

        <motion.div
          className="notion-modal"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--dashboard-card, #ffffff)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--color-border)',
            direction: 'rtl'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--quiet-gray-100)',
              color: 'var(--law-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>إجراءات سريعة</h2>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{caseTitle}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--quiet-gray-100)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Dynamic Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {!selectedAction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {Object.entries(groupedActions).map(([category, actions]) => (
                  <div key={category}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-text-secondary)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                      paddingRight: '4px'
                    }}>
                      {categoryNames[category as keyof typeof categoryNames]}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '8px'
                    }}>
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleActionClick(action)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid transparent',
                            background: 'transparent',
                            textAlign: 'right',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          className="quick-action-btn"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--quiet-gray-50)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            backgroundColor: `${action.color}15`,
                            color: action.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {action.icon}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{action.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* Selected Action Breadcrumb */}
                <button
                  onClick={() => setSelectedAction(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={14} />
                  العودة للقائمة
                </button>

                {/* Notion Style Property List */}
                <div style={{
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  padding: '1px'
                }}>
                  {/* Property: Action */}
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px', padding: '0 12px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '120px', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={14} /> الإجراء
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: `${selectedAction.color}15`,
                        color: selectedAction.color,
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {selectedAction.icon}
                        {selectedAction.title}
                      </div>
                    </div>
                  </div>

                  {/* Property: Category */}
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '40px', padding: '0 12px' }}>
                    <div style={{ width: '120px', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={14} /> التصنيف
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                      {categoryNames[selectedAction.category]}
                    </div>
                  </div>
                </div>

                {/* Big Input Area */}
                <div style={{ marginTop: '12px' }}>
                  <textarea
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={selectedAction.placeholderText || 'أضف تفاصيل الإجراء هنا...'}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '15px',
                      color: 'var(--color-text)',
                      resize: 'none',
                      outline: 'none',
                      lineHeight: '1.6'
                    }}
                  />
                  {selectedAction.requiresDescription && !description.trim() && (
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px' }}>هذا الإجراء يتطلب وصفاً توضيحياً</div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--quiet-gray-50)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              onClick={selectedAction ? () => setSelectedAction(null) : onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--dashboard-card)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>
            {selectedAction && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedAction.requiresDescription && !description.trim())}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--law-navy)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: (isSubmitting || (selectedAction.requiresDescription && !description.trim())) ? 0.6 : 1
                }}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {isSubmitting ? 'جاري الحفظ...' : 'تسجيل الإجراء'}
              </button>
            )}
          </div>

          <style>{`
            .animate-spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .quick-action-btn:hover span {
              color: var(--law-navy) !important;
            }
          `}</style>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuickActionsModal;
