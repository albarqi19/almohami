import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Copy, Check, Trash2, UserPlus, Loader2, ShieldAlert, RefreshCw, CalendarClock } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
import type { ServicePortalLinkItem } from '../../types/legalServices';

interface PortalLinksPanelProps {
  serviceId: number;
}

const fullUrl = (path: string) => `${window.location.origin}${path}`;

/** تاريخ عربي مقروء (ميلادي بأرقام عربية) — لعرض تاريخ انتهاء الرابط */
const formatArabicDate = (iso: string): string =>
  new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(iso));

/** وصف مبسّط لجمهور الرابط — يجيب «مَن سيفتح هذا الرابط وماذا يرى؟» */
const audienceHint = (audience: ServicePortalLinkItem['audience']): string =>
  audience === 'client'
    ? 'موجّه للعميل — يتابع نسبة الإنجاز ويرفع مستنداته'
    : 'موجّه للطرف الآخر (الخصم) — عرض محدود للمراحل فقط';

/** سطر الصلاحية بالعربية: نشِط حتى متى؟ منتهٍ منذ متى؟ */
const expiryText = (l: ServicePortalLinkItem): string => {
  if (l.revoked_at) return `أُلغي في ${formatArabicDate(l.revoked_at)}`;
  if (!l.expires_at) return 'بلا تاريخ انتهاء';
  return l.is_valid
    ? `صالح حتى ${formatArabicDate(l.expires_at)}`
    : `انتهت صلاحيته في ${formatArabicDate(l.expires_at)}`;
};

const PortalLinksPanel: React.FC<PortalLinksPanelProps> = ({ serviceId }) => {
  const [links, setLinks] = useState<ServicePortalLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  // معرّف الرابط الذي نُسخ للتو — لإظهار تأكيد «نُسخ ✓» على الزر نفسه
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await LegalServiceService.listPortalLinks(serviceId);
      if (res.success) setLinks(res.data);
      else setLoadError('تعذّر تحميل روابط المتابعة');
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'تعذّر تحميل روابط المتابعة'));
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, [load]);

  const handleCreate = async (audience: 'client' | 'adversary') => {
    setCreating(audience);
    try {
      const res = await LegalServiceService.createPortalLink(serviceId, { audience });
      if (!res?.success) throw new Error(res?.message || 'تعذّر إنشاء الرابط');
      const link = res.data;
      try {
        await navigator.clipboard.writeText(fullUrl(link.path));
        toast.success('تم إنشاء الرابط ونسخه إلى الحافظة');
      } catch {
        toast.success('تم إنشاء الرابط — انسخه من القائمة أدناه');
      }
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إنشاء رابط المتابعة'));
    } finally {
      setCreating(null);
    }
  };

  const handleCopy = async (link: ServicePortalLinkItem) => {
    try {
      await navigator.clipboard.writeText(fullUrl(link.path));
      setCopiedId(link.id);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر النسخ — حدّد الرابط وانسخه يدوياً'));
    }
  };

  const handleRevoke = async (linkId: number) => {
    if (!window.confirm('هل تريد إلغاء هذا الرابط؟ لن يعمل بعد الإلغاء.')) return;
    try {
      const res = await LegalServiceService.revokePortalLink(serviceId, linkId);
      if (!res?.success) throw new Error(res?.message || 'تعذّر الإلغاء');
      toast.success('تم إلغاء الرابط');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إلغاء الرابط'));
    }
  };

  const statusOf = (l: ServicePortalLinkItem): string => {
    if (l.revoked_at) return 'مُلغى';
    if (!l.is_valid) return 'منتهٍ';
    return 'نشِط';
  };

  return (
    <div className="lsd-card lsd-portal">
      <div className="lsd-card__header">
        <div className="lsd-card__title">
          <Link2 size={18} />
          <span>بوابة المتابعة (مشاركة مع العميل / الطرف الآخر)</span>
        </div>
        <div className="lsd-portal__actions">
          <button
            type="button"
            className="lsd-rich-btn lsd-rich-btn--primary"
            onClick={() => handleCreate('client')}
            disabled={creating !== null}
            title={creating !== null ? 'جارٍ إنشاء رابط — انتظر لحظة' : 'إنشاء رابط متابعة يُرسل للعميل'}
          >
            {creating === 'client' ? <Loader2 size={14} className="lsd-spin" /> : <UserPlus size={14} />}
            <span>رابط للعميل</span>
          </button>
          <button
            type="button"
            className="lsd-rich-btn lsd-rich-btn--ghost"
            onClick={() => handleCreate('adversary')}
            disabled={creating !== null}
            title={creating !== null ? 'جارٍ إنشاء رابط — انتظر لحظة' : 'إنشاء رابط عرض محدود يُرسل للطرف الآخر'}
          >
            {creating === 'adversary' ? <Loader2 size={14} className="lsd-spin" /> : <ShieldAlert size={14} />}
            <span>رابط للطرف الآخر</span>
          </button>
        </div>
      </div>

      <div className="lsd-card__content">
        <p className="lsd-portal__hint">
          رابط White-Label يتيح للطرف متابعة نسبة الإنجاز ومراحل الخدمة، ورفع مستنداته مباشرةً إلى OneDrive الخاص بالمكتب — دون حساب.
        </p>

        {loading ? (
          <p className="lsd-portal__empty">
            <Loader2 size={14} className="lsd-spin" /> جارٍ تحميل الروابط...
          </p>
        ) : loadError ? (
          <div className="lsd-portal__error">
            <span>{loadError}</span>
            <button type="button" className="lsd-rich-btn lsd-rich-btn--ghost" onClick={load}>
              <RefreshCw size={13} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        ) : links.length === 0 ? (
          <p className="lsd-portal__empty">
            لا توجد روابط متابعة بعد — أنشئ «رابط للعميل» من الأعلى ثم أرسله له عبر واتساب أو البريد.
          </p>
        ) : (
          <ul className="lsd-portal__list">
            {links.map((l) => (
              <li key={l.id} className={`lsd-portal-item ${!l.is_valid ? 'lsd-portal-item--off' : ''}`}>
                <div className="lsd-portal-item__info">
                  <div className="lsd-portal-item__title">
                    {l.audience_label}
                    {l.recipient_name ? ` · ${l.recipient_name}` : ''}
                    <span className={`lsd-portal-badge lsd-portal-badge--${l.is_valid ? 'on' : 'off'}`}>{statusOf(l)}</span>
                  </div>
                  {/* مَن جمهور الرابط؟ وماذا يرى؟ — يزيل الالتباس بين رابط العميل ورابط الخصم */}
                  <div className="lsd-portal-item__audience">{audienceHint(l.audience)}</div>
                  <div className="lsd-portal-item__expiry">
                    <CalendarClock size={12} />
                    <span>{expiryText(l)}</span>
                  </div>
                  <div className="lsd-portal-item__url" dir="ltr">{fullUrl(l.path)}</div>
                </div>
                <div className="lsd-portal-item__btns">
                  {l.is_valid && (
                    <button
                      type="button"
                      className={`lsd-icon-btn ${copiedId === l.id ? 'lsd-icon-btn--copied' : ''}`}
                      title={copiedId === l.id ? 'نُسخ ✓' : 'نسخ الرابط'}
                      onClick={() => handleCopy(l)}
                    >
                      {copiedId === l.id ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  )}
                  {!l.revoked_at && (
                    <button type="button" className="lsd-icon-btn lsd-icon-btn--danger" title="إلغاء الرابط نهائياً" onClick={() => handleRevoke(l.id)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        .lsd-portal__actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .lsd-portal__hint { font-size: 12.5px; color: var(--color-text-secondary); margin: 0 0 12px; line-height: 1.7; }
        .lsd-portal__empty { color: var(--color-text-secondary); font-size: 13px; margin: 4px 0 0; display: flex; align-items: center; gap: 6px; line-height: 1.7; }
        .lsd-portal__error { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--status-red); background: var(--status-red-light); border: 1px solid var(--status-red); border-radius: 8px; padding: 10px 12px; }
        .lsd-portal__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .lsd-portal-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--dashboard-card); }
        .lsd-portal-item--off { opacity: .6; }
        .lsd-portal-item__info { flex: 1; min-width: 0; }
        .lsd-portal-item__title { font-weight: 600; font-size: 13.5px; color: var(--color-text); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .lsd-portal-item__audience { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 3px; }
        .lsd-portal-item__expiry { font-size: 11px; color: var(--color-text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
        .lsd-portal-item__url { font-size: 11px; color: var(--law-navy); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lsd-portal-item__btns { display: flex; gap: 4px; }
        .lsd-portal-badge { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
        .lsd-portal-badge--on { background: var(--status-green-light); color: var(--status-green); }
        .lsd-portal-badge--off { background: var(--quiet-gray-100); color: var(--color-text-secondary); }
        .lsd-icon-btn--copied { color: var(--status-green); }
      `}</style>
    </div>
  );
};

export default PortalLinksPanel;
