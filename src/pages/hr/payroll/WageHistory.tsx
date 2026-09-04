import React, { useState } from 'react';
import { History, Loader2, Undo2 } from 'lucide-react';

import { EMPTY_MARK, fmtSpan, money } from './payrollFormat';
import type { WageRecord } from '../../../types/hrPayroll';

/**
 * **سجلُّ نسخ الأجر** — الخطُّ الزمنيُّ الذي لم يكن له مسارُ عرضٍ في المنصّة إطلاقاً.
 *
 * `PUT /compensation` كان يكتب تاريخاً بلا نقطةِ قراءةٍ له: تُغلَق نسخةٌ وتُدرَج أخرى ولا
 * شاشةَ تُظهر ما جرى. فكان الجدارُ يعرض «الحاليَّ» وحدَه، ومن سأل «لماذا تغيّر راتبُه في
 * مارس؟» لم يجد جواباً في المنصّة.
 *
 * ══════ 🔴 الملغى يبقى ظاهراً ══════
 * نسخةٌ أُلغيت قد يكون بُني عليها **خطابُ تعريفِ راتبٍ صادرٌ لسفارةٍ أو بنك**. حذفُها من
 * الشاشة يجعل مستنداً رسمياً بلا أصلٍ في السجلّ. تبقى موسومةً: خطٌّ فوق المبلغ وشارةٌ نصّية
 * — لا لوناً وحدَه.
 *
 * ══════ الإلغاءُ فعلٌ بسبب ══════
 * لا زرَّ حذفٍ في هذه الشاشة ولا في الخادم. والإلغاءُ يطلب سبباً ويُلحقه بسبب النسخة، ثمّ
 * **يُعيد فتحَ ذيل السابقة** — وإلا صار المنسوبُ بلا أجرٍ سارٍ وله أجر.
 */

interface Props {
  records: WageRecord[];
  canViewAmounts: boolean;
  canManage: boolean;
  voidingId: number | null;
  onVoid: (recordId: number, reason: string) => void;
}

export const WageHistory: React.FC<Props> = ({ records, canViewAmounts, canManage, voidingId, onVoid }) => {
  const [target, setTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const ask = (recordId: number) => {
    setTarget(recordId);
    setReason('');
  };

  const confirm = () => {
    if (target === null || reason.trim().length < 5) return;
    onVoid(target, reason.trim());
    setTarget(null);
    setReason('');
  };

  return (
    <section className="hrl-block hrl-block--scroll">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <History size={14} /> سجل نسخ الأجر
        </h2>
        <span className="hrl-badge hrl-badge--flat">{records.length}</span>
      </div>

      {records.length === 0 ? (
        <div className="hrl-state hrl-state--empty">
          <History size={20} />
          <p className="hrl-state__t">لا يوجد أجر مسجل بعد</p>
          <p className="hrl-state__d">
            تظهر هنا كل نسخة أجر بتاريخ سريانها وسببها ومن أدخلها، من أول تسجيل فما بعده.
          </p>
        </div>
      ) : (
        <div className="hrl-block__b hrl-block__b--flush">
          <table className="hrl-ledger">
            <caption className="hrl-sr">نسخ الأجر مرتبة من الأحدث سرياناً إلى الأقدم</caption>
            <thead>
              <tr>
                <th scope="col">السريان</th>
                <th scope="col">الأجر الشهري</th>
                <th scope="col">السبب</th>
                <th scope="col">من أدخلها</th>
                <th scope="col">
                  <span className="hrl-sr">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const voided = Boolean(record.voided_at);
                const live = !voided && record.effective_to === null;
                // وسمُ الحالة صنفٌ `hrp-*` مستقلٌّ **بجانب** صنف الخلية — لا إعادةَ تعريفٍ
                // لصنفٍ يملكه ملفٌّ آخر، فلا يتعلّق العرضُ بترتيب حقن الأنماط.
                const numClass = `hrl-ledger__num${voided ? ' hrp-void__num' : live ? ' hrp-live__num' : ''}`;

                return (
                  <React.Fragment key={record.id}>
                    <tr className={voided ? 'hrp-void' : undefined}>
                      <td>{fmtSpan(record.effective_from, record.effective_to)}</td>
                      <td className={numClass} dir="ltr">
                        {canViewAmounts ? (money(record.total_salary) ?? EMPTY_MARK) : EMPTY_MARK}
                      </td>
                      <td className="hrl-ledger__desc">{record.change_reason ?? EMPTY_MARK}</td>
                      <td className="hrl-ledger__who">{record.recorded_by_name ?? EMPTY_MARK}</td>
                      <td className="hrl-ledger__who">
                        {voided ? (
                          <span className="hrp-void__tag">ملغاة</span>
                        ) : canManage ? (
                          <button
                            type="button"
                            className="hrl-link hrl-link--danger"
                            onClick={() => ask(record.id)}
                            disabled={voidingId === record.id}
                          >
                            {voidingId === record.id ? <Loader2 size={12} /> : <Undo2 size={12} />} إلغاء
                          </button>
                        ) : null}
                      </td>
                    </tr>

                    {target === record.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="hr-field">
                            <label htmlFor={`void-reason-${record.id}`}>سبب الإلغاء</label>
                            <input
                              id={`void-reason-${record.id}`}
                              type="text"
                              value={reason}
                              onChange={(event) => setReason(event.target.value)}
                              placeholder="تم إدخال الراتب لموظف آخر · رقم خاطئ…"
                              maxLength={500}
                            />
                            <p className="hrl-hint">
                              الإلغاء لا يحذف السجل: يبقى ظاهراً مع بيان إلغائه، ويعود الأجر
                              السابق إلى السريان.
                            </p>
                          </div>
                          <div className="hrl-block__a">
                            <button
                              type="button"
                              className="hr-btn hr-btn--sm"
                              onClick={confirm}
                              disabled={reason.trim().length < 5}
                            >
                              أكد الإلغاء
                            </button>
                            <button type="button" className="hr-btn hr-btn--sm" onClick={() => setTarget(null)}>
                              تراجع
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canViewAmounts && records.length > 0 && (
        <p className="hrl-note">
          التواريخ والأسباب ومن أدخلها مرئية لك، والمبالغ محجوبة بصلاحية مستقلة.
        </p>
      )}
    </section>
  );
};

export default WageHistory;
