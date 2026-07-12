import React, { useState } from 'react';
import { Download, X, Loader2, Eraser } from 'lucide-react';
import Modal from './Modal';
import type { User as UserType } from '../services/UserService';
import { API_BASE_URL } from '../utils/api';

// فلاتر تصدير القضايا — تُرسل كما هي إلى POST /cases/export (المفاتيح الفارغة لا تُرسل)
interface ExportFilters {
	status: string;
	case_type: string;
	najiz_status: string;
	client_id: string;
	lawyer_id: string;
	responsible_lawyer_id: string;
	date_field: 'filing_date' | 'created_at';
	date_from: string;
	date_to: string;
}

const EMPTY_FILTERS: ExportFilters = {
	status: '',
	case_type: '',
	najiz_status: '',
	client_id: '',
	lawyer_id: '',
	responsible_lawyer_id: '',
	date_field: 'filing_date',
	date_from: '',
	date_to: '',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
	{ value: 'active', label: 'نشطة' },
	{ value: 'pending', label: 'قيد النظر' },
	{ value: 'closed', label: 'مغلقة' },
	{ value: 'appealed', label: 'مستأنفة' },
	{ value: 'settled', label: 'مصالحة' },
	{ value: 'dismissed', label: 'مرفوضة' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
	{ value: 'civil', label: 'مدنية' },
	{ value: 'criminal', label: 'جنائية' },
	{ value: 'commercial', label: 'تجارية' },
	{ value: 'family', label: 'أسرية' },
	{ value: 'labor', label: 'عمالية' },
	{ value: 'administrative', label: 'إدارية' },
	{ value: 'real_estate', label: 'عقارية' },
	{ value: 'intellectual_property', label: 'ملكية فكرية' },
	{ value: 'other', label: 'أخرى' },
];

interface CasesExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	lawyers: UserType[];
	clients: UserType[];
	najizStatuses: string[];
}

const fieldLabelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: 11,
	fontWeight: 600,
	color: 'var(--color-text-secondary)',
	marginBottom: 4,
};

const CasesExportModal: React.FC<CasesExportModalProps> = ({ isOpen, onClose, lawyers, clients, najizStatuses }) => {
	const [filters, setFilters] = useState<ExportFilters>(EMPTY_FILTERS);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const set = <K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) =>
		setFilters(prev => ({ ...prev, [key]: value }));

	const activeCount =
		(filters.status ? 1 : 0) +
		(filters.case_type ? 1 : 0) +
		(filters.najiz_status ? 1 : 0) +
		(filters.client_id ? 1 : 0) +
		(filters.lawyer_id ? 1 : 0) +
		(filters.responsible_lawyer_id ? 1 : 0) +
		(filters.date_from || filters.date_to ? 1 : 0);

	const handleExport = async () => {
		setExporting(true);
		setError(null);
		const token = localStorage.getItem('authToken');

		// نرسل الفلاتر المحددة فقط — الباك يفلتر على المفاتيح الموجودة
		const body: Record<string, string> = {};
		if (filters.status) body.status = filters.status;
		if (filters.case_type) body.case_type = filters.case_type;
		if (filters.najiz_status) body.najiz_status = filters.najiz_status;
		if (filters.client_id) body.client_id = filters.client_id;
		if (filters.lawyer_id) body.lawyer_id = filters.lawyer_id;
		if (filters.responsible_lawyer_id) body.responsible_lawyer_id = filters.responsible_lawyer_id;
		if (filters.date_from || filters.date_to) {
			body.date_field = filters.date_field;
			if (filters.date_from) body.date_from = filters.date_from;
			if (filters.date_to) body.date_to = filters.date_to;
		}

		try {
			const res = await fetch(`${API_BASE_URL}/cases/export`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'ngrok-skip-browser-warning': '69420',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				let message = 'تعذّر إنشاء ملف التصدير';
				try {
					const payload = await res.clone().json();
					if (payload?.message) message = payload.message;
				} catch {
					/* الرد ليس JSON — نُبقي الرسالة الافتراضية */
				}
				throw new Error(message);
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			const dateStr = new Date().toISOString().slice(0, 10);
			anchor.download = `القضايا_${dateStr}.xlsx`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير');
		} finally {
			setExporting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="تصدير القضايا (Excel)" size="lg">
			<div className="client-export-modal">
				<p className="client-export-modal__hint">
					حدّد الفلاتر المطلوبة، أو اترك كل الحقول على «الكل» لتصدير جميع القضايا المتاحة لك.
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
						<label style={fieldLabelStyle}>حالة القضية</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.status}
							onChange={(e) => set('status', e.target.value)}>
							<option value="">كل الحالات</option>
							{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>نوع القضية</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.case_type}
							onChange={(e) => set('case_type', e.target.value)}>
							<option value="">كل الأنواع</option>
							{TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>حالة ناجز</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.najiz_status}
							onChange={(e) => set('najiz_status', e.target.value)}>
							<option value="">كل الحالات</option>
							{najizStatuses.map(s => <option key={s} value={s}>{s}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>العميل / الشركة</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.client_id}
							onChange={(e) => set('client_id', e.target.value)}>
							<option value="">كل العملاء</option>
							{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>محامٍ مرتبط</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.lawyer_id}
							onChange={(e) => set('lawyer_id', e.target.value)}>
							<option value="">كل المحامين</option>
							{lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
						</select>
					</div>

					<div>
						<label style={fieldLabelStyle}>المحامي المسؤول</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.responsible_lawyer_id}
							onChange={(e) => set('responsible_lawyer_id', e.target.value)}>
							<option value="">الكل</option>
							{lawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
						</select>
					</div>
				</div>

				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
					gap: 12,
					marginBottom: 4,
					padding: '10px 12px',
					background: 'var(--dashboard-card, rgba(30,58,95,.04))',
					border: '1px solid var(--color-border)',
					borderRadius: 8,
				}}>
					<div>
						<label style={fieldLabelStyle}>نطاق التاريخ حسب</label>
						<select className="filter-select" style={{ width: '100%' }} value={filters.date_field}
							onChange={(e) => set('date_field', e.target.value as ExportFilters['date_field'])}>
							<option value="filing_date">تاريخ القيد (رفع الدعوى)</option>
							<option value="created_at">تاريخ الإضافة للنظام</option>
						</select>
					</div>
					<div>
						<label style={fieldLabelStyle}>من تاريخ</label>
						<input type="date" className="filter-select" style={{ width: '100%' }} value={filters.date_from}
							max={filters.date_to || undefined}
							onChange={(e) => set('date_from', e.target.value)} />
					</div>
					<div>
						<label style={fieldLabelStyle}>إلى تاريخ</label>
						<input type="date" className="filter-select" style={{ width: '100%' }} value={filters.date_to}
							min={filters.date_from || undefined}
							onChange={(e) => set('date_to', e.target.value)} />
					</div>
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

export default CasesExportModal;
