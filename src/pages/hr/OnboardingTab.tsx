import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ClipboardCheck, Plus, Trash2, Check, AlertTriangle, RefreshCw, ListChecks, Lock } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { useDossierInvalidate, useEmployeeChecklist } from './dossier/useDossierData';
import EmptyLine from './dossier/EmptyLine';
import { errorText, meterVars } from './leave/leaveFormat';
import { CHECKLIST_KIND_LABELS } from '../../types/hr';
import type { HrChecklistItem, ChecklistKind } from '../../types/hr';

/** النوعان — مصفوفةٌ واحدةٌ يقرؤها المبدّلُ، فلا تُكتب السلسلتان في موضعين. */
const KINDS: ChecklistKind[] = ['onboarding', 'offboarding'];

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

/** التسميةُ **حرفيةٌ** من `app/Enums/Permission.php:388` — لا صياغةَ فرونتيةً للصلاحية. */
const MANAGE_LABEL = 'إدارة ملفات الموظفين';

/**
 * **الغلافُ صار `hrl-block`** (الخطوة ٧) ورأسُه `<h2>` دلاليّ، والمبدّلُ شرائحُ
 * `hrl-chip[aria-pressed]` (بدل `hr-roster__filter` + `hr-chip--active` + `style={{maxWidth}}`)
 * فتحمل الحالةَ **دلالةً** لا شكلاً. والمقياسُ `hrl-meter` بخانةٍ واحدة بدل شريطٍ
 * يُحقن عرضُه ولونُه في `style`.
 *
 * **وسلوكان مقصودان مُحفَظان حرفياً**: (١) زرُّ التهيئة يظهر عند `all.length === 0` وحدَه —
 * التهيئةُ مرّتين تُضاعف البنود · (٢) شريطُ الاكتمال يُحسب على `onboarding` وحدَه مهما كان
 * النوعُ المعروض. ويبقى `Enter` يضيف بنداً و`disabled` على الفارغ والإبطالُ الدقيق.
 */
const OnboardingTab: React.FC<{ id: string; empId: number }> = ({ id, empId }) => {
  const canManage = usePermission('hr.manage');
  const [kind, setKind] = useState<ChecklistKind>('onboarding');
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);

  // المسارُ محروسٌ بـ`hr.manage` (`api.php:1792`)، والحارسُ في `useDossierData` يمنع
  // النداءَ الذي يردّ 403 — فلا تُعرض «تعذّر جلب القائمة» لحالةِ صلاحية.
  const checklistQuery = useEmployeeChecklist(empId);
  const items = checklistQuery.data;

  const { checklist: invalidate } = useDossierInvalidate(empId);

  const all = items ?? [];
  const current = all.filter((i) => i.kind === kind);
  const onboarding = all.filter((i) => i.kind === 'onboarding');
  const pct = onboarding.length ? Math.round((onboarding.filter((i) => i.is_done).length / onboarding.length) * 100) : 0;

  const seed = async () => {
    setBusy(true);
    try { await hrService.seedChecklist(empId); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل التهيئة'); }
    finally { setBusy(false); }
  };

  const toggle = async (it: HrChecklistItem) => {
    try { await hrService.toggleChecklistItem(empId, it.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل التحديث'); }
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try { await hrService.addChecklistItem(empId, kind, newLabel.trim()); setNewLabel(''); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الإضافة'); }
    finally { setBusy(false); }
  };

  const remove = async (it: HrChecklistItem) => {
    try { await hrService.deleteChecklistItem(empId, it.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الحذف'); }
  };

  // الفرعُ المحميّ — نسخةُ `DocumentsTab` (العرفُ الصحيحُ في الوحدة). بلا الصلاحية لا
  // يُطلَق النداءُ أصلاً، فعرضُ «لا توجد بنود» ومقياسِ اكتمالٍ ٠٪ ادّعاءٌ بلا دليل.
  if (!canManage) {
    return (
      <section className="hrl-block" id={id}>
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2"><ClipboardCheck size={14} /> المباشرة والمغادرة</h2>
        </div>
        <div className="hrl-block__b">
          <div className="hrl-state hrl-state--locked">
            <Lock size={20} />
            <p className="hrl-state__t">قائمةُ المباشرة محميّة</p>
            <p className="hrl-state__d">عرضُها يتطلّب صلاحية «{MANAGE_LABEL}».</p>
          </div>
        </div>
      </section>
    );
  }

  // البياناتُ وصلت فعلاً — قبلها لا يُرسَم مقياسٌ ولا حقلُ إضافة: مقياسٌ يقول «٠٪»
  // أثناء التحميل ادّعاءٌ، وحقلُ إضافةٍ فوق خطأٍ يَعِد بفعلٍ لا يقع.
  const settled = !checklistQuery.isPending && !checklistQuery.isError;

  /**
   * **فعلٌ واحدٌ لكلّ حالة**: حين لا بندَ إطلاقاً يملك سطرُ «تهيئة القائمة الافتراضية»
   * الفعلَ وحدَه (فيبقى البلوكُ سطراً كما في ملفٍّ جديد)؛ وفيما عداه يحضر حقلُ الإضافة —
   * ومنه فراغُ «المغادرة» بينما «المباشرة» مهيّأة، وكان طريقاً مسدوداً بلا فعلٍ واحد.
   */
  const seedOwnsAction = current.length === 0 && all.length === 0;

  /** الحالاتُ الأربعُ متمايزةٌ شكلاً ونصّاً — والقفلُ أعلاه وحدَه يحمل أيقونةَ القفل. */
  const body = (() => {
    if (checklistQuery.isPending) {
      return (
        <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل قائمة المباشرة">
          {Array.from({ length: 4 }, (_, i) => (
            <span className="hrl-skel" key={i} />
          ))}
        </div>
      );
    }

    if (checklistQuery.isError) {
      return (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذّر جلب القائمة</p>
          <p className="hrl-state__d">{errorText(checklistQuery.error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void checklistQuery.refetch()}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      );
    }

    if (current.length === 0) {
      return (
        <EmptyLine
          text={`لا بنودَ في «${CHECKLIST_KIND_LABELS[kind]}»`}
          // **الشرطُ `all.length === 0` مقصودٌ ولا يُبدَّل بفراغ النوع الحاليّ**: التهيئةُ
          // مرّتين تُضاعف البنود. وحين تسقط التهيئةُ يبقى حقلُ الإضافة أدناه فعلاً حقيقياً.
          action={canManage && all.length === 0 && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={seed} disabled={busy}>
              <ListChecks size={14} /> تهيئة القائمة الافتراضية
            </button>
          )}
        />
      );
    }

    return current.map((it) => (
      <div className="hrl-row" key={it.id}>
        <button
          type="button"
          className={`hr-check-box ${it.is_done ? 'hr-check-box--done' : ''}`}
          onClick={() => canManage && toggle(it)}
          disabled={!canManage}
          aria-pressed={it.is_done}
          aria-label={it.is_done ? 'إلغاء الإنجاز' : 'إنجاز'}
        >
          {it.is_done && <Check size={13} />}
        </button>
        <span className={`hr-check-label ${it.is_done ? 'hr-check-label--done' : ''}`}>{it.label}</span>
        {canManage && (
          <span className="hrl-tools">
            <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(it)}><Trash2 size={14} /></button>
          </span>
        )}
      </div>
    ));
  })();

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2"><ClipboardCheck size={14} /> المباشرة والمغادرة</h2>
        {/* `aria-pressed` تحمل الحالةَ بدل صنفِ `--active`: المحرِّكُ الصوتيُّ يعرف
            المختارَ من الدلالة لا من الشكل — عرفُ شرائح القائمة اليمنى نفسُه. */}
        <div className="hrl-block__a">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="hrl-chip"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {CHECKLIST_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* شريط اكتمال المباشرة — يُحسب على `onboarding` وحدَه مهما كان النوعُ المعروض.
          ولا يُرسَم بلا بندٍ واحد: مقياسٌ فوق قائمةٍ لا وجودَ لها مقياسٌ مخترَع. */}
      {settled && onboarding.length > 0 && (
        <div className="hrl-block__b">
          <p className="hrl-hint">اكتمال المباشرة — <span dir="ltr">{pct}٪</span></p>
          <div className={`hrl-meter${pct === 100 ? ' hrl-meter--done' : ''}`} role="img" aria-label={`اكتمالُ المباشرة ${pct}٪`}>
            <span className="hrl-meter__seg" style={meterVars(1, pct / 100)}>
              <span className="hrl-meter__fill" />
            </span>
          </div>
        </div>
      )}

      {/* حقلُ الإضافة **فوق القائمة** لا تحتها: بدائيّةُ الإدخال الملتصق تحمل خطَّها
          السفليَّ (فيفصلها عمّا تحتها)، ووضعُها تحت القائمة يُلصق خطَّها بخطِّ البلوك
          فيصير الفاصلُ سطرين. وموضعُها ثابتٌ لا يزحف بامتلاء القائمة. */}
      {canManage && settled && !seedOwnsAction && (
        <div className="hrl-search">
          {/* أيقونةٌ **عنصرٌ شقيقٌ** لا خلفيةٌ مطلقة — قالبُ `.hrl-search` نفسُه، فلا
              يمرّ النصُّ تحتها في أيّ اتجاه (العطبُ الذي مات في القائمة اليمنى). */}
          <ListChecks size={14} aria-hidden="true" />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label={`إضافة بند إلى «${CHECKLIST_KIND_LABELS[kind]}»`}
            placeholder={`إضافة بند إلى «${CHECKLIST_KIND_LABELS[kind]}»…`}
          />
          <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={add} disabled={busy || !newLabel.trim()}>
            <Plus size={14} /> إضافة
          </button>
        </div>
      )}

      <div className="hrl-block__b hrl-block__b--flush">{body}</div>
    </section>
  );
};

export default OnboardingTab;
