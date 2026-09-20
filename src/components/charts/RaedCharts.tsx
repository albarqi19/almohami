import React from 'react';

/**
 * «رسوم الرائد» — مجموعة رسوم خفيفة بهوية المكتب (SVG/CSS خالص، بلا مكتبة خارجية).
 *
 * القواعد التي بُنيت عليها (وهي سبب عدم استعمال مكتبة عامة):
 * - الشكل يتبع وظيفة الرقم: رقم واحد = بطاقة رقم لا عمود وحيد، نسبة = مقياس، جزء من كل = شريط مجزّأ.
 * - العلامات رفيعة: عمود ≤ 24px برأس مدوّر 4px وقاعدة مستوية، خط 2px، شبكة خطوط شعرية متصلة (لا متقطعة).
 * - الفاصل بين الأجزاء فراغ 2px بلون السطح، لا حدّ مرسوم.
 * - النص بلون الحبر دائماً ولا يلبس لون السلسلة؛ الهوية تحملها علامة ملوّنة بجواره.
 * - ألوان الحالة (جيد/حرج) محجوزة للحالة ومعها أيقونة ونص، والأخضر لا يجاور الأحمر (يلتبسان على ضعاف تمييز الألوان).
 * - محور واحد دائماً: مقياسان مختلفان = رسمان صغيران متجاوران.
 * - كل رسم له وصف نصي/جدول بديل لقارئات الشاشة، والتلميح يظهر بالتركيز كما بالمرور.
 * - الزمن يجري من اليمين إلى اليسار (الأقدم يميناً) اتساقاً مع اتجاه الواجهة.
 *
 * الألوان في styles/raed-charts.css — اجتازت فحص التباين وتمييز الألوان في الفاتح والداكن.
 */

export type ChartTone = 'series1' | 'series2' | 'good' | 'critical' | 'warning' | 'neutral';

const LATIN = 'en-US';

export const formatCount = (n: number | null | undefined): string => {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString(LATIN) : '—';
};

/** 1,284 ⟵ 12.9K ⟵ 4.2M — للأرقام الكبيرة في البطاقات */
export const formatCompact = (n: number | null | undefined): string => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  if (Math.abs(num) < 10_000) return num.toLocaleString(LATIN);
  return new Intl.NumberFormat(LATIN, { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const percentOf = (value: number, total: number): number => (total > 0 ? Math.round((value / total) * 100) : 0);

/** سقف محور «نظيف»: 4 / 5 / 10 / 20 / 50 … */
const niceCeil = (max: number): number => {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
};

// ─── خط الاتجاه ───────────────────────────────────────────────────────────

export const Sparkline: React.FC<{ values: number[]; ariaLabel: string }> = ({ values, ariaLabel }) => {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const last = values.length - 1;
  // الأقدم يميناً والأحدث يساراً
  const x = (i: number) => 100 - (i / last) * 100;
  const y = (v: number) => 28 - (v / max) * 22;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L0,32 L100,32 Z`;

  return (
    <div className="rc-spark" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
        <path className="rc-spark__area" d={area} />
        <path className="rc-spark__line" d={line} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* نقطة النهاية عنصر HTML لا SVG — التمدد غير المتناسب يشوّه الدوائر */}
      <span className="rc-spark__dot" style={{ top: `${(y(values[last]) / 32) * 100}%` }} aria-hidden="true" />
    </div>
  );
};

// ─── بطاقة رقم ────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string;
  /** سطر ثانوي هادئ تحت الرقم */
  hint?: string;
  /** حالة تُقرأ بالأيقونة والنص لا باللون وحده */
  status?: { tone: 'good' | 'critical' | 'warning'; text: string; icon: React.ReactNode };
  icon?: React.ReactNode;
  trend?: { values: number[]; ariaLabel: string };
  onClick?: () => void;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, hint, status, icon, trend, onClick }) => {
  const body = (
    <>
      <div className="rc-tile__top">
        <span className="rc-tile__label">{label}</span>
        {icon && <span className="rc-tile__icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="rc-tile__value">{value}</div>
      <div className="rc-tile__foot">
        {status ? (
          <span className="rc-status" data-tone={status.tone}>
            {status.icon}
            {status.text}
          </span>
        ) : (
          hint && <span className="rc-tile__hint">{hint}</span>
        )}
      </div>
      {trend && <Sparkline values={trend.values} ariaLabel={trend.ariaLabel} />}
    </>
  );

  return onClick ? (
    <button type="button" className="rc-tile rc-tile--action" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="rc-tile">{body}</div>
  );
};

// ─── مقياس نسبة ───────────────────────────────────────────────────────────

export const Meter: React.FC<{ value: number; tone?: ChartTone; ariaLabel: string }> = ({
  value,
  tone = 'series1',
  ariaLabel,
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="rc-meter"
      data-tone={tone}
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <span style={{ inlineSize: `${clamped}%` }} />
    </div>
  );
};

// ─── شريط مجزّأ (جزء من كل) ────────────────────────────────────────────────

export interface Segment {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
  icon?: React.ReactNode;
  /** نص القيمة المعروض بدل الرقم الخام (مثل «3 س 20 د») — القيمة الرقمية تبقى لحساب العرض */
  valueLabel?: string;
}

export const SegmentBar: React.FC<{ segments: Segment[]; ariaLabel: string; emptyText?: string }> = ({
  segments,
  ariaLabel,
  emptyText = 'لا بيانات بعد',
}) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rc-seg">
      {total === 0 ? (
        <div className="rc-seg__empty">{emptyText}</div>
      ) : (
        <div className="rc-seg__bar" role="img" aria-label={ariaLabel}>
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span key={s.key} className="rc-seg__part" data-tone={s.tone} style={{ flexGrow: s.value }} tabIndex={0}>
                <span className="rc-tip" role="tooltip">
                  {s.label} · {s.valueLabel ?? formatCount(s.value)} ({percentOf(s.value, total)}%)
                </span>
              </span>
            ))}
        </div>
      )}

      {/* المفتاح حاضر دائماً ويحمل القيم — الهوية لا تعتمد على اللون ولا على التلميح وحده */}
      <ul className="rc-legend">
        {segments.map((s) => (
          <li key={s.key} className="rc-legend__item">
            <i className="rc-swatch" data-tone={s.tone} aria-hidden="true" />
            {s.icon && <span className="rc-legend__icon" aria-hidden="true">{s.icon}</span>}
            <span className="rc-legend__label">{s.label}</span>
            <b className="rc-legend__value">{s.valueLabel ?? formatCount(s.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── قائمة أشرطة أفقية (مقارنة مقادير، سلسلة واحدة = لون واحد) ──────────────

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  icon?: React.ReactNode;
  hint?: string;
  onClick?: () => void;
}

export const BarList: React.FC<{ items: BarListItem[] }> = ({ items }) => {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="rc-bars">
      {items.map((item) => {
        const row = (
          <>
            <span className="rc-bars__label">
              {item.icon && <span className="rc-bars__icon" aria-hidden="true">{item.icon}</span>}
              {item.label}
            </span>
            <span className="rc-bars__track">
              <span className="rc-bars__fill" style={{ inlineSize: `${(item.value / max) * 100}%` }} />
            </span>
            <b className="rc-bars__value">{formatCount(item.value)}</b>
          </>
        );
        return (
          <li key={item.key}>
            {item.onClick ? (
              <button type="button" className="rc-bars__row rc-bars__row--action" onClick={item.onClick} title={item.hint}>
                {row}
              </button>
            ) : (
              <div className="rc-bars__row">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

// ─── أعمدة زمنية (سلسلة واحدة — العنوان يسمّيها فلا مفتاح) ─────────────────

export interface ColumnDatum {
  label: string;
  value: number;
}

export const ColumnChart: React.FC<{
  title: string;
  unit: string;
  data: ColumnDatum[];
  tone?: 'series1' | 'series2';
  /** أخفِ رأس الرسم حين تسمّيه اللوحة الحاوية — العنوان يبقى وصفاً لقارئات الشاشة */
  showHead?: boolean;
}> = ({ title, unit, data, tone = 'series1', showHead = true }) => {
  const max = Math.max(...data.map((d) => d.value), 0);
  const ceil = niceCeil(max);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const peakIndex = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const lastIndex = data.length - 1;

  return (
    <figure className="rc-cols" data-tone={tone}>
      <figcaption className={showHead ? 'rc-cols__head' : 'rc-sr-only'}>
        <span className="rc-cols__title">{title}</span>
        <span className="rc-cols__total">
          <b>{formatCount(total)}</b> في {data.length} أشهر
        </span>
      </figcaption>

      <div className="rc-cols__plot" aria-hidden="true">
        <div className="rc-cols__grid">
          {[ceil, ceil / 2, 0].map((tick) => (
            <span key={tick} className="rc-cols__tick">
              <i>{formatCount(tick)}</i>
            </span>
          ))}
        </div>
        <div className="rc-cols__bars">
          {data.map((d, i) => (
            <div key={`${d.label}-${i}`} className="rc-col" tabIndex={0}>
              <span className="rc-tip" role="tooltip">
                {d.label} · {formatCount(d.value)} {unit}
              </span>
              <span className="rc-col__slot">
                {/* تسمية انتقائية: الذروة والشهر الأخير فقط — رقم على كل عمود ضجيج */}
                {(i === peakIndex || i === lastIndex) && d.value > 0 && (
                  <span className="rc-col__cap" style={{ insetBlockEnd: `${(d.value / ceil) * 100}%` }}>
                    {formatCount(d.value)}
                  </span>
                )}
                <span className="rc-col__bar" style={{ blockSize: `${(d.value / ceil) * 100}%` }} />
              </span>
              <span className="rc-col__x">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* البديل الجدولي لقارئات الشاشة — داخل div: الجدول نفسه يتجاهل height/overflow فيبقى بحجمه الكامل
          ويمدّ منطقة التمرير وإن كان مخفياً بصرياً */}
      <div className="rc-sr-only">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>الشهر</th>
            <th>{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
};
