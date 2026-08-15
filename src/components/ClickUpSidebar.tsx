import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
// أيقوناتُ البنود تأتي كلُّها من `sidebarConfig` — ولا يستورد هذا الملفّ إلّا أيقوناتِ
// هيكلِه هو (الشعار · الطيّ · البحث · الإغلاق · الخروج). وقد كان يستورد ٢٣ أيقونةً ميتةً
// وحزمةَ `framer-motion` بلا استعمال: وزنُ حزمةٍ يُحمَّل على كلّ صفحةٍ بلا سطرٍ يستفيد.
import {
    LogOut,
    ChevronRight,
    ChevronLeft,
    Search,
    Scale,
    X,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useAuth } from '../contexts/AuthContext';
import { usePermissionContext } from '../contexts/PermissionContext';
import { useZatcaFeature } from '../contexts/ZatcaStatusContext';
import { mainMenuItems, settingsMenuItems, type SidebarItem } from '../config/sidebarConfig';
import deadlineService from '../services/deadlineService';
import { TaskService } from '../services/taskService';
import { AdminRequestService } from '../services/adminRequestService';

interface SidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}

interface NavItemProps {
    item: SidebarItem;
    isCollapsed: boolean;
    isActive: boolean;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    /** عدّاد حي بجوار الاسم (مثل عدد المهل المفتوحة عند المستخدم) */
    count?: number;
}

const NavItem: React.FC<NavItemProps> = React.memo(({
    item,
    isCollapsed,
    isActive,
    isMobileOpen,
    onMobileClose,
    count,
}) => {
    const Icon = item.icon;

    const content = (
        <NavLink
            to={item.path}
            className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={() => isMobileOpen && onMobileClose()}
        >
            <span className="sidebar-link__icon">
                <Icon size={17} />
            </span>

            {!isCollapsed && (
                <span className="sidebar-link__label">{item.label}</span>
            )}

            {!isCollapsed && item.badge && (
                <span className="sidebar-link__badge sidebar-link__badge--state">
                    {item.badge}
                </span>
            )}

            {!isCollapsed && typeof count === 'number' && count > 0 && (
                <span className="sidebar-link__badge sidebar-link__count">{count}</span>
            )}
        </NavLink>
    );

    if (isCollapsed) {
        return (
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    {content}
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        className="tooltip"
                        side="left"
                        sideOffset={10}
                    >
                        {item.label}
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        );
    }

    return content;
});

NavItem.displayName = 'NavItem';

const ClickUpSidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    onToggleCollapse,
    isMobileOpen,
    onMobileClose
}) => {
    const { user, logout } = useAuth();
    const { has, hasAny, isSuperAdmin } = usePermissionContext();
    // حالة ميزة ZATCA من الـ context (أعلى الشجرة) — لا تُستدعى داخل isItemVisible ولا في sidebarConfig.
    const { available: zatcaAvailable } = useZatcaFeature();
    const location = useLocation();

    // عدادات حية بجوار عناصر القائمة (بحسب رؤية المستخدم — الباك يطبقها):
    //   المهل المفتوحة / المهام المفتوحة / الطلبات الإدارية بانتظار البت
    const [navCounts, setNavCounts] = React.useState<Record<string, number>>({});

    React.useEffect(() => {
        if (!user || user.role === 'client') {
            setNavCounts({});
            return;
        }
        let cancelled = false;

        const fetchers: Array<[string, () => Promise<number>]> = [];

        if (isSuperAdmin || has('deadlines.view')) {
            fetchers.push(['/deadlines', () => deadlineService.summary(1).then((s) => s.counts.open_total ?? 0)]);
        }
        if (isSuperAdmin || has('tasks.view')) {
            fetchers.push(['/tasks', () => TaskService.getTaskStatistics().then(
                (s) => (s.todo ?? 0) + (s.in_progress ?? 0) + (s.review ?? 0) + (s.pending_approval ?? 0)
            )]);
        }
        if (isSuperAdmin || hasAny(['admin_requests.view', 'admin_requests.manage'])) {
            fetchers.push(['/admin/requests', () => AdminRequestService.getStatistics().then((s) => s.pending ?? 0)]);
        }

        fetchers.forEach(([path, fetch]) => {
            fetch()
                .then((n) => { if (!cancelled) setNavCounts((prev) => ({ ...prev, [path]: n })); })
                .catch(() => { if (!cancelled) setNavCounts((prev) => ({ ...prev, [path]: 0 })); });
        });

        return () => { cancelled = true; };
        // location.pathname: تحديث العدادات عند التنقل (إنجاز/اعتماد ثم مغادرة الصفحة)
    }, [user, has, hasAny, isSuperAdmin, location.pathname]);

    /**
     * Whitelist مسارات العميل — أي مسار خارجها يُخفى من الـ sidebar حتى لو كانت الصلاحية موجودة.
     * الحماية الفعلية تبقى في الباك إند؛ هذه طبقة UX لمنع الإرباك.
     */
    const CLIENT_ALLOWED_PATHS = new Set<string>([
        '/dashboard',
        '/my-cases',
        '/my-establishment',
        '/my-documents-required',
        '/my-messages',
        '/activities',
        '/notifications',
        '/settings',
    ]);

    /**
     * Phase 3: تصفية حسب الصلاحيات (مع روية السلوك القديم للـ legacy roles fallback أثناء الانتقال).
     * super_admin يرى كل شيء.
     */
    const isItemVisible = (item: SidebarItem): boolean => {
        // بوّابة الميزة: تُخفي العنصر تماماً عن أي منشأة غير متاحة لها الميزة (حتى super_admin) — لا تعرف بوجوده.
        if (item.featureGate === 'zatca' && !zatcaAvailable) return false;
        if (item.featureGate === 'hr' && !user?.tenant?.hr_enabled) return false;
        // العلَمُ الثالث: وحدةُ الرواتب مستقلّةٌ عن الموارد البشرية وافتراضُها مطفأة.
        if (item.featureGate === 'hr_payroll' && !user?.tenant?.hr_payroll_enabled) return false;
        if (item.featureGate === 'email_intake' && !user?.tenant?.email_intake_enabled) return false;
        if (item.featureGate === 'establishment_portal' && !user?.tenant?.establishment_portal_enabled) return false;

        if (isSuperAdmin) return true;

        // العميل: whitelist صارمة
        if (user?.role === 'client') {
            return CLIENT_ALLOWED_PATHS.has(item.path);
        }

        if (item.permission === null || item.permission === undefined) {
            // null = مرئي للجميع المسجلين
            if (item.roles && user && !item.roles.includes(user.role)) return false;
            return true;
        }
        if (item.permission && has(item.permission)) return true;
        if (item.any && hasAny(item.any)) return true;
        // Legacy fallback: لو ما عنده permission، نقبل بـ roles
        if (item.roles && user && item.roles.includes(user.role)) return true;
        return false;
    };

    const visibleMenuItems = mainMenuItems.filter(isItemVisible);
    const visibleSettingsItems = settingsMenuItems.filter(isItemVisible);

    /**
     * **بندٌ مختارٌ واحدٌ لا اثنان.**
     *
     * كان الاختيارُ يُحسب لكلّ بندٍ على حدة بـ`startsWith(path + '/')`، وهي تصدُق على أكثرَ
     * من بندٍ في وقتٍ واحد: `/hr/leave` تُضيء «الموارد البشرية» (`/hr`) و«الإجازات والغياب»
     * (`/hr/leave`) معاً، و`/hr/payroll/wages` تُضيء ثلاثةً. وبندان مضيئان ليسا تمييزاً
     * أقوى — هما إلغاءٌ للتمييز: لا يَعرف الناظرُ أين هو.
     *
     * فالأطولُ مطابقةً يفوز (**الأخصُّ يغلب الأعمّ**) — بندٌ واحدٌ يُضيء دائماً.
     */
    const matchLen = (path: string): number =>
        location.pathname === path || location.pathname.startsWith(`${path}/`) ? path.length : -1;

    const activePath = [...visibleMenuItems, ...visibleSettingsItems].reduce<string | null>(
        (best, item) => (matchLen(item.path) > (best === null ? 0 : best.length) ? item.path : best),
        null
    );

    /**
     * البندُ المفتوح يُجَرّ إلى المرأى.
     *
     * القائمةُ أطولُ من الشاشة (٣٨ بنداً على مكتبٍ مكتملِ الميزات)، فمن دخل `/hr/leave`
     * وجد قائمةً لا يظهر فيها بندٌ مختارٌ أصلاً — لا لأنّ التمييزَ ضعيف بل لأنّ البندَ خارج
     * المرأى. و`block: 'nearest'` **لا يحرّك شيئاً إن كان ظاهراً**، فلا قفزةَ في الحالة
     * الشائعة؛ و`behavior: 'auto'` بلا انزلاقٍ يحترم مَن أطفأ الحركة.
     */
    const navRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        const active = navRef.current?.querySelector('.sidebar-link--active');
        if (active instanceof HTMLElement) {
            active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    }, [activePath, isCollapsed, visibleMenuItems.length]);

    const handleLogout = () => {
        logout();
    };

    const sidebarWidth = isCollapsed ? 64 : 240;

    return (
        <Tooltip.Provider>
            <aside
                className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}
                style={{ width: sidebarWidth }}
            >
                {/* Header */}
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <Scale size={22} />
                    </div>

                    {!isCollapsed && (
                        <div className="sidebar__brand">
                            <div className="sidebar__title">نظام المحاماة</div>
                        </div>
                    )}

                    {/* Collapse Button - Desktop */}
                    <button
                        className="sidebar__toggle"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? 'توسيع' : 'طي'}
                    >
                        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {/* Close Button - Mobile */}
                    <button
                        className="sidebar__close-mobile"
                        onClick={onMobileClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                {!isCollapsed && (
                    <div className="sidebar__search">
                        <Search size={16} />
                        <span>بحث سريع...</span>
                        <kbd>⌘K</kbd>
                    </div>
                )}

                {/* Navigation */}
                <nav className="sidebar__nav" ref={navRef}>
                    {/* Main Section */}
                    <div className="sidebar__section">
                        {!isCollapsed && (
                            <div className="sidebar__section-title">القائمة الرئيسية</div>
                        )}
                        {visibleMenuItems.map((item) => (
                            <NavItem
                                key={item.path}
                                item={item}
                                isCollapsed={isCollapsed}
                                isActive={item.path === activePath}
                                isMobileOpen={isMobileOpen}
                                onMobileClose={onMobileClose}
                                count={navCounts[item.path]}
                            />
                        ))}
                    </div>

                    {/* حُذف قسم «المفضلة» — كان ثلاثة عناصر ديمو مزروعة في الكود
                        («القضية العقارية»، «مهام هذا الأسبوع»، «جلسات ديسمبر») تُعرض
                        لكل مستخدم غير العميل في أبرز موضع بالواجهة، وهي <div> غير
                        قابلة للنقر أصلاً. يُعاد القسم متى بُنيت مفضلة حقيقية مربوطة
                        بالمستخدم. */}

                    {/* Settings Section */}
                    <div className="sidebar__section">
                        {!isCollapsed && (
                            <div className="sidebar__section-title">الإعدادات</div>
                        )}
                        {visibleSettingsItems.map((item) => (
                            <NavItem
                                key={item.path}
                                item={item}
                                isCollapsed={isCollapsed}
                                isActive={item.path === activePath}
                                isMobileOpen={isMobileOpen}
                                onMobileClose={onMobileClose}
                            />
                        ))}
                    </div>
                </nav>

                {/* Footer / User Profile */}
                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">
                            {user?.name?.charAt(0) || 'م'}
                        </div>

                        {!isCollapsed && (
                            <div className="sidebar__user-info">
                                <div className="sidebar__username">{user?.name || 'المستخدم'}</div>
                                <div className="sidebar__role">
                                    {user?.role === 'admin' && 'مدير النظام'}
                                    {user?.role === 'lawyer' && 'محامي'}
                                    {user?.role === 'legal_assistant' && 'مساعد قانوني'}
                                    {user?.role === 'client' && 'موكل'}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="sidebar__logout"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        {!isCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            <style>{`
                .sidebar {
                    height: 100vh;
                    background: #1A2332;
                    color: white;
                    position: fixed;
                    right: 0;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    transition: width 0.2s ease;
                    z-index: 50;
                    overflow: hidden;
                }
                
                .sidebar--collapsed {
                    width: 64px !important;
                }
                
                @media (max-width: 1024px) {
                    .sidebar {
                        transform: translateX(100%);
                        width: 280px !important;
                    }
                    
                    .sidebar--mobile-open {
                        transform: translateX(0);
                    }
                }
                
                .sidebar__header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                
                .sidebar__logo {
                    width: 36px;
                    height: 36px;
                    background: var(--law-navy);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .sidebar__brand {
                    flex: 1;
                    min-width: 0;
                }
                
                .sidebar__title {
                    font-size: 14px;
                    font-weight: 600;
                    white-space: nowrap;
                }
                
                .sidebar__subtitle {
                    font-size: 11px;
                    color: rgba(255,255,255,0.5);
                    white-space: nowrap;
                }
                
                .sidebar__toggle {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: background 0.15s;
                }
                
                .sidebar__toggle:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                @media (max-width: 1024px) {
                    .sidebar__toggle {
                        display: none;
                    }
                }
                
                .sidebar__close-mobile {
                    display: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                
                @media (max-width: 1024px) {
                    .sidebar__close-mobile {
                        display: flex;
                        margin-right: auto;
                    }
                }
                
                .sidebar__search {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 12px;
                    padding: 10px 12px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.5);
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                
                .sidebar__search:hover {
                    background: rgba(255,255,255,0.12);
                }
                
                .sidebar__search kbd {
                    margin-right: auto;
                    font-size: 10px;
                    padding: 2px 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                
                .sidebar__nav {
                    flex: 1;
                    padding: 8px;
                    overflow-y: auto;
                }
                
                .sidebar__section {
                    margin-bottom: 10px;
                }

                /* فصلُ الأقسام خطٌّ لا فجوة — الفجوةُ وحدَها تُقرأ نهايةَ قائمةٍ فيتوقّف
                   البصرُ عندها ولا يُكمل إلى «الإعدادات». */
                .sidebar__section + .sidebar__section {
                    margin-block-start: 2px;
                    padding-block-start: 6px;
                    border-block-start: 1px solid color-mix(in srgb, var(--law-gold) 18%, transparent);
                }

                /* لا text-transform (لا حالةَ حرفٍ في العربية) ولا letter-spacing:
                   الأخيرةُ تباعد الحروفَ المتّصلةَ فتُرخي الكلمةَ العربية. */
                .sidebar__section-title {
                    font-size: 10.5px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.4);
                    padding: 6px 10px 3px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .sidebar__section-title--clickable {
                    cursor: pointer;
                    justify-content: space-between;
                }
                
                /* كثافةٌ تُدخل القائمةَ في الشاشة: قِيست الخطوةُ 44px فلم يظهر من ٣٨ بنداً
                   إلّا ١٣ على شاشة 900px — و«الإعدادات» كلُّها تحت الطيّ، بل والبندُ المفتوحُ
                   نفسُه خارج المرأى. الخطوةُ الآن ~33px فيظهر الضعفُ بلا حذفِ بندٍ ولا نقله. */
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 7px 10px;
                    border-radius: 6px;
                    color: rgba(255,255,255,0.7);
                    font-size: 13px;
                    transition: background 0.15s, color 0.15s;
                    margin-bottom: 1px;
                    text-decoration: none;
                }
                
                .sidebar--collapsed .sidebar-link {
                    justify-content: center;
                    padding: 9px;
                }
                
                .sidebar-link:hover {
                    background: rgba(255,255,255,0.08);
                    color: white;
                }
                
                /* البندُ المفتوح: كان يُملأ بـ--law-navy (#1E3A5F) فوق قائمةٍ #1A2332 —
                   فرقُ درجةٍ لا يُقرأ اختياراً. صار تلوينَ ذهبٍ + وزناً + أيقونةً ذهبية:
                   ثلاثُ إشاراتٍ لا تُحمَل على لونٍ واحد. ولا شريطَ تمييزٍ جانبيّ. */
                .sidebar-link--active {
                    background: color-mix(in srgb, var(--law-gold) 30%, transparent);
                    color: white;
                    font-weight: 600;
                }

                .sidebar-link--active .sidebar-link__icon {
                    color: var(--law-gold);
                }
                
                .sidebar-link__icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .sidebar-link__label {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .sidebar-link__badge {
                    flex: 0 0 auto;
                    padding: 1px 5px;
                    border-radius: 3px;
                    font-size: 9.5px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                /* وسمُ الحالة («جديد»/«تجريبي») حبرٌ وحدٌّ لا تعبئةٌ صفراء: ثمانيةُ أوسمةٍ
                   ممتلئةٍ في قائمةٍ واحدةٍ تتنافس مع البنود نفسِها، فلا يُقرأ أيُّها يعني شيئاً. */
                .sidebar-link__badge--state {
                    border: 1px solid color-mix(in srgb, var(--law-gold) 45%, transparent);
                    background: transparent;
                    color: var(--law-gold);
                }

                /* أمّا العدّادُ فرقمٌ حيٌّ يُقصد النظرُ إليه — يبقى ممتلئاً. */
                .sidebar-link__count {
                    border: 1px solid transparent;
                    background: var(--law-gold);
                    color: var(--law-navy);
                    min-width: 18px;
                    text-align: center;
                }
                
                .sidebar__footer {
                    padding: 12px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                
                .sidebar__user {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                
                .sidebar--collapsed .sidebar__user {
                    justify-content: center;
                    padding: 8px 0;
                }
                
                .sidebar__avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--law-navy);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 13px;
                    flex-shrink: 0;
                }
                
                .sidebar__user-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .sidebar__username {
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .sidebar__role {
                    font-size: 11px;
                    color: rgba(255,255,255,0.5);
                }
                
                .sidebar__logout {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: var(--status-red);
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                
                .sidebar--collapsed .sidebar__logout span {
                    display: none;
                }
                
                .sidebar__logout:hover {
                    background: rgba(220, 38, 38, 0.2);
                }
                
                .tooltip {
                    background: #1A2332;
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 100;
                }
            `}</style>
        </Tooltip.Provider>
    );
};

export default ClickUpSidebar;
