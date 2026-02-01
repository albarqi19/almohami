import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link2,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building,
  Calendar,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { CaseService } from '../services/caseService';
import type { Case } from '../types';
import '../styles/link-to-najiz-modal.css';

interface LinkToNajizModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string | number;
  caseTitle: string;
  onSuccess: () => void;
}

const LinkToNajizModal: React.FC<LinkToNajizModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  onSuccess
}) => {
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCases, setAvailableCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCases();
      setSelectedCase(null);
      setShowConfirm(false);
      setError(null);
      setSearchTerm('');
    }
  }, [isOpen, caseId]);

  const fetchAvailableCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const cases = await CaseService.getAvailableNajizCases(caseId);
      setAvailableCases(cases);
    } catch (err: any) {
      setError(err.message || 'فشل في جلب قضايا ناجز');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedCase) return;

    try {
      setLinking(true);
      setError(null);
      await CaseService.linkToNajiz(caseId, Number(selectedCase.id));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في ربط القضية');
      setShowConfirm(false);
    } finally {
      setLinking(false);
    }
  };

  const filteredCases = availableCases.filter(c =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.file_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.najiz_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
      return new Date(date).toLocaleDateString('ar-SA');
    } catch {
      return date;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="link-najiz-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.15 }}
          className="link-najiz-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="link-najiz-header">
            <div className="link-najiz-header-icon">
              <Link2 size={20} />
            </div>
            <div className="link-najiz-header-title">
              <h2>ربط مع قضية ناجز</h2>
              <span className="link-najiz-subtitle">{caseTitle}</span>
            </div>
            <button className="link-najiz-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="link-najiz-body">
            {error && (
              <div className="link-najiz-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {!showConfirm ? (
              <>
                {/* Search */}
                <div className="link-najiz-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="ابحث برقم القضية أو العنوان..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Cases List */}
                <div className="link-najiz-cases-list">
                  {loading ? (
                    <div className="link-najiz-loading">
                      <Loader2 size={24} className="animate-spin" />
                      <span>جاري البحث عن قضايا ناجز...</span>
                    </div>
                  ) : filteredCases.length === 0 ? (
                    <div className="link-najiz-empty">
                      <FileText size={40} />
                      <p>لا توجد قضايا ناجز متاحة للربط</p>
                      <span>تأكد من أن العميل لديه قضايا مستوردة من ناجز</span>
                    </div>
                  ) : (
                    filteredCases.map((najizCase) => (
                      <div
                        key={najizCase.id}
                        className={`link-najiz-case-item ${selectedCase?.id === najizCase.id ? 'selected' : ''}`}
                        onClick={() => setSelectedCase(najizCase)}
                      >
                        <div className="link-najiz-case-radio">
                          {selectedCase?.id === najizCase.id ? (
                            <CheckCircle size={18} />
                          ) : (
                            <div className="link-najiz-case-radio-empty" />
                          )}
                        </div>
                        <div className="link-najiz-case-content">
                          <div className="link-najiz-case-title">
                            {najizCase.title}
                          </div>
                          <div className="link-najiz-case-meta">
                            <span>
                              <FileText size={12} />
                              {najizCase.file_number}
                            </span>
                            {najizCase.najiz_id && (
                              <span>
                                <ExternalLink size={12} />
                                ناجز: {najizCase.najiz_id}
                              </span>
                            )}
                            {najizCase.court && (
                              <span>
                                <Building size={12} />
                                {najizCase.court}
                              </span>
                            )}
                            <span>
                              <Calendar size={12} />
                              {formatDate(najizCase.najiz_synced_at || najizCase.created_at)}
                            </span>
                          </div>
                          {najizCase.najiz_status && (
                            <div className="link-najiz-case-status">
                              {najizCase.najiz_status}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Confirmation View */
              <div className="link-najiz-confirm">
                <div className="link-najiz-confirm-icon">
                  <AlertCircle size={48} />
                </div>
                <h3>تأكيد الربط</h3>
                <p>
                  سيتم ربط القضية المحلية مع قضية ناجز المختارة. هذا يعني:
                </p>
                <ul>
                  <li>سيتم تحديث عنوان القضية ليطابق عنوان قضية ناجز</li>
                  <li>سيتم نقل بيانات ناجز (الرقم، الرابط، الحالة) للقضية المحلية</li>
                  <li>سيتم دمج الأطراف والجلسات</li>
                  <li>سيتم الحفاظ على جميع الوثائق والمهام والعقود المحلية</li>
                  <li>سيتم أرشفة القضية المستوردة الأصلية</li>
                </ul>

                <div className="link-najiz-confirm-cases">
                  <div className="link-najiz-confirm-case">
                    <span className="label">القضية المحلية:</span>
                    <span className="value">{caseTitle}</span>
                  </div>
                  <ArrowLeft size={20} />
                  <div className="link-najiz-confirm-case">
                    <span className="label">قضية ناجز:</span>
                    <span className="value">{selectedCase?.title}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="link-najiz-footer">
            {!showConfirm ? (
              <>
                <button
                  className="link-najiz-btn link-najiz-btn-secondary"
                  onClick={onClose}
                >
                  إلغاء
                </button>
                <button
                  className="link-najiz-btn link-najiz-btn-primary"
                  disabled={!selectedCase}
                  onClick={() => setShowConfirm(true)}
                >
                  <Link2 size={14} />
                  متابعة
                </button>
              </>
            ) : (
              <>
                <button
                  className="link-najiz-btn link-najiz-btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  disabled={linking}
                >
                  رجوع
                </button>
                <button
                  className="link-najiz-btn link-najiz-btn-danger"
                  disabled={linking}
                  onClick={handleLink}
                >
                  {linking ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      جاري الربط...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      تأكيد الربط
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LinkToNajizModal;
