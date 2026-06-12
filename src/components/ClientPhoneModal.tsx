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
import type { PotentialClient, CaseLinkedClient } from '../services/clientManagementService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

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

    const [linkedClients, setLinkedClients] = useState<CaseLinkedClient[]>([]);
    const [potentialClients, setPotentialClients] = useState<PotentialClient[]>([]);
    const [selectedParty, setSelectedParty] = useState<PotentialClient | null>(null);
    const [selectedLinked, setSelectedLinked] = useState<CaseLinkedClient | null>(null);
    const [changed, setChanged] = useState(false);

    const [phone, setPhone] = useState('');
    const [sendCredentials, setSendCredentials] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setChanged(false);
            loadCaseClients();
        }
    }, [isOpen, caseId]);

    const loadCaseClients = async () => {
        setLoading(true);
        setError('');
        setSelectedParty(null);
        setSelectedLinked(null);
        setPhone('');
        try {
            const [linked, data] = await Promise.all([
                ClientManagementService.getCaseLinkedClients(caseId),
                ClientManagementService.getCaseClients(caseId),
            ]);
            setLinkedClients(linked);
            // استبعاد الأطراف المرتبطين أصلاً كعملاء من قائمة المحتملين
            const linkedNids = new Set(linked.map(c => c.national_id).filter(Boolean));
            setPotentialClients((data.potential_clients || []).filter(p => !linkedNids.has(p.national_id)));
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const finishOrReload = () => {
        setChanged(true);
        // إعادة التحميل بدل الإغلاق — ليكمل إضافة عملاء آخرين إن أراد
        setTimeout(() => { setSuccess(''); loadCaseClients(); }, 1200);
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
                // إنشاء عميل من طرف القضية (يُربط إضافياً إن وُجد عميل رئيسي)
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
            } else if (selectedLinked) {
                // تحديث رقم عميل مرتبط
                const result = await ClientManagementService.updateClientPhone(
                    selectedLinked.id,
                    phone,
                    sendCredentials
                );

                setSuccess(
                    result.credentials_sent
                        ? 'تم تحديث الرقم وإرسال بيانات الدخول'
                        : 'تم تحديث الرقم بنجاح'
                );
            }

            finishOrReload();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ');
        } finally {
            setSubmitting(false);
        }
    };

    // إضافة طرف كعميل بدون رقم جوال (يمكن إضافة الرقم لاحقاً)
    const handleAddPartyWithoutPhone = async () => {
        if (!selectedParty) return;
        setSubmitting(true);
        setError('');
        try {
            const result = await ClientManagementService.createClientFromParty(
                caseId,
                selectedParty.party_id,
                undefined,
                false
            );
            setSuccess(result.is_existing ? 'تم ربط العميل الموجود بالقضية' : 'تم إنشاء حساب العميل (بدون رقم)');
            finishOrReload();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnlink = async (client: CaseLinkedClient, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`فك ربط «${client.name}» عن هذه القضية؟ (لن يرى القضية في بوابته بعد ذلك)`)) return;
        setSubmitting(true);
        setError('');
        try {
            await ClientManagementService.removeCaseClient(caseId, client.id);
            setSuccess('تم فك الربط');
            finishOrReload();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectParty = (party: PotentialClient) => {
        setSelectedParty(party);
        setSelectedLinked(null);
        setPhone(party.phone || '');
        setError('');
    };

    const handleSelectLinked = (client: CaseLinkedClient) => {
        setSelectedLinked(client);
        setSelectedParty(null);
        setPhone(client.phone || '');
        setError('');
    };

    const handleClose = () => {
        if (changed) onSuccess?.();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content modal-content--md" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <Users size={20} /> عملاء القضية
                    </h2>
                    <button className="modal-close" onClick={handleClose}>
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
                            {/* عملاء القضية المرتبطون (الرئيسي + الإضافيون) */}
                            {linkedClients.length > 0 && (
                                <div className="client-phone-section">
                                    <h3 className="client-phone-section__title">
                                        <User size={16} /> عملاء القضية ({linkedClients.length})
                                    </h3>
                                    <div className="client-phone-list">
                                        {linkedClients.map(client => (
                                            <div
                                                key={client.id}
                                                className={`client-card ${selectedLinked?.id === client.id ? 'client-card--selected' : ''}`}
                                                onClick={() => handleSelectLinked(client)}
                                            >
                                                <div className="client-card__avatar">
                                                    {client.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="client-card__info">
                                                    <div className="client-card__name">{client.name}</div>
                                                    <div className="client-card__id">{client.national_id}</div>
                                                    {client.phone ? (
                                                        <div className="client-card__phone">
                                                            <Phone size={12} /> {client.phone}
                                                        </div>
                                                    ) : (
                                                        <div className="client-card__no-phone">بدون رقم جوال</div>
                                                    )}
                                                </div>
                                                {client.is_primary && (
                                                    <span className="client-card__badge client-card__badge--success">رئيسي</span>
                                                )}
                                                {!client.phone && (
                                                    <span className="client-card__badge client-card__badge--warning">يحتاج رقم</span>
                                                )}
                                                {!client.is_primary && (
                                                    <button
                                                        type="button"
                                                        title="فك ربط العميل عن القضية"
                                                        onClick={(e) => handleUnlink(client, e)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* أطراف القضية الذين يمكن إضافتهم كعملاء (يدعم الإضافة تباعاً) */}
                            {potentialClients.length > 0 && (
                                <div className="client-phone-section">
                                    <h3 className="client-phone-section__title">
                                        <UserPlus size={16} /> أطراف يمكن إضافتهم كعملاء
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
                                                        {(({ plaintiff: 'مدعي', defendant: 'مدعى عليه', lawyer: 'محامٍ', agent: 'وكيل/ممثل', appellant: 'المستأنِف', appellee: 'المستأنَف ضدّه' } as Record<string, string>)[party.side] || party.role || 'طرف')} - {party.role}
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
                            {(selectedParty || selectedLinked) && (
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
                    <button className="btn-secondary" onClick={handleClose} disabled={submitting}>
                        إغلاق
                    </button>
                    {selectedParty && (
                        <button
                            className="btn-secondary"
                            onClick={handleAddPartyWithoutPhone}
                            disabled={submitting || loading}
                            title="إنشاء حساب العميل وربطه دون رقم — يمكن إضافة الرقم لاحقاً"
                        >
                            <UserPlus size={16} />
                            إضافة بدون رقم
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={handleUpdatePhone}
                        disabled={submitting || loading || (!selectedParty && !selectedLinked)}
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
