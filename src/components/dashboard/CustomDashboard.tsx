import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Calendar, FileText, CheckSquare, AlertTriangle, Upload, Search,
    Blocks, Check, Plus, RotateCcw, Magnet, Move,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import '../../styles/dashboard-theme.css';

import WidgetBoard, { type StarterEntry, type BoardApi } from './lab/WidgetBoard';
import CustomizePromoModal from './CustomizePromoModal';
import { DashboardService, type DashboardStats } from '../../services/dashboardService';

/**
 * CustomDashboard — اللوحة الرئيسية القابلة للتخصيص ✨ (خلف بوابة
 * custom_dashboard_enabled وعلى الشاشات الكبيرة فقط).
 *
 * قرار المالك: أول ما يراه المستخدم = لوحته الكلاسيكية «نفسها تماماً»
 * (نفس الهيدر والحبوب + المهل/الجلسات/الأنشطة الثلاث بنفس الترتيب)،
 * ثم مودال «خصّص صفحتك» يعرّفه بالميزة. التخطيط يُزامَن عبر الخادم.
 */

const STORAGE_KEY = 'custom_dashboard_v1';
const PROMO_SEEN_KEY = 'custom_dash_promo_seen_v1';

/* الحالة الابتدائية = اللوحة الكلاسيكية حرفياً: ثلاث بطاقات متساوية بصف واحد
   بغلافها الأصلي تماماً (chrome: classic — نفس .widget بإيموجيها وحدودها،
   بلا شرائط لونية) وتبقى قابلة للسحب/التحجيم/الحذف كأي ودجت.
   الشبكة ltr — في العرض RTL أول بطاقة (المهل) تكون أقصى اليمين = x الأكبر. */
const CLASSIC_STARTER: StarterEntry[] = [
    { i: 'deadlines-main', type: 'deadlines', lg: { x: 8, y: 0, w: 4, h: 7 }, settings: { chrome: 'classic' } },
    { i: 'sessions-main', type: 'sessions', lg: { x: 4, y: 0, w: 4, h: 7 }, settings: { chrome: 'classic' } },
    { i: 'activity-main', type: 'activity', lg: { x: 0, y: 0, w: 4, h: 7 }, settings: { chrome: 'classic' } },
];

const CustomDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [promoOpen, setPromoOpen] = useState(false);
    const boardApiRef = useRef<BoardApi | null>(null);

    /* إحصائيات الحبوب (نفس هيدر الكلاسيكية) */
    useEffect(() => {
        let alive = true;
        DashboardService.getStats()
            .then((s) => { if (alive) setStats(s); })
            .catch(() => { /* الحبوب تعرض أصفاراً */ });
        return () => { alive = false; };
    }, []);

    /* مودال «خصّص صفحتك» — مرة واحدة لكل متصفح */
    useEffect(() => {
        try {
            if (!localStorage.getItem(PROMO_SEEN_KEY)) setPromoOpen(true);
        } catch { /* تجاهل */ }
    }, []);

    const dismissPromo = () => {
        setPromoOpen(false);
        try { localStorage.setItem(PROMO_SEEN_KEY, '1'); } catch { /* تجاهل */ }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        return 'مساء الخير';
    };

    const formatDate = () =>
        new Intl.DateTimeFormat('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

    const handleStatClick = (type: string) => {
        const routes: Record<string, string> = {
            cases: '/cases',
            tasks: '/tasks',
            sessions: '/sessions',
            active: '/cases?status=active',
        };
        if (routes[type]) navigate(routes[type]);
    };

    const quickActions = [
        { id: 'new-case', icon: <FileText size={18} />, label: 'قضية جديدة', color: 'var(--law-navy)', href: '/cases' },
        { id: 'new-task', icon: <CheckSquare size={18} />, label: 'مهمة', color: 'var(--status-green)', href: '/tasks' },
        { id: 'upload-doc', icon: <Upload size={18} />, label: 'وثيقة', color: 'var(--clickup-pink)', href: '/documents' },
        { id: 'search', icon: <Search size={18} />, label: 'بحث', color: 'var(--status-blue)' },
    ];

    const statsCards = [
        { id: 'cases', label: 'قضايا نشطة', value: stats?.active_cases ?? 0, total: stats?.total_cases ?? 0, icon: <FileText size={14} />, color: 'var(--law-navy)' },
        { id: 'tasks', label: 'مهام مكتملة', value: stats?.completed_tasks ?? 0, total: stats?.total_tasks ?? 0, icon: <CheckSquare size={14} />, color: 'var(--status-green)' },
        { id: 'sessions', label: 'جلسات قادمة', value: stats?.upcoming_sessions ?? 0, icon: <Calendar size={14} />, color: 'var(--status-orange)' },
        { id: 'active', label: 'تحتاج متابعة', value: stats?.urgent_items ?? 0, icon: <AlertTriangle size={14} />, color: 'var(--status-red)' },
    ];

    return (
        <div className="dashboard-container">
            <WidgetBoard
                storageKey={STORAGE_KEY}
                starter={CLASSIC_STARTER}
                serverSync
                initialEditMode={false}
                toolbar={(api) => {
                    boardApiRef.current = api;
                    return (
                    <div className="dashboard-header dashboard-header--inline">
                        <div className="dash-toolbar">
                            {/* الترحيب — مطابق للكلاسيكية */}
                            <div className="dash-greeting">
                                <span className="dash-greeting__emoji">👋</span>
                                <div className="dash-greeting__text">
                                    <span className="dash-greeting__hi">{getGreeting()}، {user?.name || 'المستخدم'}</span>
                                    <span className="dash-greeting__date">{formatDate()}</span>
                                </div>
                            </div>

                            {/* حبوب الإحصائيات — مطابقة */}
                            <div className="dash-pills">
                                {statsCards.map((card) => (
                                    <button key={card.id} onClick={() => handleStatClick(card.id)} className="stat-pill" title={card.label}>
                                        <span className="stat-pill__icon" style={{ color: card.color }}>{card.icon}</span>
                                        <span className="stat-pill__value">
                                            {card.value}
                                            {card.total !== undefined && card.total > 0 && (
                                                <span className="stat-pill__total">/{card.total}</span>
                                            )}
                                        </span>
                                        <span className="stat-pill__label">{card.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* ✨ أدوات التخصيص — بدل زر المختبر */}
                            <div className="cdash-tools">
                                {api.editMode ? (
                                    <>
                                        <button className="lab-btn" onClick={api.openPicker}>
                                            <Plus size={15} /> إضافة ودجت
                                        </button>
                                        <button
                                            className="lab-btn"
                                            onClick={() => api.setFreeFlow((f) => !f)}
                                            title={api.freeFlow ? 'التموضع حر: الودجتس تبقى حيث تتركها' : 'رصّ تلقائي: الودجتس تلتصق للأعلى'}
                                        >
                                            {api.freeFlow ? <Move size={14} /> : <Magnet size={14} />}
                                            {api.freeFlow ? 'حر' : 'رصّ'}
                                        </button>
                                        <button className="lab-btn lab-btn--ghost" onClick={api.resetLayout} title="العودة للوحة الافتراضية">
                                            <RotateCcw size={14} />
                                        </button>
                                        <button className="lab-btn lab-btn--primary" onClick={() => api.setEditMode(false)}>
                                            <Check size={15} /> تم
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="cdash-customize-btn"
                                        onClick={() => api.setEditMode(true)}
                                        title="فعّل التخصيص: سحب، تحجيم، إضافة ودجتس، خصائص"
                                    >
                                        <Blocks size={15} /> تخصيص لوحتك
                                    </button>
                                )}
                            </div>

                            {/* الإجراءات السريعة — مطابقة */}
                            <div className="dash-actions">
                                {quickActions.map((action) => {
                                    const content = (
                                        <div className="dash-action" title={action.label}>
                                            <span className="dash-action__icon" style={{ color: action.color }}>{action.icon}</span>
                                            <span className="dash-action__label">{action.label}</span>
                                        </div>
                                    );
                                    return action.href
                                        ? <Link key={action.id} to={action.href} className="dash-action-link">{content}</Link>
                                        : <div key={action.id} className="dash-action-link">{content}</div>;
                                })}
                            </div>
                        </div>
                    </div>
                    );
                }}
            />

            <CustomizePromoModal
                open={promoOpen}
                onStart={() => { dismissPromo(); boardApiRef.current?.setEditMode(true); }}
                onLater={dismissPromo}
            />
        </div>
    );
};

export default CustomDashboard;
