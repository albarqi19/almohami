import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Scroll,
    Link2,
    Unlink,
    AlertTriangle,
    AlertCircle,
    RotateCcw,
    Calendar,
    Lightbulb,
    Eye,
} from 'lucide-react';
import {
    CaseWekalaService,
    type CaseWekalatResponse,
    type CaseWekalaItem,
    type WekalaExpiryState,
} from '../services/caseWekalaService';
import { WekalatService } from '../services/wekalatService';
import type { Wekala } from '../types';
import LinkWekalaModal from './LinkWekalaModal';
import { WekalaModal } from '../pages/Wekalat';
import '../styles/case-wekalat-panel.css';

interface Props {
    caseId: number | string;
    caseFileNumber?: string;
    onCountsChange?: (counts: { matched: number; suggested: number }) => void;
}

const STATUS_BADGE_MAP: Record<string, string> = {
    'معتمدة': 'cw-badge--approved',
    'منتهية': 'cw-badge--expired',
    'مفسوخة': 'cw-badge--terminated',
    'قيد الاعتماد': 'cw-badge--pending',
    'موقوفة': 'cw-badge--suspended',
};

const formatDate = (s?: string | null): string => {
    if (!s) return '—';
    try {
        const d = new Date(s);
        return d.toLocaleDateString('ar-SA-u-ca-gregory', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
    } catch {
        return s;
    }
};

const daysClass = (state: WekalaExpiryState, days: number | null): string => {
    if (state === 'expired' || state === 'terminated') return 'cw-days cw-days--expired';
    if (state === 'expiring_urgent') return 'cw-days cw-days--urgent';
    if (state === 'expiring_soon') return 'cw-days cw-days--soon';
    if (state === 'active' && days !== null) return 'cw-days cw-days--ok';
    return 'cw-days cw-days--none';
};

const daysText = (state: WekalaExpiryState, days: number | null): string => {
    if (state === 'expired') return 'منتهية';
    if (state === 'terminated') return 'مفسوخة';
    if (days === null) return '—';
    if (days <= 0) return 'تنتهي اليوم';
    return `${days} يوم`;
};

const buildMatchReason = (item: CaseWekalaItem): string => {
    const parts: string[] = [];
    if (item.match_reason.clients.length > 0) {
        parts.push(`موكل: ${item.match_reason.clients.join('، ')}`);
    }
    if (item.match_reason.agents.length > 0) {
        parts.push(`محامي: ${item.match_reason.agents.join('، ')}`);
    }
    if (item.is_manual_include) {
        parts.push('ربط يدوي');
    }
    return parts.join(' · ');
};

const CaseWekalatPanel: React.FC<Props> = ({ caseId, caseFileNumber, onCountsChange }) => {
    const [data, setData] = useState<CaseWekalatResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [busyWekalaId, setBusyWekalaId] = useState<number | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [previewWekala, setPreviewWekala] = useState<Wekala | null>(null);
    const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await CaseWekalaService.forCase(caseId);
            setData(res);
            onCountsChange?.({
                matched: res.summary.matched_count,
                suggested: res.summary.suggested_count,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'فشل التحميل');
        } finally {
            setLoading(false);
        }
    }, [caseId, onCountsChange]);

    useEffect(() => { load(); }, [load]);

    const handleExclude = async (wekalaId: number) => {
        if (!confirm('استثناء هذه الوكالة من القضية؟')) return;
        setBusyWekalaId(wekalaId);
        try {
            await CaseWekalaService.override(caseId, wekalaId, 'exclude');
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'فشل الإجراء');
        } finally {
            setBusyWekalaId(null);
        }
    };

    const handleRemoveOverride = async (wekalaId: number) => {
        setBusyWekalaId(wekalaId);
        try {
            await CaseWekalaService.removeOverride(caseId, wekalaId);
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'فشل الإجراء');
        } finally {
            setBusyWekalaId(null);
        }
    };

    const handlePreview = async (wekalaId: number) => {
        setPreviewLoadingId(wekalaId);
        try {
            const w = await WekalatService.getWekala(wekalaId);
            setPreviewWekala(w);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'فشل جلب الوكالة');
        } finally {
            setPreviewLoadingId(null);
        }
    };

    const handleIncludeSuggested = async (wekalaId: number) => {
        setBusyWekalaId(wekalaId);
        try {
            await CaseWekalaService.override(caseId, wekalaId, 'include');
            await load();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'فشل الإجراء');
        } finally {
            setBusyWekalaId(null);
        }
    };

    const includedList = useMemo(() => {
        if (!data) return [];
        return [...data.matched, ...data.manual];
    }, [data]);

    const suggestedList = useMemo(() => {
        if (!data) return [];
        return [...data.suggested_client_only, ...data.suggested_lawyer_only];
    }, [data]);

    if (loading) {
        return (
            <div className="cw-panel">
                <div className="cw-loading">جاري تحميل وكالات القضية…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cw-panel">
                <div className="cw-alert cw-alert--danger">
                    <AlertCircle size={14} /> {error}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const expiredCount = includedList.filter(i => i.expiry_state === 'expired' || i.expiry_state === 'terminated').length;
    const summary = data.summary;

    return (
        <>
            <div className="cw-panel">
                {/* Header */}
                <div className="cw-head">
                    <Scroll size={16} className="cw-head__icon" />
                    <div className="cw-head__title">وكالات القضية</div>
                    <div className="cw-head__chips">
                        <span className="cw-chip">مطابقة {summary.matched_count}</span>
                        {summary.suggested_count > 0 && (
                            <span className="cw-chip cw-chip--muted">اقتراحات {summary.suggested_count}</span>
                        )}
                        {expiredCount > 0 && (
                            <span className="cw-chip cw-chip--danger">منتهية {expiredCount}</span>
                        )}
                    </div>
                    <div className="cw-head__spacer" />
                    <button className="cw-btn cw-btn--sm" onClick={() => setShowLinkModal(true)}>
                        <Link2 size={13} /> ربط وكالة
                    </button>
                </div>

                {/* Alerts */}
                {summary.has_expired_only && (
                    <div className="cw-alert cw-alert--danger">
                        <AlertTriangle size={14} />
                        كل وكالات القضية منتهية. يُنصح بإصدار وكالة جديدة قبل الجلسة القادمة.
                    </div>
                )}
                {!summary.has_expired_only && summary.has_expiring_soon && summary.primary_active_wekala && (
                    <div className="cw-alert cw-alert--warn">
                        <AlertTriangle size={14} />
                        الوكالة #{summary.primary_active_wekala.number} تنتهي خلال {summary.primary_active_wekala.days_until_expiry ?? 0} يوم
                    </div>
                )}
                {includedList.length === 0 && (
                    <div className="cw-alert cw-alert--warn">
                        <AlertCircle size={14} />
                        لا توجد وكالة مرتبطة بهذه القضية في النظام.
                    </div>
                )}

                {/* Body grid */}
                <div className="cw-body">
                    <div className="cw-grid">
                        {/* Matched + Manual */}
                        <div className="cw-sub">
                            <div className="cw-sub__head">
                                <Scroll size={13} />
                                الوكالات المرتبطة
                                <span className="cw-sub__count">{includedList.length}</span>
                            </div>
                            <div className="cw-sub__body">
                                {includedList.length === 0 ? (
                                    <div className="cw-empty">لا توجد وكالات مرتبطة بعد.</div>
                                ) : (
                                    <table className="cw-table">
                                        <thead>
                                            <tr>
                                                <th>الرقم</th>
                                                <th>الحالة</th>
                                                <th>الانتهاء</th>
                                                <th>المتبقي</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {includedList.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="cw-table__num">{item.number}</div>
                                                        {item.type && <div className="cw-table__type">{item.type}</div>}
                                                        <span className="cw-match-reason" title={buildMatchReason(item)}>
                                                            {buildMatchReason(item)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`cw-badge ${STATUS_BADGE_MAP[item.status] ?? 'cw-badge--pending'}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(item.expiry_date_gregorian)}</td>
                                                    <td>
                                                        <span className={daysClass(item.expiry_state, item.days_until_expiry)}>
                                                            {daysText(item.expiry_state, item.days_until_expiry)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="cw-row-actions">
                                                            <button
                                                                className="cw-icon-btn"
                                                                title="معاينة"
                                                                disabled={previewLoadingId === item.id}
                                                                onClick={() => handlePreview(item.id)}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            {item.is_manual_include ? (
                                                                <button
                                                                    className="cw-icon-btn"
                                                                    title="إلغاء الربط اليدوي"
                                                                    disabled={busyWekalaId === item.id}
                                                                    onClick={() => handleRemoveOverride(item.id)}
                                                                >
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="cw-icon-btn cw-icon-btn--danger"
                                                                    title="استثناء من القضية"
                                                                    disabled={busyWekalaId === item.id}
                                                                    onClick={() => handleExclude(item.id)}
                                                                >
                                                                    <Unlink size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Suggested */}
                        <div className="cw-sub">
                            <div className="cw-sub__head">
                                <Lightbulb size={13} />
                                اقتراحات (مطابقة جزئية)
                                <span className="cw-sub__count">{suggestedList.length}</span>
                            </div>
                            <div className="cw-sub__body">
                                {suggestedList.length === 0 ? (
                                    <div className="cw-empty">لا توجد اقتراحات.</div>
                                ) : (
                                    <table className="cw-table">
                                        <thead>
                                            <tr>
                                                <th>الرقم</th>
                                                <th>الحالة</th>
                                                <th>السبب</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suggestedList.map(item => {
                                                const reasonText = item.match_reason.clients.length > 0
                                                    ? `الموكل فقط: ${item.match_reason.clients.join('، ')}`
                                                    : `المحامي فقط: ${item.match_reason.agents.join('، ')}`;
                                                return (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <div className="cw-table__num">{item.number}</div>
                                                            <div className="cw-table__type">
                                                                <Calendar size={10} style={{ display: 'inline', marginInlineEnd: 3 }} />
                                                                {formatDate(item.expiry_date_gregorian)}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`cw-badge ${STATUS_BADGE_MAP[item.status] ?? 'cw-badge--pending'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="cw-match-reason" title={reasonText}>
                                                                {reasonText}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="cw-row-actions">
                                                                <button
                                                                    className="cw-icon-btn"
                                                                    title="معاينة"
                                                                    disabled={previewLoadingId === item.id}
                                                                    onClick={() => handlePreview(item.id)}
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    className="cw-btn cw-btn--ghost cw-btn--sm"
                                                                    disabled={busyWekalaId === item.id}
                                                                    onClick={() => handleIncludeSuggested(item.id)}
                                                                >
                                                                    <Link2 size={12} /> ربط
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showLinkModal && (
                <LinkWekalaModal
                    isOpen={showLinkModal}
                    onClose={() => setShowLinkModal(false)}
                    caseId={caseId}
                    caseFileNumber={caseFileNumber}
                    excludeIds={[...includedList.map(w => w.id), ...suggestedList.map(w => w.id)]}
                    onLinked={async () => {
                        setShowLinkModal(false);
                        await load();
                    }}
                />
            )}

            {previewWekala && (
                <WekalaModal
                    wekala={previewWekala}
                    isOpen={true}
                    onClose={() => setPreviewWekala(null)}
                />
            )}
        </>
    );
};

export default CaseWekalatPanel;
