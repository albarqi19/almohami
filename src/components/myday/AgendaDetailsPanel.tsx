import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Trash2, Pencil, MessageSquare, Send,
  MapPin, Video, Clock, CalendarDays, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fmtDualAr, fmtTimeAr, relativeDayAr } from '../../utils/dateAr';
import {
  agendaCommentService,
  personalEventService,
  type AgendaComment,
} from '../../services/personalEventService';
import type { AgendaItem } from '../../services/myDayService';

interface Props {
  item: AgendaItem | null;
  currentUserId: number | null;
  onClose: () => void;
  onEditPersonal: (item: AgendaItem) => void;
  onChanged: () => void;
}

/**
 * لوحة تفاصيل البند — تنزلق من **اليسار** فوق الشبكة.
 *
 * لماذا لوحة لا مودال: المودال يحجب التقويم كلّه ويجبر على الإغلاق قبل النظر
 * في بندٍ آخر. اللوحة تُبقي الشبكة مرئية فيقفز المستخدم بين البنود مباشرةً،
 * وهو ما يفعله فعلاً حين يراجع يومه.
 *
 * وهي **قارئة لا محرِّرة** إلا للبند الشخصي: تحرير جلسة أو مهلة أو مهمة له
 * صفحته الكاملة، وتكرار ستة نماذج تحرير هنا يعني ستة أماكن تنحرف عن بعضها.
 */
const AgendaDetailsPanel: React.FC<Props> = ({
  item, currentUserId, onClose, onEditPersonal, onChanged,
}) => {
  const navigate = useNavigate();

  const [comments, setComments] = useState<AgendaComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // حارس مرجع تصاعدي: التنقّل السريع بين البنود يُطلق طلبات متداخلة، وردّ
  // الطلب الأقدم قد يصل أخيراً فيكتب تعليقات بندٍ غادرناه.
  const reqRef = useRef(0);

  const supportsComments = item ? agendaCommentService.supports(item.source) : false;

  const loadComments = useCallback(async () => {
    if (!item || !agendaCommentService.supports(item.source)) {
      setComments([]);
      return;
    }

    const token = ++reqRef.current;
    setLoading(true);
    setError(null);

    try {
      const rows = await agendaCommentService.list(item.source, item.id);
      if (token === reqRef.current) setComments(rows);
    } catch {
      if (token === reqRef.current) {
        setComments([]);
        setError('تعذّر تحميل التعليقات.');
      }
    } finally {
      if (token === reqRef.current) setLoading(false);
    }
  }, [item]);

  useEffect(() => {
    setDraft('');
    setConfirmDelete(false);
    loadComments();
  }, [loadComments]);

  // Esc يغلق — اللوحة طبقة فوق المحتوى فتتبع اتفاقية الطبقات
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  const isPersonal = item.source === 'personal';
  const extra = item.extra ?? {};
  const str = (k: string): string | null => {
    const v = extra[k];
    return typeof v === 'string' && v.trim() ? v : null;
  };

  const submitComment = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    try {
      const created = await agendaCommentService.add(item.source, item.id, content);
      setComments(prev => [...prev, created]);
      setDraft('');
    } catch {
      setError('تعذّر إضافة التعليق.');
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: number) => {
    try {
      await agendaCommentService.remove(item.source, item.id, id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {
      setError('تعذّر حذف التعليق.');
    }
  };

  const removePersonal = async () => {
    try {
      await personalEventService.remove(item.id);
      onChanged();
      onClose();
    } catch {
      setError('تعذّر الحذف.');
    }
  };

  return (
    <>
      <div className="mdp-scrim" onClick={onClose} aria-hidden="true" />

      <aside className="mdp" role="dialog" aria-modal="true" aria-label={item.title}>
        <header className="mdp__head">
          <span className={`mdp__badge cat-chip cat-${item.color}`}>
            <span className="cat-dot" aria-hidden="true" />
            {item.source_label}
          </span>
          <button type="button" className="mdp__close" onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        </header>

        <div className="mdp__body">
          <h3 className="mdp__title">{item.title}</h3>
          {item.subtitle && <p className="mdp__sub">{item.subtitle}</p>}

          <dl className="mdp__facts">
            <div>
              <dt><CalendarDays size={13} /> التاريخ</dt>
              <dd>{relativeDayAr(item.day)} — {fmtDualAr(item.day)}</dd>
            </div>

            <div>
              <dt><Clock size={13} /> الوقت</dt>
              <dd>
                {item.at
                  ? `${fmtTimeAr(item.at)}${item.end_at ? ` – ${fmtTimeAr(item.end_at)}` : ''}`
                  : (item.time_text
                      // وقت الجلسة نصّ عربي قادم من ناجز — يُعرض كما هو ولا يُفسَّر
                      ?? 'بلا وقت محدّد')}
              </dd>
            </div>

            {str('location') && (
              <div>
                <dt><MapPin size={13} /> المكان</dt>
                <dd>{str('location')}</dd>
              </div>
            )}

            {str('court') && (
              <div>
                <dt><MapPin size={13} /> المحكمة</dt>
                <dd>{str('court')}{str('department') ? ` · ${str('department')}` : ''}</dd>
              </div>
            )}

            {str('client_name') && (
              <div>
                <dt>العميل</dt>
                <dd>{str('client_name')}</dd>
              </div>
            )}

            {/* التصنيف نصّاً هنا: رقاقة الشبكة ملوّنة **بالمصدر** لا بالتصنيف
                (وإلا كذب مفتاح الألوان)، فهذا هو موضع ظهوره صريحاً. */}
            {str('category') && (
              <div>
                <dt>التصنيف</dt>
                <dd>{str('category')}</dd>
              </div>
            )}

            {str('notes') && (
              <div>
                <dt>ملاحظات</dt>
                <dd className="mdp__notes">{str('notes')}</dd>
              </div>
            )}
          </dl>

          {(str('meeting_url') || str('video_url')) && (
            <a
              className="fin-btn fin-btn--primary mdp__join"
              href={str('meeting_url') ?? str('video_url') ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video size={14} /> انضمام
            </a>
          )}

          {isPersonal && extra.blocks_availability === false && (
            <p className="mdp__hint">
              <AlertTriangle size={13} /> هذا البند لا يحجب وقتك — يبقى النظام قادراً على حجزك فيه.
            </p>
          )}

          <div className="mdp__actions">
            {isPersonal ? (
              <>
                <button type="button" className="fin-btn" onClick={() => onEditPersonal(item)}>
                  <Pencil size={13} /> تعديل
                </button>
                {confirmDelete ? (
                  <>
                    <button type="button" className="fin-btn fin-btn--danger" onClick={removePersonal}>
                      تأكيد الحذف
                    </button>
                    <button type="button" className="fin-btn" onClick={() => setConfirmDelete(false)}>تراجع</button>
                  </>
                ) : (
                  <button type="button" className="fin-btn" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={13} /> حذف
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="fin-btn" onClick={() => navigate(item.url)}>
                <ExternalLink size={13} /> فتح الصفحة الكاملة
              </button>
            )}
          </div>

          {/* ─── التعليقات ─── */}
          <section className="mdp__comments">
            <h4><MessageSquare size={13} /> التعليقات</h4>

            {!supportsComments ? (
              <p className="mdp__empty">
                {/* المهمة لها خيط تعليقات كامل — خيطان على الكيان نفسه يفرّقان النقاش */}
                نقاش المهمة في صفحتها، حيث المنشن و«رائد الذكي».
              </p>
            ) : loading ? (
              <p className="mdp__empty">يُحمّل…</p>
            ) : comments.length === 0 ? (
              <p className="mdp__empty">لا تعليقات بعد.</p>
            ) : (
              <ul className="mdp__thread">
                {comments.map(c => (
                  <li key={c.id}>
                    <div className="mdp__cmeta">
                      <b>{c.author?.name ?? 'مستخدم'}</b>
                      <span>{relativeDayAr(c.created_at)}</span>
                      {c.author_id === currentUserId && (
                        <button type="button" onClick={() => removeComment(c.id)} aria-label="حذف التعليق">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <p>{c.content}</p>
                  </li>
                ))}
              </ul>
            )}

            {supportsComments && (
              <div className="mdp__compose">
                <textarea
                  className="fin-input"
                  rows={2}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    // Ctrl/⌘+Enter يُرسل — Enter وحده يُبقي السطر الجديد ممكناً
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
                  }}
                  placeholder="أضف ملاحظة على هذا البند…"
                  maxLength={2000}
                />
                <button
                  type="button"
                  className="fin-btn fin-btn--primary"
                  onClick={submitComment}
                  disabled={sending || !draft.trim()}
                >
                  <Send size={13} /> {sending ? 'يُرسل…' : 'إضافة'}
                </button>
              </div>
            )}

            {error && <p className="mdp__error">{error}</p>}
          </section>
        </div>
      </aside>
    </>
  );
};

export default AgendaDetailsPanel;
