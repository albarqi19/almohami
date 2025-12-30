import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Scale,
    ArrowLeft,
    Clock,
    Loader2
} from 'lucide-react';
import type { RecentCase } from '../../../services/dashboardService';

interface CaseItem {
    id: string | number;
    title: string;
    caseType?: string;
    case_type?: string;
    client?: string;
    client_name?: string;
    status: 'active' | 'pending' | 'closed' | string;
    progress: number;
    lastUpdate?: string;
    last_update?: string;
}

interface CasesListWidgetProps {
    cases?: RecentCase[] | CaseItem[];
    limit?: number;
    onCaseClick?: (caseItem: CaseItem) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'نشطة', color: 'var(--clickup-green)', bg: 'var(--clickup-green-light)' },
    pending: { label: 'معلقة', color: 'var(--clickup-orange)', bg: 'var(--clickup-orange-light)' },
    closed: { label: 'مغلقة', color: 'var(--quiet-gray-500)', bg: 'var(--quiet-gray-100)' }
};

const CasesListWidget: React.FC<CasesListWidgetProps> = ({
    cases: initialCases,
    limit = 5,
    onCaseClick
}) => {
    const navigate = useNavigate();

    // تحويل البيانات من API إلى الشكل المتوقع
    const normalizeCase = (c: RecentCase | CaseItem): CaseItem => ({
        id: c.id,
        title: c.title,
        caseType: (c as RecentCase).case_type || (c as CaseItem).caseType || '',
        client: (c as RecentCase).client_name || (c as CaseItem).client || '',
        status: c.status,
        progress: c.progress || 0,
        lastUpdate: (c as RecentCase).last_update || (c as CaseItem).lastUpdate || ''
    });

    const cases = initialCases?.slice(0, limit).map(normalizeCase) || [];

    // Loading state
    if (!initialCases) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--clickup-purple)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>جاري تحميل القضايا...</span>
            </div>
        );
    }

    // Empty state
    if (cases.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                gap: '12px'
            }}>
                <Scale size={32} style={{ color: 'var(--quiet-gray-400)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>لا توجد قضايا نشطة</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cases.map((caseItem) => {
                const status = statusConfig[caseItem.status] || statusConfig.pending;

                return (
                    <div
                        key={caseItem.id}
                        onClick={() => onCaseClick?.(caseItem)}
                        style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'var(--quiet-gray-100)',
                            cursor: 'pointer',
                            transition: 'background 0.1s, border-color 0.1s',
                            border: '1px solid transparent'
                        }}
                        className="case-list-item"
                    >
                        {/* Icon */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--clickup-purple-light)',
                            color: 'var(--clickup-purple)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Scale size={14} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '4px'
                            }}>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: 'var(--color-text)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {caseItem.title}
                                </span>
                                <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    background: status.bg,
                                    color: status.color,
                                    flexShrink: 0,
                                    marginRight: '8px'
                                }}>
                                    {status.label}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontSize: '11px',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {caseItem.client && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <User size={10} />
                                        {caseItem.client}
                                    </span>
                                )}
                                {caseItem.lastUpdate && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Clock size={10} />
                                        {caseItem.lastUpdate}
                                    </span>
                                )}
                            </div>

                            {/* Progress */}
                            {caseItem.progress > 0 && (
                                <div style={{ marginTop: '6px' }}>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar__fill progress-bar__fill--purple"
                                            style={{ width: `${caseItem.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* View More */}
            <button
                onClick={() => navigate('/cases')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--quiet-gray-100)',
                    color: 'var(--clickup-purple)',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '4px',
                    transition: 'background 0.1s'
                }}
            >
                عرض جميع القضايا
                <ArrowLeft size={12} />
            </button>

            <style>{`
        .case-list-item:hover {
          background: var(--clickup-purple-light) !important;
          border-color: var(--clickup-purple) !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default CasesListWidget;
