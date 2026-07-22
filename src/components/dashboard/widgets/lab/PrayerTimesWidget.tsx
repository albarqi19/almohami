import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Sunrise, Sun, CloudSun, Sunset } from 'lucide-react';

/**
 * PrayerTimesWidget — مواقيت الصلاة الخمس + إبراز الصلاة القادمة وعدّاد تنازلي حيّ.
 *
 * ⚠️ تجريبي: المواقيت هنا ثابتة (ديمو للرياض) لعرض الفكرة فقط.
 * تُربط لاحقاً بحساب فلكي حقيقي (خط عرض/طول المكتب) أو بمزوّد مثل Aladhan API
 * (GET aladhan.com/timings) عبر مسار باك صغير مثل /dashboard/prayer-times،
 * فنستبدل المصفوفة أدناه بجلب ذاتي في useEffect (نمط UpcomingDeadlinesWidget).
 */

interface Prayer {
    key: string;
    name: string;
    time: string; // "HH:MM" بتوقيت 24 ساعة
    Icon: React.ComponentType<{ size?: number | string; color?: string; style?: React.CSSProperties }>;
}

const PRAYERS: Prayer[] = [
    { key: 'fajr', name: 'الفجر', time: '04:45', Icon: Sunrise },
    { key: 'dhuhr', name: 'الظهر', time: '12:05', Icon: Sun },
    { key: 'asr', name: 'العصر', time: '15:25', Icon: CloudSun },
    { key: 'maghrib', name: 'المغرب', time: '18:10', Icon: Sunset },
    { key: 'isha', name: 'العشاء', time: '19:40', Icon: Moon },
];

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const toSeconds = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h * 60 + m) * 60;
};

const to12h = (hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h < 12 ? 'ص' : 'م';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad2(m)} ${period}`;
};

const DAY_SECONDS = 86400;

const PrayerTimesWidget: React.FC = () => {
    const [now, setNow] = useState<Date>(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const { nextKey, nextName, remaining } = useMemo(() => {
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const upcoming = PRAYERS.find((p) => toSeconds(p.time) > nowSec);
        if (upcoming) {
            return {
                nextKey: upcoming.key,
                nextName: upcoming.name,
                remaining: toSeconds(upcoming.time) - nowSec,
            };
        }
        // كل صلوات اليوم مضت → القادمة فجر الغد
        const fajr = PRAYERS[0];
        return {
            nextKey: fajr.key,
            nextName: fajr.name,
            remaining: toSeconds(fajr.time) + DAY_SECONDS - nowSec,
        };
    }, [now]);

    const hh = Math.floor(remaining / 3600);
    const mm = Math.floor((remaining % 3600) / 60);
    const ss = remaining % 60;

    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', gap: '10px' }}>
            {/* بطاقة الصلاة القادمة (كحلي + ذهبي + هلال) */}
            <div
                style={{
                    background: 'var(--law-navy, #1e2a4a)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flex: '0 0 auto',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>الصلاة القادمة</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Moon size={16} color="var(--law-gold, #c9a227)" />
                        {nextName}
                    </span>
                </div>
                <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', display: 'block' }}>المتبقّي</span>
                    <span
                        style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            color: 'var(--law-gold, #c9a227)',
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '1px',
                            direction: 'ltr',
                            display: 'inline-block',
                        }}
                    >
                        {pad2(hh)}:{pad2(mm)}:{pad2(ss)}
                    </span>
                </div>
            </div>

            {/* قائمة المواقيت الخمس */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: '1 1 auto' }}>
                {PRAYERS.map((p) => {
                    const isNext = p.key === nextKey;
                    const isPassed = !isNext && toSeconds(p.time) <= nowSec;
                    return (
                        <div
                            key={p.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isNext ? 'var(--law-navy-light, #eef1f8)' : 'transparent',
                                border: isNext ? '1px solid var(--law-gold, #c9a227)' : '1px solid transparent',
                                opacity: isPassed ? 0.45 : 1,
                                transition: 'background 0.3s ease, opacity 0.3s ease',
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                <p.Icon
                                    size={16}
                                    color={isNext ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-400, #9ca3af)'}
                                />
                                <span
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: isNext ? 700 : 500,
                                        color: isNext ? 'var(--law-navy, #1e2a4a)' : 'var(--color-heading)',
                                    }}
                                >
                                    {p.name}
                                </span>
                                {isNext && (
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: '#fff',
                                            background: 'var(--law-gold, #c9a227)',
                                            borderRadius: '999px',
                                            padding: '1px 7px',
                                        }}
                                    >
                                        القادمة
                                    </span>
                                )}
                            </span>
                            <span
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: 'var(--color-text-secondary)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {to12h(p.time)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PrayerTimesWidget;
