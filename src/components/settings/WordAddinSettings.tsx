import React, { useEffect, useState } from 'react';
import { FileText, KeyRound, Copy, Check, Trash2, Loader2, Download, Sparkles } from 'lucide-react';
import { WordAddinService } from '../../services/wordAddinService';
import type { WordAddinTokenStatus } from '../../services/wordAddinService';

/**
 * إعدادات إضافة Microsoft Word — توليد/نسخ رمز الربط + تعليمات التثبيت.
 * لغير العملاء (التبويب نفسه محجوب عن دور client في Settings.tsx).
 */
const MANIFEST_URL = 'https://api.alraedlaw.com/word-addin/manifest.xml';
const DESKTOP_INSTALL_CMD =
  'irm https://api.alraedlaw.com/word-addin/install-desktop.ps1 -OutFile "$env:TEMP\\alraed-install.ps1"; powershell -ExecutionPolicy Bypass -File "$env:TEMP\\alraed-install.ps1"';

/** زر نسخ أمر تثبيت سطح المكتب — الأمر نفسه لا يُعرض (مخيف للمستخدم العادي). */
const InstallCommand: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DESKTOP_INSTALL_CMD);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = DESKTOP_INSTALL_CMD;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button type="button" className="settings-btn settings-btn--primary settings-btn--small" onClick={copy}>
      {copied ? <><Check size={13} /> نُسخ — الصقه في PowerShell</> : <><Copy size={13} /> نسخ أمر التثبيت</>}
    </button>
  );
};

const WordAddinSettings: React.FC = () => {
  const [status, setStatus] = useState<WordAddinTokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setStatus(await WordAddinService.getTokenStatus());
    } catch {
      // الحالة اختيارية — لا نعطّل الصفحة
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const generate = async () => {
    setWorking(true);
    setError(null);
    try {
      setToken(await WordAddinService.generateToken());
      setCopied(false);
      await loadStatus();
    } catch (e: any) {
      setError(e.message || 'تعذّر إنشاء رمز الربط');
    } finally {
      setWorking(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm('سيتوقف ربط إضافة Word حتى تنشئ رمزاً جديداً. متابعة؟')) return;
    setWorking(true);
    setError(null);
    try {
      await WordAddinService.revokeToken();
      setToken(null);
      await loadStatus();
    } catch (e: any) {
      setError(e.message || 'تعذّر إبطال الرمز');
    } finally {
      setWorking(false);
    }
  };

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
    } catch {
      // متصفحات قديمة
      const ta = document.createElement('textarea');
      ta.value = token;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><FileText size={14} /></div>
        <span className="settings-section__title">إضافة Microsoft Word</span>
      </div>

      <div className="settings-section__content">
        {/* ماذا تفعل الإضافة */}
        <div className="settings-option-card">
          <div className="wa-intro">
            <p className="wa-intro__lead">
              اكتب مذكرتك في Word وأرسلها إلى النظام بنقرة — دون مغادرة المستند:
            </p>
            <ul className="wa-intro__list">
              <li>إرسال نص المستند <b>كمذكرة قابلة للتحرير</b> داخل قضية.</li>
              <li>حفظ المستند <b>PDF بتنسيقه الحرفي</b> في وثائق القضية (ويُرفع إلى OneDrive تلقائياً).</li>
              <li>حفظ الـ PDF في <b>ملف العميل</b> أو <b>مرفقاً بمهمة</b>.</li>
              <li>عرض بيانات القضية العامة (العميل، الحالة، الجلسة القادمة) داخل اللوحة.</li>
              <li><b>محركات الذكاء الاثنا عشر</b> — على المستند كاملاً أو النص المحدد، مع تطبيق التعديلات داخل مستندك بنقرة.</li>
              <li><b>البحث بالمعنى في الأنظمة</b> — وإدراج نص المادة باستشهادها في موضعها.</li>
              <li><b>«راج» للسوابق القضائية</b> — صِف مسألتك ليحلّل أكثر من 40 ألف حكم ويعطيك أقرب المبادئ.</li>
            </ul>
            <p className="wa-intro__soon">
              <Sparkles size={12} /> كل ذلك من لوحة جانبية واحدة — دون نسخ أو لصق أو تنقّل بين النوافذ.
            </p>
          </div>
        </div>

        {/* رمز الربط */}
        <div className="settings-option-card">
          <div className="settings-option-card__title">
            <KeyRound size={14} /> رمز الربط
          </div>
          <div className="settings-option-card__desc">
            الإضافة تدخل بهذا الرمز بدلاً من كلمة المرور. يُعرض <b>مرة واحدة فقط</b> عند إنشائه،
            وإنشاء رمز جديد يُبطل السابق.
          </div>

          {loading ? (
            <div className="wa-row"><Loader2 className="animate-spin" size={16} /> جارٍ التحميل…</div>
          ) : (
            <>
              {status?.exists && !token && (
                <div className="wa-status">
                  <span>يوجد رمز فعّال — أُنشئ: {fmtDate(status.created_at)}</span>
                  <span>آخر استخدام: {fmtDate(status.last_used_at)}</span>
                </div>
              )}

              {token && (
                <div className="wa-token">
                  <code className="wa-token__value" dir="ltr">{token}</code>
                  <button className="settings-btn settings-btn--small" onClick={copyToken}>
                    {copied ? <><Check size={13} /> نُسخ</> : <><Copy size={13} /> نسخ</>}
                  </button>
                  <div className="wa-token__warn">انسخ الرمز الآن — لن يظهر مرة أخرى.</div>
                </div>
              )}

              {error && <div className="wa-error">{error}</div>}

              <div className="settings-btn-group">
                <button className="settings-btn settings-btn--primary" onClick={generate} disabled={working}>
                  {working ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
                  {status?.exists ? 'إنشاء رمز جديد (يُبطل السابق)' : 'إنشاء رمز ربط'}
                </button>
                {status?.exists && (
                  <button className="settings-btn settings-btn--danger" onClick={revoke} disabled={working}>
                    <Trash2 size={14} /> إبطال الرمز
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* التثبيت */}
        <div className="settings-option-card">
          <div className="settings-option-card__title">
            <Download size={14} /> تثبيت الإضافة في Word
          </div>

          {/* الطريقة 1 — للمكتب كله (الموصى بها) */}
          <div className="wa-method wa-method--best">
            <div className="wa-method__head">
              <b>لمكتبك كلّه دفعة واحدة</b>
              <span className="wa-badge">الموصى بها ⭐</span>
            </div>
            <p className="wa-method__hint">
              خطوة يقوم بها مدير حساب Microsoft 365 مرة واحدة — وتظهر الإضافة تلقائياً
              لكل الفريق في Word (سطح المكتب والويب) دون أن يثبّت أحد أي شيء.
            </p>
            <ol className="wa-steps">
              <li>
                حمّل{' '}
                <a href={MANIFEST_URL} download="alraed-word-addin.xml" className="wa-link">ملف التعريف</a>.
              </li>
              <li>
                افتح{' '}
                <a href="https://admin.microsoft.com" target="_blank" rel="noreferrer" className="wa-link">مركز إدارة Microsoft 365</a>
                {' '}← <b>الإعدادات</b> ← <b>التطبيقات المتكاملة</b>.
              </li>
              <li>اختر <b>«تحميل تطبيقات مخصّصة»</b>، ارفع الملف، واعتمد النشر لكل المستخدمين.</li>
              <li>خلال ساعات قليلة يظهر زر <b>«فتح الرائد»</b> في شريط Word لدى الجميع تلقائياً.</li>
            </ol>
          </div>

          {/* الطريقة 2 — لجهازك الآن عبر Word الويب */}
          <div className="wa-method">
            <div className="wa-method__head"><b>لجهازك الآن — ‏Word على الويب</b></div>
            <ol className="wa-steps">
              <li>
                حمّل{' '}
                <a href={MANIFEST_URL} download="alraed-word-addin.xml" className="wa-link">ملف التعريف</a>.
              </li>
              <li>افتح أي مستند في Word على المتصفح (office.com).</li>
              <li><b>إدراج</b> ← <b>الوظائف الإضافية</b> ← <b>الوظائف الإضافية الخاصة بي</b> ← <b>تحميل الوظيفة الإضافية</b>.</li>
              <li>اختر الملف — ويظهر زر <b>«فتح الرائد»</b> فوراً.</li>
            </ol>
          </div>

          {/* الطريقة 3 — سطح المكتب، مطوية للمتمكنين */}
          <details className="wa-adv">
            <summary>‏تثبيت يدوي على Word سطح المكتب (Windows) — للمتمكّنين</summary>
            <ol className="wa-steps">
              <li>
                انسخ أمر التثبيت: <InstallCommand />
              </li>
              <li>
                افتح <b>PowerShell</b> (ابحث عنه في قائمة ابدأ)، الصق الأمر واضغط Enter —
                سيطلب موافقة المسؤول مرة واحدة ويجهّز كل شيء بنفسه.
              </li>
              <li>
                أعد فتح Word ← <b>إدراج</b> ← <b>الوظائف الإضافية الخاصة بي</b> ←
                تبويب <b>«مجلد مشترك»</b> ← <b>الرائد للمحاماة</b> ← إضافة.
              </li>
            </ol>
          </details>

          <p className="wa-final">
            وأخيراً — افتح لوحة الإضافة داخل Word والصق <b>رمز الربط</b> أعلاه، وستظهر قضاياك مباشرة 🎉
          </p>
        </div>
      </div>

      <style>{`
        .wa-intro__lead { font-size: 12.5px; margin-bottom: 8px; color: var(--color-heading, #16202f); }
        .wa-intro__list { margin: 0 18px 10px 0; padding: 0; font-size: 12px; color: var(--color-text-secondary, #5d6675); display: flex; flex-direction: column; gap: 4px; }
        .wa-intro__soon { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--law-gold, #c9a35d); font-weight: 600; margin: 0; }
        .wa-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 8px 0; }
        .wa-status { display: flex; flex-direction: column; gap: 2px; font-size: 11.5px; color: var(--color-text-secondary, #5d6675); margin-bottom: 10px; }
        .wa-token { border: 1px solid var(--law-gold, #c9a35d); border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: var(--dashboard-card, #fff); }
        .wa-token__value { font-size: 11px; word-break: break-all; flex: 1 1 100%; direction: ltr; text-align: left; }
        .wa-token__warn { flex-basis: 100%; font-size: 11px; color: var(--status-orange, #cf8a2e); font-weight: 600; }
        .wa-error { font-size: 11.5px; color: var(--status-red, #b0543f); background: var(--status-red-light, #f6ebe7); border: 1px solid currentColor; border-radius: 8px; padding: 7px 10px; margin-bottom: 10px; }
        .wa-steps { margin: 6px 18px 0 0; padding: 0; font-size: 12px; display: flex; flex-direction: column; gap: 8px; color: var(--color-text-secondary, #5d6675); }
        .wa-steps b { color: var(--color-heading, #16202f); }
        .wa-link { color: var(--law-navy, #1e3a5f); font-weight: 700; text-decoration: underline; }
        .wa-method { border: 1px solid var(--quiet-gray-200, #e4e2dd); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; background: var(--dashboard-card, #fff); }
        .wa-method--best { border-color: var(--law-gold, #c9a35d); }
        .wa-method__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--color-heading, #16202f); margin-bottom: 4px; }
        .wa-badge { font-size: 10px; font-weight: 700; color: var(--law-gold, #a8834a); border: 1px solid var(--law-gold, #c9a35d); border-radius: 20px; padding: 1px 9px; white-space: nowrap; }
        .wa-method__hint { font-size: 11px; color: var(--color-text-secondary, #5d6675); margin: 0 0 8px; line-height: 1.7; }
        .wa-adv { border: 1px dashed var(--quiet-gray-200, #e4e2dd); border-radius: 10px; padding: 10px 14px; margin-bottom: 10px; }
        .wa-adv summary { cursor: pointer; font-size: 11.5px; font-weight: 600; color: var(--color-text-secondary, #5d6675); }
        .wa-adv[open] summary { margin-bottom: 8px; color: var(--color-heading, #16202f); }
        .wa-final { font-size: 12px; color: var(--color-heading, #16202f); margin: 4px 0 0; }
      `}</style>
    </div>
  );
};

export default WordAddinSettings;
