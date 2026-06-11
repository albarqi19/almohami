import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Plus, X, Trash2, Trophy, Lightbulb, Inbox, UploadCloud,
    Video as VideoIcon, Loader2, MessageSquare, Search, Award, History, Filter,
    ChevronLeft, ChevronRight, Play, AlertCircle, Paperclip, Bug,
    HelpCircle, Sparkles, Gift,
} from 'lucide-react';
import {
    FeedbackService, FEEDBACK_TYPES, resolutionStatusClass,
    type FeedbackItem, type FeedbackScore, type FeedbackType, type FeedbackAttachment,
} from '../services/feedbackService';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'UI', label: 'الواجهة' },
    { value: 'Performance', label: 'الأداء' },
    { value: 'Notifications', label: 'الإشعارات' },
    { value: 'WhatsApp', label: 'الواتساب' },
    { value: 'Mobile', label: 'الجوال' },
    { value: 'Permissions', label: 'الصلاحيات' },
    { value: 'Other', label: 'أخرى' },
];

const MAX_FILES = 3;
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const BODY_MAX = 5000;
const WELCOME_KEY = 'fb_welcome_seen_v1'; // علامة ظهور النافذة الترحيبية مرة واحدة

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return iso;
    }
}

/** مقتطف قصير من النص لعرضه في القائمة حين لا يوجد عنوان. */
function snippet(text: string, max = 90): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

/** مستوى المساهمة — تسميات مهنية رصينة. */
function getLevelDetails(points: number): { name: string; nextPoints: number; progress: number } {
    if (points >= 500) return { name: 'مستشار التطوير', nextPoints: 0, progress: 100 };
    if (points >= 250) return { name: 'شريك في التطوير', nextPoints: 500, progress: ((points - 250) / 250) * 100 };
    if (points >= 100) return { name: 'مساهم معتمد', nextPoints: 250, progress: ((points - 100) / 150) * 100 };
    if (points >= 30) return { name: 'مساهم نشط', nextPoints: 100, progress: ((points - 30) / 70) * 100 };
    return { name: 'عضو مساهم', nextPoints: 30, progress: (points / 30) * 100 };
}

/** ترجمة سبب حركة النقاط (القيم تأتي خاماً بالإنجليزية من الخادم). */
function txReasonLabel(reason: string): string {
    switch (reason) {
        case 'accepted': return 'ملاحظة مقبولة';
        case 'bonus': return 'مكافأة إضافية';
        case 'redemption': return 'استبدال نقاط';
        default: return reason;
    }
}

const Feedback: React.FC = () => {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [score, setScore] = useState<FeedbackScore | null>(null);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [detailItem, setDetailItem] = useState<FeedbackItem | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);

    // Filters and search
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState<string>('all');
    const [activeStatus, setActiveStatus] = useState<string>('all');

    // الـ lightbox: قائمة المرفقات والمؤشّر الحالي
    const [lightbox, setLightbox] = useState<{ items: FeedbackAttachment[]; index: number } | null>(null);

    const load = useCallback(async (pageToLoad = 1) => {
        setLoading(true);
        setListError(null);
        try {
            const [list, sc] = await Promise.all([
                FeedbackService.getMine(pageToLoad),
                FeedbackService.getMyScore(),
            ]);
            setItems(list.data);
            setPage(list.current_page);
            setLastPage(list.last_page);
            setScore(sc);
        } catch (err) {
            setListError(err instanceof Error ? err.message : 'تعذّر تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(1); }, [load]);

    // إظهار النافذة الترحيبية أول زيارة فقط
    useEffect(() => {
        try {
            if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true);
        } catch { /* تجاهل تعذّر الوصول للتخزين */ }
    }, []);

    const dismissWelcome = () => {
        try { localStorage.setItem(WELCOME_KEY, '1'); } catch { /* تجاهل */ }
        setShowWelcome(false);
    };

    // Local client-side filtering
    const filteredItems = items.filter((item) => {
        const matchesSearch =
            searchQuery.trim() === '' ||
            (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            item.body.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = activeType === 'all' || item.type === activeType;

        const matchesStatus =
            activeStatus === 'all' ||
            (activeStatus === 'pending' && (item.resolution_status === 'new' || item.resolution_status === 'under_review' || item.resolution_status === 'needs_info')) ||
            (activeStatus === 'resolved' && item.resolution_status === 'resolved') ||
            (activeStatus === 'rejected' && (item.resolution_status === 'rejected' || item.resolution_status === 'duplicate'));

        return matchesSearch && matchesType && matchesStatus;
    });

    const handleDelete = async (id: number) => {
        if (!window.confirm('حذف هذه الملاحظة؟')) return;
        try {
            await FeedbackService.remove(id);
            setDetailItem(null);
            load(page);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'تعذّر الحذف');
        }
    };

    const levelDetails = getLevelDetails(score?.points_balance ?? 0);
    const pointsBalance = score?.points_balance ?? 0;

    return (
        <div className="fb-page">
            {/* ===== الهيدر العلوي الممتد ===== */}
            <header className="fb-header-bar">
                <div className="fb-header-bar__start">
                    <div className="fb-header-bar__title">
                        <Lightbulb size={20} />
                        <span>مركز الاقتراحات والملاحظات</span>
                    </div>
                </div>

                <div className="fb-header-bar__end">
                    <span className="fb-points-badge">
                        <Trophy size={15} /> نقاطك: {pointsBalance}
                    </span>
                    <button className="fb-btn-primary" onClick={() => setModalOpen(true)}>
                        <Plus size={16} /> إضافة ملاحظة جديدة
                    </button>
                    <button
                        className="fb-icon-btn"
                        onClick={() => setShowWelcome(true)}
                        title="عن مركز الملاحظات"
                        aria-label="عن مركز الملاحظات"
                    >
                        <HelpCircle size={18} />
                    </button>
                </div>
            </header>

            {/* ===== المحتوى ثلاثي الأعمدة ===== */}
            <div className="fb-layout">

                {/* ── العمود الأول: الفلاتر الجانبية (يمين في RTL) ── */}
                <aside className="fb-sidebar">
                    <div className="fb-sidebar__section">
                        <div className="fb-sidebar__label">
                            <Filter size={12} /> تصفية حسب النوع
                        </div>
                        <div className="fb-sidebar__menu">
                            <button
                                className={`fb-sidebar__item ${activeType === 'all' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveType('all')}
                            >
                                <span className="fb-sidebar__item-dot fb-sidebar__item-dot--all" />
                                <span className="fb-sidebar__item-text">الكل</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeType === 'suggestion' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveType('suggestion')}
                            >
                                <span className="fb-sidebar__item-dot fb-sidebar__item-dot--suggestion" />
                                <span className="fb-sidebar__item-text">اقتراحات وأفكار</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeType === 'bug' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveType('bug')}
                            >
                                <span className="fb-sidebar__item-dot fb-sidebar__item-dot--bug" />
                                <span className="fb-sidebar__item-text">مشاكل وأعطال</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeType === 'complaint' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveType('complaint')}
                            >
                                <span className="fb-sidebar__item-dot fb-sidebar__item-dot--complaint" />
                                <span className="fb-sidebar__item-text">شكاوى وملاحظات</span>
                            </button>
                        </div>
                    </div>

                    <div className="fb-sidebar__section">
                        <div className="fb-sidebar__label">
                            <Filter size={12} /> تصفية حسب الحالة
                        </div>
                        <div className="fb-sidebar__menu">
                            <button
                                className={`fb-sidebar__item ${activeStatus === 'all' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveStatus('all')}
                            >
                                <span className="fb-sidebar__item-text">كل الحالات</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeStatus === 'pending' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveStatus('pending')}
                            >
                                <span className="fb-sidebar__item-text">قيد المراجعة</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeStatus === 'resolved' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveStatus('resolved')}
                            >
                                <span className="fb-sidebar__item-text">مقبولة ومحلولة</span>
                            </button>
                            <button
                                className={`fb-sidebar__item ${activeStatus === 'rejected' ? 'fb-sidebar__item--active' : ''}`}
                                onClick={() => setActiveStatus('rejected')}
                            >
                                <span className="fb-sidebar__item-text">مستبعدة</span>
                            </button>
                        </div>
                    </div>

                    {/* دليل المساهمة */}
                    <div className="fb-rules-card">
                        <div className="fb-rules-card__body">
                            <div className="fb-rule-item">
                                <span className="fb-rule-item__icon"><Lightbulb size={15} /></span>
                                <div className="fb-rule-item__content">
                                    <div className="fb-rule-item__title">اقتراح ميزة أو تطوير</div>
                                    <div className="fb-rule-item__desc">فكرة تُحسّن تجربة العمل في النظام</div>
                                </div>
                            </div>
                            <div className="fb-rule-item">
                                <span className="fb-rule-item__icon"><Bug size={15} /></span>
                                <div className="fb-rule-item__content">
                                    <div className="fb-rule-item__title">الإبلاغ عن خلل تقني</div>
                                    <div className="fb-rule-item__desc">ملاحظة ترفع جودة النظام ودقّته</div>
                                </div>
                            </div>
                            <div className="fb-rule-item">
                                <span className="fb-rule-item__icon"><Award size={15} /></span>
                                <div className="fb-rule-item__content">
                                    <div className="fb-rule-item__title">قبول الملاحظة واعتمادها</div>
                                    <div className="fb-rule-item__desc">ترقية مستوى مساهمتك</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── العمود الثاني: قائمة الملاحظات (الوسط) ── */}
                <main className="fb-main-stream">
                    {/* شريط البحث */}
                    <div className="fb-stream-header">
                        <div className="fb-search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="ابحث في عنوان أو وصف الملاحظة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="fb-search-box__clear" onClick={() => setSearchQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="fb-stream-header__info">
                            عدد الملاحظات: <span>{filteredItems.length}</span>
                        </div>
                    </div>

                    {/* قائمة الصفوف */}
                    <div className="fb-list-scroll">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="fb-skeleton fb-skeleton--row" />)
                        ) : listError ? (
                            <div className="fb-empty">
                                <AlertCircle size={44} className="fb-empty__icon" />
                                <div className="fb-empty__title">حدث خطأ</div>
                                <div className="fb-empty__desc">{listError}</div>
                                <button className="fb-btn-primary" onClick={() => load(1)}>إعادة المحاولة</button>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="fb-empty">
                                <Inbox size={44} className="fb-empty__icon" />
                                <div className="fb-empty__title">لا توجد ملاحظات مطابقة</div>
                                <div className="fb-empty__desc">
                                    {searchQuery || activeType !== 'all' || activeStatus !== 'all'
                                        ? 'جرّب تغيير خيارات البحث أو التصفية في العمود الجانبي.'
                                        : 'شاركنا أول اقتراح أو مشكلة لتطوير النظام.'}
                                </div>
                                {(searchQuery || activeType !== 'all' || activeStatus !== 'all') ? (
                                    <button className="fb-btn-ghost" onClick={() => { setSearchQuery(''); setActiveType('all'); setActiveStatus('all'); }}>
                                        إعادة ضبط التصفية
                                    </button>
                                ) : (
                                    <button className="fb-btn-primary" onClick={() => setModalOpen(true)}>
                                        <Plus size={16} /> إضافة ملاحظة
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="fb-row"
                                    onClick={() => setDetailItem(item)}
                                >
                                    <span className={`fb-badge fb-badge--type fb-badge--type-${item.type}`}>{item.type_label}</span>
                                    <span className="fb-row__title">{item.title || snippet(item.body, 80)}</span>
                                    <span className={`fb-badge ${resolutionStatusClass(item.resolution_status)}`}>
                                        {item.resolution_status_label}
                                    </span>
                                    {item.reward_status === 'awarded' && item.points_awarded > 0 && (
                                        <span className="fb-badge fb-badge--success">‎+{item.points_awarded}</span>
                                    )}
                                    {item.attachments.length > 0 && (
                                        <span className="fb-row__icon" title={`${item.attachments.length} مرفقات`}>
                                            <Paperclip size={13} /> {item.attachments.length}
                                        </span>
                                    )}
                                    {item.admin_comment && (
                                        <span className="fb-row__icon fb-row__icon--comment" title="يوجد ردّ من الفريق">
                                            <MessageSquare size={13} />
                                        </span>
                                    )}
                                    <span className="fb-row__date">{formatDate(item.created_at)}</span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* الترقيم */}
                    {lastPage > 1 && !loading && (
                        <div className="fb-list-pagination">
                            <button className="fb-page-btn" disabled={page <= 1} onClick={() => load(page - 1)} aria-label="السابق">
                                <ChevronRight size={16} />
                            </button>
                            <span className="fb-list-pagination__info">صفحة {page} من {lastPage}</span>
                            <button className="fb-page-btn" disabled={page >= lastPage} onClick={() => load(page + 1)} aria-label="التالي">
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}
                </main>

                {/* ── العمود الثالث: ملخّص المساهمات والنقاط (يسار) ── */}
                <aside className="fb-preview-pane">
                    <div className="fb-points-panel">
                        <div className="fb-points-panel__header">
                            <Award size={16} />
                            <span>ملخّص المساهمات</span>
                        </div>

                        {/* بطاقة الرصيد والمستوى */}
                        <div className="fb-points-summary">
                            <div className="fb-points-summary__top">
                                <div className="fb-points-summary__balance">
                                    <span className="fb-points-summary__num">{pointsBalance}</span>
                                    <span className="fb-points-summary__unit">نقطة مساهمة</span>
                                </div>
                                <span className="fb-points-summary__level">{levelDetails.name}</span>
                            </div>

                            {levelDetails.nextPoints > 0 && (
                                <div className="fb-progress">
                                    <div className="fb-progress__row">
                                        <span>المستوى التالي</span>
                                        <span>{pointsBalance} / {levelDetails.nextPoints}</span>
                                    </div>
                                    <div className="fb-progress__track">
                                        <div className="fb-progress__fill" style={{ width: `${levelDetails.progress}%` }} />
                                    </div>
                                    <div className="fb-progress__hint">
                                        يتبقّى {levelDetails.nextPoints - pointsBalance} نقطة للمستوى التالي
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* إحصاءات سريعة */}
                        <div className="fb-points-stats">
                            <div className="fb-points-stat">
                                <span className="fb-points-stat__num">{score?.total_submissions ?? 0}</span>
                                <span className="fb-points-stat__label">إجمالي المساهمات</span>
                            </div>
                            <div className="fb-points-stat">
                                <span className="fb-points-stat__num">{score?.accepted_count ?? 0}</span>
                                <span className="fb-points-stat__label">مقبولة</span>
                            </div>
                            <div className="fb-points-stat">
                                <span className="fb-points-stat__num">{score?.pending_count ?? 0}</span>
                                <span className="fb-points-stat__label">قيد المراجعة</span>
                            </div>
                        </div>

                        {/* سجل حركات النقاط */}
                        <div className="fb-tx">
                            <div className="fb-tx__header">
                                <History size={14} />
                                <span>آخر حركات النقاط</span>
                            </div>
                            <div className="fb-tx__list">
                                {score?.recent_transactions && score.recent_transactions.length > 0 ? (
                                    score.recent_transactions.map((tx) => (
                                        <div key={tx.id} className="fb-tx-item">
                                            <span className={`fb-tx-item__badge ${tx.points > 0 ? 'fb-tx-item__badge--plus' : ''}`}>
                                                {tx.points > 0 ? `+${tx.points}` : tx.points}
                                            </span>
                                            <div className="fb-tx-item__details">
                                                <div className="fb-tx-item__reason">{txReasonLabel(tx.reason)}</div>
                                                <div className="fb-tx-item__date">{formatDate(tx.created_at)}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="fb-tx__empty">لا توجد حركات نقاط حتى الآن.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {showWelcome && <WelcomeModal onContinue={dismissWelcome} />}

            {modalOpen && (
                <FeedbackModal
                    onClose={() => setModalOpen(false)}
                    onCreated={() => { setModalOpen(false); load(1); }}
                />
            )}

            {detailItem && (
                <FeedbackDetailModal
                    item={detailItem}
                    onClose={() => setDetailItem(null)}
                    onDelete={handleDelete}
                    onOpenLightbox={(atts, i) => setLightbox({ items: atts, index: i })}
                />
            )}

            {lightbox && (
                <Lightbox
                    attachments={lightbox.items}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onNavigate={(i) => setLightbox((lb) => (lb ? { ...lb, index: i } : lb))}
                />
            )}
        </div>
    );
};

// ─── النافذة الترحيبية ───────────────────────────────────

const WelcomeModal: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onContinue(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onContinue]);

    return (
        <div className="fb-modal-overlay" onClick={onContinue}>
            <div className="fb-welcome" onClick={(e) => e.stopPropagation()}>
                <div className="fb-welcome__icon"><Sparkles size={30} /></div>

                <h2 className="fb-welcome__title">هذا النظام… نظامك</h2>
                <p className="fb-welcome__lead">
                    أنت شريك أساسي في تطوير هذا النظام. بأفكارك واقتراحاتك تجعله أذكى،
                    وبملاحظاتك عن أي خلل تجعله أكثر دقّةً وأقلّ أخطاءً — وأروع تجربةً لك ولفريقك.
                </p>

                <div className="fb-welcome__points">
                    <div className="fb-welcome__point">
                        <span className="fb-welcome__point-icon"><Lightbulb size={18} /></span>
                        <div>
                            <div className="fb-welcome__point-title">شاركنا رؤيتك</div>
                            <div className="fb-welcome__point-desc">
                                كل فكرة أو اقتراح يسهم في تحسين تجربتك وتطوير النظام باستمرار.
                            </div>
                        </div>
                    </div>
                    <div className="fb-welcome__point">
                        <span className="fb-welcome__point-icon"><Award size={18} /></span>
                        <div>
                            <div className="fb-welcome__point-title">كل مساهمة لها رصيد</div>
                            <div className="fb-welcome__point-desc">
                                كل فكرة تشاركها أو مشكلة تُبلّغ عنها تُضاف كنقاط في رصيدك.
                            </div>
                        </div>
                    </div>
                    <div className="fb-welcome__point">
                        <span className="fb-welcome__point-icon"><Gift size={18} /></span>
                        <div>
                            <div className="fb-welcome__point-title">نقاطك تتحوّل إلى مزايا</div>
                            <div className="fb-welcome__point-desc">
                                تُستبدل نقاطك لاحقاً بمزايا أو خصومات أو إضافات على اشتراكك.
                            </div>
                        </div>
                    </div>
                </div>

                <button className="fb-btn-primary fb-welcome__cta" onClick={onContinue}>
                    استمرار
                </button>
            </div>
        </div>
    );
};

// ─── مودل تفاصيل الملاحظة ─────────────────────────────────

interface DetailModalProps {
    item: FeedbackItem;
    onClose: () => void;
    onDelete: (id: number) => void;
    onOpenLightbox: (attachments: FeedbackAttachment[], index: number) => void;
}

const FeedbackDetailModal: React.FC<DetailModalProps> = ({ item, onClose, onDelete, onOpenLightbox }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fb-modal-overlay" onClick={onClose}>
            <div className="fb-modal fb-modal--detail" onClick={(e) => e.stopPropagation()}>
                <div className="fb-modal__header">
                    <h2 className="fb-modal__title">
                        <span className={`fb-badge fb-badge--type fb-badge--type-${item.type}`}>{item.type_label}</span>
                        تفاصيل الملاحظة
                    </h2>
                    <button className="fb-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
                </div>

                <div className="fb-modal__body">
                    <div className="fb-detail__header-meta">
                        {item.category && <span className="fb-badge fb-badge--neutral">{item.category}</span>}
                        <span className={`fb-badge ${resolutionStatusClass(item.resolution_status)}`}>
                            {item.resolution_status_label}
                        </span>
                        {item.reward_status === 'awarded' && item.points_awarded > 0 && (
                            <span className="fb-badge fb-badge--success">‎+{item.points_awarded} نقطة</span>
                        )}
                        <span className="fb-detail__date-label">{formatDate(item.created_at)}</span>
                    </div>

                    {item.title && <h3 className="fb-detail__title">{item.title}</h3>}

                    <div className="fb-detail__body-content">{item.body}</div>

                    {item.attachments.length > 0 && (
                        <div className="fb-detail__attachments-section">
                            <div className="fb-detail__section-label">
                                <Paperclip size={13} /> المرفقات ({item.attachments.length})
                            </div>
                            <div className="fb-attachments">
                                {item.attachments.map((att, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="fb-attachment"
                                        onClick={() => onOpenLightbox(item.attachments, i)}
                                        title="فتح المرفق"
                                    >
                                        {att.kind === 'image' ? (
                                            <img src={att.url} alt="مرفق" loading="lazy" />
                                        ) : (
                                            <span className="fb-attachment__video">
                                                <VideoIcon size={24} />
                                                <span className="fb-attachment__play"><Play size={20} /></span>
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {item.admin_comment && (
                        <div className="fb-card__comment">
                            <div className="fb-card__comment-label">
                                <MessageSquare size={12} /> ردّ الفريق الإداري
                            </div>
                            <div className="fb-card__comment-text">{item.admin_comment}</div>
                        </div>
                    )}
                </div>

                {(item.resolution_status === 'new' || (item.reward_status === 'awarded' && item.points_awarded > 0)) && (
                    <div className="fb-modal__footer fb-modal__footer--detail">
                        {item.reward_status === 'awarded' && item.points_awarded > 0 && (
                            <span className="fb-detail__points-awarded">
                                <Trophy size={14} /> تم اعتماد {item.points_awarded} نقطة لهذه المساهمة
                            </span>
                        )}
                        {item.resolution_status === 'new' && (
                            <button
                                className="fb-btn-danger-ghost"
                                style={{ marginInlineStart: 'auto' }}
                                onClick={() => onDelete(item.id)}
                            >
                                <Trash2 size={14} /> حذف الملاحظة
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── الـ Lightbox (عرض الصور/الفيديو داخل الصفحة) ──────────

interface LightboxProps {
    attachments: FeedbackAttachment[];
    index: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ attachments, index, onClose, onNavigate }) => {
    const count = attachments.length;
    const current = attachments[index];

    const goPrev = useCallback(() => onNavigate((index - 1 + count) % count), [index, count, onNavigate]);
    const goNext = useCallback(() => onNavigate((index + 1) % count), [index, count, onNavigate]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goNext();   // RTL: السهم الأيسر = التالي
            else if (e.key === 'ArrowRight') goPrev();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, goPrev, goNext]);

    if (!current) return null;

    return (
        <div className="fb-lightbox" onClick={onClose}>
            <button className="fb-lightbox__close" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>

            {count > 1 && (
                <>
                    <button
                        className="fb-lightbox__nav fb-lightbox__nav--prev"
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        aria-label="السابق"
                    >
                        <ChevronRight size={24} />
                    </button>
                    <button
                        className="fb-lightbox__nav fb-lightbox__nav--next"
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        aria-label="التالي"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </>
            )}

            <div className="fb-lightbox__stage" onClick={(e) => e.stopPropagation()}>
                {current.kind === 'image' ? (
                    <img src={current.url} alt="مرفق" />
                ) : (
                    <video src={current.url} controls autoPlay playsInline />
                )}
            </div>

            {count > 1 && <div className="fb-lightbox__counter">{index + 1} / {count}</div>}
        </div>
    );
};

// ─── نافذة الإضافة ───────────────────────────────────────

interface ModalProps {
    onClose: () => void;
    onCreated: () => void;
}

interface PendingFile {
    file: File;
    preview: string | null; // معاينة الصور فقط
}

const FeedbackModal: React.FC<ModalProps> = ({ onClose, onCreated }) => {
    const [type, setType] = useState<FeedbackType>('suggestion');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // تنظيف روابط المعاينة عند الإغلاق لتفادي تسريب الذاكرة
    useEffect(() => () => { files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)); }, [files]);

    const addFiles = (selected: FileList | File[] | null) => {
        if (!selected) return;
        setError(null);
        setFiles((prev) => {
            const next = [...prev];
            for (const f of Array.from(selected)) {
                if (next.length >= MAX_FILES) { setError(`الحد الأقصى ${MAX_FILES} مرفقات`); break; }
                if (f.size > MAX_SIZE) { setError(`الملف "${f.name}" يتجاوز 15 ميجابايت`); continue; }
                const isImage = f.type.startsWith('image/');
                const isVideo = f.type === 'video/mp4' || f.type === 'video/quicktime';
                if (!isImage && !isVideo) { setError('يُسمح بالصور وفيديو MP4/MOV فقط'); continue; }
                next.push({ file: f, preview: isImage ? URL.createObjectURL(f) : null });
            }
            return next.slice(0, MAX_FILES);
        });
        if (fileRef.current) fileRef.current.value = '';
    };

    const removeFile = (idx: number) => {
        setFiles((prev) => {
            const target = prev[idx];
            if (target?.preview) URL.revokeObjectURL(target.preview);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        addFiles(e.dataTransfer.files);
    };

    const submit = async () => {
        setError(null);
        if (body.trim().length < 5) { setError('الوصف قصير جداً (5 أحرف على الأقل)'); return; }
        setSubmitting(true);
        try {
            await FeedbackService.create({
                type,
                title: title.trim() || null,
                category: category || null,
                body: body.trim(),
                attachments: files.map((f) => f.file),
            });
            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'تعذّر الإرسال');
            setSubmitting(false);
        }
    };

    return (
        <div className="fb-modal-overlay" onClick={onClose}>
            <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
                <div className="fb-modal__header">
                    <h2 className="fb-modal__title"><Lightbulb size={18} /> إضافة ملاحظة</h2>
                    <button className="fb-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
                </div>

                <div className="fb-modal__body">
                    {error && <div className="fb-alert fb-alert--error"><AlertCircle size={15} />{error}</div>}

                    <div className="fb-field">
                        <span className="fb-label">النوع</span>
                        <div className="fb-type-chips">
                            {FEEDBACK_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    className={`fb-type-chip ${type === t.value ? 'fb-type-chip--active' : ''}`}
                                    onClick={() => setType(t.value)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="fb-field-row">
                        <div className="fb-field">
                            <label className="fb-label" htmlFor="fb-title">عنوان مختصر (اختياري)</label>
                            <input id="fb-title" className="fb-input" value={title} maxLength={255}
                                onChange={(e) => setTitle(e.target.value)} placeholder="مثال: زر الحفظ لا يستجيب" />
                        </div>
                        <div className="fb-field">
                            <label className="fb-label" htmlFor="fb-cat">التصنيف (اختياري)</label>
                            <select id="fb-cat" className="fb-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="">— بدون —</option>
                                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="fb-field">
                        <label className="fb-label" htmlFor="fb-body">
                            الوصف
                            <span className="fb-label__counter">{body.length} / {BODY_MAX}</span>
                        </label>
                        <textarea id="fb-body" className="fb-textarea" value={body} maxLength={BODY_MAX}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="اشرح اقتراحك أو المشكلة بالتفصيل…" />
                    </div>

                    <div className="fb-field">
                        <span className="fb-label">مرفقات (اختياري — صور أو فيديو قصير)</span>
                        <div
                            className={`fb-dropzone ${dragActive ? 'fb-dropzone--active' : ''}`}
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={onDrop}
                        >
                            <UploadCloud size={26} />
                            <span className="fb-dropzone__title">اسحب الملفات هنا أو اضغط للاختيار</span>
                            <span className="fb-dropzone__hint">حتى {MAX_FILES} ملفات • كل ملف ≤ 15 ميجابايت • صور أو MP4/MOV</span>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple
                            style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />

                        {files.length > 0 && (
                            <div className="fb-previews">
                                {files.map((f, i) => (
                                    <div key={i} className="fb-preview">
                                        {f.preview
                                            ? <img src={f.preview} alt={f.file.name} />
                                            : <span className="fb-preview__video"><VideoIcon size={22} /></span>}
                                        <button type="button" className="fb-preview__remove"
                                            onClick={() => removeFile(i)} aria-label="إزالة"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="fb-modal__footer">
                    <button className="fb-btn-ghost" onClick={onClose} disabled={submitting}>إلغاء</button>
                    <button className="fb-btn-primary" onClick={submit} disabled={submitting}>
                        {submitting ? <><Loader2 size={15} className="fb-spin" /> جارٍ الإرسال…</> : <><Inbox size={15} /> إرسال</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Feedback;
