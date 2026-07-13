// === datalist مشترك للمدن السعودية ===
// يُركَّب مرة واحدة داخل أي نموذج، ويشير إليه أي input عبر list={SAUDI_CITIES_DATALIST_ID}.
// يمنح حقل المدينة قائمة اختيار مع إبقاء إمكانية الكتابة اليدوية (combobox).
import React from 'react';
import { SAUDI_CITIES, SAUDI_CITIES_DATALIST_ID } from '../../constants/saudiCities';

const SaudiCitiesDatalist: React.FC = () => (
  <datalist id={SAUDI_CITIES_DATALIST_ID}>
    {SAUDI_CITIES.map((city) => (
      <option key={city} value={city} />
    ))}
  </datalist>
);

export default SaudiCitiesDatalist;
