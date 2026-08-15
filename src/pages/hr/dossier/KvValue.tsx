import React from 'react';

import { EMPTY_MARK } from '../leave/leaveFormat';

interface Props {
  value?: string | number | null;
  /** للحقول اللاتينية (جوال · بريد · رقم هوية). */
  dir?: 'ltr';
}

/**
 * **قيمةُ `dl.hrl-kv`** — بدائيّةٌ واحدةٌ لكلّ حقلٍ في الجدار.
 *
 * الغيابُ يُكتب «—» بـ`dd.is-empty` (وزن 400 ولونٌ خافت) فيُقرأ **غياباً** لا بيانات،
 * ولا يُخلط برقمٍ حقيقيّ. وهي تُنهي دالّةَ `fmt()` القديمة التي كانت تُرجع شرطةً عاريةً
 * بوزن القيمة نفسِه في اثنتي عشرة `<dd>` مكرَّرةٍ بين الشجرتين.
 */
export const KvValue: React.FC<Props> = ({ value, dir }) => {
  const empty = value === null || value === undefined || value === '';

  return (
    <dd className={empty ? 'is-empty' : undefined} dir={dir}>
      {empty ? EMPTY_MARK : value}
    </dd>
  );
};

export default KvValue;
