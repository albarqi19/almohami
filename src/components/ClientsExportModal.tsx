import React, { useState } from 'react';
import { Download, X, Loader2, Eraser } from 'lucide-react';
import Modal from './Modal';
import { downloadXlsx, compactFilters } from '../utils/exportXlsx';

// فلاتر تصدير العملاء — نفس مفاتيح قائمة العملاء كي يُصدَّر ما يُعرض
interface ExportFilters {
	status: '' | 'client' | 'prospect';
	preset: '' | 'with_cases' | 'vip';
	search: string;
	include_inactive: boolean;
	without_phone: boolean;
}

const EMPTY_FILTERS: ExportFilters = {
	status: '',
	preset: '',
	search: '',
	include_inactive: false,
	without_phone: false,
};

interface ClientsExportModalProps {
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

const checkboxRowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 6,
	fontSize: 12,
};

const ClientsExportModal: React.FC<ClientsExportModalProps> = ({ isOpen, onClose, defaults }) => {
	const [filters, setFilters] = useState<ExportFilters>({ ...EMPTY_FILTERS, ...defaults });
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const set = <K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) =>
		setFilters(prev => ({ ...prev, [key]: value }));

	const activeCount =
		(filters.status ? 1 : 0) +
		(filters.preset ? 1 : 0) +
		(filters.search.trim() ? 1 : 0) +
		(filters.include_inactive ? 1 : 0) +
		(filters.without_phone ? 1 : 0);

	const handleExport = async () => {
		setExporting(true);
		setError(null);

		try {
			await downloadXlsx(
				'/client-management/export',
				compactFilters({ ...filters, search: filters.search.trim() }),
				'العملاء',
			);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير');
		} finally {
			setExporting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="تصدير العملاء (Excel)" size="lg">
			<div className="client-export-modal">
				<p className="client-export-modal__hint">
					حدّد الفلاتر المطلوبة، أو اتركها فارغة لتصدير جميع العملاء.
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
						<label style={fieldLabelStyle}>التصنيف</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.status}
							onChange={(e) => set('status', e.target.value as ExportFilters['status'])}>
							<option value="">الكل</option>
							<option value="client">عملاء</option>
							<option value="prospect">عملاء محتملون</option>
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>تصفية سريعة</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.preset}
							onChange={(e) => set('preset', e.target.value as ExportFilters['preset'])}>
							<option value="">بلا تصفية</option>
							<option value="with_cases">لديهم قضايا</option>
							<option value="vip">الأكثر نشاطاً (٥ قضايا فأكثر)</option>
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>بحث بالاسم أو الهوية أو الجوال</label>
						<input type="text" className="filter-select" style={{ width: '100%' }} value={filters.search}
							placeholder="اتركه فارغاً للكل"
							onChange={(e) => set('search', e.target.value)} />
					</div>
				</div>

				<div style={{
					display: 'flex', flexWrap: 'wrap', gap: 16,
					padding: '10px 12px',
					background: 'var(--dashboard-card, rgba(30,58,95,.04))',
					border: '1px solid var(--color-border)',
					borderRadius: 8,
				}}>
					<label style={checkboxRowStyle}>
						<input type="checkbox" checked={filters.include_inactive}
							onChange={(e) => set('include_inactive', e.target.checked)} />
						تضمين المؤرشَفين
					</label>
					<label style={checkboxRowStyle}>
						<input type="checkbox" checked={filters.without_phone}
							onChange={(e) => set('without_phone', e.target.checked)} />
						من ليس لهم رقم جوال فقط
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

export default ClientsExportModal;
