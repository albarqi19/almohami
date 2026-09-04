import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Gavel, Lock, RefreshCw, Scale } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import ComponentCatalog from './ComponentCatalog';
import GosiConfirmBlock from './GosiConfirmBlock';
import RuleTable from './RuleTable';
import { errorText, fmtDateHuman, ruleEnforcement, todayISO } from './payrollFormat';

/**
 * **المرجعُ النظاميّ** — `/hr/payroll/rules`.
 *
 * ══════ ما تقوله هذه الشاشة ══════
 * «أيُّ نصٍّ يحكم راتبَ هذا الشهر، ومن يقرؤه، وما الذي لم يُنفَّذ بعد؟». نظامُ العمل عندنا
 * **بياناتٌ مؤرَّخة** لا شيفرة: تعديلُ مادّةٍ صفُّ بياناتٍ جديدٌ بتاريخ سريان، وقسيمةُ شهرٍ
 * مضى تبقى محلولةً بنصِّ زمنها.
 *
 * ══════ 🔴 ثلاثُ درجاتٍ من الثقة لا درجتان ══════
 * لا «قواعدُ النظام» جدولاً واحداً، بل: **تُنفَّذ الآن** · **مبذورةٌ وقارئُها لم يُشحن** ·
 * **للاطّلاع فقط**. ودمجُها يشتري ثقةً بلا مقابل — يقرأ المديرُ سقفَ م.٩٣ فيظنّ أن شيئاً
 * يمنع تجاوزَه اليوم. والحالةُ **مقيسةٌ على الخادم** (`class_exists`) لا مكتوبةٌ بيدٍ تنسى.
 *
 * ══════ والحاجزُ يُعرَض قبل المحاولة ══════
 * نسبُ التأمينات تصل مقترحةً غيرَ مؤكَّدة، والاعتمادُ محجوبٌ حتى يؤكّدها إنسانٌ باسمه.
 * فالحاجزُ في رأس الصفحة بنصّه وطريقِ حلِّه، لا بردٍّ ٤٢٢ بعد نقرةِ اعتماد.
 *
 * ══════ والتاريخُ في الرابط ══════
 * `?on=2026-07-12` تجيب «ما القاعدةُ التي طُبِّقت يومها؟» — وهو السؤالُ الذي يُسأل عند
 * مراجعةِ قسيمةٍ مضت. وشاشةٌ تجيب دائماً بقاعدة اليوم تكذب على من يراجع الماضي.
 */

export const RulesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const onParam = params.get('on');
  const on = onParam !== null && /^\d{4}-\d{2}-\d{2}$/.test(onParam) ? onParam : todayISO();

  const rulesQuery = useQuery({
    queryKey: ['hr', 'payroll', 'rules', on],
    queryFn: () => hrPayrollService.getRules(onParam === null ? undefined : on),
    staleTime: 60_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (note?: string) => hrPayrollService.confirmGosi(note),
    onSuccess: () => {
      setConfirmError(null);
      void queryClient.invalidateQueries({ queryKey: ['hr', 'payroll', 'rules'] });
    },
    onError: (error) => setConfirmError(errorText(error, 'تعذر تسجيل التأكيد.')),
  });

  const setOn = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === '') next.delete('on');
    else next.set('on', value);
    setParams(next, { replace: true });
  };

  // ─────────── مقفلة: الوحدةُ مطفأةٌ أو الصلاحيةُ ناقصة — بنصَّين لا واحد ───────────
  const queryError = rulesQuery.error;
  const lockedMessage =
    queryError instanceof Error && /غير مفعّل|غير مصرح|صلاحية|Unauthorized|Forbidden/i.test(queryError.message)
      ? queryError.message
      : null;

  if (lockedMessage !== null) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">المرجع النظامي غير متاح لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (rulesQuery.isLoading) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--loading">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </div>
    );
  }

  if (rulesQuery.isError) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل المرجع النظامي</p>
          <p className="hrl-state__d">{errorText(rulesQuery.error, 'خطأ غير متوقع.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void rulesQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </div>
    );
  }

  const data = rulesQuery.data?.data;
  const meta = rulesQuery.data?.meta;

  if (data === undefined || meta === undefined) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--empty">
          <Scale size={22} />
          <p className="hrl-state__t">قواعد الرواتب غير معدة لهذا المكتب بعد</p>
          <p className="hrl-state__d">
            الإعداد يتم مع تفعيل الوحدة. أعد تحميل الصفحة، وإن بقيت خالية فالتفعيل لم يكتمل.
          </p>
        </div>
      </div>
    );
  }

  const enforced = data.binding.filter((rule) => ruleEnforcement(rule) === 'enforced');
  const pending = data.binding.filter((rule) => ruleEnforcement(rule) === 'pending_reader');
  const toggle = (code: string) => setOpenCode((current) => (current === code ? null : code));

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <Scale size={16} /> المرجع النظامي
          </h1>
          <p className="hrl-sub">
            نظام العمل مسجل كبيانات مؤرخة. كل احتساب يطبق القاعدة السارية بتاريخ الواقعة،
            وتعديل مادة لا يعيد كتابة قسيمة صرفت.
          </p>
        </div>

        <div className="hrl-head__badges">
          <span className="hrl-fact hrl-fact--gold">
            تنفذ الآن
            <span className="hrl-fact__n" dir="ltr">
              {meta.counts.readers_shipped}
            </span>
          </span>
          <span className="hrl-fact">
            غير منفذة بعد
            <span className="hrl-fact__n" dir="ltr">
              {meta.counts.readers_pending}
            </span>
          </span>
          <span className="hrl-fact">
            للاطلاع
            <span className="hrl-fact__n" dir="ltr">
              {meta.counts.informational}
            </span>
          </span>
        </div>
      </header>

      {/* الحاجزُ أوّلَ ما يُقرأ، بنصّه وبطريق حلّه — لا بردٍّ بعد نقرةِ اعتماد. */}
      {data.approval_blocked && (
        <div className="hrl-flag hrl-flag--block" role="status">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> الاعتماد محجوب حتى يتم تأكيد {data.approval_blockers.length} قاعدة ملزمة
          </p>
          <p className="hrl-flag__hint">
            {data.approval_blockers.map((blocker) => `${blocker.title_ar} (${blocker.article_ref})`).join(' · ')}
          </p>
        </div>
      )}

      <div className="hrl-cols">
        <div className="hrl-cols__main">
          {/* 🔴 `hrl-wall` هو المُمرِّرُ الوحيدُ في المسرح: `hrl-cols__main` مضبوطٌ على
              `overflow:hidden`، فكتلةٌ خارجَ الجدار **تُقصّ ولا تُمرَّر** — يرى المستخدمُ
              نصفَ الكتالوج ويظنّه كلَّه. (قِيس على الشاشة لا استُنتج.) */}
          <div className="hrl-wall">
          <GosiConfirmBlock
            gosi={data.gosi}
            canConfirm={meta.can_confirm}
            submitting={confirmMutation.isPending}
            error={confirmError}
            onConfirm={(note) => confirmMutation.mutate(note)}
          />

          <section className="hrl-block" aria-labelledby="binding-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="binding-h">
                <Gavel size={14} /> القواعد الملزمة
              </h2>
              <span className="hrl-badge hrl-badge--flat">{data.binding.length}</span>
            </header>

            <div className="hrl-block__b hrl-block__b--flush">
              <RuleTable
                rules={enforced}
                openCode={openCode}
                onToggle={toggle}
                emptyText="لا توجد قاعدة ملزمة منفذة اليوم."
              />
            </div>

            {pending.length > 0 && (
              <>
                <div className="hrl-block__b">
                  <p className="hrl-hint">
                    وهذه قواعد معدة وموثقة، ولا يطبقها النظام بعد. تطبق عند تفعيل خطوتها.
                    وعرضها هنا إعلان بما لم ينفذ بعد.
                  </p>
                </div>
                <div className="hrl-block__b hrl-block__b--flush">
                  <RuleTable rules={pending} openCode={openCode} onToggle={toggle} emptyText="" />
                </div>
              </>
            )}
          </section>

          <section className="hrl-block" aria-labelledby="informational-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="informational-h">
                <AlertTriangle size={14} /> مراجع للاطلاع غير منفذة
              </h2>
              <span className="hrl-badge hrl-badge--flat">{data.informational.length}</span>
            </header>

            <div className="hrl-block__b hrl-block__b--flush">
              <RuleTable
                rules={data.informational}
                openCode={openCode}
                onToggle={toggle}
                emptyText="لا توجد مراجع للاطلاع."
              />
            </div>
          </section>

          <section className="hrl-block" aria-labelledby="catalog-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="catalog-h">
                كتالوج بنود القسيمة
              </h2>
              <span className="hrl-badge hrl-badge--flat">{data.components.length}</span>
            </header>

            <div className="hrl-block__b hrl-block__b--flush">
              <ComponentCatalog components={data.components} />
            </div>
          </section>
          </div>
        </div>

        <aside className="hrl-cols__side">
          <section className="hrl-block" aria-labelledby="asof-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="asof-h">
                القاعدة السارية في
              </h2>
            </header>

            <div className="hrl-block__b">
              <label className="hrl-fset" htmlFor="rules-on">
                <span className="hrl-fset__t">تاريخ الواقعة</span>
                <input
                  id="rules-on"
                  className="hrl-search"
                  type="date"
                  value={on}
                  onChange={(event) => setOn(event.target.value)}
                />
              </label>

              <p className="hrl-hint">
                تعرض هذه الصفحة ما كان سارياً في {fmtDateHuman(data.on)} لا ما هو ساري اليوم،
                حتى تراجع قسيمة شهر مضى بنص زمنها.
              </p>

              {onParam !== null && (
                <button type="button" className="hrl-link" onClick={() => setOn('')}>
                  ارجع إلى اليوم
                </button>
              )}
            </div>
          </section>

          <section className="hrl-block" aria-labelledby="legend-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="legend-h">
                شرح الحالات
              </h2>
            </header>

            <div className="hrl-block__b">
              <dl className="hrl-kv">
                <dt>تنفذ الآن</dt>
                <dd>محرك الاحتساب مفعل ويطبقها في كل احتساب.</dd>
                <dt>غير منفذة بعد</dt>
                <dd>معدة وموثقة، ولا يطبقها النظام حتى يتم تفعيل خطوتها.</dd>
                <dt>للاطلاع فقط</dt>
                <dd>مرجع معروض غير منفذ.</dd>
              </dl>

              <p className="hrl-hint">
                والقاعدة غير قابلة للتعديل من هذه الشاشة ولا من غيرها: التعديل النظامي نسخة
                مؤرخة جديدة تصل بترحيل بيانات، ولا تتغير الحسابات السابقة.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RulesPage;
