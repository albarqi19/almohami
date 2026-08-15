import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, FileSpreadsheet, Info, Landmark, Loader2, RefreshCw } from 'lucide-react';

import { errorText, fmtDateHuman, money, WINDOW_TONE_CLASS, windowCountdown } from './payrollFormat';
import { hrPayrollService } from '../../../services/hrPayrollService';

/**
 * ⬇️ **كشفُ الرواتب المسلَّم للبنك** — معاينتُه ثمّ تنزيلُه.
 *
 * ══════ 🔴🔴 الجملةُ التي بُنيت الشاشةُ لأجلها ══════
 * **ما ينزل من هنا ليس ملفَّ مدد.** الملفّان اثنان لا واحد:
 *   ① ملفُّ إدخالٍ **نحن ← بنك المكتب** — صيغتُه باتفاق البنك والمنشأة، وهذا وحدَه ما نولّده.
 *   ② ملفُّ الأجور الموقَّع رقمياً **البنك ← المنشأة ← المنصّة الحكومية** — يوقّعه البنكُ
 *      بمفتاحه الخاصّ، ورفعُه فعلٌ تقوم به المنشأة. ولا نستطيعه ولا ندّعيه.
 *
 * ولذلك **نصُّ التنبيه يصل من الخادم** (`notices`) ولا يُكتب هنا: هو نفسُه المطبوعُ في رأس
 * الملفّ حرفاً — فلا يُصحَّح أحدُهما ويبقى الآخرُ يكذب. ومن يفتح الملفَّ بعد شهرين لا يقرأ
 * هذه الشاشة، فالتنبيهُ يسافر مع الملفّ.
 *
 * ══════ الرفضُ يُعرَض **بأسماء أصحابه** قبل النقر ══════
 * «تعذّر التصدير» وحدَها تجعل المستخدمَ يفتح سبعةَ ملفّاتٍ ليعرف أيَّها. والخادمُ يردّ
 * `refusal.subjects` بالأسماء، فتُعرَض قائمةً ومعها وصلةٌ إلى سجلّ الأجور.
 *
 * ══════ 🔴 ولا نسبةَ التزامٍ في هذه الشاشة ولا رقمٌ يُوهم بها ══════
 * مقامُها عددُ المسجَّلين في التأمينات لدى المنشأة، ولا يملكه هذا النظام.
 *
 * ══════ الحالاتُ الأربع ══════
 * تحميلٌ (هيكل) · مرفوضٌ (بالأسماء وبطريق العلاج) · جاهزٌ · خطأٌ بزرِّ إعادة.
 */

interface Props {
  runId: number;
}

/** الرفضُ المؤجَّل وحدَه يقبل «مسوّدةً للمراجعة» — والآيبانُ الغائبُ مبرَمٌ لا يُتجاوَز. */
const DRAFTABLE_REFUSAL = 'audit_blocked';

/** كم سطراً يُعرَض في المعاينة قبل أن تُطوى البقيّة — الملفُّ كاملٌ في التنزيل دائماً. */
const PREVIEW_ROWS = 6;

export const BankInputFilePanel: React.FC<Props> = ({ runId }) => {
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const previewQuery = useQuery({
    queryKey: ['hr', 'payroll', 'bank-input-file', runId, draft],
    queryFn: () => hrPayrollService.getBankInputPreview(runId, draft),
    staleTime: 30_000,
  });

  if (previewQuery.isLoading) {
    return (
      <section className="hrl-block" aria-labelledby="bankfile-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="bankfile-h">
            <Landmark size={14} /> كشفُ الرواتب للبنك
          </h2>
        </header>
        <div className="hrl-block__b">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </section>
    );
  }

  if (previewQuery.isError || previewQuery.data === undefined) {
    return (
      <section className="hrl-block" aria-labelledby="bankfile-h">
        <header className="hrl-block__h">
          <h2 className="hrl-block__t" id="bankfile-h">
            <Landmark size={14} /> كشفُ الرواتب للبنك
          </h2>
        </header>
        <div className="hrl-block__b">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> {errorText(previewQuery.error, 'تعذّرت معاينةُ الكشف.')}
          </p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void previewQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </section>
    );
  }

  const file = previewQuery.data.data;
  const meta = previewQuery.data.meta;
  const window_ = file.statutory_window;
  const columnKeys = Object.keys(file.columns);
  const shown = file.rows.slice(0, PREVIEW_ROWS);

  const download = async () => {
    setBusy(true);
    setError(null);
    setNote(null);

    try {
      await hrPayrollService.downloadBankInputFile(runId, meta.file_name, draft);
      setNote(`نزل [${meta.file_name}] — وسُجّل في أحداث المسير: من أصدره ومتى وكم سطراً وبأيّ إجمالي.`);
    } catch (caught) {
      setError(errorText(caught, 'تعذّر تنزيلُ الكشف.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="hrl-block" aria-labelledby="bankfile-h">
      <header className="hrl-block__h">
        <h2 className="hrl-block__t" id="bankfile-h">
          <Landmark size={14} /> كشفُ الرواتب للبنك
        </h2>
        {file.refusal === null && (
          <span className="hrl-badge hrl-badge--flat">
            {file.row_count} سطراً · <span dir="ltr">{money(file.total) ?? '—'}</span> ر.س
          </span>
        )}
        {file.refusal === null && meta.can_export && (
          <button type="button" className="hrl-block__a" disabled={busy} onClick={() => void download()}>
            {busy ? <Loader2 size={12} /> : <Download size={12} />} نزّل الكشف
          </button>
        )}
      </header>

      {/* ══ 🔴 ما هذا الملفُّ وما ليس هو — نصُّ الخادم نفسُه المطبوعُ في رأس الملفّ ══ */}
      <div className="hrp-bank__notices">
        <p className="hrp-bank__name">
          <FileSpreadsheet size={13} aria-hidden="true" /> {file.document_name}
        </p>
        <ul className="hrp-bank__list">
          {file.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
        <p className="hrl-hint">
          والدورةُ كاملةً في{' '}
          <Link className="hrl-link" to="/hr/payroll/bank-cycle">
            دورةِ الرواتب والبنك
          </Link>
          : المكتبُ يُصدّر ← يرفع لبنكه فيحوّل ← يطلب من البنك ملفَّ الأجور الموقَّع ← يرفعه بنفسه
          خلال ثلاثين يوماً.
        </p>
      </div>

      {/* ══ ⏳ عدّادُ المهلة — بنبرةٍ تتدرّج، وبلا نسبةِ التزام ══ */}
      {window_.deadline_on !== null && (
        <div className="hrl-block__b">
          <div className="hrl-head__badges">
            <span className={WINDOW_TONE_CLASS[window_.tone]}>
              {windowCountdown(window_)}
              <span className="hrl-fact__n">{fmtDateHuman(window_.deadline_on)}</span>
            </span>
            {window_.due_on !== null && (
              <span className="hrl-fact">
                الاستحقاق
                <span className="hrl-fact__n">{fmtDateHuman(window_.due_on)}</span>
              </span>
            )}
          </div>
          {window_.basis !== null && <p className="hrl-hint">{window_.basis}</p>}
        </div>
      )}

      {/* ══ الرفضُ بأسماء أصحابه — قبل النقر لا بعده ══ */}
      {file.refusal !== null ? (
        <div className="hrl-block__b">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> {file.refusal.message}
          </p>

          {file.refusal.subjects.length > 0 && (
            <ul className="hrp-bank__list">
              {file.refusal.subjects.map((subject) => (
                <li key={subject}>{subject}</li>
              ))}
            </ul>
          )}

          {file.refusal.code === 'missing_iban' && (
            <p className="hrl-hint">
              أضِف حساباتِهم في{' '}
              <Link className="hrl-link" to="/hr/payroll/wages">
                سجلّ الأجور
              </Link>
              . وسطرٌ بلا حسابٍ يُحوَّل إليه ليس أمرَ دفعٍ أصلاً — فلا يُصدَّر ولو موسوماً مسوّدة.
            </p>
          )}

          {file.refusal.code === DRAFTABLE_REFUSAL && (
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => setDraft(true)}>
              صدّرها «مسوّدةً للمراجعة» — لا تُسلَّم للبنك بهذه الحال
            </button>
          )}
        </div>
      ) : (
        <>
          {file.draft && (
            <div className="hrl-flag hrl-flag--block" role="status">
              <p className="hrl-flag__t">
                <AlertTriangle size={13} /> مسوّدةٌ للمراجعة — لا تُسلَّم للبنك بهذه الحال
              </p>
              {file.draft_reasons.map((reason) => (
                <p className="hrl-flag__hint" key={reason}>
                  {reason}
                </p>
              ))}
            </div>
          )}

          <div className="hrl-block__b">
            <dl className="hrl-kv">
              <dt>الرقمُ الموحّد للمنشأة</dt>
              <dd className={file.establishment.mol_establishment_id === null ? 'is-empty' : undefined}>
                {file.establishment.mol_establishment_id ?? 'غيرُ مُدخَل'}
              </dd>
              <dt>حسابُ المكتب المخصومُ منه</dt>
              <dd className={file.establishment.bank_account === null ? 'is-empty' : undefined}>
                <span dir="ltr">{file.establishment.bank_account ?? '—'}</span>
              </dd>
              <dt>رمزُ البنك المنفِّذ</dt>
              <dd className={file.establishment.dest_id === null ? 'is-empty' : undefined}>
                {file.establishment.dest_id ?? 'غيرُ مُدخَل'}
              </dd>
            </dl>
          </div>

          <div className="hrl-block__b hrl-block__b--flush">
            <div className="hrp-bank__scroll">
              <table className="hrl-table hrp-roster">
                <thead>
                  <tr>
                    {columnKeys.map((key) => (
                      <th scope="col" key={key}>
                        {file.columns[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.seq}>
                      {columnKeys.map((key) => (
                        <td key={key} dir={file.money_columns.includes(key) || key === 'iban' ? 'ltr' : undefined}>
                          {file.money_columns.includes(key) ? (money(row[key]) ?? row[key]) : row[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hrl-block__b">
            {/* 🔴 الإجماليُّ **مطويٌّ في الخادم بـbcmath فوق صوافي السطور** — لا يُجمَع هنا:
                جمعُ عائمٍ في المتصفّح يُنتج ١٠٩٥٥٠٫٢٩٩٩٩ فيخالف الملفَّ في آخر هللة. */}
            <div className="hrl-formula">
              <span className="hrl-formula__term hrl-formula__term--static">
                <span className="hrl-formula__k">سطورُ الكشف</span>
                <span className="hrl-formula__v" dir="ltr">
                  {file.row_count}
                </span>
              </span>
              <span className="hrl-formula__k">⟵</span>
              <span className="hrl-formula__term hrl-formula__term--sum">
                <span className="hrl-formula__k">إجماليُّ المُحوَّل</span>
                <span className="hrl-formula__v" dir="ltr">
                  {money(file.total)}
                </span>
              </span>
            </div>

            {file.rows.length > shown.length && (
              <p className="hrl-hint">
                معروضٌ {shown.length} من {file.rows.length} — والملفُّ المنزَّل يحمل السطورَ كاملةً.
              </p>
            )}
          </div>

          {/* 🚩 من خرج من الكشف — بالاسم والسبب، لا عدداً مجرَّداً */}
          {file.excluded.length > 0 && (
            <div className="hrl-block__b">
              <p className="hrl-flag__t">
                <Info size={13} /> خارجَ هذا الكشف: {file.excluded.length}
              </p>
              <ul className="hrp-bank__list">
                {file.excluded.map((person) => (
                  <li key={person.name}>
                    <strong>{person.name}</strong> — {person.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ما لا يستطيعه هذا النظامُ يُقال ولا يُسكَت عنه */}
          <div className="hrl-block__b">
            <ul className="hrp-bank__list">
              {file.disclaimers.map((item) => (
                <li key={item.code}>{item.text}</li>
              ))}
            </ul>
          </div>

          {! meta.can_export && (
            <div className="hrl-block__b">
              <p className="hrl-hint">
                تنزيلُ الكشف يحتاج صلاحيةَ «تصدير كشف الرواتب المسلَّم للبنك» — والمعاينةُ أعلاه
                متاحةٌ لك.
              </p>
            </div>
          )}
        </>
      )}

      {error !== null && (
        <div className="hrl-block__b">
          <p className="hrl-flag__t">
            <AlertTriangle size={13} /> {error}
          </p>
        </div>
      )}

      {note !== null && (
        <div className="hrl-block__b">
          <p className="hrl-hint">{note}</p>
        </div>
      )}
    </section>
  );
};

export default BankInputFilePanel;
