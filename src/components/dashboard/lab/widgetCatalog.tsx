import React, { Suspense, lazy } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
    Clock, Sparkles, Newspaper, Calendar, Bell, BarChart3, Zap, Timer, LayoutGrid,
    Hourglass, CalendarClock, Globe, ListChecks, StickyNote, Flame, Target, Scale,
    Calculator, Compass, History, TrendingUp, Gauge, CircleDollarSign, Users,
    MoonStar, Wind, CalendarRange, CloudSun,
    CalendarDays, Wallet, Coins, Percent, ArrowRightLeft, Landmark, CalendarX, Filter,
    ClipboardList, BookText, Activity, Radar, CircleDot, Hash, UserPlus, Trophy, Link as LinkIcon,
    ListTodo, Dices, Watch, Coffee, Repeat, Heart, PartyPopper, Quote, Smile, AlarmClock, Sunrise, Phone, UserX,
} from 'lucide-react';

import type { DashboardSummary, UpcomingSession, RecentActivity } from '../../../services/dashboardService';

import ClockWidget from '../widgets/ClockWidget';
import DailyWisdomWidget from '../widgets/DailyWisdomWidget';
import NewsWidget from '../widgets/NewsWidget';
import SessionsWidget from '../widgets/SessionsWidget';
import ActivityFeedWidget from '../widgets/ActivityFeedWidget';
import StatsWidget from '../widgets/StatsWidget';
import QuickActionsWidget from '../widgets/QuickActionsWidget';
import UpcomingDeadlinesWidget from '../widgets/UpcomingDeadlinesWidget';

import type { WidgetOptionDef, WidgetOpts } from './widgetOptions';

/** السياق الممرَّر لكل ودجت (بيانات حقيقية من getSummary إن توفّرت، وإلا null → ديمو). */
export interface LabCtx {
    summary: DashboardSummary | null;
}

/** تعريف ودجت في المعرض. */
export interface LabWidgetDef {
    type: string;
    title: string;
    icon: React.ReactNode;
    category: string;
    desc: string;
    /** الحجم الافتراضي بوحدات الشبكة (12 عموداً، ارتفاع الصف ~64px). */
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    /** 🎛️ خصائص الودجت (Schema) — تُرندر تلقائياً في نافذة التخصيص وتصل الودجت عبر opts. */
    options?: WidgetOptionDef[];
    /** 📡 تعرض بيانات حقيقية من النظام (وإلا فهي محلية/ديمو). */
    live?: boolean;
    /** لا تظهر بالمعرض إلا لمن يملك هذه الصلاحية. */
    requiredPermission?: string;
    /** 👑 للإدارة فقط (admin/owner/partner أو super admin). */
    adminOnly?: boolean;
    /** بيانات الغلاف الكلاسيكي (chrome: 'classic') — إيموجي وخلفية أيقونة اللوحة الأصلية. */
    classic?: { emoji: string; iconBg: string; beta?: boolean };
    render: (ctx: LabCtx, opts: WidgetOpts) => React.ReactNode;
}

/* ============ بيانات تجريبية (تعمل بلا اتصال بالخادم) ============ */
const DEMO_SESSIONS: UpcomingSession[] = [
    { id: 1, case_id: 101, case_title: 'شركة الأفق ضد مؤسسة البناء', case_number: '4450123', court: 'المحكمة التجارية', date: new Date(Date.now() + 86400000).toISOString(), time: '10:00', type: 'hearing', status: 'scheduled', days_until: 1, is_urgent: true, notes: null },
    { id: 2, case_id: 102, case_title: 'قضية عمالية — أحمد الشمري', case_number: '4450088', court: 'محكمة العمل', date: new Date(Date.now() + 3 * 86400000).toISOString(), time: '09:30', type: 'hearing', status: 'scheduled', days_until: 3, is_urgent: false, notes: null },
    { id: 3, case_id: 0, case_title: 'اجتماع مع العميل — عقد شراكة', case_number: '', court: 'مكتب المحاماة', date: new Date(Date.now() + 5 * 86400000).toISOString(), time: '13:00', type: 'meeting', status: 'scheduled', days_until: 5, is_urgent: false, notes: null },
];

const DEMO_ACTIVITIES: RecentActivity[] = [
    { id: 1, type: 'document', description: 'رفع مذكرة الدفاع', details: null, case_id: 101, case_title: 'شركة الأفق', task_id: null, performer_id: 1, performer_name: 'م. سارة', performer_avatar: null, created_at: new Date().toISOString(), time_ago: 'قبل 10 دقائق' },
    { id: 2, type: 'task', description: 'إنجاز مهمة: مراجعة العقد', details: null, case_id: 102, case_title: 'قضية عمالية', task_id: 5, performer_id: 2, performer_name: 'أ. خالد', performer_avatar: null, created_at: new Date().toISOString(), time_ago: 'قبل ساعة' },
    { id: 3, type: 'session', description: 'تحديث موعد جلسة', details: null, case_id: 101, case_title: 'شركة الأفق', task_id: null, performer_id: 1, performer_name: 'م. سارة', performer_avatar: null, created_at: new Date().toISOString(), time_ago: 'قبل 3 ساعات' },
    { id: 4, type: 'case', description: 'فتح قضية جديدة', details: null, case_id: 103, case_title: 'نزاع إيجار', task_id: null, performer_id: 3, performer_name: 'أ. نورة', performer_avatar: null, created_at: new Date().toISOString(), time_ago: 'أمس' },
];

/** ودجت متعدّد التبويبات — يجسّد ميزة «تبويبات داخل المربع الواحد». */
const TabsWidget: React.FC<LabCtx & { defaultTab?: string }> = ({ summary, defaultTab }) => {
    const triggerStyle: React.CSSProperties = {
        border: 'none',
        background: 'transparent',
        padding: '6px 10px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
    };
    const initialTab = ['sessions', 'activity', 'deadlines'].includes(defaultTab || '') ? defaultTab : 'sessions';
    return (
        <Tabs.Root key={initialTab} defaultValue={initialTab} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs.List
                className="lab-no-drag"
                style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: '8px', flexShrink: 0 }}
            >
                <Tabs.Trigger value="sessions" style={triggerStyle} className="lab-tab-trigger">
                    <Calendar size={13} /> الجلسات
                </Tabs.Trigger>
                <Tabs.Trigger value="activity" style={triggerStyle} className="lab-tab-trigger">
                    <Bell size={13} /> الأنشطة
                </Tabs.Trigger>
                <Tabs.Trigger value="deadlines" style={triggerStyle} className="lab-tab-trigger">
                    <Timer size={13} /> المهل
                </Tabs.Trigger>
            </Tabs.List>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Tabs.Content value="sessions">
                    <SessionsWidget sessions={summary?.upcoming_sessions ?? DEMO_SESSIONS} />
                </Tabs.Content>
                <Tabs.Content value="activity">
                    <ActivityFeedWidget activities={summary?.recent_activities ?? DEMO_ACTIVITIES} limit={5} />
                </Tabs.Content>
                <Tabs.Content value="deadlines">
                    <UpcomingDeadlinesWidget />
                </Tabs.Content>
            </div>
        </Tabs.Root>
    );
};

/* ============ الودجتس الجديدة (20) — تحميل كسول: كل ودجت chunk مستقل يُجلب عند إضافته ============ */
const LabFallback: React.FC = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>
        جارٍ التحميل…
    </div>
);
function lazyWidget(loader: () => Promise<{ default: React.ComponentType<any> }>): (ctx: LabCtx, opts: WidgetOpts) => React.ReactNode {
    const C = lazy(loader);
    // خصائص الودجت (opts) تُمرَّر props مسطّحة — الودجتس التي لا تعرفها تتجاهلها
    return (_ctx, opts) => (
        <Suspense fallback={<LabFallback />}>
            <C {...(opts as Record<string, unknown>)} />
        </Suspense>
    );
}

/* ============ المعرض ============ */
export const WIDGET_CATALOG: LabWidgetDef[] = [
    /* ===== 👑 الإدارة (تظهر للإدارة فقط) ===== */
    {
        type: 'overdue-by-assignee',
        title: 'متأخرات الفريق',
        icon: <UserX size={16} />,
        category: 'الإدارة',
        desc: 'المهام المتأخرة عند كل موظف — بنقرة تتوسع للتفاصيل',
        w: 4, h: 6, minW: 3, minH: 4,
        live: true, adminOnly: true,
        render: lazyWidget(() => import('../widgets/lab/OverdueByAssigneeWidget')),
    },
    {
        type: 'workload',
        title: 'عبء العمل',
        icon: <Users size={16} />,
        category: 'الإدارة',
        desc: 'المهام المفتوحة الفعلية لكل موظف بأشرطة متحرّكة',
        w: 5, h: 5, minW: 4, minH: 4,
        live: true, adminOnly: true,
        render: lazyWidget(() => import('../widgets/lab/WorkloadBarsWidget')),
    },

    /* ===== المكتب ===== */
    {
        type: 'my-tasks',
        title: 'مهامي',
        icon: <ListTodo size={16} />,
        category: 'المكتب',
        desc: 'عداداتك (مفتوحة/جارية/متأخرة) + أقرب المستحقة',
        w: 4, h: 6, minW: 3, minH: 4,
        live: true,
        options: [
            { key: 'showCompleted', label: 'إظهار منجز الأسبوع', type: 'toggle', default: true },
        ],
        render: lazyWidget(() => import('../widgets/lab/MyTasksWidget')),
    },
    {
        type: 'deadlines',
        title: 'المهل النظامية',
        icon: <Timer size={16} />,
        category: 'المكتب',
        desc: 'عدادات تنازلية لمهل الاعتراض',
        w: 4, h: 5, minW: 3, minH: 4,
        live: true,
        classic: { emoji: '⏳', iconBg: 'var(--status-red-light)', beta: true },
        options: [
            { key: 'days', label: 'النطاق الزمني', type: 'select', choices: [{ v: '7', l: '٧ أيام' }, { v: '15', l: '١٥ يوماً' }, { v: '30', l: '٣٠ يوماً' }, { v: '0', l: 'الكل' }], default: '0' },
            { key: 'mine', label: 'مهلي فقط', type: 'toggle', default: false },
            { key: 'limit', label: 'عدد المهل', type: 'number', min: 3, max: 15, default: 5 },
        ],
        render: (_ctx, o) => (
            <UpcomingDeadlinesWidget
                limit={Number(o.limit) || 5}
                days={Number(o.days) > 0 ? Number(o.days) : undefined}
                mine={!!o.mine}
            />
        ),
    },
    {
        type: 'sessions',
        title: 'الجلسات القادمة',
        icon: <Calendar size={16} />,
        category: 'المكتب',
        desc: 'أقرب الجلسات والمواعيد',
        w: 4, h: 5, minW: 3, minH: 4,
        live: true,
        classic: { emoji: '📅', iconBg: 'var(--status-orange-light)' },
        options: [
            { key: 'limit', label: 'عدد الجلسات', type: 'number', min: 3, max: 12, default: 5 },
        ],
        render: (ctx, o) => (
            <SessionsWidget sessions={(ctx.summary?.upcoming_sessions ?? DEMO_SESSIONS).slice(0, Number(o.limit) || 5)} />
        ),
    },
    {
        type: 'activity',
        title: 'آخر الأنشطة',
        icon: <Bell size={16} />,
        category: 'المكتب',
        desc: 'خط زمني لأحدث الأحداث',
        w: 4, h: 5, minW: 3, minH: 4,
        live: true,
        classic: { emoji: '🔔', iconBg: 'var(--status-blue-light)' },
        options: [
            { key: 'limit', label: 'عدد الأنشطة', type: 'number', min: 3, max: 15, default: 6 },
        ],
        render: (ctx, o) => (
            <ActivityFeedWidget activities={ctx.summary?.recent_activities ?? DEMO_ACTIVITIES} limit={Number(o.limit) || 6} />
        ),
    },
    {
        type: 'tabs',
        title: 'مركز موجز (تبويبات)',
        icon: <LayoutGrid size={16} />,
        category: 'المكتب',
        desc: 'الجلسات + الأنشطة + المهل في مربع واحد بتبويبات',
        w: 5, h: 6, minW: 4, minH: 4,
        live: true,
        options: [
            { key: 'defaultTab', label: 'التبويب الافتراضي', type: 'select', choices: [{ v: 'sessions', l: 'الجلسات' }, { v: 'activity', l: 'الأنشطة' }, { v: 'deadlines', l: 'المهل' }], default: 'sessions' },
        ],
        render: (ctx, o) => <TabsWidget {...ctx} defaultTab={String(o.defaultTab || 'sessions')} />,
    },
    {
        type: 'stats',
        title: 'الإحصائيات',
        icon: <BarChart3 size={16} />,
        category: 'المكتب',
        desc: 'بطاقات القضايا والمهام والجلسات',
        w: 6, h: 3, minW: 4, minH: 3,
        render: () => <StatsWidget />,
    },
    {
        type: 'quick-actions',
        title: 'إجراءات سريعة',
        icon: <Zap size={16} />,
        category: 'إجراءات',
        desc: 'أزرار للمهام الشائعة',
        w: 3, h: 4, minW: 2, minH: 3,
        render: () => <QuickActionsWidget />,
    },

    /* ===== الوقت / إلهام / أخبار ===== */
    {
        type: 'clock',
        title: 'الساعة',
        icon: <Clock size={16} />,
        category: 'الوقت',
        desc: 'ساعة تناظرية دائرية + تاريخ اليوم',
        w: 3, h: 5, minW: 2, minH: 4,
        options: [
            { key: 'style', label: 'النمط', type: 'select', choices: [{ v: 'both', l: 'كاملة' }, { v: 'analog', l: 'تناظرية' }, { v: 'digital', l: 'رقمية' }], default: 'both' },
            { key: 'showSeconds', label: 'الثواني', type: 'toggle', default: true },
            { key: 'hour24', label: 'نظام ٢٤ ساعة', type: 'toggle', default: false },
        ],
        render: (_ctx, o) => (
            <ClockWidget
                style={(o.style as 'both' | 'analog' | 'digital') || 'both'}
                showSeconds={o.showSeconds !== false}
                hour24={!!o.hour24}
            />
        ),
    },
    {
        type: 'wisdom',
        title: 'لمسة اليوم',
        icon: <Sparkles size={16} />,
        category: 'إلهام',
        desc: 'قاعدة فقهية أو نصيحة مهنية يومية',
        w: 4, h: 4, minW: 3, minH: 3,
        live: true,
        options: [
            { key: 'showSource', label: 'إظهار المصدر', type: 'toggle', default: true },
        ],
        render: (_ctx, o) => <DailyWisdomWidget showSource={o.showSource !== false} />,
    },
    {
        type: 'news',
        title: 'أخبار وتحديثات',
        icon: <Newspaper size={16} />,
        category: 'أخبار',
        desc: 'مستجدّات نظامية وإعلانات المكتب',
        w: 4, h: 5, minW: 3, minH: 4,
        render: () => <NewsWidget />,
    },

    /* ===== الوقت والتركيز ===== */
    {
        type: 'pomodoro', title: 'مؤقّت تركيز', icon: <Timer size={16} />, category: 'الوقت والتركيز',
        desc: 'بومودورو بحلقة تنازلية — مدد قابلة للضبط', w: 3, h: 6, minW: 3, minH: 5,
        options: [
            { key: 'workMin', label: 'مدة التركيز', type: 'select', choices: [{ v: '15', l: '١٥ د' }, { v: '25', l: '٢٥ د' }, { v: '45', l: '٤٥ د' }, { v: '60', l: '٦٠ د' }], default: '25' },
            { key: 'breakMin', label: 'مدة الراحة', type: 'select', choices: [{ v: '5', l: '٥ د' }, { v: '10', l: '١٠ د' }, { v: '15', l: '١٥ د' }], default: '5' },
        ],
        render: lazyWidget(() => import('../widgets/lab/PomodoroWidget')),
    },
    { type: 'billable-hours', title: 'ساعات الفوترة', icon: <Hourglass size={16} />, category: 'الوقت والتركيز', desc: 'عدّاد ساعات قابلة للفوترة بالريال', w: 3, h: 5, minW: 2, minH: 4, render: lazyWidget(() => import('../widgets/lab/BillableHoursWidget')) },
    {
        type: 'countdown', title: 'عدّاد تنازلي', icon: <CalendarClock size={16} />, category: 'الوقت والتركيز',
        desc: 'العدّ التنازلي لموعدك: سمّه وحدّد يومه ووقته', w: 4, h: 4, minW: 3, minH: 3,
        options: [
            { key: 'title', label: 'اسم الموعد', type: 'text', placeholder: 'الجلسة القادمة' },
            { key: 'targetDate', label: 'التاريخ', type: 'date' },
            { key: 'targetTime', label: 'الوقت', type: 'text', placeholder: '10:00', default: '10:00' },
        ],
        render: lazyWidget(() => import('../widgets/lab/CountdownWidget')),
    },
    { type: 'world-clocks', title: 'ساعات عالمية', icon: <Globe size={16} />, category: 'الوقت والتركيز', desc: 'توقيت مدن للعملاء الدوليين', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/WorldClocksWidget')) },

    /* ===== الإنتاجية ===== */
    { type: 'checklist', title: 'قائمة مهام سريعة', icon: <ListChecks size={16} />, category: 'الإنتاجية', desc: 'مهام سريعة مع شريط تقدّم', w: 4, h: 6, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/QuickChecklistWidget')) },
    { type: 'sticky-note', title: 'ملاحظة لاصقة', icon: <StickyNote size={16} />, category: 'الإنتاجية', desc: 'مذكّرة سريعة تُحفظ تلقائياً', w: 3, h: 5, minW: 2, minH: 3, render: lazyWidget(() => import('../widgets/lab/StickyNoteWidget')) },
    { type: 'habit', title: 'متتبّع العادات', icon: <Flame size={16} />, category: 'الإنتاجية', desc: 'التزام أسبوعي مع streak', w: 4, h: 4, minW: 3, minH: 3, render: lazyWidget(() => import('../widgets/lab/HabitTrackerWidget')) },
    {
        type: 'goal', title: 'تقدّم الهدف', icon: <Target size={16} />, category: 'الإنتاجية',
        desc: 'حلقة تقدّم نحو هدفك — سمّه وحدّده', w: 3, h: 5, minW: 3, minH: 4,
        options: [
            { key: 'label', label: 'اسم الهدف', type: 'text', placeholder: 'قضايا مغلقة هذا الشهر' },
            { key: 'target', label: 'الهدف', type: 'number', min: 1, max: 1000, default: 10 },
            { key: 'current', label: 'المنجز حالياً', type: 'number', min: 0, max: 1000, default: 7 },
        ],
        render: lazyWidget(() => import('../widgets/lab/GoalProgressWidget')),
    },

    /* ===== أدوات قانونية ===== */
    { type: 'deadline-calc', title: 'حاسبة المهل', icon: <Scale size={16} />, category: 'أدوات قانونية', desc: 'احسب تاريخ استحقاق المهلة', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/DeadlineCalculatorWidget')) },
    { type: 'fee-vat', title: 'حاسبة الأتعاب والضريبة', icon: <Calculator size={16} />, category: 'أدوات قانونية', desc: 'الأساس + ضريبة 15% + الإجمالي', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/FeeVatCalculatorWidget')) },
    { type: 'eisenhower', title: 'مصفوفة الأولويات', icon: <Compass size={16} />, category: 'أدوات قانونية', desc: 'عاجل/مهم — آيزنهاور 2×2', w: 5, h: 6, minW: 4, minH: 5, render: lazyWidget(() => import('../widgets/lab/EisenhowerMatrixWidget')) },
    { type: 'case-timeline', title: 'الخط الزمني للقضية', icon: <History size={16} />, category: 'أدوات قانونية', desc: 'مراحل القضية بعُقد ملوّنة', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/CaseTimelineWidget')) },

    /* ===== المالية والمؤشرات ===== */
    {
        type: 'revenue', title: 'نبض التحصيل', icon: <TrendingUp size={16} />, category: 'المالية والمؤشرات',
        desc: 'اتجاه الإيرادات الشهري الفعلي للسنة الحالية', w: 5, h: 4, minW: 4, minH: 3,
        live: true, requiredPermission: 'billing.view',
        options: [
            { key: 'metric', label: 'المقياس', type: 'select', choices: [{ v: 'collected', l: 'المحصّل' }, { v: 'invoiced', l: 'المفوتر' }], default: 'collected' },
        ],
        render: lazyWidget(() => import('../widgets/lab/RevenueSparklineWidget')),
    },
    {
        type: 'kpi-gauge', title: 'مؤشّر أداء', icon: <Gauge size={16} />, category: 'المالية والمؤشرات',
        desc: 'عدّاد دائري بإبرة — سمّه واضبط نسبته', w: 3, h: 5, minW: 3, minH: 4,
        options: [
            { key: 'title', label: 'العنوان', type: 'text', placeholder: 'نسبة كسب القضايا' },
            { key: 'percent', label: 'النسبة ٪', type: 'number', min: 0, max: 100, default: 78 },
        ],
        render: lazyWidget(() => import('../widgets/lab/KpiGaugeWidget')),
    },
    {
        type: 'collection', title: 'دائرة التحصيل', icon: <CircleDollarSign size={16} />, category: 'المالية والمؤشرات',
        desc: 'محصّل مقابل مستحق — من فواتير مكتبك الفعلية', w: 3, h: 5, minW: 3, minH: 4,
        live: true, requiredPermission: 'billing.view',
        render: lazyWidget(() => import('../widgets/lab/CollectionDonutWidget')),
    },

    /* ===== الرفاهية ===== */
    { type: 'prayer', title: 'مواقيت الصلاة', icon: <MoonStar size={16} />, category: 'الرفاهية', desc: 'الأوقات مع عدّاد للأذان القادم', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/PrayerTimesWidget')) },
    { type: 'breathing', title: 'تمرين تنفّس', icon: <Wind size={16} />, category: 'الرفاهية', desc: 'دائرة تنفّس للاسترخاء', w: 3, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/BreathingWidget')) },
    {
        type: 'day-progress', title: 'تقدّم الوقت', icon: <CalendarRange size={16} />, category: 'الرفاهية',
        desc: 'اليوم/الأسبوع/السنة — اختر ما يظهر', w: 4, h: 4, minW: 3, minH: 3,
        options: [
            { key: 'showDay', label: 'شريط اليوم', type: 'toggle', default: true },
            { key: 'showWeek', label: 'شريط الأسبوع', type: 'toggle', default: true },
            { key: 'showYear', label: 'شريط السنة', type: 'toggle', default: true },
        ],
        render: lazyWidget(() => import('../widgets/lab/DayProgressWidget')),
    },
    { type: 'weather', title: 'الطقس', icon: <CloudSun size={16} />, category: 'الرفاهية', desc: 'بطاقة طقس بتوقّع 3 أيام', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/WeatherWidget')) },

    /* ===== حاسبات ===== */
    { type: 'date-diff', title: 'فرق التواريخ', icon: <CalendarDays size={16} />, category: 'حاسبات', desc: 'أيام/أشهر/سنوات + أيام العمل', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/DateDiffWidget')) },
    { type: 'end-of-service', title: 'مكافأة نهاية الخدمة', icon: <Wallet size={16} />, category: 'حاسبات', desc: 'حسب نظام العمل السعودي', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/EndOfServiceWidget')) },
    { type: 'zakat', title: 'حاسبة الزكاة', icon: <Coins size={16} />, category: 'حاسبات', desc: 'زكاة المال ٢.٥٪ مع النصاب', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/ZakatWidget')) },
    { type: 'contingency-fee', title: 'أتعاب النسبة', icon: <Percent size={16} />, category: 'حاسبات', desc: 'نسبة من قيمة المطالبة', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/ContingencyFeeWidget')) },
    { type: 'currency', title: 'محوّل العملات', icon: <ArrowRightLeft size={16} />, category: 'حاسبات', desc: 'ريال/دولار/يورو/درهم', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/CurrencyConverterWidget')) },
    { type: 'loan', title: 'حاسبة القسط', icon: <Landmark size={16} />, category: 'حاسبات', desc: 'القسط الشهري + جدول الإطفاء', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/LoanCalculatorWidget')) },

    /* ===== أدوات قانونية (إضافية) ===== */
    { type: 'limitation', title: 'مسطرة التقادم', icon: <CalendarX size={16} />, category: 'أدوات قانونية', desc: 'قضايا تقترب من سقوط الحق', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/LimitationTrackerWidget')) },
    { type: 'case-pipeline', title: 'قمع مراحل القضايا', icon: <Filter size={16} />, category: 'أدوات قانونية', desc: 'قيد النظر ← تنفيذ', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/CasePipelineWidget')) },
    { type: 'clause-snippets', title: 'قصاصات قانونية', icon: <ClipboardList size={16} />, category: 'أدوات قانونية', desc: 'عبارات جاهزة قابلة للنسخ', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/ClauseSnippetsWidget')) },
    { type: 'law-quickref', title: 'مرجع الأنظمة السريع', icon: <BookText size={16} />, category: 'أدوات قانونية', desc: 'بحث سريع بأرقام المواد', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/LawQuickRefWidget')) },

    /* ===== تحليلات ===== */
    { type: 'activity-heatmap', title: 'خريطة النشاط', icon: <Activity size={16} />, category: 'تحليلات', desc: 'شبكة سنوية بنمط GitHub', w: 6, h: 4, minW: 5, minH: 3, render: lazyWidget(() => import('../widgets/lab/ActivityHeatmapWidget')) },
    { type: 'radar', title: 'رادار المجالات', icon: <Radar size={16} />, category: 'تحليلات', desc: 'توازن مجالات الممارسة', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/RadarChartWidget')) },
    { type: 'activity-rings', title: 'حلقات النشاط', icon: <CircleDot size={16} />, category: 'تحليلات', desc: 'قضايا/مهام/جلسات (Apple Watch)', w: 3, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/ActivityRingsWidget')) },
    {
        type: 'big-counter', title: 'عدّاد بطل', icon: <Hash size={16} />, category: 'تحليلات',
        desc: 'رقم كبير بعدّ تصاعدي — اعرض أي مؤشر تفتخر به', w: 3, h: 4, minW: 2, minH: 3,
        options: [
            { key: 'title', label: 'العنوان', type: 'text', placeholder: 'الأداء السنوي' },
            { key: 'value', label: 'الرقم', type: 'number', min: 0, max: 1000000, default: 348 },
            { key: 'label', label: 'الوصف تحت الرقم', type: 'text', placeholder: 'قضية نُفّذت هذا العام' },
            { key: 'changePct', label: 'نسبة التغيّر ٪', type: 'number', min: -100, max: 1000, default: 14 },
        ],
        render: lazyWidget(() => import('../widgets/lab/BigCounterWidget')),
    },
    { type: 'stat-grid', title: 'شبكة المؤشرات', icon: <LayoutGrid size={16} />, category: 'تحليلات', desc: 'عدة مؤشرات بأسهم اتجاه', w: 5, h: 4, minW: 4, minH: 3, render: lazyWidget(() => import('../widgets/lab/StatGridWidget')) },
    { type: 'lead-funnel', title: 'قمع التحويل', icon: <UserPlus size={16} />, category: 'تحليلات', desc: 'محتملون ← موكّلون ← قضايا', w: 4, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/LeadFunnelWidget')) },
    { type: 'win-by-type', title: 'الكسب حسب النوع', icon: <Trophy size={16} />, category: 'تحليلات', desc: 'معدّل الكسب لكل نوع قضية', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/WinByTypeWidget')) },

    /* ===== الإنتاجية (إضافية) ===== */
    { type: 'quick-links', title: 'روابط سريعة', icon: <LinkIcon size={16} />, category: 'الإنتاجية', desc: 'اختصارات قابلة للتخصيص', w: 4, h: 4, minW: 3, minH: 3, render: lazyWidget(() => import('../widgets/lab/QuickLinksWidget')) },
    { type: 'top3-today', title: 'أولويات اليوم', icon: <ListTodo size={16} />, category: 'الإنتاجية', desc: 'أهم ٣ مهام لليوم', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/TopThreeTodayWidget')) },
    { type: 'decision-wheel', title: 'عجلة القرار', icon: <Dices size={16} />, category: 'الإنتاجية', desc: 'أدِر العجلة لاختيار عشوائي', w: 3, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/DecisionWheelWidget')) },
    { type: 'stopwatch', title: 'مؤقّت عام', icon: <Watch size={16} />, category: 'الإنتاجية', desc: 'ساعة إيقاف / عدّ تنازلي', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/StopwatchTimerWidget')) },
    { type: 'break-reminder', title: 'الاستراحة والماء', icon: <Coffee size={16} />, category: 'الإنتاجية', desc: 'تذكير صحي بالماء والاستراحة', w: 3, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/BreakReminderWidget')) },
    { type: 'speed-dial', title: 'اتصال سريع', icon: <Phone size={16} />, category: 'الإنتاجية', desc: 'جهات مفضّلة (اتصال/واتساب)', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/SpeedDialWidget')) },

    /* ===== الرفاهية (إضافية) ===== */
    { type: 'tasbeeh', title: 'المسبحة الرقمية', icon: <Repeat size={16} />, category: 'الرفاهية', desc: 'عدّاد أذكار بأهداف ٣٣/٩٩', w: 3, h: 6, minW: 3, minH: 5, render: lazyWidget(() => import('../widgets/lab/TasbeehCounterWidget')) },
    { type: 'gratitude', title: 'متتبّع الامتنان', icon: <Heart size={16} />, category: 'الرفاهية', desc: 'أمتنّ اليوم لـ...', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/GratitudeWidget')) },
    { type: 'wins', title: 'سجلّ الإنجازات', icon: <PartyPopper size={16} />, category: 'الرفاهية', desc: 'سجّل إنجازاً واحتفل 🎉', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/WinsConfettiWidget')) },
    { type: 'team-mood', title: 'مزاج الفريق', icon: <Smile size={16} />, category: 'الرفاهية', desc: 'حالتك اليوم + متوسّط الفريق', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/TeamMoodWidget')) },
    { type: 'aurora', title: 'أجواء متدرّجة', icon: <Sunrise size={16} />, category: 'الرفاهية', desc: 'خلفية حيّة مع تحية ووقت', w: 4, h: 5, minW: 3, minH: 4, render: lazyWidget(() => import('../widgets/lab/AuroraAmbientWidget')) },

    /* ===== إلهام / وقت ===== */
    { type: 'leadership-quote', title: 'اقتباس قيادي', icon: <Quote size={16} />, category: 'إلهام', desc: 'حكمة إدارية متجدّدة يومياً', w: 4, h: 4, minW: 3, minH: 3, render: lazyWidget(() => import('../widgets/lab/LeadershipQuoteWidget')) },
    {
        type: 'flip-clock', title: 'ساعة Flip', icon: <AlarmClock size={16} />, category: 'الوقت والتركيز',
        desc: 'ساعة رقمية بأرقام تنقلب', w: 4, h: 4, minW: 3, minH: 3,
        options: [
            { key: 'hour24', label: 'نظام ٢٤ ساعة', type: 'toggle', default: false },
            { key: 'showSeconds', label: 'الثواني', type: 'toggle', default: true },
        ],
        render: lazyWidget(() => import('../widgets/lab/FlipClockWidget')),
    },
];

export const CATALOG_BY_TYPE: Record<string, LabWidgetDef> =
    WIDGET_CATALOG.reduce((acc, w) => { acc[w.type] = w; return acc; }, {} as Record<string, LabWidgetDef>);
