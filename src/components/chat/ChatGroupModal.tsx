import React, { useMemo, useState } from 'react';
import { X, Check, Trash2, UserMinus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { chatService, type ChatContact, type ChatConversation } from '../../services/chatService';

interface ChatGroupModalProps {
    mode: 'create' | 'edit';
    conversation?: ChatConversation;
    contacts: ChatContact[];
    currentUserId: number;
    onClose: () => void;
    /** يُستدعى بعد الحفظ — بمعرّف المحادثة لفتحها مباشرة */
    onSaved: (conversationId?: number) => void | Promise<void>;
    onDeleted: () => void | Promise<void>;
}

/**
 * إنشاء قروب أو إدارته: الاسم، إضافة أعضاء، إزالتهم، وحذف القروب.
 * لا يُفتح في وضع التعديل إلا لمن يملك الإدارة (can_manage من الباك).
 */
const ChatGroupModal: React.FC<ChatGroupModalProps> = ({
    mode,
    conversation,
    contacts,
    currentUserId,
    onClose,
    onSaved,
    onDeleted,
}) => {
    const [name, setName] = useState(conversation?.name ?? '');
    const [selected, setSelected] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const memberIds = useMemo(
        () => new Set((conversation?.participants ?? []).map(p => p.id)),
        [conversation],
    );

    // في التعديل نعرض من ليس عضواً بعد؛ في الإنشاء كل الزملاء
    const selectableContacts = contacts
        .filter(contact => (mode === 'edit' ? !memberIds.has(contact.id) : true))
        .filter(contact => contact.name.toLowerCase().includes(search.trim().toLowerCase()));

    const toggle = (id: number) => {
        setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error('اكتب اسم القروب');
            return;
        }
        if (selected.length === 0) {
            toast.error('اختر عضواً واحداً على الأقل');
            return;
        }

        setIsSaving(true);
        try {
            const created = await chatService.createGroup(trimmed, selected);
            toast.success('أُنشئ القروب');
            await onSaved(created.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّر إنشاء القروب');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!conversation) return;

        const trimmed = name.trim();
        if (!trimmed) {
            toast.error('اسم القروب مطلوب');
            return;
        }

        setIsSaving(true);
        try {
            if (trimmed !== conversation.name) {
                await chatService.renameGroup(conversation.id, trimmed);
            }
            if (selected.length > 0) {
                await chatService.addMembers(conversation.id, selected);
            }
            toast.success('حُفظت التعديلات');
            await onSaved(conversation.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّر حفظ التعديلات');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveMember = async (userId: number, memberName: string) => {
        if (!conversation) return;
        if (!window.confirm(`إزالة ${memberName} من القروب؟`)) return;

        try {
            await chatService.removeMember(conversation.id, userId);
            toast.success('أُزيل العضو');
            await onSaved(conversation.id);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّرت إزالة العضو');
        }
    };

    const handleDelete = async () => {
        if (!conversation) return;
        if (!window.confirm(`حذف «${conversation.title}» نهائياً؟ لن يصل أعضاؤه إليه بعد الآن.`)) return;

        setIsSaving(true);
        try {
            await chatService.deleteGroup(conversation.id);
            toast.success('حُذف القروب');
            await onDeleted();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّر حذف القروب');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="team-chat-modal-overlay" onClick={onClose}>
            <div className="team-chat-modal" onClick={e => e.stopPropagation()}>
                <header className="team-chat-modal__head">
                    <strong>{mode === 'create' ? 'قروب جديد' : 'إعدادات القروب'}</strong>
                    <button onClick={onClose} title="إغلاق">
                        <X size={16} />
                    </button>
                </header>

                <div className="team-chat-modal__body">
                    <label className="team-chat-field">
                        <span>اسم القروب</span>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="مثال: فريق القضايا التجارية"
                            maxLength={100}
                            autoFocus={mode === 'create'}
                        />
                    </label>

                    {mode === 'edit' && conversation && (
                        <div className="team-chat-field">
                            <span>الأعضاء الحاليون ({conversation.participants.length})</span>
                            <div className="team-chat-members">
                                {conversation.participants.map(participant => (
                                    <div key={participant.id} className="team-chat-member">
                                        <span>
                                            {participant.name}
                                            {participant.chat_role === 'owner' && (
                                                <em className="team-chat-member__tag">مالك</em>
                                            )}
                                        </span>
                                        {participant.id !== currentUserId && (
                                            <button
                                                onClick={() =>
                                                    void handleRemoveMember(participant.id, participant.name)
                                                }
                                                title="إزالة من القروب"
                                            >
                                                <UserMinus size={13} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="team-chat-field">
                        <span>{mode === 'create' ? 'اختر الأعضاء' : 'إضافة أعضاء'}</span>

                        <div className="team-chat-search is-inline">
                            <Search size={14} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="ابحث عن زميل…"
                            />
                        </div>

                        <div className="team-chat-picker">
                            {selectableContacts.length === 0 ? (
                                <p className="team-chat-picker__empty">
                                    {search.trim() ? 'لا نتائج' : 'لا زملاء متاحين للإضافة'}
                                </p>
                            ) : (
                                selectableContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        className={`team-chat-pick ${selected.includes(contact.id) ? 'is-on' : ''}`}
                                        onClick={() => toggle(contact.id)}
                                    >
                                        <span className="team-chat-pick__check">
                                            {selected.includes(contact.id) && <Check size={12} />}
                                        </span>
                                        <span className="team-chat-pick__name">{contact.name}</span>
                                        <span className="team-chat-pick__role">{contact.role ?? ''}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <footer className="team-chat-modal__foot">
                    {mode === 'edit' && (
                        <button className="team-chat-btn is-danger" onClick={() => void handleDelete()} disabled={isSaving}>
                            <Trash2 size={13} />
                            حذف القروب
                        </button>
                    )}
                    <div className="team-chat-modal__actions">
                        <button className="team-chat-btn" onClick={onClose} disabled={isSaving}>
                            إلغاء
                        </button>
                        <button
                            className="team-chat-btn is-primary"
                            onClick={() => void (mode === 'create' ? handleCreate() : handleUpdate())}
                            disabled={isSaving}
                        >
                            {isSaving ? 'جارٍ الحفظ…' : mode === 'create' ? 'إنشاء' : 'حفظ'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ChatGroupModal;
