import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserService, type User } from '../services/UserService';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'اكتب تعليقاً... استخدم @ للإشارة',
  disabled = false,
  className = ''
}) => {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // تحميل المستخدمين
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await UserService.getAllUsers({ limit: 100 });
      const usersData = response.data || [];
      setUsers(usersData.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.role
      })));
    } catch (error) {
      console.error('Failed to load users for mentions:', error);
    }
  };

  // فلترة المستخدمين حسب البحث
  useEffect(() => {
    if (mentionSearch) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(mentionSearch.toLowerCase())
      );
      setFilteredUsers(filtered.slice(0, 5));
      setSelectedIndex(0);
    } else {
      setFilteredUsers(users.slice(0, 5));
      setSelectedIndex(0);
    }
  }, [mentionSearch, users]);

  // حساب موضع قائمة الـ mentions
  const calculateMentionPosition = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // إنشاء عنصر مؤقت لحساب موضع الكرسور
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      width: ${style.width};
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
    `;

    const textBeforeCursor = value.substring(0, cursorPosition);
    mirror.textContent = textBeforeCursor;

    const span = document.createElement('span');
    span.textContent = '|';
    mirror.appendChild(span);

    document.body.appendChild(mirror);

    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    document.body.removeChild(mirror);

    // حساب الموضع النسبي
    const top = spanRect.top - mirrorRect.top + textarea.scrollTop;
    const left = spanRect.left - mirrorRect.left;

    setMentionPosition({
      top: Math.min(top + 24, textarea.offsetHeight - 10),
      left: Math.min(left, textarea.offsetWidth - 200)
    });
  }, [value, cursorPosition]);

  // التعامل مع تغيير النص
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // البحث عن @ قبل موضع الكرسور
    const textBeforeCursor = newValue.substring(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // التأكد من عدم وجود مسافة بعد @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentionList(true);
        calculateMentionPosition();
        return;
      }
    }

    setShowMentionList(false);
    setMentionSearch('');
  };

  // اختيار مستخدم من القائمة
  const selectUser = (user: MentionUser) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeMention = value.substring(0, lastAtIndex);
      const afterCursor = value.substring(cursorPosition);

      // إضافة الاسم مع @ في البداية ومسافة في النهاية
      const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
      onChange(newValue);

      // تحريك الكرسور بعد الاسم
      const newCursorPos = lastAtIndex + user.name.length + 2;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }

    setShowMentionList(false);
    setMentionSearch('');
  };

  // التعامل مع لوحة المفاتيح
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectUser(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionListRef.current &&
        !mentionListRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // الحصول على الأحرف الأولى من الاسم
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  // ترجمة الدور
  const getRoleLabel = (role?: string) => {
    const roles: Record<string, string> = {
      admin: 'مدير',
      lawyer: 'محامي',
      secretary: 'سكرتير',
      accountant: 'محاسب',
      client: 'عميل'
    };
    return role ? roles[role] || role : '';
  };

  return (
    <div className={`mention-input-container ${className}`}>
      <textarea
        ref={textareaRef}
        className="mention-input__textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />

      {showMentionList && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="mention-input__list"
          style={{
            top: mentionPosition.top,
            left: mentionPosition.left
          }}
        >
          <div className="mention-input__list-header">
            الموظفون
          </div>
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              className={`mention-input__item ${index === selectedIndex ? 'mention-input__item--selected' : ''}`}
              onClick={() => selectUser(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="mention-input__avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="mention-input__info">
                <span className="mention-input__name">{user.name}</span>
                {user.role && (
                  <span className="mention-input__role">{getRoleLabel(user.role)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .mention-input-container {
          position: relative;
          width: 100%;
        }

        .mention-input__textarea {
          width: 100%;
          min-height: 80px;
          padding: var(--space-3, 12px);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-md, 8px);
          font-size: var(--font-size-sm, 14px);
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
          background: var(--color-surface, #fff);
          color: var(--color-text, #1a1a1a);
          transition: border-color var(--transition-fast, 120ms ease);
        }

        .mention-input__textarea:focus {
          outline: none;
          border-color: var(--color-primary, #0A192F);
        }

        .mention-input__textarea::placeholder {
          color: var(--color-text-secondary, #999);
        }

        .mention-input__textarea:disabled {
          background: var(--color-surface-subtle, #f8f9fa);
          cursor: not-allowed;
        }

        .mention-input__list {
          position: absolute;
          z-index: 1000;
          min-width: 220px;
          max-width: 280px;
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-md, 8px);
          box-shadow: var(--shadow-lg, 0 8px 30px rgba(0, 0, 0, 0.12));
          overflow: hidden;
        }

        .mention-input__list-header {
          padding: var(--space-2, 8px) var(--space-3, 12px);
          font-size: var(--font-size-xs, 11px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-text-secondary, #666);
          background: var(--color-surface-subtle, #f8f9fa);
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .mention-input__item {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          width: 100%;
          padding: var(--space-2, 8px) var(--space-3, 12px);
          background: none;
          border: none;
          cursor: pointer;
          transition: background var(--transition-fast, 120ms ease);
          text-align: right;
        }

        .mention-input__item:hover,
        .mention-input__item--selected {
          background: var(--color-primary-soft, rgba(10, 25, 47, 0.08));
        }

        .mention-input__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-primary, #0A192F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-xs, 11px);
          font-weight: var(--font-weight-semibold, 600);
          flex-shrink: 0;
          overflow: hidden;
        }

        .mention-input__avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mention-input__info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }

        .mention-input__name {
          font-size: var(--font-size-sm, 13px);
          font-weight: var(--font-weight-medium, 500);
          color: var(--color-text, #1a1a1a);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .mention-input__role {
          font-size: var(--font-size-xs, 11px);
          color: var(--color-text-secondary, #666);
        }

        /* Dark Theme */
        body.dark .mention-input__textarea {
          background: var(--color-surface);
          border-color: var(--color-border);
          color: var(--color-text);
        }

        body.dark .mention-input__list {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        body.dark .mention-input__list-header {
          background: var(--color-surface-subtle);
          border-color: var(--color-border);
        }

        body.dark .mention-input__item:hover,
        body.dark .mention-input__item--selected {
          background: var(--color-surface-subtle);
        }

        body.dark .mention-input__name {
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
};

export default MentionInput;
