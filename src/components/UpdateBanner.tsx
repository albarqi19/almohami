import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

const UpdateBanner: React.FC = () => {
    const { isUpdateAvailable, isUpdating, applyUpdate, dismissUpdate } = useAppUpdate();

    return (
        <AnimatePresence>
            {isUpdateAvailable && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: 'env(safe-area-inset-top, 0px)',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            pointerEvents: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            margin: '10px 16px 0',
                            padding: '6px 14px 6px 8px',
                            borderRadius: '999px',
                            background: 'var(--color-primary)',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
                            direction: 'rtl',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 'var(--font-size-xs, 12px)',
                                fontWeight: 500,
                                color: 'white',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            تحديث جديد متاح
                        </span>

                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={applyUpdate}
                            disabled={isUpdating}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '999px',
                                background: 'white',
                                color: 'var(--color-primary)',
                                fontSize: 'var(--font-size-xs, 12px)',
                                fontWeight: 600,
                                border: 'none',
                                cursor: isUpdating ? 'wait' : 'pointer',
                                opacity: isUpdating ? 0.7 : 1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <RefreshCw
                                size={13}
                                style={{
                                    animation: isUpdating ? 'spin 1s linear infinite' : 'none',
                                }}
                            />
                            {isUpdating ? 'جاري التحديث...' : 'تحديث'}
                        </motion.button>

                        <button
                            onClick={dismissUpdate}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                padding: 0,
                            }}
                            title="إغلاق (سيظهر لاحقاً)"
                        >
                            <X size={13} color="white" />
                        </button>
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
