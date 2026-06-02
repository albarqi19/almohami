import React, { useMemo } from 'react';
import { sanitizeHtml, isHtmlEmpty } from '../../utils/sanitizeHtml';

interface LegalRichTextProps {
  /** محتوى HTML المخزَّن (مخرجات محرّر TipTap) */
  html?: string | null;
  /** نص يظهر عند غياب المحتوى */
  emptyText?: string;
  className?: string;
}

/**
 * عرض آمن للمحتوى الغني (HTML) مع تنسيق مستندي عربي RTL.
 * يُستخدم في وضع العرض داخل بطاقات الكتابة وفي صفحة التفاصيل.
 */
const LegalRichText: React.FC<LegalRichTextProps> = ({ html, emptyText = 'لا يوجد محتوى بعد', className = '' }) => {
  const safe = useMemo(() => sanitizeHtml(html), [html]);

  if (isHtmlEmpty(html)) {
    return <p className="lsd-rich-empty">{emptyText}</p>;
  }

  return (
    <>
      <div
        className={`lsd-rich-content ${className}`}
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
      <style>{`
        .lsd-rich-empty {
          color: var(--color-text-light, #9ca3af);
          font-size: 14px;
          margin: 0;
          padding: 4px 0;
        }
        .lsd-rich-content {
          font-size: 15px;
          line-height: 1.85;
          color: var(--color-text, #1f2937);
          word-break: break-word;
        }
        .lsd-rich-content > *:first-child { margin-top: 0; }
        .lsd-rich-content > *:last-child { margin-bottom: 0; }
        .lsd-rich-content p { margin: 0 0 0.6em; }
        .lsd-rich-content h1 { font-size: 1.6em; font-weight: 700; margin: 0.8em 0 0.4em; }
        .lsd-rich-content h2 { font-size: 1.35em; font-weight: 700; margin: 0.8em 0 0.4em; }
        .lsd-rich-content h3 { font-size: 1.15em; font-weight: 600; margin: 0.7em 0 0.3em; }
        .lsd-rich-content h4 { font-size: 1.05em; font-weight: 600; margin: 0.6em 0 0.3em; }
        .lsd-rich-content ul,
        .lsd-rich-content ol { padding-right: 1.6em; margin: 0 0 0.6em; }
        .lsd-rich-content li { margin: 0.2em 0; }
        .lsd-rich-content blockquote {
          border-right: 4px solid var(--color-primary, #2563eb);
          padding: 8px 14px;
          margin: 0.8em 0;
          background: var(--color-background, #f8fafc);
          border-radius: 0 8px 8px 0;
          color: #475569;
        }
        .lsd-rich-content a {
          color: var(--color-primary, #2563eb);
          text-decoration: underline;
        }
        .lsd-rich-content pre,
        .lsd-rich-content code {
          font-family: 'Monaco', 'Menlo', monospace;
          direction: ltr;
          text-align: left;
        }
        .lsd-rich-content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .lsd-rich-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.8em 0;
        }
        .lsd-rich-content th,
        .lsd-rich-content td {
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 6px 10px;
          text-align: right;
        }
        .lsd-rich-content th {
          background: var(--color-background, #f8fafc);
          font-weight: 600;
        }
        .lsd-rich-content mark {
          padding: 0 2px;
          border-radius: 2px;
        }
        body.dark .lsd-rich-content { color: #e5e7eb; }
        body.dark .lsd-rich-content blockquote { background: #1f2937; color: #cbd5e1; }
        body.dark .lsd-rich-content th { background: #1f2937; }
      `}</style>
    </>
  );
};

export default LegalRichText;
