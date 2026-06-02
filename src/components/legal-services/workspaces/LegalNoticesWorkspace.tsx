import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, User, Edit2, FileText, Send, CheckCircle, MessageSquare,
  Clock, DollarSign, Calendar, Mail, Phone, MapPin, Hash,
  AlertTriangle, Plus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import type { WorkspaceProps, MicroStatItem } from './types';
import MicroStatsBar from './MicroStatsBar';
import ContextualAlert from './ContextualAlert';
import LegalRichEditorField from '../LegalRichEditorField';
import LegalRichText from '../LegalRichText';

// ── تسميات عربية ──

const NOTICE_TYPE_LABELS: Record<string, string> = {
  payment_demand: 'مطالبة مالية',
  contract_termination: 'فسخ عقد',
  contract_breach: 'إخلال بالعقد',
  eviction: 'إخلاء عقار',
  cease_desist: 'كف وامتناع',
  warranty_claim: 'مطالبة ضمان',
  debt_collection: 'تحصيل ديون',
  general_warning: 'تحذير عام',
  response_to_notice: 'رد على إنذار',
  other: 'أخرى',
};

const RECIPIENT_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد',
  company: 'شركة',
  government: 'جهة حكومية',
};

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  spl: 'البريد السعودي',
  registered_mail: 'بريد مسجل',
  courier: 'شركة شحن',
  email: 'بريد إلكتروني',
  notary: 'كاتب عدل',
  whatsapp: 'واتساب',
  hand_delivery: 'تسليم يدوي',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getDaysRemaining(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return '—';
  return `${Number(amount).toLocaleString('ar-SA')} ر.س`;
}

// ── المكون الرئيسي ──

const LegalNoticesWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.legal_notice_detail;

  // حالات التعديل
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [recipientData, setRecipientData] = useState<Record<string, any>>({});
  const [recipientLoading, setRecipientLoading] = useState(false);

  const [editingContent, setEditingContent] = useState(false);
  const [contentData, setContentData] = useState<Record<string, any>>({});
  const [contentLoading, setContentLoading] = useState(false);

  const [showSendForm, setShowSendForm] = useState(false);
  const [sendData, setSendData] = useState<Record<string, any>>({});
  const [sendLoading, setSendLoading] = useState(false);

  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryData, setDeliveryData] = useState<Record<string, any>>({});
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [responseLoading, setResponseLoading] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);

  // حساب أيام المهلة
  const daysRemaining = useMemo(() => getDaysRemaining(detail?.response_deadline_date), [detail?.response_deadline_date]);

  // حالة فارغة
  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <Bell size={32} />
        <p>لا توجد تفاصيل للإنذار</p>
      </div>
    );
  }

  // ── معالجات الحفظ ──

  const handleSaveRecipient = async () => {
    setRecipientLoading(true);
    try {
      const res = await LegalServiceService.updateNoticeRecipient(service.id, recipientData);
      if (res.success) {
        toast.success('تم حفظ بيانات المرسل إليه');
        setEditingRecipient(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setRecipientLoading(false);
    }
  };

  const handleSaveContent = async () => {
    setContentLoading(true);
    try {
      const res = await LegalServiceService.updateNoticeContent(service.id, contentData);
      if (res.success) {
        toast.success('تم حفظ محتوى الإنذار');
        setEditingContent(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setContentLoading(false);
    }
  };

  // حفظ الحقول النصّية الغنيّة عبر updateNoticeContent مع الحفاظ على بقية حقول المحتوى
  const handleSaveNoticeContentHtml = async (html: string) => {
    const res = await LegalServiceService.updateNoticeContent(service.id, {
      notice_summary: detail.notice_summary || '',
      notice_content: html,
      demanded_amount: detail.demanded_amount ?? '',
      demanded_actions: detail.demanded_actions || '',
      response_deadline_days: detail.response_deadline_days ?? '',
      response_deadline_date: detail.response_deadline_date || '',
      template_used: detail.template_used || '',
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ نص الإنذار');
    await refreshService();
  };

  const handleSaveDemandedActionsHtml = async (html: string) => {
    const res = await LegalServiceService.updateNoticeContent(service.id, {
      notice_summary: detail.notice_summary || '',
      notice_content: detail.notice_content || '',
      demanded_amount: detail.demanded_amount ?? '',
      demanded_actions: html,
      response_deadline_days: detail.response_deadline_days ?? '',
      response_deadline_date: detail.response_deadline_date || '',
      template_used: detail.template_used || '',
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ الإجراءات المطلوبة');
    await refreshService();
  };

  const handleSaveResponseContentHtml = async (html: string) => {
    const res = await LegalServiceService.recordNoticeResponse(service.id, {
      response_received_date: detail.response_received_date || '',
      response_content: html,
      response_document_path: detail.response_document_path || '',
    });
    if (!res?.success) throw new Error(res?.message || 'تعذّر حفظ نص الرد');
    await refreshService();
  };

  const handleRecordSend = async () => {
    setSendLoading(true);
    try {
      const res = await LegalServiceService.recordNoticeSend(service.id, sendData);
      if (res.success) {
        toast.success('تم تسجيل إرسال الإنذار');
        setShowSendForm(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setSendLoading(false);
    }
  };

  const handleRecordDelivery = async () => {
    setDeliveryLoading(true);
    try {
      const res = await LegalServiceService.recordNoticeDelivery(service.id, deliveryData);
      if (res.success) {
        toast.success('تم تسجيل تسليم الإنذار');
        setShowDeliveryForm(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleRecordResponse = async () => {
    setResponseLoading(true);
    try {
      const res = await LegalServiceService.recordNoticeResponse(service.id, responseData);
      if (res.success) {
        toast.success('تم تسجيل الرد على الإنذار');
        setShowResponseForm(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setResponseLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfLoading(true);
    try {
      const res = await LegalServiceService.generateNoticePdf(service.id);
      if (res.success) {
        toast.success('تم توليد ملف PDF');
      } else {
        toast.error(res.message || 'هذه الميزة قيد التطوير');
      }
    } catch {
      toast.error('هذه الميزة قيد التطوير');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── حالة التسليم للـ Timeline ──
  const deliverySteps = [
    { key: 'sent', label: 'تم الإرسال', date: detail.sent_date, done: !!detail.sent_date, icon: Send },
    { key: 'delivered', label: 'تم التسليم', date: detail.delivered_date, done: !!detail.delivered_date, icon: CheckCircle },
    { key: 'response', label: 'ورد رد', date: detail.response_received_date, done: !!detail.response_received_date, icon: MessageSquare },
  ];

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        {
          label: 'نوع الإنذار',
          value: NOTICE_TYPE_LABELS[detail.notice_type || ''] || '—',
          icon: Bell,
          color: 'blue',
        },
        ...(detail.demanded_amount ? [{
          label: 'المبلغ المطالب',
          value: formatCurrency(detail.demanded_amount),
          icon: DollarSign as any,
          color: 'purple' as const,
        }] : []),
        ...(daysRemaining !== null ? [{
          label: 'مهلة الرد',
          value: daysRemaining > 0 ? `باقي ${daysRemaining} يوم` : daysRemaining === 0 ? 'اليوم' : `انتهت منذ ${Math.abs(daysRemaining)} يوم`,
          icon: Clock as any,
          color: (daysRemaining <= 3 ? 'red' : daysRemaining <= 7 ? 'amber' : 'green') as MicroStatItem['color'],
        }] : []),
        {
          label: 'حالة التسليم',
          value: detail.response_received_date ? 'ورد رد' : detail.delivered_date ? 'تم التسليم' : detail.sent_date ? 'تم الإرسال' : 'لم يُرسل',
          icon: Send,
          color: detail.response_received_date ? 'green' : detail.sent_date ? 'amber' : 'gray',
        },
      ]} />

      {/* ── تنبيه المهلة ── */}
      {daysRemaining !== null && daysRemaining <= 7 && !detail.response_received_date && (
        <ContextualAlert
          type={daysRemaining <= 0 ? 'danger' : 'warning'}
          title={daysRemaining <= 0 ? 'انتهت مهلة الرد' : 'مهلة الرد قاربت على الانتهاء'}
          message={daysRemaining <= 0
            ? `انتهت المهلة منذ ${Math.abs(daysRemaining)} يوم — يمكنك تصعيد الأمر لقضية`
            : `باقي ${daysRemaining} يوم على انتهاء مهلة الرد`
          }
          actionLabel="تسجيل رد"
          onAction={() => setShowResponseForm(true)}
        />
      )}

      {/* ── بطاقة بيانات المرسل إليه ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <User size={15} />
            بيانات المرسل إليه
          </div>
          <button
            className="lsd-card__action"
            onClick={() => {
              setEditingRecipient(true);
              setRecipientData({
                recipient_name: detail.recipient_name || '',
                recipient_type: detail.recipient_type || '',
                recipient_id_number: detail.recipient_id_number || '',
                recipient_address: detail.recipient_address || '',
                recipient_phone: detail.recipient_phone || '',
                recipient_email: detail.recipient_email || '',
              });
            }}
          >
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingRecipient ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الاسم</label>
                  <input
                    className="lsd-form-input"
                    value={recipientData.recipient_name || ''}
                    onChange={e => setRecipientData({ ...recipientData, recipient_name: e.target.value })}
                    placeholder="اسم المرسل إليه"
                  />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">النوع</label>
                  <select
                    className="lsd-form-input"
                    value={recipientData.recipient_type || ''}
                    onChange={e => setRecipientData({ ...recipientData, recipient_type: e.target.value })}
                  >
                    <option value="">اختر النوع</option>
                    <option value="individual">فرد</option>
                    <option value="company">شركة</option>
                    <option value="government">جهة حكومية</option>
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">رقم الهوية / السجل</label>
                  <input
                    className="lsd-form-input"
                    value={recipientData.recipient_id_number || ''}
                    onChange={e => setRecipientData({ ...recipientData, recipient_id_number: e.target.value })}
                    placeholder="رقم الهوية أو السجل التجاري"
                  />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الهاتف</label>
                  <input
                    className="lsd-form-input"
                    value={recipientData.recipient_phone || ''}
                    onChange={e => setRecipientData({ ...recipientData, recipient_phone: e.target.value })}
                    placeholder="رقم الهاتف"
                    dir="ltr"
                  />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">البريد الإلكتروني</label>
                  <input
                    className="lsd-form-input"
                    value={recipientData.recipient_email || ''}
                    onChange={e => setRecipientData({ ...recipientData, recipient_email: e.target.value })}
                    placeholder="البريد الإلكتروني"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="lsd-form-group" style={{ marginTop: 8 }}>
                <label className="lsd-form-label">العنوان</label>
                <textarea
                  className="lsd-form-textarea"
                  rows={2}
                  value={recipientData.recipient_address || ''}
                  onChange={e => setRecipientData({ ...recipientData, recipient_address: e.target.value })}
                  placeholder="العنوان الكامل"
                />
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingRecipient(false)}>إلغاء</button>
                <button
                  className="lsd-header-btn lsd-header-btn--primary"
                  onClick={handleSaveRecipient}
                  disabled={recipientLoading}
                >
                  {recipientLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : detail.recipient_name ? (
            <div className="lsd-info-grid">
              <div className="lsd-info-item">
                <div className="lsd-info-item__icon"><User size={14} /></div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">الاسم</div>
                  <div className="lsd-info-item__value">{detail.recipient_name}</div>
                </div>
              </div>
              {detail.recipient_type && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Hash size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">النوع</div>
                    <div className="lsd-info-item__value">{RECIPIENT_TYPE_LABELS[detail.recipient_type] || detail.recipient_type}</div>
                  </div>
                </div>
              )}
              {detail.recipient_id_number && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Hash size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">رقم الهوية / السجل</div>
                    <div className="lsd-info-item__value">{detail.recipient_id_number}</div>
                  </div>
                </div>
              )}
              {detail.recipient_phone && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Phone size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">الهاتف</div>
                    <div className="lsd-info-item__value" dir="ltr">{detail.recipient_phone}</div>
                  </div>
                </div>
              )}
              {detail.recipient_email && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Mail size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">البريد الإلكتروني</div>
                    <div className="lsd-info-item__value" dir="ltr">{detail.recipient_email}</div>
                  </div>
                </div>
              )}
              {detail.recipient_address && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><MapPin size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">العنوان</div>
                    <div className="lsd-info-item__value">{detail.recipient_address}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="lsd-empty-state-small">
              <User size={22} />
              <span>لم تُضف بيانات المرسل إليه بعد</span>
              <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => { setEditingRecipient(true); setRecipientData({}); }}>
                <Plus size={13} /> إضافة البيانات
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── بطاقة بيانات الإنذار (الحقول المنظَّمة) ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <FileText size={15} />
            بيانات الإنذار
          </div>
          <button
            className="lsd-card__action"
            onClick={() => {
              setEditingContent(true);
              setContentData({
                notice_summary: detail.notice_summary || '',
                demanded_amount: detail.demanded_amount || '',
                response_deadline_days: detail.response_deadline_days || '',
                response_deadline_date: detail.response_deadline_date || '',
              });
            }}
          >
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingContent ? (
            <div>
              <div className="lsd-form-group">
                <label className="lsd-form-label">ملخص الإنذار</label>
                <textarea
                  className="lsd-form-textarea"
                  rows={3}
                  value={contentData.notice_summary || ''}
                  onChange={e => setContentData({ ...contentData, notice_summary: e.target.value })}
                  placeholder="ملخص مختصر للإنذار..."
                />
              </div>
              <div className="lsd-info-grid" style={{ marginTop: 8 }}>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">المبلغ المطالب به</label>
                  <input
                    className="lsd-form-input"
                    type="number"
                    value={contentData.demanded_amount || ''}
                    onChange={e => setContentData({ ...contentData, demanded_amount: e.target.value })}
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">مهلة الرد (بالأيام)</label>
                  <input
                    className="lsd-form-input"
                    type="number"
                    value={contentData.response_deadline_days || ''}
                    onChange={e => setContentData({ ...contentData, response_deadline_days: e.target.value })}
                    placeholder="مثال: 15"
                    dir="ltr"
                  />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">تاريخ انتهاء المهلة</label>
                  <input
                    className="lsd-form-input"
                    type="date"
                    value={contentData.response_deadline_date || ''}
                    onChange={e => setContentData({ ...contentData, response_deadline_date: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingContent(false)}>إلغاء</button>
                <button
                  className="lsd-header-btn lsd-header-btn--primary"
                  onClick={handleSaveContent}
                  disabled={contentLoading}
                >
                  {contentLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : detail.notice_summary || detail.demanded_amount || detail.response_deadline_days || detail.response_deadline_date ? (
            <div>
              {detail.notice_summary && (
                <div className="lsd-notes-section">
                  <div className="lsd-notes-section__label">الملخص</div>
                  <p className="lsd-description-text">{detail.notice_summary}</p>
                </div>
              )}
              <div className="lsd-info-grid" style={{ marginTop: detail.notice_summary ? 12 : 0 }}>
                {detail.demanded_amount && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><DollarSign size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">المبلغ المطالب به</div>
                      <div className="lsd-info-item__value">{formatCurrency(detail.demanded_amount)}</div>
                    </div>
                  </div>
                )}
                {detail.response_deadline_days && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Clock size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">مهلة الرد</div>
                      <div className="lsd-info-item__value">{detail.response_deadline_days} يوم</div>
                    </div>
                  </div>
                )}
                {detail.response_deadline_date && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Calendar size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">تاريخ انتهاء المهلة</div>
                      <div className="lsd-info-item__value">{formatDate(detail.response_deadline_date)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lsd-empty-state-small">
              <FileText size={22} />
              <span>لم تُضف بيانات الإنذار بعد</span>
              <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => { setEditingContent(true); setContentData({}); }}>
                <Plus size={13} /> إضافة البيانات
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── نص الإنذار الكامل (محرّر غني) ── */}
      <LegalRichEditorField
        label="نص الإنذار الكامل"
        icon={FileText}
        value={detail.notice_content}
        onSave={handleSaveNoticeContentHtml}
        placeholder="اكتب نص الإنذار هنا..."
        emptyText="لم يُكتب نص الإنذار بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ نص الإنذار"
      />

      {/* ── الإجراءات المطلوبة (محرّر غني) ── */}
      <LegalRichEditorField
        label="الإجراءات المطلوبة"
        icon={AlertTriangle}
        value={detail.demanded_actions}
        onSave={handleSaveDemandedActionsHtml}
        description="الإجراءات المطلوب من المرسل إليه اتخاذها"
        placeholder="مثال: سداد المبلغ المستحق خلال المهلة المحددة..."
        emptyText="لم تُحدَّد الإجراءات المطلوبة بعد"
        successMessage="تم حفظ الإجراءات المطلوبة"
        minHeight="160px"
      />

      {/* ── بطاقة مسار التسليم (Timeline) ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Send size={15} />
            مسار التسليم
          </div>
        </div>
        <div className="lsd-card__content">
          {/* Timeline أفقي */}
          <div className="lsd-horizontal-timeline">
            {deliverySteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.key}>
                  <div
                    className={`lsd-ht-node ${step.done ? 'lsd-ht-node--done' : ''}`}
                    onClick={() => {
                      if (step.key === 'sent' && !step.done) setShowSendForm(true);
                      if (step.key === 'delivered' && !step.done && detail.sent_date) setShowDeliveryForm(true);
                      if (step.key === 'response' && !step.done && detail.delivered_date) setShowResponseForm(true);
                    }}
                    style={{ cursor: step.done ? 'default' : 'pointer' }}
                    title={step.done ? `${step.label}: ${formatDate(step.date)}` : `انقر لتسجيل ${step.label}`}
                  >
                    <div className="lsd-ht-node__circle">
                      <StepIcon size={14} />
                    </div>
                    <div className="lsd-ht-node__label">{step.label}</div>
                    {step.date && <div className="lsd-ht-node__date">{formatDate(step.date)}</div>}
                  </div>
                  {idx < deliverySteps.length - 1 && (
                    <div className={`lsd-ht-line ${step.done ? 'lsd-ht-line--done' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* تفاصيل طريقة التسليم */}
          {detail.delivery_method && (
            <div className="lsd-info-grid" style={{ marginTop: 16 }}>
              <div className="lsd-info-item">
                <div className="lsd-info-item__icon"><Send size={14} /></div>
                <div className="lsd-info-item__body">
                  <div className="lsd-info-item__label">طريقة التسليم</div>
                  <div className="lsd-info-item__value">{DELIVERY_METHOD_LABELS[detail.delivery_method] || detail.delivery_method}</div>
                </div>
              </div>
              {detail.tracking_number && (
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><Hash size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">رقم التتبع</div>
                    <div className="lsd-info-item__value" dir="ltr">{detail.tracking_number}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* نماذج التسجيل */}
          <AnimatePresence>
            {showSendForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 16 }}
              >
                <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>تسجيل إرسال الإنذار</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">طريقة التسليم</label>
                      <select
                        className="lsd-form-input"
                        value={sendData.delivery_method || ''}
                        onChange={e => setSendData({ ...sendData, delivery_method: e.target.value })}
                      >
                        <option value="">اختر الطريقة</option>
                        {Object.entries(DELIVERY_METHOD_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">تاريخ الإرسال</label>
                      <input
                        className="lsd-form-input"
                        type="date"
                        value={sendData.sent_date || ''}
                        onChange={e => setSendData({ ...sendData, sent_date: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">رقم التتبع</label>
                      <input
                        className="lsd-form-input"
                        value={sendData.tracking_number || ''}
                        onChange={e => setSendData({ ...sendData, tracking_number: e.target.value })}
                        placeholder="اختياري"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => setShowSendForm(false)}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleRecordSend} disabled={sendLoading}>
                      {sendLoading ? 'جارٍ...' : 'تسجيل الإرسال'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {showDeliveryForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 16 }}
              >
                <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>تسجيل تسليم الإنذار</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">تاريخ التسليم</label>
                      <input
                        className="lsd-form-input"
                        type="date"
                        value={deliveryData.delivered_date || ''}
                        onChange={e => setDeliveryData({ ...deliveryData, delivered_date: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">إثبات التسليم (رابط)</label>
                      <input
                        className="lsd-form-input"
                        value={deliveryData.delivery_proof_path || ''}
                        onChange={e => setDeliveryData({ ...deliveryData, delivery_proof_path: e.target.value })}
                        placeholder="رابط ملف الإثبات"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => setShowDeliveryForm(false)}>إلغاء</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleRecordDelivery} disabled={deliveryLoading}>
                      {deliveryLoading ? 'جارٍ...' : 'تسجيل التسليم'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {showResponseForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 16 }}
              >
                <div style={{ padding: '12px', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>تسجيل الرد على الإنذار</h4>
                  <div className="lsd-form-group">
                    <label className="lsd-form-label">تاريخ الرد</label>
                    <input
                      className="lsd-form-input"
                      type="date"
                      value={responseData.response_received_date || ''}
                      onChange={e => setResponseData({ ...responseData, response_received_date: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}>
                    <span className="lsd-form-label" style={{ display: 'block', marginBottom: 6 }}>محتوى الرد</span>
                    <LegalRichEditorField
                      label="نص الرد"
                      icon={MessageSquare}
                      value={detail.response_content}
                      onSave={handleSaveResponseContentHtml}
                      placeholder="اكتب محتوى الرد الوارد..."
                      emptyText="لم يُسجَّل نص الرد بعد"
                      successMessage="تم حفظ نص الرد"
                      minHeight="160px"
                    />
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => setShowResponseForm(false)}>إغلاق</button>
                    <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleRecordResponse} disabled={responseLoading}>
                      {responseLoading ? 'جارٍ...' : 'حفظ تاريخ الرد'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* عرض محتوى الرد إذا ورد */}
          {detail.response_content && !showResponseForm && (
            <div className="lsd-notes-section" style={{ marginTop: 16 }}>
              <div className="lsd-notes-section__label">محتوى الرد الوارد</div>
              <LegalRichText html={detail.response_content} />
            </div>
          )}
        </div>
      </div>

      {/* ── أزرار الإجراءات ── */}
      <div className="lsd-consultation-actions">
        <button
          className="lsd-header-btn"
          onClick={handleGeneratePdf}
          disabled={pdfLoading}
        >
          <FileText size={15} />
          {pdfLoading ? 'جارٍ التوليد...' : 'توليد PDF (قريباً)'}
        </button>
      </div>
    </div>
  );
};

export default LegalNoticesWorkspace;
