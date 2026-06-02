// === بطاقة التفعيل ===
// onboarded_at + البيئة + حالة الربط + أزرار: إنشاء فاتورة (CreateInvoiceModal) · عرض نتائج الاختبارات.
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { invoiceService } from '../../services/invoiceService';
import CreateInvoiceModal from '../billing/CreateInvoiceModal';
import ZatcaComplianceResultsModal from './ZatcaComplianceResultsModal';
import { ZatcaEnvBadge } from './ZatcaPageShell';
import { formatDate } from '../../utils/zatcaFormat';

interface Props {
  environment: string | null;
  onboardedAt: string | null;
}

const ZatcaActivationCard: React.FC<Props> = ({ environment, onboardedAt }) => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="zatca-card">
      <div className="zatca-card__head">
        <div className="zatca-card__icon zatca-card__icon--navy"><Link2 size={20} /></div>
        <h3 className="zatca-card__title">حالة الربط</h3>
      </div>

      <div className="zatca-card__body">
        <div className="zatca-card__row">
          <span className="zatca-card__label">الربط</span>
          <span className="zatca-conn zatca-conn--on">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-green)', display: 'inline-block' }} />
            مفعّلة
          </span>
        </div>
        <div className="zatca-card__row">
          <span className="zatca-card__label">البيئة</span>
          <ZatcaEnvBadge environment={environment} />
        </div>
        <div className="zatca-card__row">
          <span className="zatca-card__label">تاريخ التفعيل</span>
          <span className="zatca-card__value">{formatDate(onboardedAt)}</span>
        </div>
      </div>

      <div className="zatca-card__actions">
        <button type="button" className="zatca-btn zatca-btn--primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> إنشاء فاتورة جديدة
        </button>
        <button type="button" className="zatca-btn zatca-btn--ghost" onClick={() => setShowResults(true)}>
          <ClipboardCheck size={15} /> عرض نتائج الاختبارات
        </button>
      </div>

      {/* إعادة استخدام مودال إنشاء الفاتورة الموجود (لا منطق منفصل) */}
      <CreateInvoiceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (data) => {
          await invoiceService.createInvoice(data);
          queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          toast.success('تم إنشاء الفاتورة');
        }}
      />

      {showResults ? <ZatcaComplianceResultsModal onClose={() => setShowResults(false)} /> : null}
    </div>
  );
};

export default ZatcaActivationCard;
