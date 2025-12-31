import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Download } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

const UpdateBanner: React.FC = () => {
    const { isUpdateAvailable, isUpdating, applyUpdate, dismissUpdate } = useAppUpdate();

    return (
        <AnimatePresence>
            {isUpdateAvailable && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        padding: '0 16px',
                        paddingTop: 'env(safe-area-inset-top, 0px)',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '600px',
                            margin: '12px auto',
                            padding: '14px 18px',
                            borderRadius: 'var(--radius-md, 16px)',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            direction: 'rtl',
                        }}
                    >
                        {/* أيقونة التحديث */}
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Download size={22} color="white" />
                        </div>

                        {/* النص */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 'var(--font-size-sm, 13px)',
                                    fontWeight: 600,
                                    color: 'white',
                                    marginBottom: '2px',
                                }}
                            >
                                🚀 تحديث جديد متاح!
                            </div>
                            <div
                                style={{
                                    fontSize: 'var(--font-size-xs, 12px)',
                                    color: 'rgba(255, 255, 255, 0.85)',
                                }}
                            >
                                اضغط للتحديث والحصول على آخر الميزات والتحسينات
                            </div>
                        </div>

                        {/* الأزرار */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {/* زر التحديث */}
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={applyUpdate}
                                disabled={isUpdating}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 18px',
                                    borderRadius: 'var(--radius-xs, 8px)',
                                    background: 'white',
                                    color: 'var(--color-primary)',
                                    fontSize: 'var(--font-size-sm, 13px)',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: isUpdating ? 'wait' : 'pointer',
                                    opacity: isUpdating ? 0.7 : 1,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <RefreshCw
                                    size={16}
                                    style={{
                                        animation: isUpdating ? 'spin 1s linear infinite' : 'none',
                                    }}
                                />
                                {isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}
                            </motion.button>

                            {/* زر الإغلاق */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={dismissUpdate}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s ease',
                                }}
                                title="إغلاق (سيظهر لاحقاً)"
                            >
                                <X size={18} color="white" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// Keyframes للـ animation
// ============================================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-update-banner]')) {
    styleSheet.setAttribute('data-update-banner', 'true');
    document.head.appendChild(styleSheet);
}

export default UpdateBanner;
