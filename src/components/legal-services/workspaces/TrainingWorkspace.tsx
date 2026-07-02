import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, BookOpen, Award, Star, Edit2, Plus, Trash2, X,
  Calendar, Clock, MapPin, User, Mail, Phone, Building2, Check, Video,
  FileText, Dumbbell, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps } from './types';
import type { TrainingAttendee, TrainingMaterial } from '../../../types/legalServices';
import MicroStatsBar from './MicroStatsBar';
import LegalRichEditorField from '../LegalRichEditorField';
import PhoneField from '../../PhoneField';

// ── تسميات عربية ──

const TRAINING_TYPE_LABELS: Record<string, string> = {
  workshop: 'ورشة عمل',
  seminar: 'ندوة',
  course: 'دورة تدريبية',
  awareness: 'توعية',
  induction: 'تعريفي',
  certification: 'شهادة مهنية',
  other: 'أخرى',
};

const TOPIC_CATEGORY_LABELS: Record<string, string> = {
  new_companies_law: 'نظام الشركات الجديد',
  labor_law: 'نظام العمل',
  data_protection: 'حماية البيانات',
  anti_corruption: 'مكافحة الفساد',
  commercial_law: 'النظام التجاري',
  corporate_governance: 'حوكمة الشركات',
  contract_management: 'إدارة العقود',
  compliance: 'الامتثال',
  other: 'أخرى',
};

const DELIVERY_FORMAT_LABELS: Record<string, string> = {
  in_person: 'حضوري',
  online: 'عن بُعد',
  hybrid: 'مختلط',
};

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  presentation: 'عرض تقديمي',
  document: 'مستند',
  video: 'فيديو',
  exercise: 'تمرين',
};

const MATERIAL_TYPE_ICONS: Record<string, any> = {
  presentation: FileText,
  document: BookOpen,
  video: Video,
  exercise: Dumbbell,
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

// ── المكون الرئيسي ──

const TrainingWorkspace: React.FC<WorkspaceProps> = ({ service, refreshService }) => {
  const detail = service.training_detail;

  // حالات التعديل
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [certLoading, setCertLoading] = useState(false);

  const [editingEval, setEditingEval] = useState(false);
  const [evalData, setEvalData] = useState<Record<string, any>>({});
  const [evalLoading, setEvalLoading] = useState(false);

  // نموذج إضافة متدرب
  const [newAttendee, setNewAttendee] = useState<Partial<TrainingAttendee>>({});

  // نموذج إضافة مادة
  const [newMaterial, setNewMaterial] = useState<Partial<TrainingMaterial>>({});

  // حسابات
  const attendees = useMemo(() => detail?.attendees ?? [], [detail?.attendees]);
  const materials = useMemo(() => detail?.materials ?? [], [detail?.materials]);
  const attendeesCount = attendees.length;
  const attendedCount = attendees.filter(a => a.attended).length;

  // useDynamicList للمتدربين
  const attendeeList = useDynamicList<TrainingAttendee>({
    items: attendees,
    onAdd: (item) => LegalServiceService.addTrainingAttendee(service.id, item),
    onUpdate: (idx, data) => LegalServiceService.updateTrainingAttendee(service.id, idx, data),
    onRemove: (idx) => LegalServiceService.removeTrainingAttendee(service.id, idx),
    refreshService,
    addSuccessMessage: 'تمت إضافة المتدرب بنجاح',
    removeSuccessMessage: 'تم حذف المتدرب',
    updateSuccessMessage: 'تم تحديث بيانات المتدرب',
  });

  // useDynamicList للمواد
  const materialList = useDynamicList<TrainingMaterial>({
    items: materials,
    onAdd: (item) => LegalServiceService.addTrainingMaterial(service.id, item),
    refreshService,
    addSuccessMessage: 'تمت إضافة المادة بنجاح',
  });

  // حالة فارغة
  if (!detail) {
    return (
      <div className="lsd-empty-tab">
        <GraduationCap size={32} />
        <p>لا توجد تفاصيل للتدريب بعد</p>
        <p style={{ fontSize: 12.5, color: 'var(--quiet-gray-500, #6b7280)', margin: '4px 0 0' }}>
          أعد تحميل الصفحة، وإن استمرّت المشكلة تواصل مع الدعم — يُفترض أن تُنشأ تفاصيل التدريب تلقائياً مع الخدمة.
        </p>
      </div>
    );
  }

  // ── معالجات ──

  const handleSaveDetails = async () => {
    setDetailsLoading(true);
    try {
      // لا نرسل حقول التسعير إلا إذا لمسها المستخدم — كانت is_free تُكتب true صامتاً مع كل حفظ
      const payload: Record<string, any> = { ...detailsData };
      if (payload.is_free === undefined) delete payload.is_free;
      if (payload.price_per_attendee === '' || payload.price_per_attendee === undefined) delete payload.price_per_attendee;
      const res = await LegalServiceService.updateTrainingDetails(service.id, payload);
      if (res.success) {
        toast.success('تم حفظ تفاصيل التدريب');
        setEditingDetails(false);
        await refreshService();
      } else {
        toast.error(res.message || 'تعذّر حفظ تفاصيل التدريب');
      }
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ تفاصيل التدريب')); }
    finally { setDetailsLoading(false); }
  };

  // حفظ الوصف كمحتوى غني
  const handleSaveDescription = async (html: string) => {
    const res = await LegalServiceService.updateTrainingDetails(service.id, { description: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  // حفظ الأهداف كمحتوى غني
  const handleSaveObjectives = async (html: string) => {
    const res = await LegalServiceService.updateTrainingDetails(service.id, { objectives: html });
    if (!res?.success) throw new Error(res?.message || 'تعذّر الحفظ');
    await refreshService();
  };

  // إصدار الشهادات الرسمية (PDF) عبر POST /legal-services/{id}/training/certificates/generate
  // نعرض نتيجة الخادم الحقيقية — لا رسالة نجاح زائفة عند الفشل
  const handleGenerateCerts = async () => {
    setCertLoading(true);
    try {
      const res = await LegalServiceService.generateCertificates(service.id);
      if (res.success) {
        toast.success(res.message || 'تم إصدار الشهادات الرسمية — تجدها في «المخرجات الرسمية»');
        await refreshService();
      } else {
        toast.error(res.message || 'تعذّر إصدار الشهادات');
      }
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر إصدار الشهادات')); }
    finally { setCertLoading(false); }
  };

  const handleSaveEval = async () => {
    setEvalLoading(true);
    try {
      const res = await LegalServiceService.updateTrainingEvaluation(service.id, evalData);
      if (res.success) {
        toast.success('تم حفظ التقييم');
        setEditingEval(false);
        await refreshService();
      } else {
        toast.error(res.message || 'تعذّر حفظ التقييم');
      }
    } catch (err) { toast.error(getApiErrorMessage(err, 'تعذّر حفظ التقييم')); }
    finally { setEvalLoading(false); }
  };

  // ── تقييم بالنجوم ──
  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={16} fill={i <= rating ? 'var(--law-gold, #f59e0b)' : 'none'} color={i <= rating ? 'var(--law-gold, #f59e0b)' : 'var(--quiet-gray-300, #d1d5db)'} />
        ))}
      </div>
    );
  };

  return (
    <div className="lsd-tab-content-stack">

      {/* ── شريط المؤشرات ── */}
      <MicroStatsBar items={[
        {
          label: 'المسجلون',
          value: detail.max_attendees ? `${attendeesCount}/${detail.max_attendees}` : `${attendeesCount}`,
          icon: Users,
          color: detail.max_attendees && attendeesCount >= detail.max_attendees ? 'red' : 'blue',
        },
        {
          label: 'الحاضرون',
          value: `${attendedCount}`,
          icon: Check,
          color: 'green',
        },
        {
          label: 'الشهادات',
          value: `${detail.certificates_issued_count || 0}`,
          icon: Award,
          color: detail.certificates_issued_count > 0 ? 'purple' : 'gray',
        },
        ...(detail.evaluation?.average_rating ? [{
          label: 'التقييم',
          value: `${detail.evaluation.average_rating}/5`,
          icon: Star as any,
          color: 'amber' as const,
        }] : []),
      ]} />

      {/* ── بطاقة تفاصيل التدريب ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <GraduationCap size={15} />
            تفاصيل التدريب
          </div>
          <button
            className="lsd-card__action"
            onClick={() => {
              setEditingDetails(true);
              setDetailsData({
                training_type: detail.training_type || '',
                topic: detail.topic || '',
                topic_category: detail.topic_category || '',
                target_audience: detail.target_audience || '',
                delivery_format: detail.delivery_format || 'in_person',
                event_date: detail.event_date || '',
                start_time: detail.start_time || '',
                end_time: detail.end_time || '',
                duration_hours: detail.duration_hours || '',
                venue: detail.venue || '',
                online_link: detail.online_link || '',
                trainer_name: detail.trainer_name || '',
                max_attendees: detail.max_attendees || '',
                price_per_attendee: detail.price_per_attendee || '',
                // is_free لا تُدرج هنا عمداً — تُضاف للحمولة فقط عند لمس المستخدم للمفتاح
                // (كانت تُرسل true افتراضياً فتُكتب صامتاً مع كل حفظ)
              });
            }}
          >
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingDetails ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group">
                  <label className="lsd-form-label">نوع التدريب</label>
                  <select className="lsd-form-input" value={detailsData.training_type || ''} onChange={e => setDetailsData({ ...detailsData, training_type: e.target.value })}>
                    <option value="">اختر النوع</option>
                    {Object.entries(TRAINING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الموضوع</label>
                  <input className="lsd-form-input" value={detailsData.topic || ''} onChange={e => setDetailsData({ ...detailsData, topic: e.target.value })} placeholder="موضوع التدريب" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">التصنيف</label>
                  <select className="lsd-form-input" value={detailsData.topic_category || ''} onChange={e => setDetailsData({ ...detailsData, topic_category: e.target.value })}>
                    <option value="">اختر التصنيف</option>
                    {Object.entries(TOPIC_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">طريقة التقديم</label>
                  <select className="lsd-form-input" value={detailsData.delivery_format || ''} onChange={e => setDetailsData({ ...detailsData, delivery_format: e.target.value })}>
                    {Object.entries(DELIVERY_FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">التاريخ</label>
                  <input className="lsd-form-input" type="date" value={detailsData.event_date || ''} onChange={e => setDetailsData({ ...detailsData, event_date: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">وقت البدء</label>
                  <input className="lsd-form-input" type="time" value={detailsData.start_time || ''} onChange={e => setDetailsData({ ...detailsData, start_time: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">وقت الانتهاء</label>
                  <input className="lsd-form-input" type="time" value={detailsData.end_time || ''} onChange={e => setDetailsData({ ...detailsData, end_time: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">المدة (ساعات)</label>
                  <input className="lsd-form-input" type="number" value={detailsData.duration_hours || ''} onChange={e => setDetailsData({ ...detailsData, duration_hours: e.target.value })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">المكان</label>
                  <input className="lsd-form-input" value={detailsData.venue || ''} onChange={e => setDetailsData({ ...detailsData, venue: e.target.value })} placeholder="مكان انعقاد التدريب" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">رابط الاجتماع</label>
                  <input className="lsd-form-input" value={detailsData.online_link || ''} onChange={e => setDetailsData({ ...detailsData, online_link: e.target.value })} placeholder="رابط Zoom أو Teams" dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">المدرب</label>
                  <input className="lsd-form-input" value={detailsData.trainer_name || ''} onChange={e => setDetailsData({ ...detailsData, trainer_name: e.target.value })} placeholder="اسم المدرب" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">الحد الأقصى للمتدربين</label>
                  <input className="lsd-form-input" type="number" value={detailsData.max_attendees || ''} onChange={e => setDetailsData({ ...detailsData, max_attendees: e.target.value })} dir="ltr" />
                </div>
                {/* ── التسعير: مجاني أم برسوم؟ ── */}
                <div className="lsd-form-group">
                  <label className="lsd-form-label">التسعير</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', minHeight: 34 }}>
                    <input
                      type="checkbox"
                      checked={detailsData.is_free ?? detail.is_free ?? false}
                      onChange={e => setDetailsData({ ...detailsData, is_free: e.target.checked })}
                    />
                    تدريب مجاني (بدون رسوم للمتدرب)
                  </label>
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">السعر لكل متدرب (ر.س)</label>
                  <input
                    className="lsd-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={detailsData.price_per_attendee || ''}
                    onChange={e => setDetailsData({ ...detailsData, price_per_attendee: e.target.value })}
                    placeholder="مثال: 500"
                    dir="ltr"
                    disabled={detailsData.is_free ?? detail.is_free ?? false}
                    title={(detailsData.is_free ?? detail.is_free ?? false) ? 'التدريب مجاني — ألغِ تحديد «مجاني» لإدخال سعر' : undefined}
                  />
                </div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingDetails(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveDetails} disabled={detailsLoading}>
                  {detailsLoading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="lsd-info-grid">
                {detail.training_type && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><GraduationCap size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">نوع التدريب</div>
                      <div className="lsd-info-item__value">{TRAINING_TYPE_LABELS[detail.training_type] || detail.training_type}</div>
                    </div>
                  </div>
                )}
                {detail.topic && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><BookOpen size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">الموضوع</div>
                      <div className="lsd-info-item__value">{detail.topic}</div>
                    </div>
                  </div>
                )}
                {detail.topic_category && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><BookOpen size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">التصنيف</div>
                      <div className="lsd-info-item__value">{TOPIC_CATEGORY_LABELS[detail.topic_category] || detail.topic_category}</div>
                    </div>
                  </div>
                )}
                <div className="lsd-info-item">
                  <div className="lsd-info-item__icon"><MapPin size={14} /></div>
                  <div className="lsd-info-item__body">
                    <div className="lsd-info-item__label">طريقة التقديم</div>
                    <div className="lsd-info-item__value">{DELIVERY_FORMAT_LABELS[detail.delivery_format] || detail.delivery_format}</div>
                  </div>
                </div>
                {detail.event_date && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Calendar size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">التاريخ</div>
                      <div className="lsd-info-item__value">{formatDate(detail.event_date)}</div>
                    </div>
                  </div>
                )}
                {detail.duration_hours && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Clock size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">المدة</div>
                      <div className="lsd-info-item__value">{detail.duration_hours} ساعة</div>
                    </div>
                  </div>
                )}
                {detail.venue && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><MapPin size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">المكان</div>
                      <div className="lsd-info-item__value">{detail.venue}</div>
                    </div>
                  </div>
                )}
                {detail.trainer_name && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><User size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">المدرب</div>
                      <div className="lsd-info-item__value">{detail.trainer_name}</div>
                    </div>
                  </div>
                )}
                {detail.price_per_attendee && !detail.is_free && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Star size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">السعر</div>
                      <div className="lsd-info-item__value">{Number(detail.price_per_attendee).toLocaleString('ar-SA')} ر.س</div>
                    </div>
                  </div>
                )}
                {detail.is_free && (
                  <div className="lsd-info-item">
                    <div className="lsd-info-item__icon"><Star size={14} /></div>
                    <div className="lsd-info-item__body">
                      <div className="lsd-info-item__label">السعر</div>
                      <div className="lsd-info-item__value" style={{ color: 'var(--status-green, #16a34a)' }}>مجاني</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── الوصف (محتوى غني) ── */}
      <LegalRichEditorField
        label="الوصف"
        icon={FileText}
        value={detail.description}
        onSave={handleSaveDescription}
        description="وصف تفصيلي للتدريب ومحتواه."
        placeholder="اكتب وصف التدريب..."
        emptyText="لا يوجد وصف بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ الوصف"
      />

      {/* ── الأهداف (محتوى غني) ── */}
      <LegalRichEditorField
        label="الأهداف"
        icon={GraduationCap}
        value={detail.objectives}
        onSave={handleSaveObjectives}
        description="الأهداف التعليمية المرجوّة من التدريب."
        placeholder="اكتب أهداف التدريب..."
        emptyText="لا توجد أهداف بعد — اضغط «تعديل» لبدء الكتابة"
        successMessage="تم حفظ الأهداف"
      />

      {/* ── بطاقة المتدربين ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Users size={15} />
            المتدربون
            {attendeesCount > 0 && <span className="lsd-tab__count">{detail.max_attendees ? `${attendeesCount}/${detail.max_attendees}` : attendeesCount}</span>}
          </div>
          <button className="lsd-card__action" onClick={() => attendeeList.setShowAddForm(true)}>
            <Plus size={13} />
            إضافة متدرب
          </button>
        </div>
        <div className="lsd-card__content">
          {/* نموذج إضافة */}
          <AnimatePresence>
            {attendeeList.showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--quiet-gray-50, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة متدرب جديد</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الاسم *</label>
                      <input className="lsd-form-input" value={newAttendee.name || ''} onChange={e => setNewAttendee({ ...newAttendee, name: e.target.value })} placeholder="اسم المتدرب" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">البريد الإلكتروني</label>
                      <input className="lsd-form-input" value={newAttendee.email || ''} onChange={e => setNewAttendee({ ...newAttendee, email: e.target.value })} placeholder="البريد" dir="ltr" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الهاتف</label>
                      <PhoneField value={newAttendee.phone || ''} onChange={(v) => setNewAttendee({ ...newAttendee, phone: v })} placeholder="5X XXX XXXX" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">الشركة</label>
                      <input className="lsd-form-input" value={newAttendee.company || ''} onChange={e => setNewAttendee({ ...newAttendee, company: e.target.value })} placeholder="اسم الشركة" />
                    </div>
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { attendeeList.setShowAddForm(false); setNewAttendee({}); }}>إلغاء</button>
                    <button
                      className="lsd-header-btn lsd-header-btn--primary"
                      onClick={() => {
                        if (!newAttendee.name?.trim()) { toast.error('يرجى إدخال اسم المتدرب'); return; }
                        attendeeList.handleAdd({ ...newAttendee, name: newAttendee.name!, attended: false });
                        setNewAttendee({});
                      }}
                      disabled={attendeeList.addLoading}
                    >
                      {attendeeList.addLoading ? 'جارٍ...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* قائمة المتدربين */}
          {attendees.length > 0 ? (
            <div className="lsd-references-list">
              {attendees.map((att, idx) => (
                <div key={idx} className="lsd-reference-item" style={{ alignItems: 'center' }}>
                  <div className="lsd-reference-item__icon">
                    <User size={15} />
                  </div>
                  <div className="lsd-reference-item__body" style={{ flex: 1 }}>
                    <div className="lsd-reference-item__title">{att.name}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)', flexWrap: 'wrap' }}>
                      {att.email && <span><Mail size={11} style={{ marginLeft: 3 }} />{att.email}</span>}
                      {att.phone && <span><Phone size={11} style={{ marginLeft: 3 }} />{att.phone}</span>}
                      {att.company && <span><Building2 size={11} style={{ marginLeft: 3 }} />{att.company}</span>}
                    </div>
                  </div>
                  {/* checkbox حضور */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>
                    <input
                      type="checkbox"
                      checked={att.attended ?? false}
                      onChange={() => attendeeList.handleUpdate(idx, { attended: !att.attended })}
                      disabled={attendeeList.updateLoadingIdx === idx}
                    />
                    حضر
                  </label>
                  <button
                    className="lsd-doc-action-btn"
                    title="حذف المتدرب"
                    onClick={() => attendeeList.handleRemove(idx)}
                    disabled={attendeeList.removeLoadingIdx === idx}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !attendeeList.showAddForm && (
              <div className="lsd-empty-state-small">
                <Users size={22} />
                <span>لا يوجد متدربون مسجلون</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => attendeeList.setShowAddForm(true)}>
                  <Plus size={13} /> إضافة المتدرب الأول
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة المواد التدريبية ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <BookOpen size={15} />
            المواد التدريبية
            {materials.length > 0 && <span className="lsd-tab__count">{materials.length}</span>}
          </div>
          <button className="lsd-card__action" onClick={() => materialList.setShowAddForm(true)}>
            <Plus size={13} />
            إضافة مادة
          </button>
        </div>
        <div className="lsd-card__content">
          <AnimatePresence>
            {materialList.showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: 12, background: 'var(--quiet-gray-50, #f8f9fa)', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>إضافة مادة تدريبية</h4>
                  <div className="lsd-info-grid">
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">العنوان *</label>
                      <input className="lsd-form-input" value={newMaterial.title || ''} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })} placeholder="عنوان المادة" />
                    </div>
                    <div className="lsd-form-group">
                      <label className="lsd-form-label">النوع</label>
                      <select className="lsd-form-input" value={newMaterial.type || 'document'} onChange={e => setNewMaterial({ ...newMaterial, type: e.target.value as any })}>
                        {Object.entries(MATERIAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="lsd-form-group" style={{ marginTop: 8 }}>
                    <label className="lsd-form-label">الوصف</label>
                    <textarea className="lsd-form-textarea" rows={2} value={newMaterial.description || ''} onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })} placeholder="وصف المادة..." />
                  </div>
                  <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                    <button className="lsd-header-btn" onClick={() => { materialList.setShowAddForm(false); setNewMaterial({}); }}>إلغاء</button>
                    <button
                      className="lsd-header-btn lsd-header-btn--primary"
                      onClick={() => {
                        if (!newMaterial.title?.trim()) { toast.error('يرجى إدخال عنوان المادة'); return; }
                        materialList.handleAdd({ ...newMaterial, title: newMaterial.title!, type: newMaterial.type || 'document' });
                        setNewMaterial({});
                      }}
                      disabled={materialList.addLoading}
                    >
                      {materialList.addLoading ? 'جارٍ...' : 'إضافة'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {materials.length > 0 ? (
            <div className="lsd-references-list">
              {materials.map((mat, idx) => {
                const MatIcon = MATERIAL_TYPE_ICONS[mat.type] || FileText;
                return (
                  <div key={idx} className="lsd-reference-item">
                    <div className="lsd-reference-item__icon"><MatIcon size={15} /></div>
                    <div className="lsd-reference-item__body">
                      <div className="lsd-reference-item__title">{mat.title}</div>
                      <div className="lsd-reference-item__source">{MATERIAL_TYPE_LABELS[mat.type] || mat.type}</div>
                      {mat.description && <div style={{ fontSize: 12, color: 'var(--quiet-gray-500)' }}>{mat.description}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !materialList.showAddForm && (
              <div className="lsd-empty-state-small">
                <BookOpen size={22} />
                <span>لا توجد مواد تدريبية</span>
                <button className="lsd-header-btn lsd-header-btn--primary" style={{ marginTop: 8 }} onClick={() => materialList.setShowAddForm(true)}>
                  <Plus size={13} /> إضافة المادة الأولى
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── بطاقة الشهادات ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Award size={15} />
            الشهادات
          </div>
        </div>
        <div className="lsd-card__content">
          <div className="lsd-info-grid">
            <div className="lsd-info-item">
              <div className="lsd-info-item__icon"><Award size={14} /></div>
              <div className="lsd-info-item__body">
                <div className="lsd-info-item__label">الشهادات الصادرة</div>
                <div className="lsd-info-item__value">{detail.certificates_issued_count || 0}</div>
              </div>
            </div>
            <div className="lsd-info-item">
              <div className="lsd-info-item__icon"><Users size={14} /></div>
              <div className="lsd-info-item__body">
                <div className="lsd-info-item__label">الحاضرون المستحقون</div>
                <div className="lsd-info-item__value">{attendedCount}</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="lsd-header-btn lsd-header-btn--primary"
              onClick={handleGenerateCerts}
              disabled={certLoading || attendedCount === 0}
              title={attendedCount === 0
                ? 'علّم «حضر» على متدرب واحد على الأقل ليمكن إصدار الشهادات'
                : 'يولّد شهادات حضور رسمية (PDF) لكل من علِّم عليه «حضر»'}
            >
              <Award size={15} />
              {certLoading ? 'جارٍ الإصدار...' : 'إصدار الشهادات الرسمية (PDF)'}
            </button>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>
              يولّد شهادة PDF رسمية لكل متدرب مُعلَّم عليه «حضر»، وتظهر ضمن «المخرجات الرسمية» للخدمة.
            </p>
          </div>
        </div>
      </div>

      {/* ── بطاقة التقييم ── */}
      <div className="lsd-card">
        <div className="lsd-card__header">
          <div className="lsd-card__title">
            <Star size={15} />
            التقييم
          </div>
          <button className="lsd-card__action" onClick={() => {
            setEditingEval(true);
            setEvalData({
              average_rating: detail.evaluation?.average_rating || 0,
              total_responses: detail.evaluation?.total_responses || 0,
            });
          }}>
            <Edit2 size={13} />
            تعديل
          </button>
        </div>
        <div className="lsd-card__content">
          {editingEval ? (
            <div>
              <div className="lsd-info-grid">
                <div className="lsd-form-group">
                  <label className="lsd-form-label">متوسط التقييم (من 5)</label>
                  <input className="lsd-form-input" type="number" min="0" max="5" step="0.1" value={evalData.average_rating || ''} onChange={e => setEvalData({ ...evalData, average_rating: parseFloat(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div className="lsd-form-group">
                  <label className="lsd-form-label">عدد الردود</label>
                  <input className="lsd-form-input" type="number" min="0" value={evalData.total_responses || ''} onChange={e => setEvalData({ ...evalData, total_responses: parseInt(e.target.value) || 0 })} dir="ltr" />
                </div>
              </div>
              <div className="lsd-inline-form__actions" style={{ marginTop: 10 }}>
                <button className="lsd-header-btn" onClick={() => setEditingEval(false)}>إلغاء</button>
                <button className="lsd-header-btn lsd-header-btn--primary" onClick={handleSaveEval} disabled={evalLoading}>
                  {evalLoading ? 'جارٍ...' : 'حفظ'}
                </button>
              </div>
            </div>
          ) : detail.evaluation?.average_rating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--law-gold, #f59e0b)' }}>{detail.evaluation.average_rating}</div>
                <div style={{ fontSize: 12, color: 'var(--quiet-gray-500)' }}>من 5</div>
                {renderStars(Math.round(detail.evaluation.average_rating))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--quiet-gray-600)' }}>
                {detail.evaluation.total_responses} تقييم
              </div>
            </div>
          ) : (
            <div className="lsd-empty-state-small">
              <Star size={22} />
              <span>لا يوجد تقييم بعد</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingWorkspace;
