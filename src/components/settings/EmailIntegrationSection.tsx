import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Mail, Link2, Link2Off, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
    Loader2, Eye, TrendingUp, Send, AlertCircle, Inbox, Activity, Server, Search,
} from 'lucide-react';
import { emailLogsService } from '../../services/emailLogsService';
import type {
    EmailLogEntry, EmailStatus, EmailCategory, EmailStatsTotals, EmailStatsDailyPoint,
} from '../../services/emailLogsService';
import { microsoftIntegrationService } from '../../services/microsoftIntegrationService';
import type { MicrosoftStatus } from '../../services/microsoftIntegrationService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * صفحة "البريد الإلكتروني" — للأونر فقط.
 *
 * تعتمد على CSS variables من الثيمات الثلاثة (Light / Dark / Classic)
 * عبر `var(--color-*)` لكي تتبدّل تلقائياً.
 *
 * البنية ERP-dense:
 *   1) Hero — حالة الربط + معلومات الحساب + أزرار الربط/فك
 *   2) شريط إحصائيات 6 بطاقات
 *   3) رسم بياني آخر 7 أيام (Bar مبسّط)
 *   4) جدول السجل compact + فلاتر inline + modal تفاصيل
 */
const EmailIntegrationSection: React.FC = () => {
    const { user } = useAuth();
    const isOwner = !!user?.is_tenant_owner;
    const isSuperAdmin = user?.role === 'super_admin';
    const canSeePreview = isOwner || isSuperAdmin;

    // OAuth callback banner
    const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // State
    const [msStatus, setMsStatus] = useState<MicrosoftStatus | null>(null);
    const [logs, setLogs] = useState<EmailLogEntry[]>([]);
    const [stats, setStats] = useState<{
        totals: EmailStatsTotals;
        by_category: Record<string, number>;
        top_errors: Record<string, number>;
        daily_7d: Record<string, EmailStatsDailyPoint>;
    } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string>('');

    const [statusFilter, setStatusFilter] = useState<EmailStatus | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<EmailCategory | ''>('');
    const [search, setSearch] = useState<string>('');
    const [selectedLog, setSelectedLog] = useState<EmailLogEntry | null>(null);

    // Handle OAuth callback URL params (when returning from Microsoft)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('microsoft_callback') === '1' && params.get('mail_flow') === '1') {
            if (params.get('success') === '1' || params.get('success') === 'true') {
                setOauthBanner({ type: 'success', msg: `تم ربط البريد الإلكتروني بنجاح${params.get('email') ? `: ${params.get('email')}` : ''}` });
            } else {
                setOauthBanner({ type: 'error', msg: 'تعذّر إتمام ربط البريد' });
            }
            const clean = window.location.pathname + window.location.hash;
            window.history.replaceState(null, '', clean);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [statusResp, logsResp, statsResp] = await Promise.all([
                microsoftIntegrationService.getStatus(),
                emailLogsService.list({
                    status: statusFilter || undefined,
                    category: categoryFilter || undefined,
                    search: search || undefined,
                    per_page: 30,
                }),
                emailLogsService.stats(),
            ]);
            setMsStatus(statusResp);
            setLogs(logsResp.data);
            setStats(statsResp.data);
        } catch (e: any) {
            setError(e?.message || 'تعذّر تحميل بيانات البريد');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, categoryFilter, search]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // هل البريد مربوط فعلاً؟ نفحص Mail.Send في scopes
    const mailConnected = useMemo(() => {
        if (!msStatus?.connected) return false;
        const scopes = msStatus.granted_scopes || [];
        return scopes.some((s) => s === 'Mail.Send' || s.endsWith('/Mail.Send'));
    }, [msStatus]);

    const handleConnectMail = async () => {
        if (!isOwner) {
            setError('فقط مالك الشركة يمكنه ربط البريد الإلكتروني');
            return;
        }
        setIsConnecting(true);
        setError('');
        try {
            // نطلب mail فقط — لو الحساب نفسه مربوط لـ Calendar/Todo، Microsoft يجمع scopes تلقائياً
            const resp = await microsoftIntegrationService.startAuth(['mail']);
            // علامة mail_flow=1 في returnTo لنميّز الـ callback في هذه الصفحة
            const sep = resp.auth_url.includes('?') ? '&' : '?';
            window.location.href = `${resp.auth_url}${sep}state_hint=mail`;
        } catch (e: any) {
            setError(e?.message || 'تعذّر بدء عملية الربط');
            setIsConnecting(false);
        }
    };

    const handleDisconnectMail = async () => {
        if (!window.confirm('فك الربط: إشعارات الشركة (موافقات، تذكيرات، إلخ) ستعود للإرسال من admin@alraedlaw.com بدلاً من بريد شركتك. لن تنقطع — فقط ستتغير الجهة المُرسِلة. متابعة؟')) {
            return;
        }
        // ملاحظة: فك Mail.Send وحده غير مدعوم في Graph — نطلب re-connect بدون mail
        try {
            const resp = await microsoftIntegrationService.startAuth(['calendar', 'todo']);
            window.location.href = resp.auth_url;
        } catch (e: any) {
            setError(e?.message || 'تعذّر بدء عملية إعادة الربط');
        }
    };

    // ---------- Render ----------
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* OAuth callback banner */}
            {oauthBanner && (
                <BannerCallback type={oauthBanner.type} msg={oauthBanner.msg} onClose={() => setOauthBanner(null)} />
            )}

            {/* Error */}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    background: 'var(--color-error-soft)', color: 'var(--color-error)',
                    border: '1px solid var(--color-error)', borderRadius: 6, fontSize: 14,
                }}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* 1) Hero — حالة الربط */}
            <HeroCard
                msStatus={msStatus}
                mailConnected={mailConnected}
                isOwner={isOwner}
                isConnecting={isConnecting}
                onConnect={handleConnectMail}
                onDisconnect={handleDisconnectMail}
                onRefresh={loadAll}
                isLoading={isLoading}
            />

            {/* 2) شريط الإحصائيات */}
            {stats && <StatsBar totals={stats.totals} />}

            {/* 3) رسم اتجاه آخر 7 أيام + top errors */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <DailyChart daily={stats.daily_7d} />
                    <TopErrorsCard errors={stats.top_errors} />
                </div>
            )}

            {/* 4) السجل compact + فلاتر */}
            <LogsTable
                logs={logs}
                isLoading={isLoading}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                search={search}
                onStatusChange={setStatusFilter}
                onCategoryChange={setCategoryFilter}
                onSearchChange={setSearch}
                onRefresh={loadAll}
                onSelect={async (log) => {
                    if (canSeePreview && log.body_preview === undefined) {
                        try {
                            const r = await emailLogsService.list({
                                status: statusFilter || undefined,
                                category: categoryFilter || undefined,
                                per_page: 30,
                                include: 'preview',
                            });
                            const enriched = r.data.find((l) => l.id === log.id);
                            if (enriched) { setSelectedLog(enriched); return; }
                        } catch {/* fallthrough */}
                    }
                    setSelectedLog(log);
                }}
            />

            {/* Modal تفاصيل */}
            {selectedLog && (
                <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </div>
    );
};

// ============================================================
//                       SUBCOMPONENTS
// ============================================================

const BannerCallback: React.FC<{ type: 'success' | 'error'; msg: string; onClose: () => void }> = ({ type, msg, onClose }) => {
    const isSuccess = type === 'success';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            background: isSuccess ? 'var(--color-success-soft)' : 'var(--color-error-soft)',
            color: isSuccess ? 'var(--color-success)' : 'var(--color-error)',
            border: `1px solid ${isSuccess ? 'var(--color-success)' : 'var(--color-error)'}`,
            borderRadius: 6, fontSize: 14,
        }}>
            {isSuccess ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span style={{ flex: 1 }}>{msg}</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <XCircle size={16} />
            </button>
        </div>
    );
};

interface HeroCardProps {
    msStatus: MicrosoftStatus | null;
    mailConnected: boolean;
    isOwner: boolean;
    isConnecting: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    isLoading: boolean;
}
const HeroCard: React.FC<HeroCardProps> = ({ msStatus, mailConnected, isOwner, isConnecting, onConnect, onDisconnect, onRefresh, isLoading }) => (
    <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 8, padding: 20, boxShadow: 'var(--shadow-xs)',
    }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: mailConnected ? 'var(--color-success-soft)' : 'var(--color-primary-soft)',
                    color: mailConnected ? 'var(--color-success)' : 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Mail size={26} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-heading)' }}>
                        البريد الإلكتروني للشركة
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                        اربط Outlook لترسل إشعارات شركتك (موافقة طلبات الموظفين، تذكير المحامين والعملاء، وغيرها) من بريد شركتك الرسمي بدلاً من بريد افتراضي.
                    </p>
                </div>
            </div>
            <button onClick={onRefresh} disabled={isLoading} title="تحديث"
                style={{
                    padding: '6px 10px', background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)', borderRadius: 6,
                    color: 'var(--color-text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                }}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                تحديث
            </button>
        </div>

        <div style={{
            marginTop: 16, padding: 14, borderRadius: 6,
            background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)',
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
        }}>
            <StatusDot connected={mailConnected} />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
                    {mailConnected ? 'البريد مربوط' : 'البريد غير مربوط'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {mailConnected
                        ? `إشعارات الشركة تُرسل من: ${msStatus?.email || '—'}`
                        : 'إشعارات الشركة تُرسل حالياً من admin@alraedlaw.com (الافتراضي)'}
                </div>
                {msStatus?.needs_reauth && (
                    <div style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> يحتاج إعادة ربط — صلاحية البريد منتهية أو ملغاة
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                {!isOwner ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '6px 12px' }}>
                        للأونر فقط
                    </span>
                ) : !mailConnected ? (
                    <button onClick={onConnect} disabled={isConnecting}
                        style={{
                            padding: '8px 16px', background: 'var(--color-primary)', color: '#fff',
                            border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                            opacity: isConnecting ? 0.7 : 1,
                        }}>
                        {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                        ربط Outlook
                    </button>
                ) : (
                    <button onClick={onDisconnect}
                        style={{
                            padding: '8px 16px', background: 'var(--color-surface)',
                            border: '1px solid var(--color-error)', color: 'var(--color-error)',
                            borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        }}>
                        <Link2Off size={14} /> فك الربط
                    </button>
                )}
            </div>
        </div>
    </div>
);

const StatusDot: React.FC<{ connected: boolean }> = ({ connected }) => (
    <div style={{
        width: 10, height: 10, borderRadius: 5,
        background: connected ? 'var(--color-success)' : 'var(--color-gray-400)',
        boxShadow: connected ? '0 0 0 3px var(--color-success-soft)' : 'none',
    }} />
);

const StatsBar: React.FC<{ totals: EmailStatsTotals }> = ({ totals }) => {
    const items = [
        { label: 'إجمالي 30 يوم', value: totals.total_30d, icon: Inbox, color: 'var(--color-primary)' },
        { label: 'عبر Outlook', value: totals.sent_outlook, icon: Send, color: 'var(--color-success)' },
        { label: 'SMTP احتياطي', value: totals.sent_smtp, icon: Server, color: 'var(--color-warning)' },
        { label: 'فشل', value: totals.failed, icon: XCircle, color: 'var(--color-error)' },
        { label: 'في الطابور', value: totals.queued_or_pending, icon: Activity, color: 'var(--color-info)' },
        { label: 'معدل النجاح', value: `${totals.delivery_rate}%`, icon: TrendingUp, color: 'var(--color-accent)' },
    ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {items.map((it, idx) => (
                <div key={idx} style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '10px 12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{it.label}</span>
                        <it.icon size={13} style={{ color: it.color }} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-heading)' }}>{it.value}</div>
                </div>
            ))}
        </div>
    );
};

const DailyChart: React.FC<{ daily: Record<string, EmailStatsDailyPoint> }> = ({ daily }) => {
    const days = Object.entries(daily);
    const max = Math.max(1, ...days.map(([, p]) => p.sent + p.fallback + p.failed));

    // إنشاء آخر 7 أيام حتى لو الجدول فارغ
    const fullDays: Array<[string, EmailStatsDailyPoint]> = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const found = daily[key];
        fullDays.push([key, found || { sent: 0, fallback: 0, failed: 0 }]);
    }

    return (
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: 14,
        }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
                اتجاه آخر 7 أيام
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
                {fullDays.map(([day, p]) => {
                    const total = p.sent + p.fallback + p.failed;
                    const h = (total / max) * 100;
                    return (
                        <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start', height: '100%', width: '100%', minHeight: 4 }}>
                                {p.sent > 0 && <div style={{ background: 'var(--color-success)', height: `${(p.sent / max) * 100}%` }} title={`Outlook: ${p.sent}`} />}
                                {p.fallback > 0 && <div style={{ background: 'var(--color-warning)', height: `${(p.fallback / max) * 100}%` }} title={`SMTP: ${p.fallback}`} />}
                                {p.failed > 0 && <div style={{ background: 'var(--color-error)', height: `${(p.failed / max) * 100}%` }} title={`فشل: ${p.failed}`} />}
                                {total === 0 && <div style={{ background: 'var(--color-gray-200)', height: '4px', borderRadius: 2 }} />}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                                {new Date(day).toLocaleDateString('ar-SA', { weekday: 'short' })}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-heading)', height: 14 }}>
                                {total > 0 ? total : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <LegendDot color="var(--color-success)" label="Outlook" />
                <LegendDot color="var(--color-warning)" label="SMTP احتياطي" />
                <LegendDot color="var(--color-error)" label="فشل" />
            </div>
        </div>
    );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        {label}
    </div>
);

const TopErrorsCard: React.FC<{ errors: Record<string, number> }> = ({ errors }) => {
    const entries = Object.entries(errors);
    return (
        <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: 14,
        }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-heading)' }}>
                أبرز الأخطاء
            </h3>
            {entries.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                    لا توجد أخطاء — كل شيء يعمل ✓
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entries.map(([code, count]) => (
                        <div key={code} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px', background: 'var(--color-surface-subtle)',
                            borderRadius: 4, fontSize: 12,
                        }}>
                            <span style={{ color: 'var(--color-text)', fontFamily: 'monospace', fontSize: 11 }}>
                                {translateErrorCode(code)}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--color-error)' }}>{count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface LogsTableProps {
    logs: EmailLogEntry[];
    isLoading: boolean;
    statusFilter: EmailStatus | '';
    categoryFilter: EmailCategory | '';
    search: string;
    onStatusChange: (s: EmailStatus | '') => void;
    onCategoryChange: (c: EmailCategory | '') => void;
    onSearchChange: (q: string) => void;
    onRefresh: () => void;
    onSelect: (log: EmailLogEntry) => void;
}
const LogsTable: React.FC<LogsTableProps> = ({ logs, isLoading, statusFilter, categoryFilter, search, onStatusChange, onCategoryChange, onSearchChange, onRefresh, onSelect }) => (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: '1px solid var(--color-border)',
        }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-heading)', flex: 1 }}>
                سجل الإيميلات
            </h3>

            <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                    type="text" placeholder="بحث (مستلم/موضوع)" value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{
                        padding: '5px 26px 5px 10px', fontSize: 12,
                        background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)',
                        borderRadius: 4, color: 'var(--color-text)', width: 200,
                    }}
                />
            </div>

            <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value as EmailStatus | '')} style={selectStyle}>
                <option value="">كل الحالات</option>
                <option value="queued">في الطابور</option>
                <option value="pending">قيد المعالجة</option>
                <option value="sent">مُرسَل (Outlook)</option>
                <option value="fallback_sent">SMTP احتياطي</option>
                <option value="failed">فشل</option>
            </select>
            <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value as EmailCategory | '')} style={selectStyle}>
                <option value="">كل الفئات</option>
                <option value="welcome">ترحيب</option>
                <option value="payment_success">دفع ناجح</option>
                <option value="payment_failed">فشل دفع</option>
                <option value="expiry_reminder">تذكير انتهاء</option>
                <option value="data_delete_code">رمز حذف</option>
                <option value="admin_request">طلب إداري</option>
                <option value="generic">عام</option>
            </select>
            <button onClick={onRefresh} disabled={isLoading} style={{
                padding: 5, background: 'transparent', border: '1px solid var(--color-border)',
                borderRadius: 4, cursor: 'pointer', color: 'var(--color-text-secondary)',
            }}>
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>

        {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30, color: 'var(--color-text-secondary)' }}>
                <Loader2 size={20} className="animate-spin" />
            </div>
        ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                لا توجد إيميلات تطابق المعايير
            </div>
        ) : (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: 'var(--color-surface-subtle)' }}>
                            <Th>التاريخ</Th>
                            <Th>المستلم</Th>
                            <Th>الموضوع</Th>
                            <Th>الفئة</Th>
                            <Th>الحالة</Th>
                            <Th>المزود</Th>
                            <Th>الخطأ</Th>
                            <Th>محاولات</Th>
                            <Th></Th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                                <Td>{new Date(log.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                                <Td title={log.to_email} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.to_email}</Td>
                                <Td title={log.subject} style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</Td>
                                <Td>{translateCategory(log.category)}</Td>
                                <Td><StatusBadge status={log.status} /></Td>
                                <Td>{translateProvider(log.provider)}</Td>
                                <Td title={log.error_code || ''} style={{ color: log.error_code ? 'var(--color-error)' : 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                                    {log.error_code ? translateErrorCode(log.error_code) : '—'}
                                </Td>
                                <Td>{log.attempts}</Td>
                                <Td>
                                    <button onClick={() => onSelect(log)} title="تفاصيل"
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                                        <Eye size={14} />
                                    </button>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

const selectStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: 12,
    background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)',
    borderRadius: 4, color: 'var(--color-text)',
};

const Th: React.FC<React.PropsWithChildren> = ({ children }) => (
    <th style={{
        padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11,
        color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.3,
    }}>{children}</th>
);

const Td: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLTableCellElement>>> = ({ children, ...rest }) => (
    <td {...rest} style={{ padding: '6px 10px', color: 'var(--color-text)', ...rest.style }}>{children}</td>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg: Record<string, { bg: string; color: string; label: string }> = {
        queued: { bg: 'var(--color-neutral-soft)', color: 'var(--color-text-secondary)', label: 'في الطابور' },
        pending: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'قيد المعالجة' },
        sent: { bg: 'var(--color-success-soft)', color: 'var(--color-success)', label: 'Outlook' },
        fallback_sent: { bg: 'var(--color-warning-soft)', color: 'var(--color-warning)', label: 'SMTP' },
        failed: { bg: 'var(--color-error-soft)', color: 'var(--color-error)', label: 'فشل' },
    };
    const c = cfg[status] || { bg: 'var(--color-neutral-soft)', color: 'var(--color-text-secondary)', label: status };
    return (
        <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 3,
            background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
        }}>{c.label}</span>
    );
};

const LogDetailsModal: React.FC<{ log: EmailLogEntry; onClose: () => void }> = ({ log, onClose }) => (
    <div onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
        <div onClick={(e) => e.stopPropagation()}
            style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, maxWidth: 720, width: '100%', maxHeight: '85vh',
                overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
            }}>
            <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-heading)' }}>
                    تفاصيل الإيميل #{log.id}
                </h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                    <XCircle size={18} />
                </button>
            </div>
            <div style={{ padding: 18 }}>
                <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 6, fontSize: 13, margin: 0 }}>
                    <Dt>المستلم:</Dt><Dd>{log.to_email}</Dd>
                    <Dt>المرسل:</Dt><Dd>{log.from_email || '—'}</Dd>
                    <Dt>الموضوع:</Dt><Dd>{log.subject}</Dd>
                    <Dt>الفئة:</Dt><Dd>{translateCategory(log.category)}</Dd>
                    <Dt>الحالة:</Dt><Dd><StatusBadge status={log.status} /></Dd>
                    <Dt>المزود:</Dt><Dd>{translateProvider(log.provider)}</Dd>
                    <Dt>رمز الخطأ:</Dt><Dd>{log.error_code ? translateErrorCode(log.error_code) : '—'}</Dd>
                    <Dt>HTTP status:</Dt><Dd>{log.provider_status_code ?? '—'}</Dd>
                    <Dt>correlation_id:</Dt><Dd style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.correlation_id || '—'}</Dd>
                    <Dt>connection_id:</Dt><Dd>{log.connection_id ?? '—'}</Dd>
                    <Dt>عدد المحاولات:</Dt><Dd>{log.attempts}</Dd>
                    <Dt>أُرسل في:</Dt><Dd>{log.sent_at ? new Date(log.sent_at).toLocaleString('ar-SA') : '—'}</Dd>
                </dl>

                {log.last_error && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>آخر خطأ:</div>
                        <pre style={{
                            background: 'var(--color-error-soft)', color: 'var(--color-error)',
                            border: '1px solid var(--color-error)', borderRadius: 4, padding: 10,
                            fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                        }}>{log.last_error}</pre>
                    </div>
                )}

                {log.body_preview !== undefined && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>معاينة المحتوى (300 حرف كحد أقصى):</div>
                        <pre style={{
                            background: 'var(--color-surface-subtle)', color: 'var(--color-text)',
                            border: '1px solid var(--color-border)', borderRadius: 4, padding: 10,
                            fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                        }}>{log.body_preview || '(فارغ — مثل أكواد التحقق التي لا نُخزّنها لأسباب أمنية)'}</pre>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const Dt: React.FC<React.PropsWithChildren> = ({ children }) => (
    <dt style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{children}</dt>
);
const Dd: React.FC<React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>> = ({ children, ...rest }) => (
    <dd {...rest} style={{ color: 'var(--color-text)', margin: 0, ...rest.style }}>{children}</dd>
);

// ---------- ترجمات ----------
function translateCategory(cat: string): string {
    return ({
        welcome: 'ترحيب', payment_success: 'دفع ناجح', payment_failed: 'فشل دفع',
        expiry_reminder: 'تذكير انتهاء', data_delete_code: 'رمز حذف',
        admin_request: 'طلب إداري', generic: 'عام',
    } as Record<string, string>)[cat] || cat;
}

function translateProvider(p: string): string {
    return ({
        outlook_graph: 'Outlook', smtp_default: 'SMTP', failed: 'فشل',
    } as Record<string, string>)[p] || p;
}

function translateErrorCode(code: string): string {
    return ({
        token_revoked: 'token ملغي',
        missing_scope: 'صلاحية ناقصة',
        needs_reauth: 'يحتاج ربط',
        network_timeout: 'انتهاء الوقت',
        rate_limited: 'تجاوز الحد',
        invalid_recipient: 'بريد غير صالح',
        bad_payload: 'حمولة خاطئة',
        server_error: 'خطأ خادم',
        smtp_failed: 'فشل SMTP',
        feature_disabled: 'الميزة معطّلة',
        connection_missing: 'لا يوجد ربط',
        tenant_mismatch: 'عدم تطابق tenant',
    } as Record<string, string>)[code] || code;
}

export default EmailIntegrationSection;
