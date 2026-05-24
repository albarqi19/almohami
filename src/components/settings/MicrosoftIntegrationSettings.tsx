import React, { useState, useEffect, useCallback } from 'react';
import {
    Link2,
    Link2Off,
    Calendar,
    CheckSquare,
    AlertTriangle,
    Loader2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import { microsoftIntegrationService } from '../../services/microsoftIntegrationService';
import type {
    MicrosoftStatus,
    MicrosoftPreferences,
    MicrosoftSyncLogEntry,
} from '../../services/microsoftIntegrationService';

/**
 * Microsoft 365 integration settings (Calendar + To Do).
 *
 * Sprint 1 scope:
 *   - Connect / disconnect (delegates OAuth to backend)
 *   - Toggle calendar_sync_enabled / todo_sync_enabled
 *   - Change sync_mode
 *   - Trigger full re-sync
 *   - View last 50 sync log entries
 *
 * Sprint 2-3 hooks (webhook lifecycle, conflict resolution) are not exposed here yet.
 */
const MicrosoftIntegrationSettings: React.FC = () => {
    const [status, setStatus] = useState<MicrosoftStatus | null>(null);
    const [prefs, setPrefs] = useState<MicrosoftPreferences | null>(null);
    const [logs, setLogs] = useState<MicrosoftSyncLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isResyncing, setIsResyncing] = useState(false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Surface success/error from OAuth callback (frontend lands here with ?microsoft_callback=1&success=…)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('microsoft_callback') === '1') {
            if (params.get('success') === '1' || params.get('success') === 'true') {
                const email = params.get('email');
                setSuccessMessage(
                    email
                        ? `تم ربط حساب Microsoft بنجاح: ${email}`
                        : 'تم ربط حساب Microsoft بنجاح'
                );
            } else {
                const errCode = params.get('error') || 'unknown_error';
                setError(translateOAuthError(errCode));
            }
            // Clean the URL so refresh doesn't re-show the banner
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState(null, '', cleanUrl);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const s = await microsoftIntegrationService.getStatus();
            setStatus(s);

            if (s.connected) {
                const [prefsResp, logsResp] = await Promise.all([
                    microsoftIntegrationService.getPreferences(),
                    microsoftIntegrationService.getSyncLog(),
                ]);
                setPrefs(prefsResp.data);
                setLogs(logsResp.data || []);
            } else {
                setPrefs(null);
                setLogs([]);
            }
        } catch (e) {
            setError(errMessage(e, 'تعذّر تحميل بيانات التكامل'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError('');
        try {
            const resp = await microsoftIntegrationService.startAuth(['calendar', 'todo']);
            window.location.href = resp.auth_url;
        } catch (e) {
            setError(errMessage(e, 'تعذّر بدء عملية الربط'));
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('هل تريد فعلاً إلغاء ربط حساب Microsoft؟ ستتوقف المزامنة فوراً.')) {
            return;
        }
        setIsDisconnecting(true);
        setError('');
        try {
            await microsoftIntegrationService.disconnect();
            setSuccessMessage('تم إلغاء ربط حساب Microsoft');
            await loadAll();
        } catch (e) {
            setError(errMessage(e, 'تعذّر إلغاء الربط'));
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleResync = async () => {
        setIsResyncing(true);
        setError('');
        try {
            await microsoftIntegrationService.fullResync();
            setSuccessMessage(
                'تم جدولة مزامنة كاملة لكل جلساتك ومهامك. ستظهر تدريجياً في Outlook و To Do خلال دقائق.'
            );
            // Reload log shortly after to show queued operations
            setTimeout(loadAll, 1500);
        } catch (e) {
            setError(errMessage(e, 'تعذّر بدء المزامنة الكاملة'));
        } finally {
            setIsResyncing(false);
        }
    };

    const handlePrefChange = async (changes: Partial<MicrosoftPreferences>) => {
        if (!prefs) return;
        setIsSavingPrefs(true);
        setError('');
        try {
            const resp = await microsoftIntegrationService.updatePreferences(changes);
            setPrefs(resp.data);
        } catch (e) {
            setError(errMessage(e, 'تعذّر حفظ التفضيلات'));
        } finally {
            setIsSavingPrefs(false);
        }
    };

    // ─── Auto-clear success after 5s
    useEffect(() => {
        if (successMessage) {
            const t = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(t);
        }
    }, [successMessage]);

    if (isLoading) {
        return (
            <div className="settings-section">
                <div className="settings-section__header">
                    <div className="settings-section__icon">
                        <Link2 size={14} />
                    </div>
                    <span className="settings-section__title">تكامل Microsoft 365</span>
                </div>
                <div className="settings-section__content">
                    <div className="settings-option-card">
                        <Loader2 size={18} className="animate-spin" />
                        <div className="settings-option-card__title">جاري التحميل...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-section">
            <div className="settings-section__header">
                <div className="settings-section__icon">
                    <Link2 size={14} />
                </div>
                <span className="settings-section__title">تكامل Microsoft 365</span>
            </div>

            <div className="settings-section__content">
                {/* Re-auth banner — top priority */}
                {status?.needs_reauth && (
                    <ReauthBanner onReconnect={handleConnect} isConnecting={isConnecting} />
                )}

                {/* Messages */}
                {error && (
                    <MessageBanner type="error" message={error} onClose={() => setError('')} />
                )}
                {successMessage && (
                    <MessageBanner
                        type="success"
                        message={successMessage}
                        onClose={() => setSuccessMessage('')}
                    />
                )}

                {/* Connection card */}
                <ConnectionCard
                    status={status}
                    isConnecting={isConnecting}
                    isDisconnecting={isDisconnecting}
                    isResyncing={isResyncing}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onResync={handleResync}
                />

                {/* Preferences — only when connected */}
                {status?.connected && prefs && (
                    <PreferencesCard
                        prefs={prefs}
                        isSaving={isSavingPrefs}
                        onChange={handlePrefChange}
                    />
                )}

                {/* Sync log */}
                {status?.connected && logs.length > 0 && (
                    <SyncLogTable logs={logs} onRefresh={loadAll} />
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

const ReauthBanner: React.FC<{ onReconnect: () => void; isConnecting: boolean }> = ({
    onReconnect,
    isConnecting,
}) => (
    <div
        className="settings-option-card"
        style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderRight: '3px solid #f59e0b',
            marginBottom: '12px',
        }}
    >
        <div className="settings-option-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <div>
                    <div className="settings-option-card__title">إعادة التفويض مطلوبة</div>
                    <div className="settings-option-card__desc">
                        انتهت صلاحية ربط Microsoft. أعد الربط لاستئناف المزامنة.
                    </div>
                </div>
            </div>
            <button
                className="btn btn-primary"
                onClick={onReconnect}
                disabled={isConnecting}
                style={{ minWidth: 130 }}
            >
                {isConnecting ? <Loader2 size={14} className="animate-spin" /> : 'إعادة الربط'}
            </button>
        </div>
    </div>
);

const MessageBanner: React.FC<{
    type: 'success' | 'error';
    message: string;
    onClose: () => void;
}> = ({ type, message, onClose }) => {
    const isError = type === 'error';
    return (
        <div
            style={{
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                background: isError ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                borderRight: `3px solid ${isError ? '#ef4444' : '#22c55e'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
            }}
        >
            {isError ? (
                <XCircle size={16} color="#ef4444" />
            ) : (
                <CheckCircle2 size={16} color="#22c55e" />
            )}
            <span style={{ flex: 1 }}>{message}</span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    fontSize: '16px',
                }}
                aria-label="إغلاق"
            >
                ×
            </button>
        </div>
    );
};

const ConnectionCard: React.FC<{
    status: MicrosoftStatus | null;
    isConnecting: boolean;
    isDisconnecting: boolean;
    isResyncing: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onResync: () => void;
}> = ({ status, isConnecting, isDisconnecting, isResyncing, onConnect, onDisconnect, onResync }) => {
    if (!status?.connected) {
        return (
            <div className="settings-option-card">
                <div className="settings-option-card__header">
                    <div>
                        <div className="settings-option-card__title">ربط حساب Microsoft 365</div>
                        <div className="settings-option-card__desc">
                            سيتم إنشاء جلساتك في تقويم Outlook ومهامك في Microsoft To Do تلقائياً.
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={onConnect}
                        disabled={isConnecting}
                        style={{ minWidth: 140 }}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> جاري التحويل...
                            </>
                        ) : (
                            <>
                                <Link2 size={14} /> ربط الحساب
                            </>
                        )}
                    </button>
                </div>

                <PrivacyNote />
            </div>
        );
    }

    return (
        <div className="settings-option-card">
            <div className="settings-option-card__header">
                <div style={{ flex: 1 }}>
                    <div className="settings-option-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} color="#22c55e" />
                        {status.email}
                    </div>
                    <div className="settings-option-card__desc">
                        {status.display_name && <>الاسم: {status.display_name} · </>}
                        ربط منذ: {formatDate(status.connected_at)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onResync}
                        disabled={isResyncing}
                        title="مزامنة كاملة لكل الجلسات والمهام"
                    >
                        {isResyncing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        {isResyncing ? 'جاري الجدولة' : 'مزامنة كاملة'}
                    </button>
                    <button
                        className="btn btn-danger-outline"
                        onClick={onDisconnect}
                        disabled={isDisconnecting}
                    >
                        {isDisconnecting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Link2Off size={14} />
                        )}
                        إلغاء الربط
                    </button>
                </div>
            </div>

            {status.granted_scopes && status.granted_scopes.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
                    الصلاحيات الممنوحة:{' '}
                    {status.granted_scopes
                        .filter((s) => s !== 'offline_access' && s !== 'User.Read')
                        .map((s) => translateScope(s))
                        .join('، ')}
                </div>
            )}

            <PrivacyNote />
        </div>
    );
};

const PrivacyNote: React.FC = () => (
    <div
        style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(99, 102, 241, 0.05)',
            borderRadius: '6px',
            fontSize: '12px',
            opacity: 0.85,
        }}
    >
        <strong>الخصوصية:</strong> لا يُرسل لـ Microsoft سوى عنوان الجلسة/المهمة والوقت
        والمكان. لا تُرسل ملاحظات أو بيانات عملاء أو نصوص ضبط.
    </div>
);

const PreferencesCard: React.FC<{
    prefs: MicrosoftPreferences;
    isSaving: boolean;
    onChange: (changes: Partial<MicrosoftPreferences>) => void;
}> = ({ prefs, isSaving, onChange }) => {
    return (
        <div className="settings-option-card" style={{ marginTop: '12px' }}>
            <div className="settings-option-card__title">تفضيلات المزامنة</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {/* Calendar toggle */}
                <PrefToggle
                    icon={<Calendar size={14} />}
                    label="مزامنة الجلسات مع Outlook Calendar"
                    description="ينشئ حدثاً في تقويم Outlook لكل جلسة مرتبطة بك."
                    checked={prefs.calendar_sync_enabled}
                    disabled={isSaving}
                    onChange={(v) => onChange({ calendar_sync_enabled: v })}
                />

                {/* Todo toggle */}
                <PrefToggle
                    icon={<CheckSquare size={14} />}
                    label="مزامنة المهام مع Microsoft To Do"
                    description="ينشئ مهمة في قائمة “الرائد لإدارة المحاماة” لكل مهمة مسندة إليك."
                    checked={prefs.todo_sync_enabled}
                    disabled={isSaving}
                    onChange={(v) => onChange({ todo_sync_enabled: v })}
                />

                {/* Reminder */}
                <div>
                    <label
                        htmlFor="ms-reminder"
                        style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}
                    >
                        دقائق التذكير قبل الجلسة
                    </label>
                    <input
                        id="ms-reminder"
                        type="number"
                        min={0}
                        max={10080}
                        value={prefs.default_reminder_minutes_before}
                        disabled={isSaving}
                        onChange={(e) =>
                            onChange({
                                default_reminder_minutes_before: parseInt(e.target.value, 10) || 0,
                            })
                        }
                        style={{ width: 100, padding: '4px 8px' }}
                    />
                    <span style={{ marginRight: 8, fontSize: '12px', opacity: 0.7 }}>دقيقة</span>
                </div>

                {/* Sync mode */}
                <div>
                    <label htmlFor="ms-sync-mode" style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                        نمط المزامنة
                    </label>
                    <select
                        id="ms-sync-mode"
                        value={prefs.sync_mode}
                        disabled={isSaving}
                        onChange={(e) =>
                            onChange({ sync_mode: e.target.value as MicrosoftPreferences['sync_mode'] })
                        }
                        style={{ padding: '4px 8px', minWidth: 200 }}
                    >
                        <option value="bidirectional">ثنائي الاتجاه (مزامنة كاملة)</option>
                        <option value="outbound_only">من النظام إلى Microsoft فقط</option>
                        <option value="paused">إيقاف مؤقت</option>
                    </select>
                    <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                        {prefs.sync_mode === 'bidirectional'
                            ? 'التعديل من Outlook أو To Do سينعكس تلقائياً على النظام (مع احترام قواعد ملكية الحقول).'
                            : prefs.sync_mode === 'outbound_only'
                                ? 'التعديلات من Microsoft لا تُطبَّق على النظام (المراقبة فقط).'
                                : 'كل المزامنة متوقفة. لا قراءة ولا كتابة.'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PrefToggle: React.FC<{
    icon: React.ReactNode;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}> = ({ icon, label, description, checked, disabled, onChange }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
        }}
    >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '2px', opacity: 0.7 }}>{icon}</div>
            <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{description}</div>
            </div>
        </div>
        <label className="settings-toggle" style={{ flexShrink: 0 }}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="settings-toggle__slider" />
        </label>
    </div>
);

const SyncLogTable: React.FC<{
    logs: MicrosoftSyncLogEntry[];
    onRefresh: () => void;
}> = ({ logs, onRefresh }) => (
    <div className="settings-option-card" style={{ marginTop: '12px' }}>
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
            }}
        >
            <div className="settings-option-card__title">سجل المزامنة (آخر 50)</div>
            <button
                onClick={onRefresh}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="تحديث"
            >
                <RefreshCw size={12} /> تحديث
            </button>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 320 }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary, #f8f9fa)' }}>
                    <tr>
                        <th style={th}>الوقت</th>
                        <th style={th}>النوع</th>
                        <th style={th}>العملية</th>
                        <th style={th}>الاتجاه</th>
                        <th style={th}>الحالة</th>
                        <th style={th}>الخطأ</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id} style={{ borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                            <td style={td} title={log.created_at}>
                                <Clock size={11} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                                {formatRelative(log.created_at)}
                            </td>
                            <td style={td}>{translateEntity(log.entity_type)}</td>
                            <td style={td}>{translateOperation(log.operation)}</td>
                            <td style={td}>{translateDirection(log.direction)}</td>
                            <td style={td}>
                                <StatusBadge status={log.status} />
                            </td>
                            <td style={{ ...td, color: '#ef4444', maxWidth: 250 }} title={log.error_message || ''}>
                                {log.error_message
                                    ? log.error_message.slice(0, 50) + (log.error_message.length > 50 ? '...' : '')
                                    : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const StatusBadge: React.FC<{ status: MicrosoftSyncLogEntry['status'] }> = ({ status }) => {
    const colors: Record<typeof status, { bg: string; color: string }> = {
        success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#15803d' },
        failed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#b91c1c' },
        retried: { bg: 'rgba(245, 158, 11, 0.15)', color: '#a16207' },
        observed: { bg: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' },
    };
    const labels: Record<typeof status, string> = {
        success: 'نجاح',
        failed: 'فشل',
        retried: 'إعادة محاولة',
        observed: 'مراقبة',
    };
    const c = colors[status];
    return (
        <span
            style={{
                background: c.bg,
                color: c.color,
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
            }}
        >
            {labels[status]}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
    textAlign: 'right',
    padding: '8px 10px',
    fontWeight: 600,
    fontSize: '11px',
    opacity: 0.8,
};

const td: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: '12px',
};

function errMessage(e: unknown, fallback: string): string {
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === 'string') return e;
    return fallback;
}

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRelative(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `${diffMin} د`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} س`;
    return d.toLocaleDateString('ar-SA');
}

function translateOAuthError(code: string): string {
    const map: Record<string, string> = {
        authorization_failed: 'تم رفض الموافقة على الصلاحيات',
        missing_params: 'بيانات الربط غير مكتملة',
        invalid_state: 'انتهت صلاحية جلسة الربط — حاول مرة أخرى',
        token_exchange_failed: 'فشل تبادل الرمز مع Microsoft',
        token_exchange_exception: 'خطأ تقني عند الاتصال بـ Microsoft',
    };
    return map[code] || `فشل الربط (${code})`;
}

function translateEntity(t: MicrosoftSyncLogEntry['entity_type']): string {
    return (
        {
            session: 'جلسة',
            task: 'مهمة',
            subtask: 'مهمة فرعية',
            webhook: 'webhook',
            subscription: 'اشتراك',
            reconciliation: 'تسوية',
        } as const
    )[t];
}

function translateOperation(op: MicrosoftSyncLogEntry['operation']): string {
    return (
        {
            create: 'إنشاء',
            update: 'تحديث',
            delete: 'حذف',
            skip: 'تخطّي',
            conflict: 'تعارض',
            overwrite: 'كتابة فوق',
            merge: 'دمج',
        } as const
    )[op];
}

function translateDirection(dir: MicrosoftSyncLogEntry['direction']): string {
    return (
        {
            to_ms: 'إلى Microsoft',
            from_ms: 'من Microsoft',
            webhook_received: 'استقبال webhook',
            webhook_observed: 'مراقبة webhook',
            webhook_applied: 'تطبيق webhook',
            renewal: 'تجديد',
            reconcile: 'تسوية',
        } as const
    )[dir];
}

function translateScope(scope: string): string {
    const short = scope.includes('/') ? scope.split('/').pop()! : scope;
    return (
        {
            'Calendars.ReadWrite': 'التقويم',
            'Tasks.ReadWrite': 'المهام',
            'Mail.Send': 'إرسال البريد',
            'Files.ReadWrite': 'الملفات',
            'Files.Read': 'قراءة الملفات',
        } as Record<string, string>
    )[short] || short;
}

export default MicrosoftIntegrationSettings;
