// [وحدة المحاسبة #141 — م3] سجلّ القيود الفاشلة: الدَّينُ المحاسبيُّ المؤجَّل وزرُّ سداده.
//
// ══════ 🔴 الثغرةُ التي تغلقها هذه الشاشة ══════
// `AutoJournalService` استبدل الابتلاعَ الصامت لفشل التوليد بسياستين: يرمي داخلَ
// المعاملة فترتدّ العمليةُ كلُّها، ويكتب صفّاً في `accounting_posting_failures` خارجَها.
// لكنّ الجدولَ بقي **يُكتب ولا يُقرأ** — لا مسارَ ولا شاشةَ ولا عدّاد — فما تغيّر شيءٌ
// في الحقيقة: استُبدل «سطرٌ في اللوق لا يراه أحد» بـ«صفٍّ في جدولٍ لا يراه أحد».
//
// وكلُّ صفٍّ هنا يعني **مستنداً ثبت في القاعدة وقيدُه لم يُكتب**: انحرافٌ لا يفضحه
// ميزانُ المراجعة (القيودُ الموجودةُ متوازنةٌ كلٌّ على حدة) ولا يظهر في شاشةٍ أخرى، فلا
// يُكتشف إلا عند مطابقةٍ يدويّةٍ بعد شهور — وحينها يكون التصحيحُ إعادةَ كتابةِ تاريخٍ
// محاسبيّ لا إصلاحَ عطل. لذلك القراءةُ بـ`accounting.view` والإعادةُ بـ`accounting.manage`.
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle, RefreshCw, FileWarning, CheckCircle2 } from 'lucide-react';
import {
  accountingService,
  type PostingFailure,
  type PostingFailureStatus,
  type PostingFailureSource,
} from '../../../services/accountingService';
import { DataTable, FilterBar, Pagination, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { formatSAR } from '../../../utils/money';
import { toDayString } from '../../../utils/dayString';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

/** مفتاحُ عدّاد الشارة — مشتركٌ مع `AccountingTab` كي يُجلب مرّةً ويُبطَل مرّةً. */
export const POSTING_FAILURES_SUMMARY_KEY = ['accounting', 'posting-failures', 'summary'] as const;

const STATUS_OPTIONS: { value: PostingFailureStatus; label: string }[] = [
  { value: 'unresolved', label: 'المفتوحة' },
  { value: 'resolved', label: 'المُغلقة' },
  { value: 'all', label: 'الكل' },
];

const SOURCE_OPTIONS: { value: '' | PostingFailureSource; label: string }[] = [
  { value: '', label: 'كل المصادر' },
  { value: 'invoice', label: 'الفواتير' },
  { value: 'payment', label: 'سندات القبض' },
  { value: 'expense', label: 'المصروفات' },
];

/**
 * ⏱️ ساعةُ الطابع من نصٍّ ساذجٍ بتوقيت الرياض (`2026-08-15 14:32:07`).
 *
 * اليومُ يُقرأ بـ`toDayString` (المتسامحة مع الصيغتين لو تبدّل تسلسلُ الخادم يوماً)،
 * والساعةُ تُقتطع بنمطٍ صريحٍ لا بـ`new Date()`: النصُّ بلا لاحقةِ منطقةٍ يفسّره
 * المتصفّح بتوقيت **جهازه**، فيقفز الطابعُ ساعاتٍ على من يفتح الشاشة من خارج الرياض.
 */
const HHMM = /[T ](\d{2}:\d{2})/;

/**
 * اليومُ فوق والساعةُ تحت — في عنصرين لا في نصٍّ واحد.
 *
 * 🩸 عددان متجاوران في سطرٍ عربيّ يقلبهما محرّكُ الاتجاه: «2026-08-15 14:32» تُعرض
 * «14:32 2026-08-15». والفصلُ بعنصرين يُنهي المسألةَ بلا `dir="ltr"` — وهي بدورها
 * تمزّق السطرَ حين يخالطه حرفٌ عربيّ.
 */
const Stamp: React.FC<{ value: string | null }> = ({ value }) => {
  const day = toDayString(value);
  if (!day) return <span className="fin-cell-muted">—</span>;
  const time = value ? HHMM.exec(value)?.[1] : undefined;

  return (
    <div>
      <div>{day}</div>
      {time && <div className="fin-cell-muted">{time}</div>}
    </div>
  );
};

const PostingFailuresPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.accountingManage);

  const [status, setStatus] = useState<PostingFailureStatus>('unresolved');
  const [source, setSource] = useState<'' | PostingFailureSource>('');
  const [page, setPage] = useState(1);
  // 🔑 المودال يحمل **معرّفاً لا نسخةً من الصفّ**: بعد إعادة المحاولة يتبدّل عدّادُ
  //    المحاولات ونصُّ الخطأ في الخادم، ونسخةٌ محفوظةٌ في الحالة تبقى تعرض ما بطل.
  //    والاشتقاقُ من القائمة يُغلق المودال وحدَه حين يغادر الصفُّ الفلترَ (أُغلق دَينُه
  //    ونحن نستعرض «المفتوحة») — وهو بالضبط ما ينبغي أن يحدث.
  const [detailId, setDetailId] = useState<number | null>(null);
  // رفضُ الباك يبقى **مكتوباً في المودال** لا في toast يزول بعد ثوان: بعضُ أسبابه
  // تعليماتٌ تُنفَّذ («الفاتورة عادت مسوّدة» · «المستند حُذف») لا تُقرأ في لمحة.
  const [retryError, setRetryError] = useState<{ id: number; message: string } | null>(null);

  const filter = {
    status,
    source: source || undefined,
    page,
    per_page: 25,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'posting-failures', filter],
    queryFn: () => accountingService.getPostingFailures(filter),
  });

  // العدّادُ نفسُه الذي تقرؤه شارةُ التبويب — استعلامٌ واحدٌ بمفتاحٍ واحد، فلا نداءَ
  // ثانٍ ولا رقمان يفترقان بين الشارة وصدر الشاشة.
  const { data: summaryData } = useQuery({
    queryKey: POSTING_FAILURES_SUMMARY_KEY,
    queryFn: () => accountingService.getPostingFailuresSummary(),
  });

  const rows = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;
  const summary = summaryData?.data;
  const oldestDay = toDayString(summary?.oldest_at);

  const detail = rows.find((r) => r.id === detailId) ?? null;

  const retryMutation = useMutation({
    mutationFn: (failure: PostingFailure) => accountingService.retryPostingFailure(failure.id),
    onSuccess: (res) => {
      // رسالةُ الباك تفرّق «تولّد القيد» من «كان مكتوباً سلفاً» من «لم يعد مستحقّاً» —
      // ثلاثُ نهاياتٍ تُغلق الدَّين، وطمسُها في «تمّ» يخفي أيَّها وقع.
      toast.success(res.message || 'أُغلق الدَّين المحاسبيّ');
      setRetryError(null);
      // الإبطالُ شاملٌ لأن القيدَ المولَّد يغيّر الدفاترَ كلَّها: القيود والقوائم
      // والإقرار — لا هذه القائمةَ وحدَها.
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
    onError: (error: Error & { status?: number }, failure) => {
      // 🩸 ٤٢٩ وحدَها تأتي بنصٍّ إنجليزيّ من Laravel («Too Many Attempts.») لا برسالةٍ
      //    عربيةٍ من المتحكّم — وهي ليست فشلَ توليدٍ أصلاً بل حدُّ المسار (٢٠/دقيقة).
      //    عرضُها كما هي يوهم المحاسبَ أن الدفترَ رفض قيدَه.
      const message = error.status === 429
        ? 'تجاوزتَ حدَّ إعادة المحاولات لهذه الدقيقة — كلُّ ضغطةٍ تشغّل المولّدَ كاملاً. أمهِل دقيقةً ثمّ أعِد.'
        : (error.message || 'تعذّرت إعادة المحاولة');

      setRetryError({ id: failure.id, message });
      toast.error(message);
      // 🔑 الإبطالُ في مسار الخطأ أيضاً: الفشلَ المتكرّر يزيد `attempts` ويكتب نصَّ
      //    خطأٍ جديداً في الخادم، فصفٌّ لا يُعاد جلبُه يعرض محاولةً أقلَّ ممّا وقع
      //    فعلاً — ويُخفي بالضبط الإشارةَ التي تميّز العطلَ العنيدَ من العابر.
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
  });

  const pendingId = retryMutation.isPending ? retryMutation.variables?.id ?? null : null;

  /** الصفُّ قابلٌ لإعادة المحاولة: مفتوحٌ ومصدرُه حيٌّ — والصلاحيةُ فوقهما. */
  const canRetry = (f: PostingFailure) => canManage && !f.resolved_at && f.source_available;

  const runRetry = (f: PostingFailure) => {
    setRetryError(null);
    retryMutation.mutate(f);
  };

  const columns = useMemo<Column<PostingFailure>[]>(() => [
    {
      key: 'source',
      header: 'المستند',
      render: (f) => (
        <div>
          {/* الرقمُ المفهوم لا المعرّف: «#4172» مجرّداً لا يدلّ المحاسبَ على شيء.
              والباك يجلبه بـwithTrashed فيبقى مقروءاً ولو حُذف المستندُ ناعماً. */}
          <span className="fin-docnum">{f.source_title ?? `#${f.source_id}`}</span>
          <div className="fin-cell-muted">
            {f.source_label}
            {!f.source_available && ' · محذوف'}
          </div>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'الحدث',
      render: (f) => (
        <div>
          {/* التسميةُ من الباك لا من خريطةٍ هنا: مفاتيحُ الأحداث تحمل لواحقَ
              (`payment_refund@1200.00`) وخريطةٌ ثانيةٌ في الواجهة تفوتها بأوّل لاحقة. */}
          <span className="fin-cell-strong">{f.event_label}</span>
          <div className="fin-cell-mono">{f.source_event}</div>
        </div>
      ),
    },
    {
      key: 'error',
      header: 'سبب الفشل',
      render: (f) => (
        <span
          className="fin-cell-muted"
          title={f.error_message}
          style={{ display: 'block', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {f.error_message}
        </span>
      ),
    },
    {
      key: 'attempts',
      header: 'المحاولات',
      align: 'center',
      // ثلاثُ محاولاتٍ فأكثر عطلٌ عنيدٌ لا عابر: سببُه بنيويّ (حسابٌ غير مزروع · فترةٌ
      // مقفلة) ولا يُشفى بضغطةٍ رابعة — فيُميَّز بلونٍ يوقف اليدَ عن التكرار.
      render: (f) => <ToneBadge tone={f.attempts >= 3 ? 'warning' : 'neutral'}>{f.attempts}</ToneBadge>,
    },
    { key: 'last', header: 'آخر محاولة', render: (f) => <Stamp value={f.last_attempted_at} /> },
    {
      key: 'status',
      header: 'الحالة',
      align: 'center',
      render: (f) => (
        <div>
          <ToneBadge tone={f.resolved_at ? 'success' : 'danger'}>{f.resolved_at ? 'مُغلق' : 'مفتوح'}</ToneBadge>
          {f.resolved_entry_number && <div className="fin-cell-mono">{f.resolved_entry_number}</div>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (f) => {
        if (!canManage || f.resolved_at) return null;

        // زرٌّ يُضغط فيعتذر دائماً يُعلّم المستخدمَ ألّا يثق بالأزرار — فالمصدرُ
        // المحذوفُ يُقابَل بسببٍ مكتوبٍ لا بزرٍّ ميّتٍ ولا بزرٍّ يَعِد بما لا يقع.
        if (!f.source_available) {
          return <span className="fin-cell-muted">المصدر محذوف</span>;
        }

        return (
          <button
            type="button"
            className="fin-btn fin-btn--sm"
            // كلُّ الأزرار تُعطَّل ما دامت محاولةٌ جارية: النداءُ يشغّل المولّدَ كاملاً
            // (زرعُ دليلٍ + بناءُ قيد) والمسارُ محدودٌ بعشرين نداءً في الدقيقة، فضغطٌ
            // متوازٍ يحرق الحدَّ ويعود بـ٤٢٩ لا علاقة له بالعطل المعروض.
            disabled={retryMutation.isPending}
            title="إعادة توليد القيد الفائت"
            onClick={(ev) => { ev.stopPropagation(); runRetry(f); }}
          >
            <RefreshCw size={13} /> {pendingId === f.id ? 'جارٍ التوليد...' : 'إعادة محاولة'}
          </button>
        );
      },
    },
  ], [canManage, retryMutation.isPending, pendingId]);

  // الحالةُ الفارغةُ تختلف بالفلتر: «لا شيء هنا» تحت «المُغلقة» بشارةٌ سارّة، وهي تحت
  // «المفتوحة» شهادةُ سلامةٍ للدفاتر — ونصٌّ واحدٌ لا يقول أيَّهما.
  //
  // ⚠️ وشهادةُ السلامة تُحجب متى ضُيّق الفلترُ بمصدر: «الدفاتر مكتملة» فوق نتيجةٍ
  //    مقصورةٍ على المصروفات تُطمئن كذباً بينما عشرُ فواتيرَ مفتوحةٌ خارج الفلتر —
  //    وطمأنينةٌ كاذبةٌ في شاشةِ إنذارٍ أسوأُ من غياب الشاشة أصلاً.
  const empty = source
    ? {
      icon: FileWarning,
      title: 'لا صفوف تطابق هذا الفلتر',
      desc: 'السجلّ يخصّ مصدراً آخر أو حالةً أخرى — أزِل الفلتر لرؤية بقيّته.',
    }
    : status === 'unresolved'
      ? {
        icon: CheckCircle2,
        title: 'لا قيود فاشلة — الدفاتر مكتملة',
        desc: 'كلُّ فاتورةٍ وسندٍ ومصروفٍ وجد طريقَه إلى الدفتر. يظهر هنا أيُّ مستندٍ يثبت في القاعدة ويفوت قيدُه، ومعه زرُّ إعادة توليده.',
      }
      : status === 'resolved'
        ? {
          icon: FileWarning,
          title: 'لا دَينَ مُغلقاً بعد',
          desc: 'هنا يُؤرشَف كلُّ قيدٍ فات الدفترَ ثمّ وُلد لاحقاً — ومعه رقمُ القيد الذي أغلقه.',
        }
        : {
          icon: CheckCircle2,
          title: 'السجلّ فارغ',
          desc: 'لم يفت الدفترَ قيدٌ واحدٌ منذ تفعيل الوحدة.',
        };

  return (
    <div>
      {/* صدرُ الشاشة يقرأ العدّاد نفسَه — والتاريخُ لا الرقمَ وحدَه: أقدمُ قيدٍ فائتٍ هو
          الخطرُ الحقيقيّ، وكلَّما طال بقاؤه اقترب من فترةٍ تُقفل فيصير تصحيحُه إعادةَ
          كتابةِ تاريخٍ محاسبيّ لا إصلاحَ عطل. */}
      {!!summary?.unresolved_count && (
        <div className="acc-warn">
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{summary.unresolved_count}</strong> قيداً فات الدفترَ ولم يُعوَّض بعد
            {oldestDay && <> — أقدمُها منذ <strong>{oldestDay}</strong></>}.
            المستنداتُ ثابتةٌ في القاعدة وقيودُها غائبةٌ عن الدفاتر، فيخالف الإقرارُ الضريبيّ
            (يقرأ المستندات) ميزانَ المراجعة (يقرأ القيود) بلا أيّ عدم توازنٍ يفضح ذلك.
          </span>
        </div>
      )}

      <FilterBar
        selects={[
          {
            value: status,
            onChange: (v) => { setStatus(v as PostingFailureStatus); setPage(1); },
            options: STATUS_OPTIONS,
            ariaLabel: 'فلتر الحالة',
          },
          {
            value: source,
            onChange: (v) => { setSource(v as '' | PostingFailureSource); setPage(1); },
            options: SOURCE_OPTIONS,
            ariaLabel: 'فلتر المصدر',
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(f) => f.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={(f) => { setRetryError(null); setDetailId(f.id); }}
        emptyIcon={empty.icon}
        emptyTitle={empty.title}
        emptyDesc={empty.desc}
        footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
      />

      {/* ── تفاصيل الدَّين: نصُّ الخطأ كاملاً لا مقصوصاً ── */}
      <Modal
        open={detail !== null}
        onClose={() => { setDetailId(null); setRetryError(null); }}
        title={detail ? `${detail.source_label} ${detail.source_title ?? `#${detail.source_id}`}` : ''}
        icon={FileWarning}
        size="wide"
        footerAlign="end"
        footer={detail && (
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => { setDetailId(null); setRetryError(null); }}>
              إغلاق
            </button>
            {canRetry(detail) && (
              <button
                type="button"
                className="fin-btn fin-btn--primary"
                disabled={retryMutation.isPending}
                onClick={() => runRetry(detail)}
              >
                <RefreshCw size={14} /> {pendingId === detail.id ? 'جارٍ التوليد...' : 'إعادة توليد القيد'}
              </button>
            )}
          </>
        )}
      >
        {detail && (
          <>
            <div className="fin-grid fin-grid--2" style={{ marginBottom: 10 }}>
              <div>
                <div className="fin-cell-muted">الحدث المحاسبيّ</div>
                <div className="fin-cell-strong">{detail.event_label}</div>
                <div className="fin-cell-mono">{detail.source_event}</div>
              </div>
              <div>
                <div className="fin-cell-muted">قيمة المستند وقت الفشل</div>
                <div className="fin-cell-strong">
                  {detail.source_amount === null ? '—' : formatSAR(detail.source_amount)}
                </div>
              </div>
              <div>
                <div className="fin-cell-muted">أول فشل</div>
                <Stamp value={detail.created_at} />
              </div>
              <div>
                <div className="fin-cell-muted">آخر محاولة ({detail.attempts})</div>
                <Stamp value={detail.last_attempted_at} />
              </div>
            </div>

            <div className="fin-field">
              <label className="fin-field__label">سبب الفشل كما سجّله المحرّك</label>
              {/* النصُّ كاملاً بلا قصّ: صنفُ الاستثناء يفرّق «فترةً مقفلة» (يفتحها
                  المحاسب) عن «حسابٍ نظاميٍّ غير مزروع» (يزرعه الدليل) — والفرقُ هو
                  كلُّ ما يحتاجه من يقف أمام الزرّ. */}
              <div className="fin-cell-mono" style={{ marginBottom: 4 }}>{detail.error_class}</div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12.5 }}>
                {detail.error_message}
              </div>
            </div>

            {detail.resolved_at && (
              <div className="acc-warn" style={{ background: 'var(--status-green-light)', color: 'var(--status-green)' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  أُغلق هذا الدَّين
                  {detail.resolved_entry_number && <> بالقيد <strong>{detail.resolved_entry_number}</strong></>}
                  {toDayString(detail.resolved_at) && <> بتاريخ <strong>{toDayString(detail.resolved_at)}</strong></>}.
                  {!detail.resolved_entry_id && ' لم يعد المستندُ يستوجب قيداً (صُفِّر أو عُدّل أو فرقُه صفر)، فأُغلق بلا قيد.'}
                </span>
              </div>
            )}

            {retryError?.id === detail.id && (
              <div className="acc-warn" style={{ background: 'var(--status-red-light)', color: 'var(--status-red)' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {retryError.message}
              </div>
            )}

            {canRetry(detail) && (
              <p className="fin-cell-muted" style={{ marginTop: 10 }}>
                {/* طمأنةٌ صادقة: المولّدُ idempotent بطبقتين (فحصٌ تطبيقيّ + فريدٌ في
                    القاعدة)، ولولاها ما جاز زرٌّ يُضغط مرّتين فوق دفترٍ حقيقيّ. */}
                إعادةُ المحاولة تنادي المولّدَ الآليَّ نفسَه — لا تكتب قيداً مكرّراً بحال، وإن كان القيدُ
                قد كُتب سلفاً أُغلق الدَّينُ وربُط به.
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default PostingFailuresPanel;
