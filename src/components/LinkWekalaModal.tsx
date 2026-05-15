import React, { useEffect, useMemo, useState } from 'react';
import { X, Link2, Search, AlertCircle, Scroll } from 'lucide-react';
import { WekalatService } from '../services/wekalatService';
import { CaseWekalaService } from '../services/caseWekalaService';
import type { Wekala } from '../types';
import '../styles/case-wekalat-panel.css';
import '../styles/share-case-modal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    caseId: number | string;
    caseFileNumber?: string;
    /** ids to hide from selectable list (already linked/suggested) */
    excludeIds?: number[];
    onLinked: () => void | Promise<void>;
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
        return new Date(s).toLocaleDateString('ar-SA-u-ca-gregory', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
    } catch { return s; }
};

const LinkWekalaModal: React.FC<Props> = ({
    isOpen, onClose, caseId, caseFileNumber, excludeIds = [], onLinked
}) => {
    const [list, setList] = useState<Wekala[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setSelectedId(null);
        setNote('');
        setSearch('');
        let cancelled = false;
        setLoading(true);
        WekalatService.getWekalat({ per_page: 100 } as any)
            .then(res => {
                if (cancelled) return;
                const items = (res?.data ?? []) as Wekala[];
                setList(items);
            })
            .catch(e => {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'فشل تحميل قائمة الوكالات');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen]);

    const filtered = useMemo(() => {
        const excludeSet = new Set(excludeIds);
        const term = search.trim();
        return list.filter(w => {
            if (excludeSet.has(w.id)) return false;
            if (!term) return true;
            const haystack = `${w.number} ${w.type ?? ''} ${w.status}`.toLowerCase();
            return haystack.includes(term.toLowerCase());
        });
    }, [list, excludeIds, search]);

    const submit = async () => {
        if (!selectedId) return;
        setSubmitting(true);
        setError('');
        try {
            await CaseWekalaService.override(caseId, selectedId, 'include', note || undefined);
            await onLinked();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'فشل الربط');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="sc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="sc-modal" style={{ maxWidth: 560 }}>
                <div className="sc-header">
                    <Scroll size={16} className="sc-header__icon" />
                    <div className="sc-header__title">ربط وكالة بالقضية</div>
                    {caseFileNumber && (
                        <div className="sc-header__case" title={caseFileNumber}>#{caseFileNumber}</div>
                    )}
                    <div className="sc-header__spacer" />
                    <button className="sc-share-btn" disabled={!selectedId || submitting} onClick={submit}>
                        <Link2 size={13} /> {submitting ? 'جاري الربط…' : 'ربط'}
                    </button>
                    <button className="sc-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div className="sc-alert sc-alert--error">
                        <AlertCircle size={13} /> {error}
                    </div>
                )}

                <div className="sc-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="بحث برقم الوكالة أو النوع أو الحالة…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="sc-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="cw-loading">جاري التحميل…</div>
                    ) : filtered.length === 0 ? (
                        <div className="cw-empty">لا توجد وكالات متاحة للربط.</div>
                    ) : (
                        <table className="cw-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 36 }}></th>
                                    <th>الرقم</th>
                                    <th>النوع</th>
                                    <th>الحالة</th>
                                    <th>الانتهاء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(w => (
                                    <tr
                                        key={w.id}
                                        onClick={() => setSelectedId(w.id)}
                                        style={{ cursor: 'pointer', background: selectedId === w.id ? 'rgba(30,58,95,.06)' : undefined }}
                                    >
                                        <td>
                                            <input
                                                type="radio"
                                                name="wekala_pick"
                                                className="sc-checkbox"
                                                checked={selectedId === w.id}
                                                onChange={() => setSelectedId(w.id)}
                                            />
                                        </td>
                                        <td className="cw-table__num">{w.number}</td>
                                        <td className="cw-table__type">{w.type || '—'}</td>
                                        <td>
                                            <span className={`cw-badge ${STATUS_BADGE_MAP[w.status] ?? 'cw-badge--pending'}`}>
                                                {w.status}
                                            </span>
                                        </td>
                                        <td>{formatDate(w.expiry_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {selectedId && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)' }}>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="ملاحظة (اختيارية) — لماذا تربط هذه الوكالة يدوياً؟"
                            style={{
                                width: '100%', border: '1px solid var(--color-border)', borderRadius: 5,
                                padding: '6px 10px', fontSize: 12, fontFamily: 'inherit',
                                background: 'var(--dashboard-card)', color: 'var(--color-text)'
                            }}
                            maxLength={500}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LinkWekalaModal;
