// مودل «إرسال تقرير الجلسة» للعميل كـ PDF (مرفق واتساب/إيميل) —
// اختيار القالب + توليد/تحرير الملخص الرسمي بالذكاء + معاينة + إرسال.
import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Eye, Send, Loader2, Sparkles, Save, Languages } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  sessionReportService,
  type SessionReportTemplate,
  type SessionReportSummary,
} from '../services/sessionReportService';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  onSent?: (number?: string) => void;
}

export const SendSessionReportModal: React.FC<Props> = ({ open, onClose, sessionId, onSent }) => {
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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  // قوالب «الضبط الكامل» لا تحتاج توليد ملخص (تُرسل الضبط الخام).
  const needsSummary = selectedTemplate ? selectedTemplate.type !== 'full_dabt' : false;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSummary('');
    setJudgement('');
    setSummaryMeta(null);
    setDirty(false);
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
  }, [open]);

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

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      // نحفظ أي تعديل غير محفوظ قبل المعاينة كي تظهر في الـ PDF
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

  const busy = previewing || sending || generating || savingSummary;
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
                    disabled={busy}
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
                  الملخص يُشتقّ من نص ضبط الجلسة فقط. إن لم تولّده، يُولَّد تلقائياً عند الإرسال.
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
                disabled={busy || loading || !templateId}
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
