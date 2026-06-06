// زر إعدادات العرض (⚙) + نافذة منبثقة لتفعيل أعمدة اختيارية.
// يُستخدم في صفحتي القضايا والجلسات بجانب أزرار التحديث/الفلتر.
import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDisplayPreferences } from '../hooks/useDisplayPreferences';

const DisplaySettingsButton: React.FC = () => {
	const [open, setOpen] = useState(false);
	const { prefs, setPreference } = useDisplayPreferences();
	const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

	return (
		<div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				className="icon-btn"
				onClick={() => setOpen(o => !o)}
				title="إعدادات العرض"
				style={open ? { background: 'var(--law-navy-light, rgba(30,58,95,.08))', color: 'var(--law-navy)' } : undefined}
			>
				<Settings size={16} />
			</button>

			{open && (
				<div
					style={{
						position: 'absolute',
						top: 'calc(100% + 6px)',
						insetInlineEnd: 0,
						zIndex: 50,
						minWidth: 240,
						background: 'var(--dashboard-card, #fff)',
						border: '1px solid var(--color-border, #e2e8f0)',
						borderRadius: 10,
						boxShadow: '0 8px 28px rgba(0,0,0,.14)',
						padding: 8,
					}}
				>
					<div style={{
						fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)',
						padding: '4px 8px 6px', letterSpacing: '.02em',
					}}>
						إعدادات العرض
					</div>

					<label
						style={{
							display: 'flex', alignItems: 'center', gap: 10,
							padding: '8px', borderRadius: 8, cursor: 'pointer',
							fontSize: 13, color: 'var(--color-text-primary, #1e293b)',
						}}
						onMouseEnter={e => (e.currentTarget.style.background = 'var(--law-navy-light, rgba(30,58,95,.06))')}
						onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
					>
						<input
							type="checkbox"
							checked={prefs.showOpponent}
							onChange={e => setPreference('showOpponent', e.target.checked)}
							style={{ width: 16, height: 16, accentColor: 'var(--law-navy, #1e3a5f)', cursor: 'pointer' }}
						/>
						<span>إظهار اسم الخصم في الأطراف</span>
					</label>
				</div>
			)}
		</div>
	);
};

export default DisplaySettingsButton;
