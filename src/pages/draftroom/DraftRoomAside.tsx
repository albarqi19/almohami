/**
 * اللوحُ الجانبيُّ الحيّ — وجهُه يتبدّل بتبدّل المرحلة.
 *
 * 🔑 الفكرة من المالك نفسِه: المصادرُ وقتَ المستندات، والموادُّ المستشهَدُ بها وقتَ
 * التحليل (ملوّنةً بلون سؤالها، وموادُّ السؤالِ الذي أمامك أعلاها)، وخريطةُ البناء
 * وقتَ الهيكل، وفهرسُ الأقسام وقتَ الصياغة، وأفعالُ التصدير وقتَ المذكّرة النهائية.
 *
 * 🩸 السببُ الذي وُلد منه: لوحُ الموادّ كان يُرسم داخل المحادثة فيبلغ ثلاثةَ أرباع
 * الشاشة ويدفع السؤالَ خارجها — فيجلس المحامي أمام نصوصٍ نظاميةٍ يبحث عن سؤالٍ ضائع.
 */

import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, BookOpen, CheckCircle2, CircleDashed, Copy, FileDown,
  FileText, ListTree, PenLine, Scale, Send, Trash2,
} from 'lucide-react';
import type {
  CitationItem, DraftRoomSource, DraftRoomWorkspace, FinalMemo, SourceSide,
} from '../../services/draftRoomService';
import { SIDE_LABELS } from '../../services/draftRoomService';

export type DraftView = 'intake' | 'questioning' | 'planning' | 'drafting' | 'drafted';

/** مجموعةُ موادَّ وصلت مع سؤالٍ بعينه — تحمل لونَه فيتعارفان بالعين */
export interface ArticleGroup {
  runId: number;
  /** كلُّ أسئلة الدور — أيُّها أمام العين يرفع المجموعةَ كلَّها */
  questionIds: number[];
  label: string;
  hue: number;
  items: CitationItem[];
}

export interface SectionEntry {
  title: string;
  words: number;
}

interface AsideProps {
  view: DraftView;
  workspace: DraftRoomWorkspace;
  busy: boolean;
  groups: ArticleGroup[];
  activeQuestionId: number | null;
  sections: SectionEntry[];
  answered: number;
  final: FinalMemo | null;
  finalLoading: boolean;
  exported: { memoId: number; title: string } | null;
  copied: boolean;
  onSide: (sourceId: number, side: SourceSide) => void;
  onDeleteSource: (sourceId: number, name: string) => void;
  onJumpToSection: (title: string) => void;
  onExport: () => void;
  onSendToCase: () => void;
  onAskEdit: () => void;
  onOpenPdf: () => void;
  onCopyFinal: () => void;
}

const VIEW_TITLES: Record<DraftView, string> = {
  intake: 'المصادر',
  questioning: 'الموادُّ المستشهَد بها',
  planning: 'خريطة البناء',
  drafting: 'فهرس الأقسام',
  drafted: 'إخراجُ المذكّرة',
};

export default function DraftRoomAside(props: AsideProps) {
  const { view } = props;

  /*
   * 🩸 كان التبديل بـ`AnimatePresence mode="wait"` فعلق اللوحُ على وجهه الأوّل:
   * خروجُ اللوح القديم لم يكتمل قطّ فلم يُركَّب الجديد. حركةُ CSS عند الدخول
   * (`key` يعيد التركيب فيعيد الحركة) تعطي الانزلاقَ نفسَه بلا آلة حالاتٍ تعلق.
   */
  return (
    <aside className="dr-aside">
      <div key={view} className="dr-aside__panel dr-aside__panel--enter">
        <span className="dr-aside__title dr-aside__title--panel">{VIEW_TITLES[view]}</span>
        {view === 'intake' && <SourcesPanel {...props} />}
        {view === 'questioning' && <ArticlesPanel {...props} />}
        {view === 'planning' && <StructurePanel {...props} />}
        {view === 'drafting' && <TocPanel {...props} />}
        {view === 'drafted' && <FinalActionsPanel {...props} />}
      </div>
    </aside>
  );
}

// ═══════════════ المستندات ═══════════════

function SourcesPanel({ workspace, busy, onSide, onDeleteSource }: AsideProps) {
  const readable = workspace.sources.filter((s) => s.readable).length;

  return (
    <div className="dr-aside__block">
      <span className="dr-aside__title">{readable} مقروءٌ من {workspace.sources.length}</span>

      {workspace.sources.length === 0 && <p className="dr-source__msg">لا مصادرَ بعد.</p>}

      {workspace.sources.map((s: DraftRoomSource) => (
        <div className="dr-source" key={s.id}>
          <span className="dr-source__name">{s.title ?? 'ملفّ'}</span>

          <div className="dr-source__row">
            {s.readable
              ? <span className="dr-tag dr-tag--ok">مقروء{s.pages ? ` · ${s.pages} صفحة` : ''}</span>
              : <span className="dr-tag dr-tag--warn">لم يُقرأ</span>}
            <span className="dr-tag">{SIDE_LABELS[s.side]}</span>
            {/* حذفٌ لمن رفع مستنداً بالخطأ — بتأكيدٍ لأنه لا يُستدرك */}
            <button
              type="button"
              className="dr-btn dr-btn--ghost dr-source__del"
              disabled={busy}
              aria-label={`حذف ${s.title ?? 'الملفّ'}`}
              title="حذفُ المصدر"
              onClick={() => onDeleteSource(s.id, s.title ?? 'الملفّ')}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </div>

          {/* «لم يُقرأ» بلا سببٍ لا تُخبر المحامي بما يفعل */}
          {s.message && <span className="dr-source__msg">{s.message}</span>}

          {s.readable && s.side_decided_by !== 'lawyer' && (
            <div className="dr-source__row">
              <button type="button" className="dr-btn" disabled={busy} onClick={() => onSide(s.id, 'ours')}>لنا</button>
              <button type="button" className="dr-btn" disabled={busy} onClick={() => onSide(s.id, 'opponent')}>للخصم</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════ التحليل: الموادُّ بألوان أسئلتها ═══════════════

/**
 * 🔑 موادُّ السؤالِ الذي أمام عين المحامي تطفو أعلى اللوح — يتتبّعها راصدُ
 * التمرير في الصفحة. رجع لسؤالٍ سابقٍ صعدت موادُّه، وبانزلاقٍ محسوسٍ لا قفزة.
 */
function ArticlesPanel({ groups, activeQuestionId }: AsideProps) {
  const reduced = useReducedMotion();

  if (groups.length === 0) {
    return (
      <div className="dr-aside__block">
        <p className="dr-source__msg">
          لا موادَّ بعد — حين يستشهد الوكيلُ بنصٍّ نظاميٍّ مع سؤالٍ تجده هنا بلون سؤاله.
        </p>
      </div>
    );
  }

  const isActive = (g: ArticleGroup) =>
    activeQuestionId !== null && g.questionIds.includes(activeQuestionId);

  const ordered = [...groups].sort((a, b) => {
    if (isActive(a)) return -1;
    if (isActive(b)) return 1;
    return 0; // sort مستقرّ — الباقي يحفظ ترتيبَ وصوله
  });

  return (
    <div className="dr-aside__block">
      {ordered.map((g) => (
        <motion.div
          key={g.runId}
          layout={reduced ? false : 'position'}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          data-article-group={g.questionIds[0]}
          className={`dr-artgroup dr-hue-${g.hue}${isActive(g) ? ' dr-artgroup--active' : ''}`}
        >
          <div className="dr-artgroup__head">
            <span className={`dr-huedot dr-hue-${g.hue}`} aria-hidden />
            <span className="dr-artgroup__q">{g.label}</span>
          </div>

          {g.items.map((c) => (
            <div className="dr-artgroup__item" key={g.runId + '-' + c.index}>
              <div className="dr-artgroup__ref">
                <Scale size={12} aria-hidden />
                <span>{c.statute_name} — {c.article_number}</span>
              </div>
              {/* فراغُ الحالة ليس دليلَ سريان */}
              {!c.is_current && (
                <span className="dr-tag dr-tag--warn">
                  <AlertTriangle size={11} aria-hidden />
                  {c.legal_status ?? 'حالة غير محقَّقة'} — لا يُستشهد بها
                </span>
              )}
              <p className="dr-artgroup__text">{c.excerpt}</p>
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════ الهيكل: خريطة البناء ═══════════════

function StructurePanel({ workspace, sections, answered }: AsideProps) {
  const readable = workspace.sources.filter((s) => s.readable).length;
  const accepted = workspace.facts.filter((f) => f.accepted).length;
  const totalQ = workspace.questions.length;

  const rows: Array<{ done: boolean; label: string }> = [
    { done: readable > 0, label: `المصادر — ${readable} مقروء` },
    // 🩸 كانت ✓ تُعرض بمجرّد وجود وقائع — «الوقائع 0 مُقرّة من 2» بعلامة اكتمال!
    { done: workspace.facts.length > 0 && accepted > 0, label: `الوقائع — ${accepted} مُقرّة من ${workspace.facts.length}` },
    { done: totalQ > 0 && answered === totalQ, label: `الأسئلة — ${answered} مُجاب من ${totalQ}` },
    { done: sections.length > 0, label: `الأقسام المصوغة — ${sections.length}` },
  ];

  return (
    <div className="dr-aside__block">
      {rows.map((r) => (
        <div key={r.label} className="dr-structrow">
          {r.done
            ? <CheckCircle2 size={15} className="dr-structrow__ok" aria-hidden />
            : <CircleDashed size={15} aria-hidden />}
          <span>{r.label}</span>
        </div>
      ))}

      {workspace.has_blocking_questions && (
        <p className="dr-source__msg dr-structrow__warn">
          <AlertTriangle size={12} aria-hidden /> أسئلةٌ حاجبةٌ مفتوحة — لا صياغةَ قبل جوابها.
        </p>
      )}

      {workspace.facts.length > accepted && workspace.facts.length > 0 && (
        <p className="dr-source__msg">
          الوقائعُ غيرُ المُقرّة لا تدخل المذكّرة — راجِعها في المحادثة وأقِرَّ ما تعتمده.
        </p>
      )}
    </div>
  );
}

// ═══════════════ الصياغة: فهرس الأقسام ═══════════════

function TocPanel({ sections, onJumpToSection }: AsideProps) {
  if (sections.length === 0) {
    return (
      <div className="dr-aside__block">
        <p className="dr-source__msg">لا أقسامَ مصوغةً بعد — اطلب الصياغةَ في المحادثة.</p>
      </div>
    );
  }

  return (
    <div className="dr-aside__block">
      {sections.map((s, i) => (
        <button
          key={s.title + i}
          type="button"
          className="dr-tocrow"
          onClick={() => onJumpToSection(s.title)}
          title="انتقالٌ إلى القسم في المحادثة"
        >
          <ListTree size={14} aria-hidden />
          <span className="dr-tocrow__title">{s.title}</span>
          <span className="dr-tocrow__meta">{s.words} كلمة</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════ المذكّرة النهائية: الأفعال ═══════════════

function FinalActionsPanel({
  final, finalLoading, busy, exported, copied,
  onExport, onSendToCase, onAskEdit, onOpenPdf, onCopyFinal,
}: AsideProps) {
  if (finalLoading || !final) {
    return <div className="dr-aside__block"><p className="dr-source__msg">تُركَّب المذكّرة…</p></div>;
  }

  return (
    <div className="dr-aside__block">
      {final.blocking_open && (
        <p className="dr-source__msg dr-structrow__warn">
          <AlertTriangle size={12} aria-hidden /> أسئلةٌ حاجبةٌ بلا جواب — أجِب عنها قبل التصدير.
        </p>
      )}

      {final.missing.length > 0 && (
        <>
          <span className="dr-aside__title">يُستكمل قبل الإيداع</span>
          {final.missing.map((m) => (
            <p key={m} className="dr-source__msg dr-missing"><FileText size={12} aria-hidden /> {m}</p>
          ))}
        </>
      )}

      <span className="dr-aside__title">الإجراءات</span>

      {exported ? (
        <>
          <p className="dr-source__msg dr-exported">
            <CheckCircle2 size={13} aria-hidden /> حُفظت في مكتبة المذكّرات: «{exported.title}»
          </p>
          <button type="button" className="dr-btn dr-actrow" disabled={busy} onClick={onOpenPdf}>
            <FileDown size={14} aria-hidden /> افتح PDF
          </button>
        </>
      ) : (
        <button
          type="button"
          className="dr-btn dr-btn--primary dr-actrow"
          disabled={busy || !final.exportable}
          onClick={onExport}
          title={final.exportable ? 'حفظٌ في مكتبة مذكّرات المكتب' : 'يلزم قسمٌ مصوغٌ وجوابُ الأسئلة الحاجبة'}
        >
          <BookOpen size={14} aria-hidden /> احفظ في مكتبة المذكّرات
        </button>
      )}

      <button
        type="button"
        className="dr-btn dr-actrow"
        disabled={busy || !final.exportable}
        onClick={onSendToCase}
        title="حفظُ المذكّرة مربوطةً بقضيةٍ من قضايا المكتب"
      >
        <Send size={14} aria-hidden /> أرسِل إلى قضية…
      </button>

      <button type="button" className="dr-btn dr-actrow" disabled={busy || final.sections_count === 0} onClick={onCopyFinal}>
        {copied ? <CheckCircle2 size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? 'نُسخ' : 'انسخ النصّ'}
      </button>

      <button type="button" className="dr-btn dr-btn--ghost dr-actrow" disabled={busy} onClick={onAskEdit}>
        <PenLine size={14} aria-hidden /> اطلب تعديلاً من الوكيل
      </button>
    </div>
  );
}
