import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ListChecks, RefreshCw } from 'lucide-react';

import EmptyLine from '../dossier/EmptyLine';
import { SEC } from '../dossier/dossierSections';
import { errorText, fmtCount } from '../leave/leaveFormat';
import type { ActionRow } from './boardFacts';

interface Props {
  rows: ActionRow[];
  /** فشلُ استعلام المئة — يُعرض **داخل هذا البلوك وحدَه** ولا يُسقط الشريطَ ولا الرصيف. */
  error: unknown;
  isError: boolean;
  onRetry: () => void;
  /** عددُ منسوبي المكتب الحقيقيّ — `null` حين لم يصل. */
  total: number | null;
  /** عددُ الصفوف التي فُحصت فعلاً (سقفُ الخادم ١٠٠). */
  scanned: number;
}

/** اقتطاعٌ ثمّ «اعرض الكلّ (N)» — عرفُ `ContractsTab`/`DocumentsTab` نفسُه. */
const VISIBLE_LIMIT = 12;

const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

/**
 * **«منسوبون بحاجةِ فعل» — جوهرُ اللوحة: مَن أفتح ملفَّه الآن، ولماذا.**
 *
 * هنا تنزل «القيادة» من مستوى الرقم إلى مستوى الصفّ: لا بطاقةَ إحصاءٍ صمّاء تنتظر نقرةً
 * لا تقود، بل **صفٌّ باسمٍ يفتح ملفّاً عند المرساة الصحيحة**.
 *
 * · **العمودُ الأوّلُ عددُ الأيام**، والقائمةُ مرتَّبةٌ تصاعدياً — وهذا هو خطُّ الزمن
 *   مقروءاً **عمودياً**. وهو بديلٌ مقصودٌ عن خطٍّ أفقيّ: الخطُّ الأفقيُّ الحقيقيُّ يحتاج
 *   تموضعاً مطلقاً، و`left/right` محظوران و`translate` **فيزيائيٌّ ينقلب في RTL**
 *   (§٤ من ترويسة `hr-leave.css` تمنعه نصّاً).
 * · المرساةُ من `dossier/dossierSections` (`SEC`) **لا سلسلةً مكتوبةً يدوياً**؛
 *   و`HrDossierWall` يقرأ `location.hash` عند التركيب فيهبط القارئُ في «الهوية
 *   والتوثيق» حيث يعيش زرُّ [تحقّق من الهيئة]. وصفُّ «تاريخُ المباشرة» يفتح الملفَّ بلا
 *   مرساة (شريحةُ «ما يستحقّ الفعل» هناك تفتح `EditEmployeeModal`).
 * · **الشدّةُ في الترويسة**: `hrl-rule--warn` يصبغ العدَّ برتقالياً حين في القائمة ما
 *   مضى موعدُه — فيجد الرقمُ الأهمُّ (حجمُ قائمة العمل) موضعَه الأكثفَ والأصدق، بدل
 *   `hrl-num` الذي هو توقيعُ **رصيدِ موظفٍ واحد** لا عدٍّ على مستوى المكتب.
 */
export const BoardActionList: React.FC<Props> = ({ rows, error, isError, onRetry, total, scanned }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const hasDanger = rows.some((row) => row.severe);
  const shown = expanded ? rows : rows.slice(0, VISIBLE_LIMIT);

  const open = (row: ActionRow) => {
    navigate(row.anchored ? `/hr/employees/${row.empId}#${SEC.identity}` : `/hr/employees/${row.empId}`);
  };

  return (
    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <ListChecks size={14} /> منسوبون بحاجةِ فعل
        </h2>

        {!isError && (
          <div className={hasDanger ? 'hrl-block__a hrl-rule--warn' : 'hrl-block__a'}>
            <span className="hrl-rule__n">{fmtCount(rows.length)}</span>
          </div>
        )}
      </div>

      {isError ? (
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={20} />
          <p className="hrl-state__t">تعذّر جلب قائمة المنسوبين</p>
          <p className="hrl-state__d">{errorText(error, CONNECTION_FALLBACK)}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={onRetry}>
            <RefreshCw size={13} /> إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* ⏳ سقفُ المئة **يُعلَن للمستخدم ولا يُخفى**: `index()` مسقوفٌ بـ`min(100, …)`
              ومرتَّبٌ `latest('id')` في الخادم، فالفحصُ الشاملُ يحتاج ترتيباً وترشيحاً هناك. */}
          {total !== null && total > scanned && (
            <p className="hrl-note">
              {`المكتب يضمّ ${fmtCount(total)} منسوباً، وهذه القائمة تفحص أحدثَ ${fmtCount(scanned)}. الفحصُ الشاملُ يحتاج ترتيباً وترشيحاً بالخادم.`}
            </p>
          )}

          <div className="hrl-block__b hrl-block__b--flush">
            <table className="hrl-table">
              <caption className="hrl-sr">منسوبون بحاجة فعل</caption>
              <thead>
                <tr>
                  <th scope="col">المدّة</th>
                  <th scope="col">المنسوب</th>
                  <th scope="col">ما ينتظر</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.empId}>
                    <td className="hrl-cellnum">
                      {row.negative ? <span className="hrl-mini is-neg">{row.duration}</span> : row.duration}
                    </td>

                    <td>
                      <button type="button" className="hrl-cellbtn" onClick={() => open(row)}>
                        {row.name}
                      </button>
                      {row.meta !== '' && <span className="hrl-cellsub">{row.meta}</span>}
                    </td>

                    <td>{row.extra > 0 ? `${row.reason} +${fmtCount(row.extra)}` : row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!expanded && rows.length > VISIBLE_LIMIT && (
              <EmptyLine
                text={`تُعرض ${fmtCount(VISIBLE_LIMIT)} من ${fmtCount(rows.length)}`}
                action={(
                  <button type="button" className="hr-btn hr-btn--sm" onClick={() => setExpanded(true)}>
                    اعرض الكلّ ({fmtCount(rows.length)})
                  </button>
                )}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default BoardActionList;
