import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, Loader2, AlertTriangle, CheckCircle2, Users, Clock } from 'lucide-react';
import { OfficeBroadcastService } from '../../services/officeBroadcastService';
import type { OfficeBroadcast, OfficeBroadcastState } from '../../services/officeBroadcastService';

/**
 * تعميم المكتب — رسالةٌ يكتبها المدير فتصل موظّفيه إشعاراً في الجوّال والموقع.
 *
 * ‏والحدُّ رسالةٌ واحدة في اليوم — وهو ليس تضييقاً بل حمايةٌ لبقيّة النظام:
 * ‏مكتبٌ يبثّ خمس رسائل يومياً يُعلّم موظّفيه تجاهلَ الإشعارات، فتضيع معها
 * ‏تنبيهات الجلسات والمُهَل. والحدُّ مفروضٌ في قاعدة البيانات لا هنا؛ وتعطيلُ
 * ‏الزرّ في الواجهة **راحةٌ لا حراسة** — تمنع الكتابة التي ستُردّ، لا الالتفاف.
 *
 * ‏الأنماط من settings-page.css و office-broadcast.css (يُحمَّلان مركزياً عبر
 * ‏styles/appStyles.ts) — لا استيراد CSS هنا.
 */

/** ‏احتياطٌ حتى تصل حدود الخادم — تُستبدل بها فور وصول الرد */
const FALLBACK_TITLE_MAX = 120;
const FALLBACK_BODY_MAX = 2000;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

const OfficeBroadcastSettings: React.FC = () => {
  const [state, setState] = useState<OfficeBroadcastState | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<OfficeBroadcast | null>(null);

  const titleMax = state?.title_max ?? FALLBACK_TITLE_MAX;
  const bodyMax = state?.body_max ?? FALLBACK_BODY_MAX;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setState(await OfficeBroadcastService.load());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'تعذّر جلب التعاميم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sentToday = state?.sent_today ?? false;

  const canSend = useMemo(
    () => !sending && !sentToday && title.trim().length >= 3 && body.trim().length >= 3,
    [sending, sentToday, title, body],
  );

  const submit = useCallback(async () => {
    if (!canSend) return;

    setSending(true);
    setError(null);

    try {
      const created = await OfficeBroadcastService.send(title.trim(), body.trim());

      setSent(created);
      setTitle('');
      setBody('');

      // ‏نُعيد التحميل لا نُحدّث محلياً: `sent_today` يحسبه الخادم بتوقيت الرياض
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذّر إرسال التعميم');
    } finally {
      setSending(false);
    }
  }, [canSend, title, body, load]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><Megaphone size={14} /></div>
        <span className="settings-section__title">تعميم للموظفين</span>
      </div>

      <div className="settings-section__content">
        <div className="settings-option-card">
          <div className="settings-option-card__title">ما هذا؟</div>
          <div className="settings-option-card__desc">
            رسالةٌ تكتبها فتصل <strong>كل موظّف نشط في مكتبك</strong> إشعاراً على جواله وفي
            تنبيهات الموقع. ولا تصل العملاء.
          </div>
          <div className="obc-limit">
            <Clock size={13} />
            <span>
              تعميمٌ واحد في اليوم — حتى لا يعتاد الموظّفون تجاهل الإشعارات فتضيع معها
              تنبيهات الجلسات والمُهَل.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="obc-loading"><Loader2 size={16} className="obc-spin" /> جارٍ التحميل…</div>
        ) : (
          <>
            {sentToday && !sent && (
              <div className="obc-notice">
                <AlertTriangle size={14} />
                <span>أُرسل تعميم اليوم — التالي بعد منتصف الليل بتوقيت الرياض.</span>
              </div>
            )}

            {sent && (
              <div className="obc-success">
                <CheckCircle2 size={14} />
                <span>وصل التعميم إلى {sent.recipients_count} موظّفاً.</span>
              </div>
            )}

            <div className="settings-option-card">
              <div className="obc-field">
                <label className="obc-field__label" htmlFor="obc-title">
                  العنوان
                  <span className="obc-counter">{title.length} / {titleMax}</span>
                </label>
                <input
                  id="obc-title"
                  type="text"
                  className="obc-input"
                  value={title}
                  maxLength={titleMax}
                  disabled={sentToday || sending}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اجتماع عام يوم الأحد"
                />
              </div>

              <div className="obc-field">
                <label className="obc-field__label" htmlFor="obc-body">
                  النص
                  <span className="obc-counter">{body.length} / {bodyMax}</span>
                </label>
                <textarea
                  id="obc-body"
                  className="obc-input obc-textarea"
                  value={body}
                  maxLength={bodyMax}
                  disabled={sentToday || sending}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب ما تريد إبلاغه للفريق…"
                />
              </div>

              {error && <div className="obc-error"><AlertTriangle size={13} /> {error}</div>}

              <button
                type="button"
                className="obc-btn obc-btn--primary"
                disabled={!canSend}
                onClick={submit}
              >
                {sending ? <Loader2 size={14} className="obc-spin" /> : <Send size={14} />}
                {sending ? 'جارٍ الإرسال…' : 'إرسال التعميم'}
              </button>

              <div className="obc-hint">
                ⚠️ لا يمكن سحب التعميم بعد إرساله — راجعه قبل الضغط.
              </div>
            </div>

            {(state?.broadcasts?.length ?? 0) > 0 && (
              <div className="settings-option-card">
                <div className="settings-option-card__title">التعاميم السابقة</div>
                <div className="obc-list">
                  {state!.broadcasts.map((b) => (
                    <div key={b.id} className="obc-item">
                      <div className="obc-item__head">
                        <span className="obc-item__title">{b.title}</span>
                        <span className="obc-item__meta">
                          <Users size={11} /> {b.recipients_count}
                        </span>
                      </div>
                      <div className="obc-item__body">{b.body}</div>
                      <div className="obc-item__foot">
                        {formatDate(b.created_at)}
                        {b.author?.name ? ` · ${b.author.name}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OfficeBroadcastSettings;
