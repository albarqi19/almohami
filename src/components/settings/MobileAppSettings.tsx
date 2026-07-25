import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Timer,
  Clock,
  LogOut,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { MobileAppService } from '../../services/mobileAppService';
import type { MobileDevice } from '../../services/mobileAppService';

/**
 * إعدادات تطبيق الجوال «رائد» — إصدار رمز الاقتران وإدارة الأجهزة المرتبطة.
 *
 * الرمز يظهر **مرة واحدة** ولمدة ثلاث دقائق فقط، فالعدّاد التنازلي جزء من الأمان
 * لا زينة: عند وصوله صفراً يُخفى الرمز من الشاشة حتى لا يبقى معروضاً خلف ظهر
 * صاحبه بعد أن فقد صلاحيته.
 *
 * الأنماط من settings-page.css و mobile-app-settings.css (يُحمَّلان مركزياً عبر
 * styles/appStyles.ts) — لا استيراد CSS هنا.
 */

/** مدة صلاحية الرمز افتراضياً بالثواني — الخادم يعيد expires_in ونعتمده إن ورد. */
const DEFAULT_TTL_SECONDS = 180;

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'آيفون / آيباد',
  android: 'أندرويد',
};

const MobileAppSettings: React.FC = () => {
  const [code, setCode] = useState<string | null>(null);
  const [formattedCode, setFormattedCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  const [issuing, setIssuing] = useState(false);
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineRef = useRef<number | null>(null);
  // عدّاد إصدارات — لإعادة تشغيل المؤقّت حتى لو صادف الرمز الجديد نصّ السابق
  const [issueSeq, setIssueSeq] = useState(0);

  const loadDevices = useCallback(async () => {
    try {
      setDevices(await MobileAppService.listDevices());
    } catch {
      // قائمة الأجهزة ثانوية — فشلها لا يعطّل إصدار الرمز
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  // العدّاد يُحتسب من لحظة انتهاء مطلقة لا بالإنقاص المتتابع: لو خمد المؤقّت
  // (تبويب في الخلفية) لا يتأخّر الانتهاء عن وقته الحقيقي.
  useEffect(() => {
    if (deadlineRef.current === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setCode(null);
        setFormattedCode(null);
        setExpired(true);
        deadlineRef.current = null;
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [issueSeq]);

  const issue = async () => {
    setIssuing(true);
    setError(null);
    setCopied(false);
    try {
      const result = await MobileAppService.issueCode();
      const ttl = result.expires_in > 0 ? result.expires_in : DEFAULT_TTL_SECONDS;
      deadlineRef.current = Date.now() + ttl * 1000;
      setCode(result.code);
      setFormattedCode(result.formatted_code || result.code);
      setSecondsLeft(ttl);
      setExpired(false);
      setIssueSeq(n => n + 1);
    } catch (e: any) {
      setError(e?.message || 'تعذّر إنشاء رمز الاقتران');
    } finally {
      setIssuing(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // متصفحات قديمة أو سياق غير آمن
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const revokeDevice = async (device: MobileDevice) => {
    const label = device.device_name || 'هذا الجهاز';
    if (!window.confirm(`سيُفصل «${label}» فوراً ولن يتمكن من الدخول حتى تعيد ربطه. متابعة؟`)) return;

    setWorking(true);
    setError(null);
    try {
      await MobileAppService.revokeDevice(device.device_id);
      await loadDevices();
    } catch (e: any) {
      setError(e?.message || 'تعذّر فصل الجهاز');
    } finally {
      setWorking(false);
    }
  };

  const revokeAll = async () => {
    if (!window.confirm('سيُفصل كل الأجهزة المربوطة بحسابك. متابعة؟')) return;

    setWorking(true);
    setError(null);
    try {
      await MobileAppService.revokeAll();
      await loadDevices();
    } catch (e: any) {
      setError(e?.message || 'تعذّر فصل الأجهزة');
    } finally {
      setWorking(false);
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const fmtClock = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const platformLabel = (device: MobileDevice) => {
    const base = PLATFORM_LABELS[(device.platform || '').toLowerCase()] || device.platform || '—';
    return device.os_version ? `${base} · ${device.os_version}` : base;
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><Smartphone size={14} /></div>
        <span className="settings-section__title">تطبيق الجوال</span>
      </div>

      <div className="settings-section__content">
        {/* التعليمات */}
        <div className="settings-option-card">
          <div className="settings-option-card__title">
            <Smartphone size={14} /> كيف تربط جوالك؟
          </div>
          <ol className="mob-steps">
            <li><b>١)</b> نزّل تطبيق «رائد» على جوالك</li>
            <li><b>٢)</b> افتح شاشة الربط في التطبيق</li>
            <li><b>٣)</b> أدخل الرمز الظاهر أدناه</li>
          </ol>
        </div>

        {/* رمز الاقتران */}
        <div className="settings-option-card">
          <div className="settings-option-card__title">
            <KeyRound size={14} /> رمز الاقتران
          </div>
          <div className="settings-option-card__desc">
            رمز صالح لمرة واحدة ولثلاث دقائق فقط. يُعرض <b>مرة واحدة</b> عند إنشائه ولا يمكن استرجاعه بعدها.
          </div>

          <div className="mob-danger">
            <AlertTriangle size={16} />
            <span>هذا الرمز يمنح دخولاً كاملاً لحسابك — لا تُملِه لأحد ولو قال إنه الدعم الفني.</span>
          </div>

          {formattedCode && !expired && (
            <div className="mob-code">
              <code className="mob-code__value" dir="ltr">{formattedCode}</code>
              <span className={`mob-code__timer${secondsLeft <= 30 ? ' mob-code__timer--urgent' : ''}`}>
                <Timer size={13} /> ينتهي خلال {fmtClock(secondsLeft)}
              </span>
              <button type="button" className="settings-btn settings-btn--small" onClick={copyCode}>
                {copied ? <><Check size={13} /> نُسخ</> : <><Copy size={13} /> نسخ الرمز</>}
              </button>
              <div className="mob-code__note">انسخه الآن — لن يظهر مرة أخرى.</div>
            </div>
          )}

          {expired && (
            <div className="mob-code__expired">
              <Clock size={15} /> انتهت صلاحية الرمز — أنشئ رمزاً جديداً.
            </div>
          )}

          {error && <div className="mob-error">{error}</div>}

          <div className="settings-btn-group">
            <button
              type="button"
              className="settings-btn settings-btn--primary"
              onClick={issue}
              disabled={issuing}
            >
              {issuing ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
              {formattedCode || expired ? 'إنشاء رمز جديد' : 'إنشاء رمز'}
            </button>
          </div>
        </div>

        {/* الأجهزة المربوطة */}
        <div className="settings-option-card">
          <div className="mob-devices__head">
            <div className="settings-option-card__title">
              <Smartphone size={14} /> الأجهزة المربوطة
            </div>
            <div className="settings-btn-group">
              <button
                type="button"
                className="settings-btn settings-btn--small"
                onClick={loadDevices}
                disabled={working}
              >
                <RefreshCw size={13} /> تحديث
              </button>
              {devices.length > 0 && (
                <button
                  type="button"
                  className="settings-btn settings-btn--small settings-btn--danger"
                  onClick={revokeAll}
                  disabled={working}
                >
                  <Trash2 size={13} /> فصل جميع الأجهزة
                </button>
              )}
            </div>
          </div>

          {loadingDevices ? (
            <div className="mob-row"><Loader2 className="animate-spin" size={16} /> جارٍ التحميل…</div>
          ) : devices.length === 0 ? (
            <div className="mob-empty">لا توجد أجهزة مربوطة بحسابك بعد.</div>
          ) : (
            <div className="mob-devices">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>الجهاز</th>
                    <th>المنصّة</th>
                    <th>آخر نشاط</th>
                    <th>تاريخ الربط</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.device_id}>
                      <td>
                        <span className="mob-device__name">
                          {device.device_name || 'جهاز بلا اسم'}
                          {device.is_current && <span className="settings-badge settings-badge--success">هذا الجهاز</span>}
                        </span>
                        {device.app_version && (
                          <span className="mob-device__meta">إصدار التطبيق {device.app_version}</span>
                        )}
                      </td>
                      <td>{platformLabel(device)}</td>
                      <td>
                        {fmtDate(device.last_seen_at)}
                        {device.last_ip && <span className="mob-device__meta">{device.last_ip}</span>}
                      </td>
                      <td>
                        {fmtDate(device.paired_at)}
                        {device.token_expires_at && (
                          <span className="mob-device__meta">تنتهي الصلاحية {fmtDate(device.token_expires_at)}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="settings-btn settings-btn--small settings-btn--danger"
                          onClick={() => revokeDevice(device)}
                          disabled={working}
                        >
                          <LogOut size={13} /> فصل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAppSettings;
