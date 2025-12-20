import React from 'react';
import {
    FileText,
    User,
    Scale,
    ArrowLeft,
    Clock
} from 'lucide-react';

interface CaseItem {
    id: string;
    title: string;
    caseType: string;
    client: string;
    status: 'active' | 'pending' | 'closed';
    progress: number;
    lastUpdate: string;
}

interface CasesListWidgetProps {
    cases?: CaseItem[];
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
    const defaultCases: CaseItem[] = [
        {
            id: '1',
            title: 'القضية العقارية - نزاع ملكية',
            caseType: 'عقارية',
            client: 'أحمد محمد العتيبي',
            status: 'active',
            progress: 65,
            lastUpdate: 'منذ ساعتين'
        },
        {
            id: '2',
            title: 'نزاع تجاري - خلاف شراكة',
            caseType: 'تجارية',
            client: 'شركة النور للتجارة',
            status: 'active',
            progress: 45,
            lastUpdate: 'منذ 3 ساعات'
        },
        {
            id: '3',
            title: 'قضية عمالية - فصل تعسفي',
            caseType: 'عمالية',
            client: 'محمد سالم القحطاني',
            status: 'pending',
            progress: 30,
            lastUpdate: 'أمس'
        },
        {
            id: '4',
            title: 'نزاع أسري - حضانة أطفال',
            caseType: 'أسرية',
            client: 'سارة أحمد',
            status: 'active',
            progress: 80,
            lastUpdate: 'منذ 5 ساعات'
        }
    ];

    const cases = (initialCases || defaultCases).slice(0, limit);

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
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <User size={10} />
                                    {caseItem.client}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={10} />
                                    {caseItem.lastUpdate}
                                </span>
                            </div>

                            {/* Progress */}
                            <div style={{ marginTop: '6px' }}>
                                <div className="progress-bar">
                                    <div
                                        className="progress-bar__fill progress-bar__fill--purple"
                                        style={{ width: `${caseItem.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* View More */}
            <button
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
      `}</style>
        </div>
    );
};

export default CasesListWidget;
