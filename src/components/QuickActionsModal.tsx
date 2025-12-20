import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Loader2
} from 'lucide-react';
import Modal from './Modal';
import { ActivityService } from '../services/activityService';

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

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
      icon: <Phone size={20} />,
      category: 'communication',
      color: '#10b981',
      requiresDescription: false,
      placeholderText: 'تفاصيل المكالمة (اختياري)...'
    },
    {
      id: 'message_client',
      title: 'رسالة للعميل',
      description: 'واتساب أو رسالة نصية',
      icon: <MessageSquare size={20} />,
      category: 'communication',
      color: '#06b6d4',
      requiresDescription: false,
      placeholderText: 'محتوى الرسالة (اختياري)...'
    },
    {
      id: 'client_meeting',
      title: 'اجتماع مع العميل',
      description: 'لقاء شخصي أو عبر الإنترنت',
      icon: <Users size={20} />,
      category: 'communication',
      color: '#8b5cf6',
      requiresDescription: false,
      placeholderText: 'تفاصيل الاجتماع (اختياري)...'
    },
    {
      id: 'internal_consultation',
      title: 'استشارة داخلية',
      description: 'مناقشة مع زميل أو مدير',
      icon: <Users size={20} />,
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
      icon: <BookOpen size={20} />,
      category: 'legal',
      color: '#3b82f6',
      requiresDescription: false,
      placeholderText: 'ما تم مراجعته (اختياري)...'
    },
    {
      id: 'legal_research',
      title: 'البحث القانوني',
      description: 'بحث في السوابق والقوانين',
      icon: <FileSearch size={20} />,
      category: 'legal',
      color: '#6366f1',
      requiresDescription: true,
      placeholderText: 'موضوع البحث ونتائجه...'
    },
    {
      id: 'prepare_pleading',
      title: 'إعداد مرافعة',
      description: 'كتابة أو تحضير مرافعة',
      icon: <Edit3 size={20} />,
      category: 'legal',
      color: '#ec4899',
      requiresDescription: false,
      placeholderText: 'نوع المرافعة وتفاصيلها (اختياري)...'
    },
    {
      id: 'document_review',
      title: 'مراجعة وثائق',
      description: 'فحص ومراجعة المستندات',
      icon: <Eye size={20} />,
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
      icon: <Building2 size={20} />,
      category: 'court',
      color: '#dc2626',
      requiresDescription: false,
      placeholderText: 'ما حدث في الجلسة (اختياري)...'
    },
    {
      id: 'hearing_postponed',
      title: 'تأجيل جلسة',
      description: 'إشعار أو طلب تأجيل',
      icon: <Calendar size={20} />,
      category: 'court',
      color: '#f97316',
      requiresDescription: true,
      placeholderText: 'سبب التأجيل والتاريخ الجديد...'
    },
    {
      id: 'submit_document',
      title: 'تقديم مذكرة',
      description: 'تقديم مرافعة أو طلب للمحكمة',
      icon: <FileText size={20} />,
      category: 'court',
      color: '#7c3aed',
      requiresDescription: true,
      placeholderText: 'نوع المذكرة وتفاصيلها...'
    },
    {
      id: 'receive_judgment',
      title: 'استلام حكم',
      description: 'استلام قرار المحكمة',
      icon: <Gavel size={20} />,
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
      icon: <Settings size={20} />,
      category: 'administrative',
      color: '#6b7280',
      requiresDescription: true,
      placeholderText: 'الحالة الجديدة وسبب التغيير...'
    },
    {
      id: 'request_documents',
      title: 'طلب مستندات',
      description: 'طلب وثائق من العميل أو جهة أخرى',
      icon: <FileDown size={20} />,
      category: 'administrative',
      color: '#0891b2',
      requiresDescription: true,
      placeholderText: 'المستندات المطلوبة ومن أين...'
    },
    {
      id: 'external_followup',
      title: 'متابعة خارجية',
      description: 'تواصل مع جهة خارجية',
      icon: <ExternalLink size={20} />,
      category: 'administrative',
      color: '#be185d',
      requiresDescription: true,
      placeholderText: 'الجهة وموضوع المتابعة...'
    },
    {
      id: 'update_notes',
      title: 'تحديث الملاحظات',
      description: 'إضافة تطورات أو ملاحظات مهمة',
      icon: <StickyNote size={20} />,
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

  const categoryColors = {
    communication: '#10b981',
    legal: '#3b82f6',
    court: '#dc2626',
    administrative: '#6b7280'
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
    
    if (selectedAction.requiresDescription && !description.trim()) {
      return;
    }

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

      // Reset and close
      setSelectedAction(null);
      setDescription('');
      onClose();
      
      // Notify parent component
      if (onActivityAdded) {
        onActivityAdded();
      }
      
    } catch (error) {
      console.error('Error creating activity:', error);
      // Handle error - you might want to show a toast or error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setDescription('');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="الأجراءات السريعة"
      size="lg"
    >
      <div style={{
        maxHeight: '70vh',
        overflow: 'auto'
      }}>
        {!selectedAction ? (
          // Main actions grid
          <div>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              اختر إجراء سريع لتسجيله في الجدول الزمني للقضية: <strong>{caseTitle}</strong>
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {Object.entries(groupedActions).map(([category, actions]) => (
                <div key={category}>
                  <h3 style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: categoryColors[category as keyof typeof categoryColors],
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '16px',
                      backgroundColor: categoryColors[category as keyof typeof categoryColors],
                      borderRadius: '2px'
                    }} />
                    {categoryNames[category as keyof typeof categoryNames]}
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    {actions.map((action) => (
                      <motion.button
                        key={action.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleActionClick(action)}
                        style={{
                          padding: '16px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-background)',
                          cursor: 'pointer',
                          textAlign: 'right',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = action.color;
                          e.currentTarget.style.backgroundColor = `${action.color}10`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.backgroundColor = 'var(--color-background)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%'
                        }}>
                          <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: `${action.color}20`,
                            color: action.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {action.icon}
                          </div>
                          <h4 style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--color-text)',
                            margin: 0
                          }}>
                            {action.title}
                          </h4>
                        </div>
                        <p style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {action.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Selected action form
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: `${selectedAction.color}10`,
              borderRadius: '8px',
              border: `1px solid ${selectedAction.color}30`
            }}>
              <div style={{
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: selectedAction.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedAction.icon}
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  {selectedAction.title}
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  margin: 0
                }}>
                  {selectedAction.description}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '8px'
              }}>
                {selectedAction.requiresDescription ? 'تفاصيل الإجراء *' : 'تفاصيل الإجراء (اختياري)'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={selectedAction.placeholderText}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  resize: 'vertical',
                  minHeight: '100px',
                  fontFamily: 'inherit'
                }}
                disabled={isSubmitting}
              />
              {selectedAction.requiresDescription && (
                <p style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  margin: '4px 0 0 0'
                }}>
                  هذا الحقل مطلوب
                </p>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedAction.requiresDescription && !description.trim())}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: selectedAction.color,
                  color: 'white',
                  fontSize: 'var(--font-size-sm)',
                  cursor: (isSubmitting || (selectedAction.requiresDescription && !description.trim())) 
                    ? 'not-allowed' 
                    : 'pointer',
                  opacity: (isSubmitting || (selectedAction.requiresDescription && !description.trim())) 
                    ? 0.6 
                    : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting && (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                )}
                {isSubmitting ? 'جارٍ الحفظ...' : 'تسجيل الإجراء'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuickActionsModal;
