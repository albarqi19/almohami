import React, { useState, useEffect } from 'react';
import {
    X,
    Phone,
    User,
    Send,
    AlertCircle,
    CheckCircle,
    UserPlus,
    Users
} from 'lucide-react';
import { ClientManagementService } from '../services/clientManagementService';
import type { PotentialClient, Client } from '../services/clientManagementService';
import '../styles/client-phone-modal.css';

interface ClientPhoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: number | string;
    onSuccess?: () => void;
}

const ClientPhoneModal: React.FC<ClientPhoneModalProps> = ({
    isOpen,
    onClose,
    caseId,
    onSuccess
}) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [currentClient, setCurrentClient] = useState<Client | null>(null);
    const [potentialClients, setPotentialClients] = useState<PotentialClient[]>([]);
    const [selectedParty, setSelectedParty] = useState<PotentialClient | null>(null);

    const [phone, setPhone] = useState('');
    const [sendCredentials, setSendCredentials] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadCaseClients();
        }
    }, [isOpen, caseId]);

    const loadCaseClients = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await ClientManagementService.getCaseClients(caseId);
            setCurrentClient(data.client);
            setPotentialClients(data.potential_clients);

            // إذا كان هناك عميل موجود بدون رقم، تعبئة الحقل
            if (data.client && !data.client.phone) {
                setSelectedParty(null);
            }
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePhone = async () => {
        if (!phone || !phone.match(/^05[0-9]{8}$/)) {
            setError('يرجى إدخال رقم جوال صالح يبدأ بـ 05');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (selectedParty) {
                // إنشاء عميل جديد من طرف القضية
                const result = await ClientManagementService.createClientFromParty(
                    caseId,
                    selectedParty.party_id,
                    phone,
                    sendCredentials
                );

                if (result.is_existing) {
                    setSuccess('تم ربط العميل الموجود بالقضية');
                } else {
                    setSuccess(
                        result.credentials_sent
                            ? 'تم إنشاء حساب العميل وإرسال بيانات الدخول'
                            : 'تم إنشاء حساب العميل بنجاح'
                    );
                }
            } else if (currentClient) {
                // تحديث رقم العميل الحالي
                const result = await ClientManagementService.updateClientPhone(
                    currentClient.id,
                    phone,
                    sendCredentials
                );

                setSuccess(
                    result.credentials_sent
                        ? 'تم تحديث الرقم وإرسال بيانات الدخول'
                        : 'تم تحديث الرقم بنجاح'
                );
            }

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectParty = (party: PotentialClient) => {
        setSelectedParty(party);
        setPhone(party.phone || '');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--md" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <Users size={20} /> إضافة رقم جوال العميل
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="modal-error">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {success && (
                        <div className="modal-success">
                            <CheckCircle size={14} /> {success}
                        </div>
                    )}

                    {loading ? (
                        <div className="client-phone-loading">جاري التحميل...</div>
                    ) : (
                        <>
                            {/* العميل الحالي */}
                            {currentClient && (
                                <div className="client-phone-section">
                                    <h3 className="client-phone-section__title">
                                        <User size={16} /> العميل المرتبط
                                    </h3>
                                    <div className={`client-card ${!selectedParty ? 'client-card--selected' : ''}`}
                                        onClick={() => { setSelectedParty(null); setPhone(currentClient.phone || ''); }}>
                                        <div className="client-card__avatar">
                                            {currentClient.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="client-card__info">
                                            <div className="client-card__name">{currentClient.name}</div>
                                            <div className="client-card__id">{currentClient.national_id}</div>
                                            {currentClient.phone ? (
                                                <div className="client-card__phone">
                                                    <Phone size={12} /> {currentClient.phone}
                                                </div>
                                            ) : (
                                                <div className="client-card__no-phone">بدون رقم جوال</div>
                                            )}
                                        </div>
                                        {!currentClient.phone && (
                                            <span className="client-card__badge client-card__badge--warning">
                                                يحتاج رقم
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* العملاء المحتملين - يظهر فقط إذا لم يكن هناك عميل مرتبط */}
                            {!currentClient && potentialClients.length > 0 && (
                                <div className="client-phone-section">
                                    <h3 className="client-phone-section__title">
                                        <UserPlus size={16} /> أطراف القضية (عملاء محتملين)
                                    </h3>
                                    <div className="client-phone-list">
                                        {potentialClients.map(party => (
                                            <div
                                                key={party.party_id}
                                                className={`client-card ${selectedParty?.party_id === party.party_id ? 'client-card--selected' : ''}`}
                                                onClick={() => handleSelectParty(party)}
                                            >
                                                <div className="client-card__avatar">
                                                    {party.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="client-card__info">
                                                    <div className="client-card__name">{party.name}</div>
                                                    <div className="client-card__id">{party.national_id}</div>
                                                    <div className="client-card__role">
                                                        {party.side === 'plaintiff' ? 'مدعي' : 'مدعى عليه'} - {party.role}
                                                    </div>
                                                </div>
                                                {party.has_account ? (
                                                    party.has_phone ? (
                                                        <span className="client-card__badge client-card__badge--success">
                                                            مسجل + رقم
                                                        </span>
                                                    ) : (
                                                        <span className="client-card__badge client-card__badge--warning">
                                                            مسجل بدون رقم
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="client-card__badge">
                                                        غير مسجل
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* إدخال رقم الجوال */}
                            {(selectedParty || (currentClient && !currentClient.phone)) && (
                                <div className="client-phone-section">
                                    <h3 className="client-phone-section__title">
                                        <Phone size={16} /> رقم الجوال
                                    </h3>
                                    <div className="client-phone-form">
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="05xxxxxxxx"
                                            className="client-phone-input"
                                            dir="ltr"
                                        />
                                        <label className="client-phone-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={sendCredentials}
                                                onChange={e => setSendCredentials(e.target.checked)}
                                            />
                                            <span>إرسال بيانات الدخول عبر WhatsApp</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={submitting}>
                        إلغاء
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleUpdatePhone}
                        disabled={submitting || loading || (!selectedParty && currentClient?.phone !== null)}
                    >
                        <Send size={16} />
                        {submitting ? 'جاري الإرسال...' : selectedParty ? 'إنشاء وإرسال' : 'تحديث وإرسال'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientPhoneModal;
