import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Copy, Trash2, UserPlus, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import type { ServicePortalLinkItem } from '../../types/legalServices';

interface PortalLinksPanelProps {
  serviceId: number;
}

const fullUrl = (path: string) => `${window.location.origin}${path}`;

const PortalLinksPanel: React.FC<PortalLinksPanelProps> = ({ serviceId }) => {
  const [links, setLinks] = useState<ServicePortalLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LegalServiceService.listPortalLinks(serviceId);
      if (res.success) setLinks(res.data);
    } catch {
      // تجاهل
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
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
        toast.success('تم إنشاء الرابط');
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر إنشاء الرابط');
    } finally {
      setCreating(null);
    }
  };

  const handleCopy = async (link: ServicePortalLinkItem) => {
    try {
      await navigator.clipboard.writeText(fullUrl(link.path));
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('تعذّر النسخ — انسخ الرابط يدوياً');
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
      toast.error(err instanceof Error ? err.message : 'تعذّر إلغاء الرابط');
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
          >
            {creating === 'client' ? <Loader2 size={14} className="lsd-spin" /> : <UserPlus size={14} />}
            <span>رابط للعميل</span>
          </button>
          <button
            type="button"
            className="lsd-rich-btn lsd-rich-btn--ghost"
            onClick={() => handleCreate('adversary')}
            disabled={creating !== null}
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
          <p className="lsd-portal__empty">جارٍ التحميل...</p>
        ) : links.length === 0 ? (
          <p className="lsd-portal__empty">لا توجد روابط متابعة بعد.</p>
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
                  <div className="lsd-portal-item__url" dir="ltr">{fullUrl(l.path)}</div>
                </div>
                <div className="lsd-portal-item__btns">
                  {l.is_valid && (
                    <button type="button" className="lsd-icon-btn" title="نسخ الرابط" onClick={() => handleCopy(l)}>
                      <Copy size={15} />
                    </button>
                  )}
                  {!l.revoked_at && (
                    <button type="button" className="lsd-icon-btn lsd-icon-btn--danger" title="إلغاء" onClick={() => handleRevoke(l.id)}>
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
        .lsd-portal__hint { font-size: 12.5px; color: var(--color-text-light, #6b7280); margin: 0 0 12px; line-height: 1.7; }
        .lsd-portal__empty { color: var(--color-text-light, #9ca3af); font-size: 13px; margin: 4px 0 0; }
        .lsd-portal__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .lsd-portal-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 10px; }
        .lsd-portal-item--off { opacity: .6; }
        .lsd-portal-item__info { flex: 1; min-width: 0; }
        .lsd-portal-item__title { font-weight: 600; font-size: 13.5px; color: var(--color-text, #1f2937); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .lsd-portal-item__url { font-size: 11px; color: #2563eb; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lsd-portal-item__btns { display: flex; gap: 4px; }
        .lsd-portal-badge { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
        .lsd-portal-badge--on { background: #dcfce7; color: #166534; }
        .lsd-portal-badge--off { background: #f1f5f9; color: #64748b; }
        body.dark .lsd-portal-item { border-color: #333; }
      `}</style>
    </div>
  );
};

export default PortalLinksPanel;
