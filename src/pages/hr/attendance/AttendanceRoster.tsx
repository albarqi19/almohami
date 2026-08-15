import React from 'react';
import { Users } from 'lucide-react';

import { fmtCount } from './attendanceFormat';

/**
 * العمودُ الأيمن — المنسوبون في نطاق العرض الحاليّ.
 *
 * 🔴 **الترتيبُ أبجديّ**: لا ترتيبَ بالتأخير، ولا لوحةَ صدارة، ولا شارةَ انضباط. والحاضرون
 * لا يظهرون في طابور القرارات — رقمُهم في الترويسة وكفى.
 *
 * والشرائحُ الثلاثُ تبدّل **ما يعرضه عمودُ العمل** لا ترتيبَ القائمة: «يحتاج قراراً» هي
 * الافتراضية لأنها الشيءُ الوحيد الذي يطلب فعلاً من الإنسان.
 */

export type AttendanceView = 'queue' | 'today' | 'claims';

export interface RosterRow {
  id: number;
  name: string | null;
  /** سطرٌ ثانويّ: المسمّى أو حالةُ اليوم — يُحسب في الصفحة لا هنا. */
  meta: string;
  /** رقمٌ في نهاية الصفّ (أيامٌ منتظِرة · ادّعاءاتٌ معلّقة) — أو `null` فلا يُرسَم. */
  end: number | null;
}

interface Props {
  view: AttendanceView;
  onView: (view: AttendanceView) => void;
  counts: Record<AttendanceView, number | null>;
  rows: RosterRow[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading: boolean;
}

const CHIPS: Array<{ key: AttendanceView; label: string }> = [
  { key: 'queue', label: 'يحتاج قراراً' },
  { key: 'today', label: 'اليوم' },
  { key: 'claims', label: 'الادّعاءات' },
];

/** نصُّ الفراغ لكلّ نطاق — الفراغُ يُعلَن بكلمةٍ تخصّه لا بـ«لا توجد بيانات». */
const EMPTY_TEXT: Record<AttendanceView, string> = {
  queue: 'لا أحدَ ينتظر قراراً',
  today: 'لا صفَّ محتسَبٌ في هذا اليوم',
  claims: 'لا ادّعاءاتٍ في هذا النطاق',
};

export const AttendanceRoster: React.FC<Props> = ({
  view,
  onView,
  counts,
  rows,
  selectedId,
  onSelect,
  loading,
}) => (
  <>
    <div className="hra-sech">
      <h2 className="hra-sech__t">
        <Users size={14} aria-hidden="true" /> المنسوبون
      </h2>
      {selectedId !== null && (
        <button type="button" className="ssp2-btn" onClick={() => onSelect(null)}>
          الكلّ
        </button>
      )}
    </div>

    <div className="hra-chips" role="group" aria-label="نطاقُ العرض">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="hra-chip"
          aria-pressed={view === chip.key}
          onClick={() => onView(chip.key)}
        >
          {chip.label}
          {counts[chip.key] !== null && (
            <span className="hra-chip__n" dir="ltr">{fmtCount(counts[chip.key])}</span>
          )}
        </button>
      ))}
    </div>

    <div className="hra-scroll">
      {loading ? (
        <div className="hra-state hra-state--loading" aria-busy="true" aria-label="جارٍ تحميل المنسوبين">
          {Array.from({ length: 5 }, (_, i) => <span className="hra-skel" key={i} />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="hra-line">{EMPTY_TEXT[view]}</p>
      ) : (
        <div className="hra-list">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`hra-row${selectedId === row.id ? ' is-on' : ''}`}
              aria-pressed={selectedId === row.id}
              onClick={() => onSelect(selectedId === row.id ? null : row.id)}
            >
              <span className="hra-row__main">
                <span className="hra-row__n">{row.name ?? 'منسوبٌ بلا اسم'}</span>
                <span className="hra-row__m">{row.meta}</span>
              </span>
              {row.end !== null && (
                <span className="hra-row__end" dir="ltr">{fmtCount(row.end)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  </>
);

export default AttendanceRoster;
