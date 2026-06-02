// === عرض استجابة ZATCA (أخطاء الرفض + تحذيرات المقبولة) ===
import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, FileWarning } from 'lucide-react';

type AnyObj = Record<string, unknown>;

interface Msg { code?: string; message: string; }

// يستخرج رسائل الأخطاء/التحذيرات من أشكال استجابة ZATCA الشائعة.
function extractMessages(response?: AnyObj | null): { errors: Msg[]; warnings: Msg[] } {
  const errors: Msg[] = [];
  const warnings: Msg[] = [];
  if (!response || typeof response !== 'object') return { errors, warnings };

  const pushFrom = (arr: unknown, target: Msg[]) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (typeof item === 'string') target.push({ message: item });
      else if (item && typeof item === 'object') {
        const o = item as AnyObj;
        const message = (o.message ?? o.Message ?? o.text ?? o.error ?? JSON.stringify(o)) as string;
        const code = (o.code ?? o.Code ?? o.category) as string | undefined;
        target.push({ code, message: String(message) });
      }
    });
  };

  // الأشكال الشائعة
  pushFrom((response as AnyObj).errors, errors);
  pushFrom((response as AnyObj).errorMessages, errors);
  pushFrom((response as AnyObj).warnings, warnings);
  pushFrom((response as AnyObj).warningMessages, warnings);

  const vr = (response as AnyObj).validationResults as AnyObj | undefined;
  if (vr && typeof vr === 'object') {
    pushFrom(vr.errorMessages, errors);
    pushFrom(vr.warningMessages, warnings);
  }

  return { errors, warnings };
}

interface PanelProps {
  response?: AnyObj | null;
  warnings?: string[] | null;
}

export const ZatcaResponsePanel: React.FC<PanelProps> = ({ response, warnings }) => {
  const [showRaw, setShowRaw] = useState(false);
  const extracted = extractMessages(response);
  const allWarnings: Msg[] = [
    ...(warnings?.map((w) => ({ message: w })) ?? []),
    ...extracted.warnings,
  ];
  const errors = extracted.errors;
  const hasAny = errors.length > 0 || allWarnings.length > 0;

  return (
    <div className="zatca-response">
      <h4 className="zatca-response__title"><FileWarning size={15} /> استجابة الهيئة</h4>

      {!hasAny ? (
        <p className="zatca-card__desc" style={{ margin: 0 }}>لا توجد أخطاء أو تحذيرات مفصّلة في الاستجابة.</p>
      ) : (
        <ul className="zatca-response__list">
          {errors.map((e, i) => (
            <li key={`e-${i}`} className="zatca-response__item zatca-response__item--error">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{e.code ? <strong>[{e.code}] </strong> : null}{e.message}</span>
            </li>
          ))}
          {allWarnings.map((w, i) => (
            <li key={`w-${i}`} className="zatca-response__item zatca-response__item--warn">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{w.code ? <strong>[{w.code}] </strong> : null}{w.message}</span>
            </li>
          ))}
        </ul>
      )}

      {response ? (
        <>
          <button
            type="button"
            className="zatca-btn zatca-btn--ghost"
            style={{ marginTop: 10, fontSize: 12, padding: '5px 10px' }}
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? 'إخفاء الاستجابة الخام' : 'عرض الاستجابة الخام'}
          </button>
          {showRaw ? <pre className="zatca-response__raw">{JSON.stringify(response, null, 2)}</pre> : null}
        </>
      ) : null}
    </div>
  );
};

interface ModalProps extends PanelProps {
  invoiceNumber?: string;
  onClose: () => void;
}

export const ZatcaResponseModal: React.FC<ModalProps> = ({ response, warnings, invoiceNumber, onClose }) => (
  <div className="zatca-modal-overlay" onClick={onClose}>
    <div className="zatca-modal zatca-modal--wide" onClick={(e) => e.stopPropagation()}>
      <div className="zatca-modal__head">
        <span className="zatca-modal__head-icon" style={{ background: 'var(--status-red-light)', color: 'var(--status-red)' }}>
          <AlertCircle size={17} />
        </span>
        <h3 className="zatca-modal__title">تفاصيل الاستجابة{invoiceNumber ? ` — ${invoiceNumber}` : ''}</h3>
        <button className="zatca-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
      </div>
      <div className="zatca-modal__body">
        <ZatcaResponsePanel response={response} warnings={warnings} />
      </div>
    </div>
  </div>
);

export default ZatcaResponsePanel;
