import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Chrome, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'https://api.alraedlaw.com/api';
const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/cmanbngddccpfalmmpmkglfgncopmmcn?utm_source=item-share-cb';
const POLL_INTERVAL_MS = 30_000;

type WaStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown';

interface InstanceLite {
  id: number | string;
  status: 'connected' | 'connecting' | 'disconnected';
  phone_number?: string;
  department?: string;
}

const BottomActionBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [waStatus, setWaStatus] = useState<WaStatus>('unknown');
  const [waInstances, setWaInstances] = useState<InstanceLite[]>([]);
  const [showWaTip, setShowWaTip] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);

  const tipRef = useRef<HTMLDivElement>(null);
  const waBtnRef = useRef<HTMLButtonElement>(null);

  const fetchWaStatus = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/v1/whatsapp/instances`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' }
      });
      if (!res.ok) { setWaStatus('disconnected'); return; }
      const json = await res.json();
      const list: InstanceLite[] = (json?.data || []).map((i: any) => ({
        id: i.id, status: i.status || 'disconnected', phone_number: i.phone_number, department: i.department
      }));
      setWaInstances(list);
      if (list.length === 0) setWaStatus('disconnected');
      else if (list.some(i => i.status === 'connected')) setWaStatus('connected');
      else if (list.some(i => i.status === 'connecting')) setWaStatus('connecting');
      else setWaStatus('disconnected');
    } catch {
      setWaStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    fetchWaStatus();
    const intv = setInterval(fetchWaStatus, POLL_INTERVAL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') fetchWaStatus(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(intv); document.removeEventListener('visibilitychange', onVis); };
  }, [user, fetchWaStatus]);

  useEffect(() => {
    if (!showWaTip) return;
    const handler = (e: MouseEvent) => {
      if (tipRef.current?.contains(e.target as Node)) return;
      if (waBtnRef.current?.contains(e.target as Node)) return;
      setShowWaTip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showWaTip]);

  if (!user || user.role !== 'admin') return null;

  const connectedInstance = waInstances.find(i => i.status === 'connected');
  const isWaOk = waStatus === 'connected';
  const isWaConnecting = waStatus === 'connecting';
  const showAttention = waStatus === 'disconnected' && !tipDismissed;

  const waLabel = isWaOk
    ? (connectedInstance?.department || connectedInstance?.phone_number || 'متصل')
    : isWaConnecting ? 'جاري الربط' : 'غير متصل';

  const goWhatsapp = () => { setShowWaTip(false); navigate('/whatsapp-settings'); };
  const openChrome = () => { window.open(CHROME_EXTENSION_URL, '_blank', 'noopener,noreferrer'); };

  return (
    <div className="bab" dir="rtl" role="status" aria-label="شريط حالة النظام">
      <button
        ref={waBtnRef}
        className={`bab__chip bab__chip--${waStatus}`}
        onClick={goWhatsapp}
        onMouseEnter={() => !isWaOk && setShowWaTip(true)}
        onMouseLeave={() => setShowWaTip(false)}
        title={isWaOk ? 'إعدادات الواتساب' : 'الواتساب غير متصل — اضغط للإعداد'}
      >
        <span className={`bab__dot bab__dot--${waStatus}`} />
        <MessageSquare size={12} />
        <span className="bab__chip-label">واتساب</span>
        <span className="bab__chip-value">{waLabel}</span>
        {showAttention && <AlertTriangle size={11} className="bab__warn" />}
      </button>

      <button
        className="bab__chip bab__chip--neutral"
        onClick={openChrome}
        title="تثبيت إضافة Chrome"
      >
        <Chrome size={12} />
        <span className="bab__chip-label">إضافة Chrome</span>
        <span className="bab__chip-value">تثبيت</span>
        <ExternalLink size={10} className="bab__ext-icon" />
      </button>

      {showWaTip && !isWaOk && (
        <div ref={tipRef} className="bab__tip" role="tooltip">
          <div className="bab__tip-header">
            <AlertTriangle size={13} />
            <span>الواتساب غير متصل</span>
            <button
              className="bab__tip-close"
              onClick={(e) => { e.stopPropagation(); setShowWaTip(false); setTipDismissed(true); }}
              aria-label="إغلاق"
            >
              <X size={12} />
            </button>
          </div>
          <ol className="bab__tip-steps">
            <li>افتح صفحة إعدادات الواتساب من النظام.</li>
            <li>اضغط "إضافة رقم جديد" واختر القسم.</li>
            <li>افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة.</li>
            <li>امسح رمز QR الظاهر لربط الرقم.</li>
          </ol>
          <button
            className="bab__tip-btn"
            onClick={(e) => { e.stopPropagation(); goWhatsapp(); }}
          >
            الذهاب إلى الإعدادات
          </button>
        </div>
      )}

      <style>{`
        .bab {
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          height: 30px;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          z-index: 38;
          font-family: inherit;
          box-shadow: var(--shadow-xs);
        }

        .bab__chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 22px;
          padding: 0 8px;
          border-radius: 4px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, transform 0.05s;
          white-space: nowrap;
          line-height: 1;
        }
        .bab__chip:hover {
          background: var(--color-surface-subtle);
          border-color: var(--color-border-strong);
        }
        .bab__chip:active { transform: scale(0.98); }
        .bab__chip-label { color: var(--color-text-secondary); font-weight: 400; }
        .bab__chip-value { font-weight: 600; color: var(--color-heading); }

        .bab__chip--connected {
          border-color: color-mix(in srgb, var(--color-success) 35%, transparent);
          background: var(--color-success-soft);
        }
        .bab__chip--connected .bab__chip-value { color: var(--color-success); }
        .bab__chip--connected:hover {
          background: color-mix(in srgb, var(--color-success) 15%, var(--color-surface));
        }

        .bab__chip--connecting {
          border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
          background: var(--color-warning-soft);
        }
        .bab__chip--connecting .bab__chip-value { color: var(--color-warning); }
        .bab__chip--connecting:hover {
          background: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface));
        }

        .bab__chip--disconnected {
          border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
          background: var(--color-error-soft);
        }
        .bab__chip--disconnected .bab__chip-value { color: var(--color-error); }
        .bab__chip--disconnected:hover {
          background: color-mix(in srgb, var(--color-error) 15%, var(--color-surface));
        }

        .bab__chip--unknown { opacity: 0.7; }
        .bab__ext-icon { opacity: 0.5; color: var(--color-text-secondary); }

        .bab__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-text-secondary);
          flex-shrink: 0;
          opacity: 0.5;
        }
        .bab__dot--connected {
          background: var(--color-success);
          opacity: 1;
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 60%, transparent);
          animation: bab-pulse 2s infinite;
        }
        .bab__dot--connecting {
          background: var(--color-warning);
          opacity: 1;
          animation: bab-blink 1s infinite;
        }
        .bab__dot--disconnected { background: var(--color-error); opacity: 1; }
        .bab__dot--unknown { background: var(--color-text-secondary); opacity: 0.4; }

        @keyframes bab-pulse {
          0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 50%, transparent); }
          70% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-success) 0%, transparent); }
          100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 0%, transparent); }
        }
        @keyframes bab-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .bab__warn { color: var(--color-error); margin-right: 2px; }

        .bab__tip {
          position: absolute;
          bottom: 36px;
          right: 12px;
          width: 280px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
          padding: 10px 12px;
          z-index: 39;
          font-size: 12px;
          color: var(--color-text);
          animation: bab-tip-in 0.15s ease-out;
        }
        @keyframes bab-tip-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bab__tip::after {
          content: '';
          position: absolute;
          bottom: -5px;
          right: 24px;
          width: 10px; height: 10px;
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          transform: rotate(45deg);
        }
        .bab__tip-header {
          display: flex; align-items: center; gap: 6px;
          font-weight: 600;
          color: var(--color-error);
          padding-bottom: 6px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 6px;
        }
        .bab__tip-close {
          margin-right: auto;
          background: transparent; border: none; cursor: pointer;
          color: var(--color-text-secondary);
          padding: 2px; display: flex; align-items: center; justify-content: center;
          border-radius: 3px;
        }
        .bab__tip-close:hover {
          background: var(--color-surface-subtle);
          color: var(--color-heading);
        }
        .bab__tip-steps {
          margin: 0; padding-right: 18px;
          color: var(--color-text-secondary);
          line-height: 1.7;
          font-size: 11.5px;
        }
        .bab__tip-steps li { margin-bottom: 2px; }
        .bab__tip-btn {
          width: 100%;
          margin-top: 8px;
          padding: 6px 10px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: 5px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s;
        }
        .bab__tip-btn:hover { background: var(--color-primary-hover); }

        @media (max-width: 1024px) {
          .bab, .bab__tip { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default BottomActionBar;
