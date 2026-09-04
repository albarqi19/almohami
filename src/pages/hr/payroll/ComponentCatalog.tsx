import React from 'react';
import { Ban, FileSignature, Paperclip } from 'lucide-react';

import {
  BEARER_LABELS,
  COMPONENT_KIND_LABELS,
  COUNTERPARTY_LABELS,
  EMPTY_MARK,
  RUN_TYPE_LABELS,
} from './payrollFormat';
import type { PayrollComponent } from '../../../types/hrPayroll';

/**
 * كتالوجُ بنود القسيمة — «إلى أين يذهب هذا المال، وبأيّ شرط؟».
 *
 * ══════ ثلاثةُ أعمدةٍ تُسقط ثلاثةَ أعطالٍ معروفة ══════
 *   · **الحامل**: حصّةُ صاحب العمل تُعرَض «تكلفةَ مكتب» لا استقطاعاً — ونموذجُ الاتجاهين
 *     وحدَه هو الذي يخصمها من الموظف.
 *   · **الطرفُ المقابل**: غرامةُ م.٧٣ تذهب إلى **صندوق العمال** لا إلى المكتب؛ وثلاثةُ
 *     خصومٍ متساويةِ الاتجاه تذهب إلى ثلاث جهات.
 *   · **القرار**: كلُّ استقطاعٍ يلزمه فعلُ إنسانٍ مسمّى — لا خصمَ يولّده محرّك.
 *
 * ══════ وما لا يجوز معروضٌ أيضاً ══════
 * رسومُ الإقامة والاستقدام تُعرَض **معطَّلةً موسومةً بالبطلان**: غيابُها من الكتالوج يجعل
 * المكتبَ يخترعها بنداً يدوياً، ووجودُها بهذا الوسم يمنعها ويشرح لماذا.
 */

interface Props {
  components: PayrollComponent[];
}

export const ComponentCatalog: React.FC<Props> = ({ components }) => {
  if (components.length === 0) {
    return <p className="hrl-hint">لم يتم إعداد كتالوج البنود بعد.</p>;
  }

  return (
    <table className="hrl-table">
      <caption className="hrl-sr">كتالوج بنود قسيمة الراتب</caption>
      <thead>
        <tr>
          <th scope="col">البند</th>
          <th scope="col">النوع</th>
          <th scope="col">يتحمله</th>
          <th scope="col">يذهب إلى</th>
          <th scope="col">الشروط</th>
          <th scope="col">يظهر في</th>
        </tr>
      </thead>
      <tbody>
        {components.map((component) => {
          const forbidden = component.kind === 'informational';

          return (
            <tr key={component.code} className={component.is_active ? undefined : 'hrl-row--static'}>
              <th scope="row">
                <span className="hrl-row__name">
                  {forbidden && <Ban size={12} />} {component.name_ar}
                </span>
                <span className="hrl-row__meta" dir="ltr">
                  {component.code}
                </span>
              </th>
              <td>{COMPONENT_KIND_LABELS[component.kind] ?? component.kind}</td>
              <td>{BEARER_LABELS[component.bearer] ?? component.bearer}</td>
              <td>{COUNTERPARTY_LABELS[component.counterparty] ?? component.counterparty}</td>
              <td>
                <span className="hrl-chips">
                  {component.requires_decision && (
                    <span className="hrl-chip">
                      <FileSignature size={11} /> قرار مسجل
                    </span>
                  )}
                  {component.requires_document && (
                    <span className="hrl-chip">
                      <Paperclip size={11} /> مستند
                    </span>
                  )}
                  {component.requires_reason && <span className="hrl-chip">سبب</span>}
                  {!component.requires_decision && !component.requires_document && !component.requires_reason && (
                    <span className="hrl-row__meta">{EMPTY_MARK}</span>
                  )}
                </span>
              </td>
              <td>
                {component.allowed_run_types.length === 0 ? (
                  <span className="hrl-chip hrl-chip--danger">لا يصرف</span>
                ) : (
                  <span className="hrl-row__meta">
                    {component.allowed_run_types.map((type) => RUN_TYPE_LABELS[type] ?? type).join(' · ')}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ComponentCatalog;
