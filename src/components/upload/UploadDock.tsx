/**
 * شريط تتبّع الرفع — ملتصق بالحافة السفلية بجوار شريط الدردشة.
 *
 * يقرأ من uploadManager (مفردة خارج شجرة React) بـuseSyncExternalStore، فلا يملك
 * الحالة ولا يفقدها بإعادة التركيب. ولأنه مركَّبٌ في Layout خارج Outlet، فالتنقّل
 * بين الصفحات لا يمسّه: الرفع يستمرّ والشريط يتابعه.
 *
 * مطويّاً: شريطٌ بارتفاع ٣٢ بكسل يقول «يرفع ٣ ملفات — ٦٤٪».
 * مفروداً: لوحةٌ تُظهر كل ملف بنسبته وسرعته ووقته المتبقّي، مجمَّعةً بالسياق
 * («قضية ٤٢١») مع إعادة محاولةٍ لكل ملفٍ فشل.
 */

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  UploadCloud,
  ChevronUp,
  ChevronDown,
  X,
  RotateCw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { uploadManager, type UploadItem, type UploadSnapshot } from '../../upload/uploadManager';
import '../../styles/upload-dock.css';

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 بايت';
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

const formatEta = (seconds: number | null): string => {
  if (seconds === null || !isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return `${seconds} ثانية`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} دقيقة` : `${Math.round(minutes / 60)} ساعة`;
};

const STATUS_LABEL: Record<UploadItem['status'], string> = {
  queued: 'في الانتظار',
  uploading: 'يُرفع',
  done: 'تم',
  failed: 'فشل',
  canceled: 'أُلغي',
};

const StatusIcon: React.FC<{ status: UploadItem['status'] }> = ({ status }) => {
  switch (status) {
    case 'done':
      return <Check size={13} className="upload-dock__icon upload-dock__icon--done" />;
    case 'failed':
      return <AlertCircle size={13} className="upload-dock__icon upload-dock__icon--failed" />;
    case 'uploading':
      return <Loader2 size={13} className="upload-dock__icon upload-dock__icon--spin" />;
    default:
      return <UploadCloud size={13} className="upload-dock__icon upload-dock__icon--muted" />;
  }
};

/** يقصّ اسم الملف من الوسط ليبقى الامتداد ظاهراً */
const truncateMiddle = (name: string, max = 34): string => {
  if (name.length <= max) return name;
  const head = name.slice(0, max - 12);
  const tail = name.slice(-9);
  return `${head}…${tail}`;
};

const UploadRow: React.FC<{ item: UploadItem }> = ({ item }) => {
  const isActive = item.status === 'uploading' || item.status === 'queued';

  return (
    <div className={`upload-dock__row upload-dock__row--${item.status}`}>
      <div className="upload-dock__row-head">
        <StatusIcon status={item.status} />

        <span className="upload-dock__name" title={item.fileName}>
          {truncateMiddle(item.fileName)}
        </span>

        <span className="upload-dock__meta">
          {item.status === 'uploading' && item.speed
            ? `${formatBytes(item.speed)}/ث`
            : item.status === 'uploading'
              ? `${item.progress}٪`
              : STATUS_LABEL[item.status]}
        </span>

        {(item.status === 'failed' || item.status === 'canceled') && (
          <button
            type="button"
            className="upload-dock__act"
            onClick={() => uploadManager.retry(item.id)}
            title="إعادة المحاولة"
            aria-label={`إعادة رفع ${item.fileName}`}
          >
            <RotateCw size={12} />
          </button>
        )}

        {isActive ? (
          <button
            type="button"
            className="upload-dock__act"
            onClick={() => uploadManager.cancel(item.id)}
            title="إلغاء"
            aria-label={`إلغاء رفع ${item.fileName}`}
          >
            <X size={12} />
          </button>
        ) : (
          <button
            type="button"
            className="upload-dock__act"
            onClick={() => uploadManager.dismiss(item.id)}
            title="إزالة من القائمة"
            aria-label={`إزالة ${item.fileName}`}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {item.status === 'uploading' && (
        <div className="upload-dock__bar" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="upload-dock__bar-fill" style={{ width: `${item.progress}%` }} />
        </div>
      )}

      <div className="upload-dock__sub">
        {item.status === 'uploading' && (
          <>
            <span>{formatBytes(item.loaded)} من {formatBytes(item.size)}</span>
            {item.eta !== null && <span>· يتبقّى {formatEta(item.eta)}</span>}
          </>
        )}
        {item.status === 'queued' && <span>{formatBytes(item.size)}</span>}
        {item.status === 'done' && <span>{formatBytes(item.size)} · أُضيف للقضية</span>}
        {item.status === 'failed' && <span className="upload-dock__err">{item.error || 'تعذّر الرفع'}</span>}
        {item.status === 'canceled' && <span>أُلغي قبل الاكتمال</span>}
      </div>
    </div>
  );
};

const UploadDockInner: React.FC<{ snapshot: UploadSnapshot }> = ({ snapshot }) => {
  const [open, setOpen] = useState(false);
  const { items, activeCount, doneCount, failedCount, overallProgress, hasActive } = snapshot;

  // يُفتح تلقائياً عند أول رفعة ليرى المستخدم أن شيئاً بدأ، ولا يُفرض بعدها
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (hasActive && !autoOpened) {
      setOpen(true);
      setAutoOpened(true);
    }
    if (!hasActive && items.length === 0) {
      setAutoOpened(false);
      setOpen(false);
    }
  }, [hasActive, autoOpened, items.length]);

  // Esc يطوي اللوحة
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (items.length === 0) return null;

  // تجميع بالسياق: «قضية ٤٢١» ثم ملفاتها — ليعرف أيّ رفعةٍ تخصّ أيّ ملف
  const groups = new Map<string, { label: string; rows: UploadItem[] }>();
  for (const item of items) {
    const key = `${item.context.kind}:${item.context.id}`;
    if (!groups.has(key)) groups.set(key, { label: item.context.label, rows: [] });
    groups.get(key)!.rows.push(item);
  }

  const headline = hasActive
    ? `يُرفع ${activeCount} ${activeCount === 1 ? 'ملف' : 'ملفات'} — ${overallProgress}٪`
    : failedCount > 0
      ? `فشل ${failedCount} من ${items.length}`
      : `اكتمل رفع ${doneCount}`;

  return (
    <div className={`upload-dock ${open ? 'upload-dock--open' : ''}`} dir="rtl">
      <button
        type="button"
        className="upload-dock__fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={headline}
      >
        {hasActive ? (
          <Loader2 size={14} className="upload-dock__icon--spin" />
        ) : failedCount > 0 ? (
          <AlertCircle size={14} />
        ) : (
          <Check size={14} />
        )}

        <span className="upload-dock__headline">{headline}</span>

        {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}

        {hasActive && (
          <span className="upload-dock__fab-bar" aria-hidden="true">
            <span className="upload-dock__fab-bar-fill" style={{ width: `${overallProgress}%` }} />
          </span>
        )}
      </button>

      {open && (
        <div className="upload-dock__panel" role="region" aria-label="حالة رفع الملفات">
          <div className="upload-dock__panel-head">
            <span>رفع الملفات</span>

            <div className="upload-dock__panel-acts">
              {failedCount > 0 && (
                <button type="button" onClick={() => uploadManager.retryAllFailed()}>
                  إعادة الفاشل ({failedCount})
                </button>
              )}
              {(doneCount > 0 || failedCount > 0) && (
                <button type="button" onClick={() => uploadManager.clearFinished()}>
                  مسح المنتهي
                </button>
              )}
            </div>
          </div>

          <div className="upload-dock__list">
            {Array.from(groups.entries()).map(([key, group]) => (
              <div key={key} className="upload-dock__group">
                <div className="upload-dock__group-head">{group.label}</div>
                {group.rows.map((item) => (
                  <UploadRow key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>

          {hasActive && (
            <div className="upload-dock__note">
              تحديث الصفحة يُلغي الرفع الجاري. التنقّل بين الصفحات آمن.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * يُركَّب في Layout مرّةً واحدة. يُرسم عبر Portal إلى body حتى لا يقيّده أي
 * overflow أو transform في الشجرة فوقه (وهو ما يكسر position: fixed).
 */
const UploadDock: React.FC = () => {
  const snapshot = useSyncExternalStore(uploadManager.subscribe, uploadManager.getSnapshot);

  if (typeof document === 'undefined') return null;

  return createPortal(<UploadDockInner snapshot={snapshot} />, document.body);
};

export default UploadDock;
