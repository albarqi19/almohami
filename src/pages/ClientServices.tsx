import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Plus, ChevronLeft, AlertCircle, Loader2, FileText, X, Send, Paperclip } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  ClientServiceService,
  formatServiceDate,
  type ClientService,
  type ClientServiceType,
  type ServiceGroup,
  type ServiceRequestInput,
} from '../services/clientServiceService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (client-services.css + بدائيّات cx-*)

const GROUPS: { key: ServiceGroup; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'جارية' },
  { key: 'closed', label: 'منتهية' },
];

export function serviceChipClass(s: Pick<ClientService, 'status' | 'is_closed'>): string {
  if (s.status === 'cancelled' || s.status === 'rejected') return 'cv-chip cv-chip--cancelled';
  if (s.is_closed) return 'cv-chip cv-chip--closed';
  if (s.status === 'new') return 'cv-chip cv-chip--new';
  return 'cv-chip cv-chip--active';
}

type FieldErrors = Partial<Record<keyof ServiceRequestInput, string>>;

/**
 * مودال «اطلب خدمة» — نوع + عنوان + وصف. يُنشئ خدمةً حقيقية بحالة «جديدة» في لوحة المكتب.
 */
export const RequestServiceModal: React.FC<{ onClose: () => void; onCreated: (id: number) => void }> = ({ onClose, onCreated }) => {
  const [types, setTypes] = useState<ClientServiceType[]>([]);
  const [typesError, setTypesError] = useState(false);
  const [form, setForm] = useState<ServiceRequestInput>({ service_type: '', title: '', description: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ClientServiceService.types().then(setTypes).catch(() => setTypesError(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.service_type) next.service_type = 'اختر نوع الخدمة';
    if (!form.title.trim()) next.title = 'اكتب عنواناً للطلب';
    if (form.description.trim().length < 10) next.description = 'اكتب وصفاً لما تحتاجه (عشرة أحرف على الأقل)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const created = await ClientServiceService.request({
        service_type: form.service_type,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      toast.success('وصل طلبك إلى المكتب وسيتواصل معك قريباً');
      onCreated(created.id);
    } catch (err) {
      const e2 = err as Error & { errors?: Record<string, string[]> };
      if (e2.errors) {
        const next: FieldErrors = {};
        (Object.keys(e2.errors) as (keyof ServiceRequestInput)[]).forEach(k => { next[k] = e2.errors?.[k]?.[0]; });
        setErrors(next);
      } else {
        toast.error(e2.message || 'تعذّر إرسال الطلب');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="case-modal-overlay" onClick={onClose}>
      <div className="case-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cv-req-title">
        <div className="case-modal__header">
          <h3 className="case-modal__title" id="cv-req-title">طلب خدمة قانونية</h3>
          <button type="button" onClick={onClose} className="case-modal__close" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="cv-form" noValidate>
          <div className="case-modal__body">
            <div className="cv-form__note">
              اكتب ما تحتاجه باختصار. سيراجع المكتب طلبك ويتواصل معك للاتفاق على التفاصيل، وتتابع الحالة من صفحة «خدماتي».
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cv-type">نوع الخدمة</label>
              <select
                id="cv-type"
                className="form-select"
                value={form.service_type}
                onChange={e => setForm({ ...form, service_type: e.target.value })}
                disabled={typesError}
              >
                <option value="">{typesError ? 'تعذّر جلب الأنواع' : 'اختر النوع'}</option>
                {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {errors.service_type && <div className="cv-form__error">{errors.service_type}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cv-title">عنوان الطلب</label>
              <input
                id="cv-title"
                className="form-input"
                value={form.title}
                maxLength={255}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: مراجعة عقد توريد قبل التوقيع"
              />
              {errors.title && <div className="cv-form__error">{errors.title}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cv-desc">وصف ما تحتاجه</label>
              <textarea
                id="cv-desc"
                className="form-textarea"
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="اشرح الموضوع، وما الذي تريد من المكتب فعله، وأي مهلة تهمّك"
              />
              <div className="cv-form__hint">{form.description.trim().length} / 5000</div>
              {errors.description && <div className="cv-form__error">{errors.description}</div>}
            </div>
          </div>
          <div className="case-modal__footer">
            <button type="submit" className="modal-btn modal-btn--success" disabled={submitting || typesError}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
            </button>
            <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * «خدماتي» — الخدمات القانونية التي طلبها العميل أو ينفّذها له المكتب.
 */
const ClientServices: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientService[]>([]);
  const [counts, setCounts] = useState<Record<ServiceGroup, number> | null>(null);
  const [group, setGroup] = useState<ServiceGroup>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const load = useCallback(async (g: ServiceGroup, p: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true); else { setLoading(true); setError(null); }
      const res = await ClientServiceService.list({ group: g, page: p });
      setRows(prev => (append ? [...prev, ...res.rows] : res.rows));
      setCounts(res.counts);
      setPage(res.page);
      setLastPage(res.lastPage);
      setTotal(res.total);
    } catch (e) {
      if (!append) setRows([]);
      setError(e instanceof Error ? e.message : 'تعذّر جلب الخدمات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(group, 1, false);
  }, [group, load]);

  const hasAny = (counts?.all ?? 0) > 0;

  return (
    <div className="cx-page" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><Briefcase size={20} /></div>
          <div>
            <h1 className="cx-header__h1">خدماتي</h1>
            <p className="cx-header__sub">الخدمات القانونية التي طلبتها أو ينفّذها المكتب لك</p>
          </div>
        </div>
        <button type="button" className="cv-primary" onClick={() => setShowRequest(true)}>
          <Plus size={16} /> اطلب خدمة
        </button>
      </div>

      <div className="cx-content">
        {hasAny && (
          <div className="cx-filters">
            <div className="cx-chips" role="group" aria-label="تصفية">
              {GROUPS.map(g => (
                <button key={g.key} type="button" className="cx-chipbtn" aria-pressed={group === g.key} onClick={() => setGroup(g.key)}>
                  {g.label} <em>{counts?.[g.key] ?? 0}</em>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="cx-skeleton" aria-busy="true" aria-label="جارٍ التحميل">
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
            <div className="cx-skeleton__row" />
          </div>
        ) : error ? (
          <div className="cx-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="cx-btn" onClick={() => void load(group, 1, false)} style={{ marginInlineStart: 'auto' }}>إعادة المحاولة</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="cx-empty">
            <div className="cx-empty__icon"><Briefcase size={24} /></div>
            <h3 className="cx-empty__title">{hasAny ? 'لا خدمات في هذا التصنيف' : 'لا توجد خدمات بعد'}</h3>
            <p className="cx-empty__text">
              {hasAny ? 'جرّب تصنيفاً آخر.' : 'اطلب خدمة قانونية من هنا وتابع حالتها خطوةً بخطوة.'}
            </p>
            {!hasAny && (
              <button type="button" className="cv-primary" style={{ marginTop: 14 }} onClick={() => setShowRequest(true)}>
                <Plus size={16} /> اطلب خدمة
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="cx-list">
              {rows.map(s => (
                <li key={s.id}>
                  <Link to={`/my-services/${s.id}`} className="cv-row">
                    <div>
                      <div className="cv-row__title">
                        <span>{s.title}</span>
                        <span className="cv-chip cv-chip--type">{s.service_type_label}</span>
                        {s.service_number && <span className="cv-row__num">{s.service_number}</span>}
                      </div>
                      <div className="cv-row__meta">
                        {s.requested_by_client && <span>طلبتَه من البوابة</span>}
                        {s.documents_count > 0 && <span><Paperclip size={13} /> {s.documents_count} مستند</span>}
                        {s.case && <span><FileText size={13} /> تحوّلت إلى قضية: {s.case.title}</span>}
                      </div>
                    </div>
                    <div className="cv-row__lawyer">
                      <b>المحامي المسؤول</b>
                      {s.assigned_lawyer?.name || 'لم يُحدَّد بعد'}
                    </div>
                    <div className="cv-row__status">
                      <span className={serviceChipClass(s)}>{s.status_label}</span>
                      <span className="cv-row__date">{formatServiceDate(s.created_at)}</span>
                    </div>
                    <ChevronLeft size={16} className="cx-row__arrow" />
                  </Link>
                </li>
              ))}
            </ul>
            {page < lastPage && (
              <div className="cx-more">
                <button type="button" className="cx-btn" disabled={loadingMore} onClick={() => void load(group, page + 1, true)}>
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  عرض المزيد ({rows.length} من {total})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showRequest && (
        <RequestServiceModal
          onClose={() => setShowRequest(false)}
          onCreated={id => { setShowRequest(false); navigate(`/my-services/${id}`); }}
        />
      )}
    </div>
  );
};

export default ClientServices;
