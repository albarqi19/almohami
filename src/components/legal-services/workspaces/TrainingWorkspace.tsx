import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, BookOpen, Award, Star, Edit2, Plus, Trash2, X,
  Calendar, Clock, MapPin, User, Mail, Phone, Building2, Check, Video,
  FileText, Dumbbell, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../../services/legalServiceService';
import { useDynamicList } from '../../../hooks/useDynamicList';
import type { WorkspaceProps } from './types';
import type { TrainingAttendee, TrainingMaterial } from '../../../types/legalServices';
import MicroStatsBar from './MicroStatsBar';

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
        <p>لا توجد تفاصيل للتدريب</p>
      </div>
    );
  }

  // ── معالجات ──

  const handleSaveDetails = async () => {
    setDetailsLoading(true);
    try {
      const res = await LegalServiceService.updateTrainingDetails(service.id, detailsData);
      if (res.success) {
        toast.success('تم حفظ تفاصيل التدريب');
        setEditingDetails(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setDetailsLoading(false); }
  };

  const handleGenerateCerts = async () => {
    setCertLoading(true);
    try {
      const res = await LegalServiceService.generateCertificates(service.id);
      if (res.success) {
        toast.success('تم إصدار الشهادات بنجاح');
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
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
        toast.error(res.message || 'حدث خطأ');
      }
    } catch { toast.error('حدث خطأ في الاتصال'); }
    finally { setEvalLoading(false); }
  };

  // ── تقييم بالنجوم ──
  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={16} fill={i <= rating ? '#f59e0b' : 'none'} color={i <= rating ? '#f59e0b' : '#d1d5db'} />
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
                description: detail.description || '',
                objectives: detail.objectives || '',
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
                is_free: detail.is_free ?? true,
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
              </div>
              <div className="lsd-form-group" style={{ marginTop: 8 }}>
                <label className="lsd-form-label">الوصف</label>
                <textarea className="lsd-form-textarea" rows={3} value={detailsData.description || ''} onChange={e => setDetailsData({ ...detailsData, description: e.target.value })} placeholder="وصف التدريب..." />
              </div>
              <div className="lsd-form-group" style={{ marginTop: 8 }}>
                <label className="lsd-form-label">الأهداف</label>
                <textarea className="lsd-form-textarea" rows={2} value={detailsData.objectives || ''} onChange={e => setDetailsData({ ...detailsData, objectives: e.target.value })} placeholder="أهداف التدريب..." />
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
                      <div className="lsd-info-item__value" style={{ color: '#16a34a' }}>مجاني</div>
                    </div>
                  </div>
                )}
              </div>
              {detail.description && (
                <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                  <div className="lsd-notes-section__label">الوصف</div>
                  <p className="lsd-description-text">{detail.description}</p>
                </div>
              )}
              {detail.objectives && (
                <div className="lsd-notes-section" style={{ marginTop: 12 }}>
                  <div className="lsd-notes-section__label">الأهداف</div>
                  <p className="lsd-description-text">{detail.objectives}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
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
                      <input className="lsd-form-input" value={newAttendee.phone || ''} onChange={e => setNewAttendee({ ...newAttendee, phone: e.target.value })} placeholder="رقم الهاتف" dir="ltr" />
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
                <div style={{ padding: 12, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8 }}>
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
          {attendedCount > 0 && (
            <div style={{ marginTop: 12 }}>
              <button
                className="lsd-header-btn lsd-header-btn--primary"
                onClick={handleGenerateCerts}
                disabled={certLoading}
              >
                <Award size={15} />
                {certLoading ? 'جارٍ الإصدار...' : 'إصدار الشهادات'}
              </button>
            </div>
          )}
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
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{detail.evaluation.average_rating}</div>
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
