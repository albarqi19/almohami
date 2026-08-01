import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, FileWarning, Link2 } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { CaseWekalaService, type MissingWekalaCase, type MissingWekalaResponse } from '../services/caseWekalaService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/**
 * ‏«قضايا بلا وكالة» — قائمةٌ تُحسب عند فتحها.
 *
 * ‏كان هذا السؤال يُجاب بإشعارٍ لكل (قضية × مستخدم) يتكرّر كل سبعة أيام،
 * ‏فبلغ 7,766 صفّاً في صندوق التنبيهات، 18.7% منها فقط صادق: الباقي إمّا
 * ‏قضايا صار لها وكالة ولم يُبطَل إشعارها، أو قضايا لها وكالة سارية بهوية
 * ‏موكّلها نفسه، أو قضايا ليست نشطة أصلاً.
 *
 * ‏ولذلك لا شيء هنا يُخزَّن: الجواب يُحسب لحظةَ الفتح، فما إن تُربط الوكالة
 * ‏حتى تخرج القضية من القائمة بلا حاجة إلى منطق إبطال.
 */

const formatHearing = (value: string | null): string => {
    if (!value) return '—';
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return value;
    }
};

export interface MissingWekalaCasesPanelProps {
    /** ‏الترتيب يملكه الأب لأن زرّه انتقل إلى الشريط العلوي */
    sort: 'hearing' | 'oldest';
    /** ‏كل زيادةٍ تعيد الجلب — زرّ التحديث في الشريط العلوي يرفعه */
    refreshToken?: number;
    /** ‏الملخّص (العدد والنطاق ومدى الاستشراف) يُعرض في الشريط العلوي */
    onMetaChange?: (meta: MissingWekalaResponse['meta'] | null) => void;
    /** ‏لدوران أيقونة التحديث في الشريط العلوي */
    onBusyChange?: (busy: boolean) => void;
}

export const MissingWekalaCasesPanel: React.FC<MissingWekalaCasesPanelProps> = ({
    sort,
    refreshToken = 0,
    onMetaChange,
    onBusyChange,
}) => {
    const [result, setResult] = useState<MissingWekalaResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async (nextSort: 'hearing' | 'oldest', isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        onBusyChange?.(true);
        setError(null);
        try {
            const res = await CaseWekalaService.missingCases(nextSort);
            setResult(res);
            onMetaChange?.(res.meta);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر جلب القضايا');
            onMetaChange?.(null);
        } finally {
            setLoading(false);
            onBusyChange?.(false);
        }
    };

    // أوّل تحميلٍ وأيّ تغيّر ترتيب يُظهران الهيكل العظمي؛ التحديث اليدوي لا يُخفي القائمة.
    useEffect(() => { load(sort); }, [sort]);
    useEffect(() => {
        if (refreshToken > 0) load(sort, true);
    }, [refreshToken]);
    // مغادرة التبويب تُفرغ ملخّص الشريط العلوي فلا يبقى عدّادٌ لقائمةٍ لا تُعرض.
    useEffect(() => () => { onMetaChange?.(null); }, []);

    if (loading) {
        return (
            <div className="wekalat-loading">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="wekalat-skeleton-row" />)}
            </div>
        );
    }

    if (error) {
        return (
            <div className="wekalat-empty">
                <AlertCircle size={48} className="wekalat-empty__icon" />
                <div className="wekalat-empty__title">حدث خطأ</div>
                <div className="wekalat-empty__desc">{error}</div>
                <button className="btn-primary" onClick={() => load(sort)}>إعادة المحاولة</button>
            </div>
        );
    }

    const cases = result?.data ?? [];

    if (cases.length === 0) {
        return (
            <div className="wekalat-empty">
                <FileWarning size={48} className="wekalat-empty__icon" />
                <div className="wekalat-empty__title">لا توجد قضايا بلا وكالة</div>
                <div className="wekalat-empty__desc">
                    كل القضايا النشطة — والتي لها جلسة خلال {result?.meta.lookahead_days ?? 30} يوماً — لها وكالة مرتبطة.
                </div>
            </div>
        );
    }

    return (
        <>
            {/* الملخّص وزرّا الترتيب والتحديث في الشريط العلوي (Wekalat.tsx) — لا هنا */}
            <div className="wekalat-table-wrapper">
                <table className="wekalat-table">
                    <thead>
                        <tr>
                            <th>رقم الملف</th>
                            <th>القضية</th>
                            <th>العميل</th>
                            <th>المحكمة</th>
                            <th>الجلسة القادمة</th>
                            <th>الحالة</th>
                            <th>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map(c => (
                            <tr key={c.id}>
                                <td>
                                    <RouterLink to={`/cases/${c.id}`} className="mwk-file-link">
                                        {c.file_number}
                                    </RouterLink>
                                </td>
                                <td className="mwk-title-cell" title={c.title}>{c.title}</td>
                                <td>{c.client_name || '—'}</td>
                                <td>{c.court || '—'}</td>
                                <td>
                                    {c.next_hearing ? (
                                        <span className="mwk-hearing">
                                            <Calendar size={13} />
                                            {formatHearing(c.next_hearing)}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td>{c.status_arabic}</td>
                                <td>
                                    <RouterLink
                                        to={`/cases/${c.id}?tab=wekalat`}
                                        className="mwk-link-btn"
                                        title="فتح تبويب الوكالات لربط وكالة بهذه القضية"
                                    >
                                        <Link2 size={13} />
                                        ربط وكالة
                                        {c.suggestions_count > 0 && (
                                            <span className="mwk-suggest-badge" title={`${c.suggestions_count} وكالة سارية يظهر فيها أحد محامي القضية`}>
                                                {c.suggestions_count}
                                            </span>
                                        )}
                                    </RouterLink>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {result && result.meta.returned < result.meta.total && (
                <div className="mwk-truncated">
                    عُرضت {result.meta.returned} من {result.meta.total} — عالِج المعروضة ثم حدّث القائمة.
                </div>
            )}
        </>
    );
};
