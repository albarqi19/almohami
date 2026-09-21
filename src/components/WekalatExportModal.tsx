import React, { useState } from 'react';
import { Download, X, Loader2, Eraser } from 'lucide-react';
import Modal from './Modal';
import { downloadXlsx, compactFilters } from '../utils/exportXlsx';

// فلاتر تصدير الوكالات — نفس مفاتيح قائمة الوكالات كي يُصدَّر ما يُعرض
interface ExportFilters {
	status: string;
	search: string;
	active_only: boolean;
	archived: '0' | '1' | 'all';
}

const EMPTY_FILTERS: ExportFilters = {
	status: '',
	search: '',
	active_only: false,
	archived: '0',
};

// نفس قائمة حالات صفحة الوكالات
const STATUS_OPTIONS = ['معتمدة', 'منتهية', 'مفسوخة', 'مفسوخة كلياً', 'قيد الاعتماد', 'موقوفة'];

interface WekalatExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	/** الفلاتر المعروضة حالياً في الصفحة — تُستعمل قيماً ابتدائية */
	defaults?: Partial<ExportFilters>;
}

const fieldLabelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: 11,
	fontWeight: 600,
	color: 'var(--color-text-secondary)',
	marginBottom: 4,
};

const WekalatExportModal: React.FC<WekalatExportModalProps> = ({ isOpen, onClose, defaults }) => {
	const [filters, setFilters] = useState<ExportFilters>({ ...EMPTY_FILTERS, ...defaults });
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const set = <K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) =>
		setFilters(prev => ({ ...prev, [key]: value }));

	const activeCount =
		(filters.status ? 1 : 0) +
		(filters.search.trim() ? 1 : 0) +
		(filters.active_only ? 1 : 0) +
		(filters.archived !== '0' ? 1 : 0);

	const handleExport = async () => {
		setExporting(true);
		setError(null);

		try {
			// archived تُرسل دائماً: قيمتها '0' معنى لا فراغ
			await downloadXlsx(
				'/najiz/wekalat/export',
				{ ...compactFilters({ ...filters, search: filters.search.trim() }), archived: filters.archived },
				'الوكالات',
			);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير');
		} finally {
			setExporting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="تصدير الوكالات (Excel)" size="lg">
			<div className="client-export-modal">
				<p className="client-export-modal__hint">
					حدّد الفلاتر المطلوبة، أو اتركها فارغة لتصدير جميع الوكالات.
				</p>

				{error && (
					<div style={{
						background: 'rgba(239,68,68,.08)', color: 'var(--status-red, #ef4444)',
						border: '1px solid rgba(239,68,68,.25)', borderRadius: 8,
						padding: '8px 12px', fontSize: 12, marginBottom: 10,
					}}>
						{error}
					</div>
				)}

				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
					gap: 12,
					marginBottom: 12,
				}}>
					<div>
						<label style={fieldLabelStyle}>الحالة</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.status}
							onChange={(e) => set('status', e.target.value)}>
							<option value="">كل الحالات</option>
							{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>المؤرشفة</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.archived}
							onChange={(e) => set('archived', e.target.value as ExportFilters['archived'])}>
							<option value="0">بلا المؤرشفة</option>
							<option value="all">تضمين المؤرشفة</option>
							<option value="1">المؤرشفة فقط</option>
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>بحث بالرقم أو الاسم أو الشركة</label>
						<input type="text" className="filter-select" style={{ width: '100%' }} value={filters.search}
							placeholder="اتركه فارغاً للكل"
							onChange={(e) => set('search', e.target.value)} />
					</div>
				</div>

				<div style={{
					display: 'flex', gap: 16,
					padding: '10px 12px',
					background: 'var(--dashboard-card, rgba(30,58,95,.04))',
					border: '1px solid var(--color-border)',
					borderRadius: 8,
				}}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
						<input type="checkbox" checked={filters.active_only}
							onChange={(e) => set('active_only', e.target.checked)} />
						السارية فقط
					</label>
				</div>

				<div className="client-export-modal__divider" />

				<div className="client-export-modal__actions" style={{ alignItems: 'center' }}>
					{activeCount > 0 && (
						<button
							type="button"
							className="client-export-modal__btn"
							onClick={() => setFilters(EMPTY_FILTERS)}
							disabled={exporting}
							style={{ marginInlineEnd: 'auto' }}
						>
							<Eraser size={14} /> مسح الفلاتر ({activeCount})
						</button>
					)}
					<button type="button" className="client-export-modal__btn" onClick={onClose} disabled={exporting}>
						<X size={14} /> إلغاء
					</button>
					<button
						type="button"
						className="client-export-modal__btn client-export-modal__btn--primary"
						onClick={handleExport}
						disabled={exporting}
					>
						{exporting ? <Loader2 size={14} className="spinning" /> : <Download size={14} />}
						{exporting ? 'جاري التصدير...' : activeCount > 0 ? 'تصدير حسب الفلاتر' : 'تصدير الكل'}
					</button>
				</div>
			</div>
		</Modal>
	);
};

export default WekalatExportModal;
