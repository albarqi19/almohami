// مودالُ «تقرير القضية»: اختيارُ الشكل، والتحكّمُ بما يظهر، وانتقاءُ النشاطات،
// وصياغةُ السرد بالذكاء، ثم المعاينةُ والإصدارُ إرسالاً أو طباعة.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, FileText, Eye, Send, Loader2, Sparkles, Save, Printer, Plus, Trash2, History, Download,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  caseReportService,
  CASE_REPORT_LAYOUT_HINTS,
  CASE_REPORT_CHANNEL_LABELS,
  type CaseReport,
  type CaseReportActivity,
  type CaseReportChannel,
  type CaseReportLayout,
  type CaseReportTemplate,
  type CustomSection,
  type LetterSection,
} from '../services/caseReportService';

interface Props {
  open: boolean;
  onClose: () => void;
  caseId: number;
  /** يُنادى بعد إصدارٍ ناجح — ليحدّث الأبُ ما يعرضه. */
  onIssued?: (number?: string) => void;
}

type Tab = 'layout' | 'content' | 'narrative' | 'issue' | 'history';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'layout', label: 'الشكل' },
  { id: 'content', label: 'المحتوى' },
  { id: 'narrative', label: 'الصياغة' },
  { id: 'issue', label: 'الإصدار' },
  { id: 'history', label: 'السجلّ' },
];

const CHANNELS: CaseReportChannel[] = ['whatsapp', 'email', 'print'];

export const CaseReportModal: React.FC<Props> = ({ open, onClose, caseId, onIssued }) => {
  const [tab, setTab] = useState<Tab>('layout');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'' | 'preview' | 'save' | 'generate' | 'issue'>('');

  const [templates, setTemplates] = useState<CaseReportTemplate[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  // الحالةُ المعروضةُ للأقسام = الافتراضيُّ ثم اختيارُ التقرير فوقه — كما يحلّها
  // الخادم. قراءةُ الخام وحدَه تُظهر أقساماً مشتغلةً على أنها مطفأة.
  const [defaultFields, setDefaultFields] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<CaseReport | null>(null);
  const [history, setHistory] = useState<CaseReport[]>([]);
  const [activities, setActivities] = useState<CaseReportActivity[]>([]);

  // حالةُ التحرير (محليّةٌ حتى الحفظ)
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [layout, setLayout] = useState<CaseReportLayout>('tabular');
  const [fields, setFields] = useState<Record<string, boolean>>({});
  const [selectedActs, setSelectedActs] = useState<number[] | null>(null);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [periodLabel, setPeriodLabel] = useState('');
  const [dirty, setDirty] = useState(false);

  // السرد
  const [summary, setSummary] = useState('');
  const [summaryShort, setSummaryShort] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [letterOpening, setLetterOpening] = useState('');
  const [letterClosing, setLetterClosing] = useState('');
  const [letterSections, setLetterSections] = useState<LetterSection[]>([]);
  const [narrativeDirty, setNarrativeDirty] = useState(false);

  const [channels, setChannels] = useState<CaseReportChannel[]>(['whatsapp']);

  const isLetter = layout === 'ai_letter';
  const editable = report?.is_editable ?? true;

  /** هل في التقرير مضمونٌ يستحقّ رقمَ صادر؟ نفسُ شرط الحارس في الخادم. */
  const hasSubstance = useMemo(() => {
    if (isLetter) return letterSections.some((s) => s.body.trim() !== '');
    return summary.trim() !== '' || customSections.some((s) => s.body.trim() !== '');
  }, [isLetter, letterSections, summary, customSections]);

  // ─────────── التحميل ───────────

  /**
   * @param keepNarrative لا تدهس حقولَ السرد بما جاء من الخادم.
   *   ⚠️ `persist()` لا يرسل السردَ إطلاقاً (حمولتُه الاختياراتُ وحدَها)، فردُّه
   *   يحمل السردَ **القديم**. فإعادةُ ضبط الحقول منه تمحو ألفَ كلمةٍ كتبها
   *   المحامي للتوّ، وتصفّر `narrativeDirty` فلا ينبّه حارسُ الإغلاق حتى.
   */
  const applyReport = useCallback((r: CaseReport, keepNarrative = false) => {
    setReport(r);
    setTemplateId(r.template_id ?? undefined);
    setLayout(r.layout);
    setFields(r.show_fields ?? {});
    setSelectedActs(r.selected_activity_ids ?? null);
    setCustomSections(r.custom_sections ?? []);
    setPeriodLabel(r.period_label ?? '');
    setDirty(false);

    if (keepNarrative) return;

    setSummary(r.summary ?? '');
    setSummaryShort(r.summary_short ?? '');
    setNextStep(r.next_step ?? '');
    setLetterOpening(r.letter?.opening ?? '');
    setLetterClosing(r.letter?.closing ?? '');
    setLetterSections(r.letter?.sections ?? []);
    setNarrativeDirty(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    setTab('layout');
    setLoading(true);
    setReport(null);

    (async () => {
      try {
        /**
         * ⚠️ `allSettled` لا `all`: نداءُ القوالب أو النشاطات قد يُرفَض لسببٍ
         * لا يمنع بناءَ التقرير (صلاحيةٌ أضيق، أو عطلٌ عابر). ومع `all` يُجهَض
         * التحميلُ كلُّه فتموت الشاشةُ ولا تُنشأ مسوّدةٌ أصلاً.
         * الحملُ الحرجُ وحدَه (`list` ثم إنشاء/استئناف المسوّدة) هو ما يُفشِل.
         */
        const [tplR, listR, actR] = await Promise.allSettled([
          caseReportService.listTemplates(),
          caseReportService.list(caseId),
          caseReportService.activities(caseId),
        ]);

        if (listR.status === 'rejected') {
          throw listR.reason instanceof Error ? listR.reason : new Error('تعذّر قراءة تقارير القضية');
        }

        const tpls = tplR.status === 'fulfilled' ? (tplR.value.data ?? []) : [];
        setTemplates(tpls);
        setActivities(actR.status === 'fulfilled' ? (actR.value.data ?? []) : []);

        const all = listR.value.data ?? [];
        setHistory(all);

        // تسمياتُ الأقسام: من القوالب إن وصلت، وإلا من meta ردِّ التقارير نفسِه.
        setFieldLabels(
          (tplR.status === 'fulfilled' ? tplR.value.meta?.field_labels : undefined)
            ?? listR.value.meta?.field_labels
            ?? {},
        );
        setDefaultFields(
          (tplR.status === 'fulfilled' ? tplR.value.meta?.default_fields : undefined)
            ?? listR.value.meta?.default_fields
            ?? {},
        );

        // نستأنف آخرَ مسوّدةٍ إن وُجدت، وإلا ننشئ واحدة.
        const draft = all.find((r) => r.is_editable);
        if (draft) {
          const full = await caseReportService.get(draft.id);
          applyReport(full.data);
        } else {
          // بلا قوالبَ مقروءة: يختار الخادمُ الافتراضيَّ بنفسه.
          const def = tpls.find((t) => t.is_default) ?? tpls[0];
          const created = await caseReportService.create(caseId, def?.id);
          applyReport(created.data);
          setHistory((h) => [created.data, ...h]);
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'تعذّر فتح شاشة التقرير');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, caseId, applyReport]);

  // ─────────── الحفظ ───────────

  const persist = useCallback(async (): Promise<CaseReport | null> => {
    if (!report) return null;
    try {
      const res = await caseReportService.update(report.id, {
        template_id: templateId,
        layout,
        show_fields: fields,
        custom_sections: customSections.filter((s) => s.title.trim() !== '' || s.body.trim() !== ''),
        selected_activity_ids: selectedActs,
        period_label: periodLabel.trim() || null,
      });
      applyReport(res.data, narrativeDirty);
      return res.data;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر حفظ الاختيارات');
      return null;
    }
  }, [report, templateId, layout, fields, customSections, selectedActs, periodLabel, applyReport, narrativeDirty]);

  const handleSave = async () => {
    setBusy('save');
    // السردُ أوّلاً: مسارُه مستقلٌّ، وتركُه يجعل «حفظ» كذبةً نصفَ صادقة.
    const nOk = narrativeDirty ? await saveNarrative() : true;
    const ok = await persist();
    setBusy('');
    if (ok && nOk) toast.success('حُفظ التقرير');
    else if (ok && !nOk) toast.warn('حُفظت الاختيارات، وتعذّر حفظُ السرد.');
  };

  const handlePreview = async () => {
    if (!report) return;
    setBusy('preview');
    try {
      // المعاينةُ تُولَّد على الخادم من المحفوظ. فبلا حفظِ السرد يقرأ المحامي
      // نسخةً ويُصدر أخرى — وهو أسوأ من ألّا يعاين.
      if (narrativeDirty && !(await saveNarrative())) {
        toast.error('تعذّر حفظُ السرد — أُلغيت المعاينة كي لا تُظهر غيرَ ما على الشاشة.');
        return;
      }
      if (dirty && !(await persist())) {
        return;
      }
      await caseReportService.openPreview(report.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّرت المعاينة');
    } finally {
      setBusy('');
    }
  };

  const handleGenerate = async () => {
    if (!report) return;

    /**
     * ⚠️ `force` يطمس ما كتبه المحامي. الخادمُ يحترم `edited` ما لم يصل
     * `force=true` — فإرسالُها دائماً يُبطل الحارسَ ويُلغي عملَ ساعة.
     * فلا تُرسَل إلا بعد إقرارٍ صريحٍ حين يوجد نصٌّ بشريّ.
     */
    const hasHumanText = isLetter
      ? letterSections.some((x) => x.body.trim() !== '') || letterOpening.trim() !== ''
      : summary.trim() !== '';

    let force = false;
    if (hasHumanText) {
      if (!window.confirm('ستُستبدل الصياغةُ الحالية بنصٍّ جديدٍ من الذكاء، ولا يمكن استرجاعُ ما كُتب. متابعة؟')) {
        return;
      }
      force = true;
    }

    setBusy('generate');
    try {
      if (dirty && !(await persist())) {
        return;
      }
      const res = await caseReportService.generateSummary(report.id, force);
      const d = res.data;
      if (d.is_letter) {
        setLetterOpening(d.opening ?? '');
        setLetterSections(d.sections ?? []);
        setLetterClosing(d.closing ?? '');
      } else {
        setSummary(d.summary ?? '');
        setSummaryShort(d.summary_short ?? '');
        setNextStep(d.next_step ?? '');
      }
      setNarrativeDirty(false);
      toast.success(res.message || 'صِيغ التقرير — راجِعه قبل الإصدار');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّرت الصياغة الآلية');
    } finally {
      setBusy('');
    }
  };

  /** يحفظ السردَ ويُرجع نجاحَه — يُستعمل من الزرّ ومن مسار الإصدار معاً. */
  const saveNarrative = async (): Promise<boolean> => {
    if (!report) return false;
    try {
      const payload = isLetter
        ? {
            opening: letterOpening.trim() || null,
            sections: letterSections.filter((s) => s.body.trim() !== ''),
            closing: letterClosing.trim() || null,
          }
        : {
            summary: summary.trim(),
            summary_short: summaryShort.trim() || null,
            next_step: nextStep.trim() || null,
          };

      if (!isLetter && !summary.trim()) {
        toast.warn('السرد فارغ');
        return false;
      }

      await caseReportService.saveSummary(report.id, payload);
      setNarrativeDirty(false);
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر حفظ السرد');
      return false;
    }
  };

  const handleSaveNarrative = async () => {
    setBusy('save');
    const ok = await saveNarrative();
    setBusy('');
    if (ok) toast.success('حُفظ السرد');
  };

  const handleIssue = async () => {
    if (!report || channels.length === 0) return;

    const onlyPrint = channels.length === 1 && channels[0] === 'print';
    const label = channels.map((c) => CASE_REPORT_CHANNEL_LABELS[c]).join('، ');
    const question = onlyPrint
      ? 'سيصدر التقرير برقم صادرٍ لا يُستردّ، دون إرساله للعميل. متابعة؟'
      : `سيصدر التقرير برقم صادرٍ لا يُستردّ ويُرسَل للعميل عبر: ${label}. متابعة؟`;

    if (!window.confirm(question)) return;

    setBusy('issue');
    try {
      /**
       * ⚠️ **التوقّفُ عند فشل الحفظ إلزاميّ.** السردُ يُحفظ بمسارٍ مستقلٍّ عن
       * الاختيارات، وكلاهما يبتلع خطأه ويُرجع false/null. فالمضيُّ بعد فشلٍ
       * يُصدر مستنداً برقمِ صادرٍ لا يُستردّ **بمحتوىً قديم** — ويرى المحامي
       * رسالةَ نجاحٍ فيظنّ أن ما كتبه هو ما وصل العميل.
       */
      if (narrativeDirty && !(await saveNarrative())) {
        toast.error('أُلغي الإصدار: تعذّر حفظُ السرد. صحّح ثم أعِد المحاولة.');
        return;
      }
      if (dirty && !(await persist())) {
        toast.error('أُلغي الإصدار: تعذّر حفظُ الاختيارات. صحّح ثم أعِد المحاولة.');
        return;
      }
      const res = await caseReportService.issue(report.id, channels);
      if (res.success) {
        toast.success(res.message);
        if (res.data) applyReport(res.data);
        onIssued?.(res.number);
        const list = await caseReportService.list(caseId);
        setHistory(list.data ?? []);
        setTab('history');
      } else {
        toast.error(res.message);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إصدار التقرير');
    } finally {
      setBusy('');
    }
  };

  // ─────────── مساعداتُ الحالة ───────────

  const fieldOn = (k: string): boolean => fields[k] ?? (defaultFields[k] ?? false);

  const toggleField = (k: string) => {
    // الدمجُ أوّلاً كي يُكتب المفتاحُ المعاكسُ صراحةً ولا يعود للافتراضيّ.
    setFields((f) => ({ ...defaultFields, ...f, [k]: !(f[k] ?? (defaultFields[k] ?? false)) }));
    setDirty(true);
  };

  const toggleActivity = (id: number) => {
    setSelectedActs((cur) => {
      const base = cur ?? activities.map((a) => a.id);
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
    setDirty(true);
  };

  const actsChecked = (id: number) => (selectedActs === null ? true : selectedActs.includes(id));

  const toggleChannel = (c: CaseReportChannel) => {
    setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  };

  // ─────────── العرض ───────────

  const renderLayoutTab = () => (
    <>
      <p className="crm-hint">
        الشكلُ يحدّد كيف يُرسَم التقرير. عايِن أيَّها شئتَ ببياناتٍ تجريبية قبل أن تختار.
      </p>
      {templates.length === 0 && (
        <div className="crm-note">
          تعذّر قراءةُ القوالب. سيُستعمل القالبُ الافتراضيُّ للمكتب، وتبقى بقيّةُ
          التبويبات تعمل كالمعتاد.
        </div>
      )}
      <div className="crm-layouts">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`crm-layout${t.layout === layout && t.id === templateId ? ' crm-layout--on' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!editable) return;
              setTemplateId(t.id);
              setLayout(t.layout);
              setDirty(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!editable) return;
                setTemplateId(t.id);
                setLayout(t.layout);
                setDirty(true);
              }
            }}
          >
            <div className="crm-layout__t">
              {t.name}
              {t.layout === 'ai_letter' && <span className="crm-layout__ai">ذكاء</span>}
            </div>
            <p className="crm-layout__d">{t.description || CASE_REPORT_LAYOUT_HINTS[t.layout]}</p>
            <button
              type="button"
              className="crm-layout__prev"
              onClick={(e) => {
                e.stopPropagation();
                caseReportService.openTemplatePreview(t.id).catch(() => toast.error('تعذّرت المعاينة'));
              }}
            >
              <Eye size={11} /> معاينة الشكل
            </button>
          </div>
        ))}
      </div>

      <div className="crm-sec">عنوانُ المدى (اختياري)</div>
      <input
        className="crm-input"
        value={periodLabel}
        disabled={!editable}
        placeholder="مثال: حتى 2026-08-25 — أو: تقرير أغسطس"
        onChange={(e) => {
          setPeriodLabel(e.target.value);
          setDirty(true);
        }}
      />
      <p className="crm-hint" style={{ marginTop: 6 }}>
        يظهر في عنوان التقرير فقط — لا يُرشّح البيانات.
      </p>
    </>
  );

  const renderContentTab = () => (
    <>
      <div className="crm-sec">أقسامُ التقرير</div>
      <p className="crm-hint">اختَر ما يظهر في المستند. المالي مُطفأٌ افتراضاً.</p>
      <div className="crm-fields">
        {Object.entries(fieldLabels).map(([key, label]) => (
          <label key={key} className="crm-check">
            <input
              type="checkbox"
              checked={fieldOn(key)}
              disabled={!editable}
              onChange={() => toggleField(key)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="crm-sec">النشاطاتُ الأخيرة</div>
      {!fieldOn('activities') && (
        <p className="crm-note">
          قسمُ النشاطات مُطفأٌ الآن. فعّله من الأقسام أعلاه ليظهر في المستند.
        </p>
      )}
      <div className="crm-acts__bar">
        <span>
          {selectedActs === null
            ? `الافتراضي: أحدثُ النشاطات تلقائياً (${activities.length} متاحة)`
            : `مختارٌ ${selectedActs.length} من ${activities.length}`}
        </span>
        <button type="button" className="crm-link" disabled={!editable} onClick={() => { setSelectedActs(null); setDirty(true); }}>
          الافتراضي
        </button>
        <button type="button" className="crm-link" disabled={!editable} onClick={() => { setSelectedActs(activities.map((a) => a.id)); setDirty(true); }}>
          تحديد الكلّ
        </button>
        <button type="button" className="crm-link" disabled={!editable} onClick={() => { setSelectedActs([]); setDirty(true); }}>
          إلغاء الكلّ
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="crm-empty">لا توجد نشاطاتٌ تُعرض للعميل على هذه القضية.</div>
      ) : (
        <div className="crm-acts">
          {activities.map((a) => (
            <label key={a.id} className="crm-act">
              <input
                type="checkbox"
                checked={actsChecked(a.id)}
                disabled={!editable}
                onChange={() => toggleActivity(a.id)}
              />
              <span>
                <span className="crm-act__t">{a.title || a.type}</span>
                {a.description && <span className="crm-act__m">{a.description}</span>}
                <span className="crm-act__m">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA') : '—'}
                  {a.by ? ` · ${a.by}` : ''}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      <p className="crm-hint" style={{ marginTop: 6 }}>
        تُعرض هنا النشاطاتُ المسموحُ عرضُها للعميل فقط — الداخليُّ لا يظهر في القائمة ولا في المستند.
      </p>

      <div className="crm-sec">أقسامٌ تضيفها بنفسك</div>
      {customSections.map((s, i) => (
        <div key={i} className="crm-block">
          <div className="crm-block__hd">
            <input
              className="crm-input"
              value={s.title}
              disabled={!editable}
              placeholder="عنوان القسم"
              onChange={(e) => {
                const next = [...customSections];
                next[i] = { ...next[i], title: e.target.value };
                setCustomSections(next);
                setDirty(true);
              }}
            />
            <button
              type="button"
              className="crm-btn crm-btn--sm"
              disabled={!editable}
              onClick={() => {
                setCustomSections(customSections.filter((_, x) => x !== i));
                setDirty(true);
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <textarea
            className="crm-textarea"
            value={s.body}
            disabled={!editable}
            placeholder="نصُّ القسم…"
            onChange={(e) => {
              const next = [...customSections];
              next[i] = { ...next[i], body: e.target.value };
              setCustomSections(next);
              setDirty(true);
            }}
          />
        </div>
      ))}
      {customSections.length < 8 && (
        <button
          type="button"
          className="crm-btn crm-btn--sm"
          disabled={!editable}
          onClick={() => {
            setCustomSections([...customSections, { title: '', body: '', order: customSections.length }]);
            setDirty(true);
          }}
        >
          <Plus size={12} /> إضافة قسم
        </button>
      )}
    </>
  );

  const renderNarrativeTab = () => (
    <>
      <div className="crm-row">
        <span className="crm-sec" style={{ margin: 0 }}>
          {isLetter ? 'الرسالةُ بالذكاء' : 'ملخّصُ السير'}
        </span>
        <button
          type="button"
          className="crm-btn crm-btn--sm"
          disabled={!editable || busy === 'generate'}
          onClick={handleGenerate}
        >
          {busy === 'generate' ? <Loader2 size={12} className="crm-spin" /> : <Sparkles size={12} />}
          {busy === 'generate' ? 'جارٍ الصياغة…' : 'صياغة بالذكاء'}
        </button>
      </div>

      <p className="crm-hint">
        {isLetter
          ? 'يكتب الذكاءُ التقريرَ رسالةً متّصلةً من وقائع الملفّ. راجِعها وعدّلها كما تشاء — تعديلُك يمنع إعادةَ التوليد فوقه.'
          : 'يصوغ الذكاءُ سرداً موجزاً من محاضر الجلسات. لا يتنبّأ بنتيجةٍ ولا يُبدي رأياً قانونياً.'}
      </p>

      {isLetter ? (
        <>
          <div className="crm-field">
            <label className="crm-label">التمهيد</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 70 }}
              value={letterOpening}
              disabled={!editable}
              onChange={(e) => { setLetterOpening(e.target.value); setNarrativeDirty(true); }}
            />
          </div>

          {letterSections.map((s, i) => (
            <div key={i} className="crm-block">
              <div className="crm-block__hd">
                <input
                  className="crm-input"
                  value={s.title}
                  disabled={!editable}
                  placeholder="عنوان الفصل"
                  onChange={(e) => {
                    const next = [...letterSections];
                    next[i] = { ...next[i], title: e.target.value };
                    setLetterSections(next);
                    setNarrativeDirty(true);
                  }}
                />
                <button
                  type="button"
                  className="crm-btn crm-btn--sm"
                  disabled={!editable}
                  onClick={() => { setLetterSections(letterSections.filter((_, x) => x !== i)); setNarrativeDirty(true); }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                className="crm-textarea"
                value={s.body}
                disabled={!editable}
                onChange={(e) => {
                  const next = [...letterSections];
                  next[i] = { ...next[i], body: e.target.value };
                  setLetterSections(next);
                  setNarrativeDirty(true);
                }}
              />
            </div>
          ))}

          {letterSections.length < 8 && (
            <button
              type="button"
              className="crm-btn crm-btn--sm"
              disabled={!editable}
              onClick={() => { setLetterSections([...letterSections, { title: '', body: '' }]); setNarrativeDirty(true); }}
            >
              <Plus size={12} /> إضافة فصل
            </button>
          )}

          <div className="crm-field" style={{ marginTop: 12 }}>
            <label className="crm-label">الخاتمة</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 70 }}
              value={letterClosing}
              disabled={!editable}
              onChange={(e) => { setLetterClosing(e.target.value); setNarrativeDirty(true); }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="crm-field">
            <label className="crm-label">سردُ سير القضية</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 150 }}
              value={summary}
              disabled={!editable}
              onChange={(e) => { setSummary(e.target.value); setNarrativeDirty(true); }}
            />
          </div>
          <div className="crm-field">
            <label className="crm-label">الخلاصة المختصرة (تظهر في الشكل التنفيذي)</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 70 }}
              value={summaryShort}
              disabled={!editable}
              onChange={(e) => { setSummaryShort(e.target.value); setNarrativeDirty(true); }}
            />
          </div>
          <div className="crm-field">
            <label className="crm-label">الخطوة القادمة</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 60 }}
              value={nextStep}
              disabled={!editable}
              onChange={(e) => { setNextStep(e.target.value); setNarrativeDirty(true); }}
            />
          </div>
        </>
      )}

      {narrativeDirty && (
        <button type="button" className="crm-btn crm-btn--sm" disabled={busy === 'save'} onClick={handleSaveNarrative}>
          {busy === 'save' ? <Loader2 size={12} className="crm-spin" /> : <Save size={12} />} حفظ السرد
        </button>
      )}
    </>
  );

  const renderIssueTab = () => (
    <>
      {!hasSubstance && (
        <div className="crm-warn">
          التقرير بلا مضمون. صُغ السردَ من تبويب «الصياغة» أو أضِف قسماً واحداً على الأقلّ —
          فالإصدارُ يخصّص رقمَ صادرٍ لا يُستردّ.
        </div>
      )}

      <div className="crm-sec">قنواتُ الإصدار</div>
      <div className="crm-channels">
        {CHANNELS.map((c) => (
          <label key={c} className={`crm-channel${channels.includes(c) ? ' crm-channel--on' : ''}`}>
            <input type="checkbox" checked={channels.includes(c)} disabled={!editable} onChange={() => toggleChannel(c)} />
            <span>
              {CASE_REPORT_CHANNEL_LABELS[c]}
              <span className="crm-channel__m">
                {c === 'whatsapp' && 'يُرسَل ملفُّ PDF مرفقاً إلى جوال العميل.'}
                {c === 'email' && 'يُرسَل من بريد المكتب إن كان مربوطاً.'}
                {c === 'print' && 'يُخصَّص رقمُ صادرٍ ويُحفظ المستند، دون إرساله لأحد.'}
              </span>
            </span>
          </label>
        ))}
      </div>

      <p className="crm-note">
        الإصدارُ يُثبّت لقطةَ الاختيارات: تعديلُ القالب بعده لا يغيّر ما بيد العميل.
        ولا يُعدَّل تقريرٌ صدر — يُنشأ غيرُه.
      </p>
    </>
  );

  const renderHistoryTab = () => (
    <>
      <div className="crm-sec">تقاريرُ هذه القضية</div>
      {history.length === 0 ? (
        <div className="crm-empty">لم يصدر تقريرٌ عن هذه القضية بعد.</div>
      ) : (
        <div className="crm-hist">
          {history.map((r) => (
            <div key={r.id} className="crm-hist__row">
              <span>
                <span className={`crm-badge ${r.status === 'issued' ? 'crm-badge--issued' : 'crm-badge--draft'}`}>
                  {r.status_label}
                </span>{' '}
                {r.layout_label}
                <span className="crm-hist__m">
                  {r.outgoing_number ? `صادر ${r.outgoing_number} · ` : ''}
                  {r.report_number}
                  {r.issued_at ? ` · ${new Date(r.issued_at).toLocaleDateString('en-CA')}` : ''}
                  {r.issued_by_name ? ` · ${r.issued_by_name}` : ''}
                  {r.channels.length ? ` · ${r.channels.map((c) => CASE_REPORT_CHANNEL_LABELS[c]).join('، ')}` : ''}
                </span>
              </span>
              {r.has_file && (
                <button
                  type="button"
                  className="crm-btn crm-btn--sm"
                  onClick={() => caseReportService.openIssued(r.id).catch(() => toast.error('تعذّر فتح الملف'))}
                >
                  <Download size={12} /> فتح
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  /** إغلاقٌ لا يبتلع تعديلاً غيرَ محفوظ. */
  const requestClose = () => {
    if ((dirty || narrativeDirty) && editable) {
      if (!window.confirm('توجد تعديلاتٌ لم تُحفظ. إغلاقُ الشاشة يفقدها. متابعة؟')) return;
    }
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="crm-overlay" />
        <Dialog.Content className="crm-content" aria-describedby={undefined}>
          <header className="crm-header">
            <Dialog.Title className="crm-title">
              <FileText size={15} />
              تقرير القضية
              {report && <small>· {report.report_number}</small>}
              {report && !editable && <span className="crm-badge crm-badge--issued">صادر</span>}
            </Dialog.Title>
            <button type="button" className="crm-close" aria-label="إغلاق" onClick={requestClose}>
              <X size={14} />
            </button>
          </header>

          <nav className="crm-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`crm-tab${tab === t.id ? ' crm-tab--on' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'history' && history.length > 0 && <span className="crm-tab__n">{history.length}</span>}
              </button>
            ))}
          </nav>

          <div className="crm-body">
            {loading ? (
              <div className="crm-empty">
                <Loader2 size={16} className="crm-spin" /> جارٍ التحميل…
              </div>
            ) : !report ? (
              <div className="crm-empty">تعذّر تجهيز التقرير.</div>
            ) : (
              <>
                {tab === 'layout' && renderLayoutTab()}
                {tab === 'content' && renderContentTab()}
                {tab === 'narrative' && renderNarrativeTab()}
                {tab === 'issue' && renderIssueTab()}
                {tab === 'history' && renderHistoryTab()}
              </>
            )}
          </div>

          <footer className="crm-footer">
            <div className="crm-footer__l">
              {editable && dirty && (
                <button type="button" className="crm-btn" disabled={busy !== ''} onClick={handleSave}>
                  {busy === 'save' ? <Loader2 size={13} className="crm-spin" /> : <Save size={13} />} حفظ
                </button>
              )}
            </div>
            <div className="crm-footer__r">
              <button type="button" className="crm-btn" disabled={!report || busy !== ''} onClick={handlePreview}>
                {busy === 'preview' ? <Loader2 size={13} className="crm-spin" /> : <Eye size={13} />} معاينة
              </button>
              {editable ? (
                <button
                  type="button"
                  className="crm-btn crm-btn--primary"
                  disabled={!report || busy !== '' || channels.length === 0 || !hasSubstance}
                  title={!hasSubstance ? 'صُغ السردَ أوّلاً — الإصدارُ يحرق رقمَ صادر' : undefined}
                  onClick={handleIssue}
                >
                  {busy === 'issue' ? (
                    <Loader2 size={13} className="crm-spin" />
                  ) : channels.length === 1 && channels[0] === 'print' ? (
                    <Printer size={13} />
                  ) : (
                    <Send size={13} />
                  )}
                  {channels.length === 1 && channels[0] === 'print' ? 'إصدار للطباعة' : 'إصدار وإرسال'}
                </button>
              ) : (
                <button
                  type="button"
                  className="crm-btn crm-btn--primary"
                  onClick={async () => {
                    try {
                      const created = await caseReportService.create(caseId, templateId);
                      applyReport(created.data);
                      setHistory((h) => [created.data, ...h]);
                      setTab('layout');
                      toast.success('أُنشئت مسوّدةٌ جديدة');
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : 'تعذّر الإنشاء');
                    }
                  }}
                >
                  <History size={13} /> تقريرٌ جديد
                </button>
              )}
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CaseReportModal;
