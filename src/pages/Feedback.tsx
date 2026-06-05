import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Plus, X, Trash2, Trophy, Lightbulb, Inbox, Paperclip,
    Image as ImageIcon, Video as VideoIcon, Loader2,
} from 'lucide-react';
import {
    FeedbackService, FEEDBACK_TYPES, resolutionStatusClass,
    type FeedbackItem, type FeedbackScore, type FeedbackType,
} from '../services/feedbackService';
import '../styles/feedback-page.css';

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

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return iso;
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

    const handleDelete = async (id: number) => {
        if (!window.confirm('حذف هذه الملاحظة؟')) return;
        try {
            await FeedbackService.remove(id);
            load(page);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'تعذّر الحذف');
        }
    };

    return (
        <div className="fb-page">
            {/* الرأس */}
            <div className="fb-header">
                <div className="fb-header__titles">
                    <h1 className="fb-title">الملاحظات والاقتراحات</h1>
                    <span className="fb-temp-badge">مؤقتة</span>
                </div>
                <div className="fb-header__actions">
                    <span className="fb-points-badge">
                        <Trophy size={15} /> نقاطك: {score?.points_balance ?? 0}
                    </span>
                    <button className="fb-btn fb-btn--primary" onClick={() => setModalOpen(true)}>
                        <Plus size={16} /> إضافة ملاحظة
                    </button>
                </div>
            </div>

            {/* شريط الإحصاء */}
            <div className="fb-stats">
                <div className="fb-stat">
                    <div className="fb-stat__value">{score?.total_submissions ?? 0}</div>
                    <div className="fb-stat__label">مساهماتي</div>
                </div>
                <div className="fb-stat">
                    <div className="fb-stat__value">{score?.accepted_count ?? 0}</div>
                    <div className="fb-stat__label">مقبولة ومُكافأة</div>
                </div>
                <div className="fb-stat">
                    <div className="fb-stat__value">{score?.pending_count ?? 0}</div>
                    <div className="fb-stat__label">قيد المراجعة</div>
                </div>
                <div className="fb-stat">
                    <div className="fb-stat__value">{score?.points_balance ?? 0}</div>
                    <div className="fb-stat__label">مجموع النقاط</div>
                </div>
            </div>

            {/* القائمة */}
            {loading ? (
                <div className="fb-empty"><Loader2 className="fb-empty__icon" size={40} /><div>جارٍ التحميل…</div></div>
            ) : listError ? (
                <div className="fb-empty">{listError}</div>
            ) : items.length === 0 ? (
                <div className="fb-empty">
                    <Lightbulb className="fb-empty__icon" size={48} />
                    <div>لا توجد ملاحظات بعد — شاركنا أول اقتراح أو مشكلة لتطوير النظام!</div>
                </div>
            ) : (
                <div className="fb-list">
                    {items.map((item) => (
                        <article key={item.id} className="fb-card">
                            <div className="fb-card__top">
                                <span className="fb-badge fb-badge--type">{item.type_label}</span>
                                {item.category && <span className="fb-badge fb-badge--neutral">{item.category}</span>}
                                <span className={`fb-badge ${resolutionStatusClass(item.resolution_status)}`}>
                                    {item.resolution_status_label}
                                </span>
                                {item.reward_status === 'awarded' && (
                                    <span className="fb-badge fb-badge--success">+{item.points_awarded} نقطة</span>
                                )}
                                <span className="fb-card__date">{formatDate(item.created_at)}</span>
                            </div>

                            {item.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</div>}
                            <div className="fb-card__body">{item.body}</div>

                            {item.attachments.length > 0 && (
                                <div className="fb-attachments">
                                    {item.attachments.map((att, i) => (
                                        <a key={i} className="fb-attachment" href={att.url} target="_blank" rel="noreferrer" title="فتح المرفق">
                                            {att.kind === 'image'
                                                ? <img src={att.url} alt="مرفق" loading="lazy" />
                                                : <VideoIcon size={22} />}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {item.admin_comment && (
                                <div className="fb-card__comment">
                                    <div className="fb-card__comment-label">ردّ الفريق</div>
                                    {item.admin_comment}
                                </div>
                            )}

                            <div className="fb-card__footer">
                                {item.points_awarded > 0 && (
                                    <span className="fb-card__points">🏅 {item.points_awarded} نقطة</span>
                                )}
                                {item.resolution_status === 'new' && (
                                    <button className="fb-btn fb-btn--danger-ghost" onClick={() => handleDelete(item.id)} title="حذف">
                                        <Trash2 size={14} /> حذف
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* ترقيم بسيط */}
            {!loading && lastPage > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="fb-btn fb-btn--ghost" disabled={page <= 1} onClick={() => load(page - 1)}>السابق</button>
                    <span className="fb-hint" style={{ alignSelf: 'center' }}>{page} / {lastPage}</span>
                    <button className="fb-btn fb-btn--ghost" disabled={page >= lastPage} onClick={() => load(page + 1)}>التالي</button>
                </div>
            )}

            {modalOpen && (
                <FeedbackModal
                    onClose={() => setModalOpen(false)}
                    onCreated={() => { setModalOpen(false); load(1); }}
                />
            )}
        </div>
    );
};

// ─── نافذة الإضافة ───────────────────────────────────────

interface ModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const FeedbackModal: React.FC<ModalProps> = ({ onClose, onCreated }) => {
    const [type, setType] = useState<FeedbackType>('suggestion');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const addFiles = (selected: FileList | null) => {
        if (!selected) return;
        const next = [...files];
        for (const f of Array.from(selected)) {
            if (next.length >= MAX_FILES) { setError(`الحد الأقصى ${MAX_FILES} مرفقات`); break; }
            if (f.size > MAX_SIZE) { setError(`الملف "${f.name}" يتجاوز 15 ميجابايت`); continue; }
            const ok = f.type.startsWith('image/') || f.type === 'video/mp4' || f.type === 'video/quicktime';
            if (!ok) { setError('يُسمح بالصور وفيديو MP4/MOV فقط'); continue; }
            next.push(f);
        }
        setFiles(next.slice(0, MAX_FILES));
        if (fileRef.current) fileRef.current.value = '';
    };

    const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

    const submit = async () => {
        setError(null);
        if (body.trim().length < 5) { setError('الوصف قصير جداً'); return; }
        setSubmitting(true);
        try {
            await FeedbackService.create({
                type,
                title: title.trim() || null,
                category: category || null,
                body: body.trim(),
                attachments: files,
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
                    <h2 className="fb-modal__title">إضافة ملاحظة</h2>
                    <button className="fb-modal__close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
                </div>

                <div className="fb-modal__body">
                    {error && <div className="fb-alert fb-alert--error">{error}</div>}

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

                    <div className="fb-field">
                        <label className="fb-label" htmlFor="fb-body">الوصف</label>
                        <textarea id="fb-body" className="fb-textarea" value={body} maxLength={5000}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="اشرح اقتراحك أو المشكلة بالتفصيل…" />
                    </div>

                    <div className="fb-field">
                        <span className="fb-label">مرفقات (اختياري — صور أو فيديو قصير)</span>
                        <div className="fb-file-row">
                            <button type="button" className="fb-btn fb-btn--ghost" onClick={() => fileRef.current?.click()}>
                                <Paperclip size={15} /> إرفاق ملف
                            </button>
                            {files.map((f, i) => (
                                <span key={i} className="fb-file-pill">
                                    {f.type.startsWith('image/') ? <ImageIcon size={13} /> : <VideoIcon size={13} />}
                                    {f.name.length > 18 ? f.name.slice(0, 18) + '…' : f.name}
                                    <button type="button" onClick={() => removeFile(i)} aria-label="إزالة"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple
                            style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
                        <span className="fb-hint">حتى {MAX_FILES} ملفات، وكل ملف لا يتجاوز 15 ميجابايت.</span>
                    </div>
                </div>

                <div className="fb-modal__footer">
                    <button className="fb-btn fb-btn--ghost" onClick={onClose} disabled={submitting}>إلغاء</button>
                    <button className="fb-btn fb-btn--primary" onClick={submit} disabled={submitting}>
                        {submitting ? <><Loader2 size={15} className="fb-spin" /> جارٍ الإرسال…</> : <><Inbox size={15} /> إرسال</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Feedback;
