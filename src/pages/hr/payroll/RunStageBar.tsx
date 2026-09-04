import React from 'react';
import { Check, Lock } from 'lucide-react';

import { STAGE_DONE_LABEL, STAGE_LOCKED_LABEL, STAGES } from './payrollFormat';
import type { StageKey } from './payrollFormat';

/**
 * شريطُ المراحل السبع — **المسيرُ صفحةٌ واحدةٌ بمراحلَ لا معالجٌ متعدّدُ الصفحات**.
 *
 * ══════ لماذا لا معالج ══════
 * المعالجُ يكسر النمطَ الملتصق ويُفقد عمودَ المنسوبين عند كلّ انتقال، ويفترض أن المستندَ
 * يُفتح مرّةً. والمسيرُ يُزار مراراً: يُفتح ويُراجَع ويُعاد إليه بعد أسبوع.
 *
 * ══════ 🔴 الخطوةُ المنقضيةُ تُوسَم — وإلا فالشريطُ يقول «أين أنت» ولا يقول «أين وصلت» ══════
 * سبعُ خطواتٍ متشابهةٍ بلا علامةٍ على ما تمّ تجعل مسيراً معتمَداً يبدو كمسوّدةٍ لم تبدأ.
 * والعلامةُ **نصٌّ وأيقونةٌ معاً** (`hrl-sr` للقارئ الصوتيّ): من يقرأ بالأبيض والأسود يقرأ
 * الشيءَ نفسَه.
 *
 * ══════ 🔴 المرحلةُ القادمةُ معطَّلةٌ وتحتها سببُها — لا مخفيّة ══════
 * إخفاءُ ما لم يُشحن بعد يجعل المستخدمَ يظنّ الوحدةَ ناقصةً بلا أن يعرف متى تكتمل؛ وإظهارُه
 * معطَّلاً بنصّه يقول الحقيقة. والصدقُ هنا أرخصُ من سؤالٍ يتكرّر.
 *
 * وتعريفُ المراحل في `payrollFormat` لا هنا: ملفُّ مكوّنٍ يصدّر ثوابتَ يكسر إعادةَ التحميل
 * السريع، والقائمةُ نفسُها خريطةُ أسماء.
 */

interface Props {
  current: StageKey;
  /** رقمُ آخرِ خطوةٍ انقضت على الخادم — مشتقٌّ من `run.stage` لا من موضع القارئ. */
  done: number;
  onSelect: (stage: StageKey) => void;
}

export const RunStageBar: React.FC<Props> = ({ current, done, onSelect }) => (
  <nav className="hrp-stagebar" aria-label="مراحل المسير">
    {STAGES.map((stage) => {
      const isCurrent = stage.key === current;
      const isDone = stage.n <= done;
      const disabled = stage.disabledReason !== null;

      return (
        <button
          type="button"
          key={stage.key}
          className={`hrp-stagebar__s${isCurrent ? ' hrp-stagebar__s--on' : ''}${
            isDone ? ' hrp-stagebar__s--done' : ''
          }`}
          aria-current={isCurrent ? 'step' : undefined}
          disabled={disabled}
          title={stage.disabledReason ?? undefined}
          onClick={() => onSelect(stage.key)}
        >
          <span className="hrp-stagebar__n" dir="ltr">
            {stage.n}
          </span>
          <span className="hrp-stagebar__t">{stage.title}</span>
          {isDone && (
            <>
              <Check size={10} aria-hidden="true" />
              <span className="hrl-sr">{STAGE_DONE_LABEL}</span>
            </>
          )}
          {disabled && (
            <>
              <Lock size={10} aria-hidden="true" />
              <span className="hrl-sr">{STAGE_LOCKED_LABEL}</span>
            </>
          )}
        </button>
      );
    })}
  </nav>
);

export default RunStageBar;
