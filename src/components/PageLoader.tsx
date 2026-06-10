import React from 'react';

/**
 * PageLoader — مؤشر تحميل خفيف لأجزاء التطبيق المؤجلة (code-splitting)
 * بلا اعتماد على أي CSS خارجي ليبقى ضمن الحزمة الأولى صغيراً
 */
const PageLoader: React.FC<{ full?: boolean }> = ({ full }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: full ? '100vh' : '40vh',
        }}
        role="status"
        aria-label="جاري التحميل"
    >
        <div
            style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '3px solid rgba(21, 42, 53, 0.15)',
                borderTopColor: '#152a35',
                animation: 'page-loader-spin 0.8s linear infinite',
            }}
        />
        <style>{'@keyframes page-loader-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
);

export default PageLoader;
