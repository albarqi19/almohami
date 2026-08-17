// مودل «إرسال تقرير الجلسة» للعميل كـ PDF (مرفق واتساب/إيميل) —
// اختيار القالب + توليد/تحرير الملخص الرسمي بالذكاء + معاينة + إرسال.
import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Eye, Send, Loader2, Sparkles, Save, Languages, PenLine } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  sessionReportService,
  type SessionReportTemplate,
  type SessionReportSummary,
  type SessionNarrative,
  type SessionNarrativeSource,
} from '../services/sessionReportService';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  onSent?: (number?: string) => void;
  /** يُنادى بعد حفظ/حذف إفادة المكتب — ليحدّث الأبُ شارةَ الجلسة. */
  onStatementSaved?: (at: string | null) => void;
}

export const SendSessionReportModal: React.FC<Props> = ({
  open,
  onClose,
  sessionId,
  onSent,
  onStatementSaved,
}) => {
  const [templates, setTemplates] = useState<SessionReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  // الملخص الرسمي
  const [generating, setGenerating] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [judgement, setJudgement] = useState('');
  const [summaryMeta, setSummaryMeta] = useState<SessionReportSummary | null>(null);
  const [dirty, setDirty] = useState(false);

  // سرد الجلسة: الضبط الرسمي (إن وصل) وإفادة المكتب (إن كُتبت)
  const [narrative, setNarrative] = useState<SessionNarrative | null>(null);
  const [narrativeSource, setNarrativeSource] = useState<SessionNarrativeSource>(null);
  const [statement, setStatement] = useState('');
  const [statementDirty, setStatementDirty] = useState(false);
  const [savingStatement, setSavingStatement] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  // قوالب «الضبط الكامل» لا تحتاج توليد ملخص (تُرسل الضبط الخام).
  const needsSummary = selectedTemplate ? selectedTemplate.type !== 'full_dabt' : false;

  const hasDabt = narrativeSource === 'dabt';
  /**
   * هل للتقرير مضمون يُرسَل؟ يكفي أحدُ ثلاثة: ضبطُ المحكمة، أو إفادةُ المكتب
   * المحفوظة، أو ملخصٌ كتبه المحامي. (نفس شرط الحارس في الخادم — نمنع الرحلة
   * الضائعة بدل انتظار الرفض.)
   */
  const hasNarrative = narrativeSource !== null || statement.trim() !== '' || summary.trim() !== '';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSummary('');
    setJudgement('');
    setSummaryMeta(null);
    setDirty(false);
    setNarrative(null);
    setNarrativeSource(null);
    setStatement('');
    setStatementDirty(false);

    sessionReportService
      .list()
      .then((res) => {
        const list = res.data ?? [];
        setTemplates(list);
        const def = list.find((t) => t.is_default) ?? list[0];
        setTemplateId(def?.id);
      })
      .catch(() => toast.error('تعذّر تحميل القوالب'))
      .finally(() => setLoading(false));

    // حالة السرد تُجلب مستقلةً — فشلُها لا يمنع الإرسال (الخادم هو الحارس).
    sessionReportService
      .getNarrative(sessionId)
      .then((res) => {
        if (!res.data) return;
        setNarrative(res.data);
        setNarrativeSource(res.data.narrative_source);
        setStatement(res.data.office_statement ?? '');
        setStatementDirty(false);
      })
      .catch(() => undefined);
  }, [open, sessionId]);

  const applyMeta = (data: SessionReportSummary) => {
    setSummaryMeta(data);
    setSummary(data.summary ?? '');
    setJudgement(data.judgement ?? '');
    setDirty(false);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      // عند تعذّر التوليد (لا ضبط/تعذّر الذكاء) يردّ الخادم 422 فيُرمى استثناء برسالة واضحة.
      const res = await sessionReportService.generateSummary(sessionId, true);
      if (res.data) {
        applyMeta(res.data);
        toast.success(res.message || 'تم توليد الملخص');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر توليد الملخص');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary.trim()) {
      toast.warn('الملخص فارغ');
      return;
    }
    try {
      setSavingSummary(true);
      const res = await sessionReportService.saveSummary(sessionId, {
        summary: summary.trim(),
        judgement: judgement.trim() || null,
      });
      if (res.success && res.data) {
        applyMeta(res.data);
        toast.success('تم حفظ الملخص');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر حفظ الملخص');
    } finally {
      setSavingSummary(false);
    }
  };

  /** يحفظ إفادة المكتب (نصٌّ فارغ يحذفها). */
  const persistStatement = async (): Promise<void> => {
    const res = await sessionReportService.saveOfficeStatement(sessionId, statement.trim());
    if (res.data) {
      setNarrativeSource(res.data.narrative_source);
      setStatementDirty(false);
      onStatementSaved?.(res.data.office_statement_at);
    }
  };

  const handleSaveStatement = async () => {
    try {
      setSavingStatement(true);
      await persistStatement();
      toast.success(statement.trim() ? 'تم حفظ إفادة المكتب' : 'تم حذف إفادة المكتب');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر حفظ الإفادة');
    } finally {
      setSavingStatement(false);
    }
  };

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      // نحفظ أي تعديل غير محفوظ قبل المعاينة كي تظهر في الـ PDF
      if (statementDirty) {
        await persistStatement();
      }
      if (needsSummary && dirty && summary.trim()) {
        await sessionReportService.saveSummary(sessionId, {
          summary: summary.trim(),
          judgement: judgement.trim() || null,
        });
        setDirty(false);
      }
      await sessionReportService.openSessionPreview(sessionId, templateId);
    } catch {
      toast.error('تعذّر فتح المعاينة');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      // احفظ التعديل غير المحفوظ قبل الإرسال
      if (statementDirty) {
        await persistStatement();
      }
      if (needsSummary && dirty && summary.trim()) {
        await sessionReportService.saveSummary(sessionId, {
          summary: summary.trim(),
          judgement: judgement.trim() || null,
        });
        setDirty(false);
      }
      const res = await sessionReportService.sendReport(sessionId, templateId);
      if (res.success) {
        toast.success(`${res.message}${res.number ? ` (صادر ${res.number})` : ''}`);
        onSent?.(res.number);
        onClose();
      } else {
        toast.error(res.message || 'تعذّر الإرسال');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إرسال التقرير');
    } finally {
      setSending(false);
    }
  };

  const busy = previewing || sending || generating || savingSummary || savingStatement;
  const clientLang = summaryMeta?.client_language_name;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sdpm-overlay" />
        <Dialog.Content className="sdpm-content" aria-describedby={undefined}>
          <header className="sdpm-header">
            <Dialog.Title className="sdpm-title">
              <FileText size={14} />
              <span>إرسال تقرير الجلسة للعميل</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="sdpm-close" aria-label="إغلاق">
                <X size={14} />
              </button>
            </Dialog.Close>
          </header>

          <div className="sdpm-body">
            <p className="sdpm-intro">
              يُرسَل تقرير الجلسة كملف PDF بكليشة المكتب وعلامة مائية عبر واتساب العميل (وإيميل الشركة إن وُجد)،
              مع رقم صادر متسلسل. إن كانت لغة العميل غير العربية، تُضاف تلقائياً صفحة ثانية مترجمة بلغته.
            </p>

            <label className="srt__field">
              <span>القالب</span>
              {loading ? (
                <div className="sdpm-intro"><Loader2 size={14} className="sdpm-spin" /> جارٍ تحميل القوالب…</div>
              ) : (
                <select
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(Number(e.target.value))}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.is_default ? ' (افتراضي)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {/* إفادة المكتب — ما كتبه المحامي بقلمه حين لا يصل ضبط المحكمة بعد.
                ليست ضبطاً: الضبطُ محضرُ المحكمة، والتقرير يميّز المصدرين بتسمية
                الخانة كي لا يُنسب لمحضر المحكمة كلامُ المحامي. */}
            <div className="srpm-section">
              <div className="srpm-row">
                <span className="srpm-row__title">
                  <PenLine size={13} /> إفادة المكتب عن الجلسة
                </span>
                <button
                  type="button"
                  className="sdpm-btn sdpm-btn--ghost srpm-btn--sm"
                  onClick={handleSaveStatement}
                  disabled={busy || !statementDirty}
                >
                  {savingStatement ? <Loader2 size={12} className="sdpm-spin" /> : <Save size={12} />}
                  <span>حفظ الإفادة</span>
                </button>
              </div>

              <p
                className="srpm-note"
                style={{ marginTop: 0, marginBottom: 8, color: hasDabt ? undefined : '#8a6620' }}
              >
                {hasDabt
                  ? 'وصل ضبط الجلسة الرسمي من ناجز، والتقرير يعتمده. ما تكتبه هنا يبقى محفوظاً في الملف ولا يظهر في التقرير ما دام الضبط موجوداً.'
                  : narrativeSource === 'office'
                    ? 'لم يصل ضبط الجلسة الرسمي بعد. التقرير سيخرج بإفادة المكتب، وتُذكر بهذا الاسم فيه.'
                    : 'لم يصل ضبط الجلسة الرسمي بعد. اكتب ما جرى في الجلسة ليخرج التقرير — وإلا فلا مضمون يُرسَل.'}
              </p>

              <textarea
                className="srpm-textarea"
                value={statement}
                placeholder="مثال: حضرتُ الجلسة عن المدعي وقدّمتُ أصل الوكالة ومشفوعات الدعوى، وطلبت الدائرة من المدعى عليه تقديم جوابه، فأُجّلت الجلسة…"
                onChange={(e) => { setStatement(e.target.value); setStatementDirty(true); }}
                disabled={busy}
              />

              {narrative?.office_statement_at && !statementDirty && (
                <p className="srpm-note" style={{ marginBottom: 0 }}>
                  ✎ كتبها {narrative.office_statement_by_name || 'المكتب'}
                  {' · '}
                  {new Date(narrative.office_statement_at).toLocaleDateString('ar-SA')}
                </p>
              )}
            </div>

            {/* قسم الملخص الرسمي — لقوالب الملخص فقط (لا الضبط الكامل) */}
            {needsSummary && (
              <div className="srpm-section">
                <div className="srpm-row">
                  <span className="srpm-row__title">
                    <Sparkles size={13} /> الملخص الرسمي للجلسة
                  </span>
                  <button
                    type="button"
                    className="sdpm-btn sdpm-btn--ghost srpm-btn--sm"
                    onClick={handleGenerate}
                    disabled={busy || !hasDabt}
                    title={hasDabt ? undefined : 'لا ضبط لتلخيصه — التقرير يعتمد إفادة المكتب كما كتبتها'}
                  >
                    {generating ? <Loader2 size={12} className="sdpm-spin" /> : <Sparkles size={12} />}
                    <span>{summaryMeta && summary ? 'إعادة التوليد' : 'توليد بالذكاء'}</span>
                  </button>
                </div>

                <label className="srpm-fieldlabel">ملخص الجلسة (يمكنك تعديله قبل الإرسال)</label>
                <textarea
                  className="srpm-textarea"
                  value={summary}
                  placeholder="اضغط «توليد بالذكاء» لإنشاء ملخص رسمي من نص الضبط، أو اكتبه يدوياً…"
                  onChange={(e) => { setSummary(e.target.value); setDirty(true); }}
                  disabled={busy}
                />

                <label className="srpm-fieldlabel">قرار المحكمة (اتركه فارغاً إن لم يصدر قرار في الجلسة)</label>
                <textarea
                  className="srpm-textarea srpm-textarea--sm"
                  value={judgement}
                  placeholder="يُملأ تلقائياً إن ورد قرار صريح في الضبط…"
                  onChange={(e) => { setJudgement(e.target.value); setDirty(true); }}
                  disabled={busy}
                />

                {summary.trim() && (
                  <div className="srpm-row" style={{ marginTop: 8 }}>
                    <span className="srpm-note" style={{ margin: 0 }}>
                      {summaryMeta?.edited
                        ? '✎ ملخص محرَّر يدوياً'
                        : summaryMeta?.source === 'ai'
                          ? '✨ مولَّد بالذكاء — راجعه قبل الإرسال'
                          : ''}
                    </span>
                    <button
                      type="button"
                      className="sdpm-btn sdpm-btn--ghost srpm-btn--sm"
                      onClick={handleSaveSummary}
                      disabled={busy || !dirty}
                    >
                      {savingSummary ? <Loader2 size={12} className="sdpm-spin" /> : <Save size={12} />}
                      <span>حفظ الملخص</span>
                    </button>
                  </div>
                )}

                <p className="srpm-note">
                  {hasDabt
                    ? 'الملخص يُشتقّ من نص ضبط الجلسة فقط. إن لم تولّده، يُولَّد تلقائياً عند الإرسال.'
                    : 'لا ضبط لتلخيصه — التقرير يعتمد إفادة المكتب أعلاه كما كتبتها، بلا إعادة صياغة.'}
                </p>
              </div>
            )}

            {clientLang && (
              <div className="srpm-langbadge">
                <Languages size={13} />
                <span>لغة العميل: {clientLang} — ستُضاف صفحة ثانية مترجمة في الملف.</span>
              </div>
            )}
          </div>

          <footer className="sdpm-footer">
            <button
              type="button"
              className="sdpm-btn sdpm-btn--ghost"
              onClick={handlePreview}
              disabled={busy || loading}
            >
              {previewing ? <Loader2 size={12} className="sdpm-spin" /> : <Eye size={12} />}
              <span>معاينة</span>
            </button>
            <div className="sdpm-footer__right">
              <Dialog.Close asChild>
                <button type="button" className="sdpm-btn sdpm-btn--ghost" disabled={busy}>
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="sdpm-btn sdpm-btn--primary"
                onClick={handleSend}
                disabled={busy || loading || !templateId || !hasNarrative}
                title={hasNarrative ? undefined : 'اكتب إفادة المكتب أولاً — التقرير يخرج برقم صادر، فلا يُرسل فارغاً'}
              >
                {sending ? <Loader2 size={12} className="sdpm-spin" /> : <Send size={12} />}
                <span>{sending ? 'جارٍ الإرسال…' : 'إرسال الآن'}</span>
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
