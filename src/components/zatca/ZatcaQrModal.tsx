// === مودال عرض رمز QR (المكان الوحيد لعرض QR) ===
// يُفضَّل <img src="data:image/svg+xml,..."> — الـ img لا تنفّذ scripts داخل SVG (أأمن من dangerouslySetInnerHTML).
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, QrCode, Loader2 } from 'lucide-react';
import { zatcaService } from '../../services/zatcaService';

interface Props {
  invoiceId: number;
  invoiceNumber?: string;
  uuid?: string | null;
  icv?: number | null;
  onClose: () => void;
}

const ZatcaQrModal: React.FC<Props> = ({ invoiceId, invoiceNumber, uuid, icv, onClose }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['zatca', 'qr', invoiceId],
    queryFn: async () => {
      const res = await zatcaService.getQr(invoiceId);
      return res.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const svg = data?.qr_svg;

  return (
    <div className="zatca-modal-overlay" onClick={onClose}>
      <div className="zatca-modal" onClick={(e) => e.stopPropagation()}>
        <div className="zatca-modal__head">
          <span className="zatca-modal__head-icon"><QrCode size={17} /></span>
          <h3 className="zatca-modal__title">رمز QR{invoiceNumber ? ` — ${invoiceNumber}` : ''}</h3>
          <button className="zatca-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="zatca-modal__body">
          {isLoading ? (
            <div className="zatca-list-loading"><Loader2 size={20} className="zatca-spin" /> جارٍ تحميل الرمز…</div>
          ) : isError ? (
            <div className="zatca-form-error">{error instanceof Error ? error.message : 'تعذّر تحميل رمز QR'}</div>
          ) : !svg ? (
            <div className="zatca-compliance-empty">لا يوجد رمز QR لهذه الفاتورة بعد.</div>
          ) : (
            <div className="zatca-qr">
              <img
                className="zatca-qr__img"
                src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
                alt={`رمز QR للفاتورة ${invoiceNumber ?? invoiceId}`}
              />
              <div className="zatca-qr__meta">
                {uuid ? (
                  <div className="zatca-card__row">
                    <span className="zatca-card__label">UUID</span>
                    <span className="zatca-card__value zatca-card__value--ltr" style={{ fontSize: 10.5 }}>{uuid}</span>
                  </div>
                ) : null}
                {typeof icv === 'number' ? (
                  <div className="zatca-card__row">
                    <span className="zatca-card__label">ICV</span>
                    <span className="zatca-card__value zatca-card__value--ltr">{icv}</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZatcaQrModal;
