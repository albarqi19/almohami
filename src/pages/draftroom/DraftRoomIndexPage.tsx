/**
 * فهرسُ «غرفة الصياغة» — بطراز شاشةِ بداية assistant-ui كما طلب المالك:
 * ترحيبٌ ممركز، بطاقتا خيارٍ للنوع، ومُدخلٌ كبيرٌ تحكي فيه قضيّتك وتنطلق —
 * لا استمارة. العنوانُ يتولّد من أول الحكاية، والصفةُ يستنتجها الوكيل.
 *
 * «خيارات واختيارات»: بطاقتا النوع اختيارٌ صريح، وحبوبُ الأمثلة تملأ المُدخل
 * ليرى المحامي شكلَ الحكاية المطلوبة قبل أن يكتب حكايتَه.
 *
 * نوعان لا غير في الشحنة الأولى: الجوابية والافتتاحية — 67٪ من الاستعمال المقيس.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import {
  createWorkspace, listWorkspaces,
  MEMO_TYPE_LABELS, STATUS_LABELS,
  type DraftRoomWorkspaceSummary, type MemoTypeKey,
} from '../../services/draftRoomService';

/** النوعان الشغّالان + أنواعٌ قادمةٌ تُعلن نفسَها «قريباً» عند النقر */
const TYPE_CHIPS: Array<{ key: MemoTypeKey | null; label: string }> = [
  { key: 'written_plea', label: 'مذكّرة جوابية' },
  { key: 'claim_petition', label: 'صحيفة دعوى' },
  { key: null, label: 'صياغة عقد' },
  { key: null, label: 'لائحة اعتراضية' },
  { key: null, label: 'خطاب مطالبة' },
];

const EXAMPLES = [
  'مقاولٌ يطالب موكّلتنا بباقي عقد إنشاء فيلا رغم عيوبٍ لم يصلحها',
  'موكّلنا ورّد بضاعةً واستلمها المشتري ثم ماطل في السداد',
  'موظفٌ فُصل وقدّم شكوى، ونمثّل المنشأة في الردّ',
];

export default function DraftRoomIndexPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<DraftRoomWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [memoType, setMemoType] = useState<MemoTypeKey>('written_plea');
  const [brief, setBrief] = useState('');
  const [soonNote, setSoonNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listWorkspaces()
      .then(setItems)
      .catch(() => setError('تعذّر تحميلُ المساحات.'))
      .finally(() => setLoading(false));
  }, []);

  /** العنوانُ من أوّل الحكاية — لا حقلَ عنوانٍ يقطع الانطلاقة */
  const titleFromBrief = (text: string) => {
    const words = text.trim().replace(/\s+/g, ' ').split(' ');
    let head = '';
    for (const w of words) {
      if ((head + ' ' + w).trim().length > 46) break;
      head = (head + ' ' + w).trim();
    }
    return head + (head.length < text.trim().length ? '…' : '');
  };

  const create = async () => {
    const story = brief.trim();
    if (!story || creating) return;

    setCreating(true);
    setError(null);
    try {
      const ws = await createWorkspace({
        title: `${MEMO_TYPE_LABELS[memoType]} — ${titleFromBrief(story)}`,
        memo_type: memoType,
        // 🔑 الصفةُ لا تُنقر: الوكيلُ يستنتجها من الحكاية ويعلنها للتصحيح
        client_position: null,
        case_brief: story,
      });
      navigate(`/draft-room/${ws.id}`);
    } catch {
      setError('تعذّر فتحُ المساحة. أعِد المحاولة.');
      setCreating(false);
    }
  };

  const lastActivity = (w: DraftRoomWorkspaceSummary) => {
    const raw = w.last_activity_at ?? w.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('ar', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="driw" dir="rtl">
      <div className="driw-stage">
        {/* ═══ الترحيب ═══ */}
        <h1 className="driw-title">غرفة الصياغة</h1>
        <p className="driw-sub">
          احكِ قضيّتك — يقرأ الوكيلُ مستنداتِك، يسألك عمّا ينقص، ولا تخرج المذكّرةُ قبل اكتمال مراحلها.
        </p>

        {/* ═══ النوع: رقاقاتٌ صغيرة — والقادمُ يقول «قريباً» بنفسه ═══ */}
        <div className="driw-chips" role="radiogroup" aria-label="نوع المذكّرة">
          {TYPE_CHIPS.map(({ key, label }) => (
            <button
              key={label}
              type="button"
              role={key ? 'radio' : 'button'}
              aria-checked={key ? memoType === key : undefined}
              className={`driw-chip${key && memoType === key ? ' driw-chip--on' : ''}${key ? '' : ' driw-chip--soon'}`}
              onClick={() => {
                if (key) {
                  setMemoType(key);
                  setSoonNote(null);
                  inputRef.current?.focus();
                } else {
                  setSoonNote(`«${label}» — قريباً في الغرفة.`);
                }
              }}
            >
              {label}
              {!key && <span className="driw-chip__soon">قريباً</span>}
            </button>
          ))}
        </div>
        {soonNote && <p className="driw-soonnote" role="status">{soonNote}</p>}

        {/* ═══ المُدخل: الحكاية تنطلق منها المساحة ═══ */}
        <div className="driw-composer">
          <textarea
            ref={inputRef}
            className="driw-composer__input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void create(); }
            }}
            rows={2}
            maxLength={2000}
            placeholder="اكتب قضيّتك بسطرٍ أو سطرين… ومن حكايتك يستنتج الوكيلُ موقعَ موكّلك"
            aria-label="وصفُ القضية"
            disabled={creating}
          />
          <button
            type="button"
            className="driw-composer__send"
            disabled={creating || brief.trim().length === 0}
            onClick={() => void create()}
            aria-label="افتتاحُ المساحة"
            title="افتتح الغرفة"
          >
            <Send size={16} aria-hidden />
          </button>
        </div>

        {/* أمثلة تملأ المُدخل — يرى شكلَ الحكاية قبل أن يكتبها */}
        <div className="driw-pills">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="drt-pill"
              disabled={creating}
              onClick={() => { setBrief(ex); inputRef.current?.focus(); }}
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <p className="dr-card__why" role="alert">{error}</p>}
      </div>

      {/* ═══ سجلّ المساحات ═══ */}
      {!loading && items.length > 0 && (
        <section className="driw-reg" aria-label="المساحات القائمة">
          <div className="dri-reg__head">
            <h2 className="dri-reg__title">سجلُّ المساحات</h2>
            <span className="dri-reg__count">{items.length}</span>
          </div>
          <div className="dri-reg__rows">
            {items.map((w) => (
              <button
                key={w.id}
                type="button"
                className="dri-row"
                onClick={() => navigate(`/draft-room/${w.id}`)}
              >
                <span className="dri-row__title">{w.title}</span>
                <span className="dri-row__meta">
                  <span className="dr-tag">{MEMO_TYPE_LABELS[w.memo_type]}</span>
                  <span className={`dr-tag${w.status === 'drafted' ? ' dr-tag--ok' : ''}`}>
                    {STATUS_LABELS[w.status]}
                  </span>
                  {lastActivity(w) && <span className="dri-row__date">{lastActivity(w)}</span>}
                </span>
                <ArrowLeft size={15} className="dri-row__go" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
