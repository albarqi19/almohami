import { API_BASE_URL } from './api';

/**
 * تنزيل كشف Excel من الخادم.
 *
 * ‏يستعمل fetch خاماً لا apiClient لأن الأخير بلا دعم blob/responseType.
 * ‏الخادم يردّ 422 بـJSON عند «لا نتائج مطابقة» فنرفع رسالته العربية كما هي.
 *
 * @param path   مسار التصدير بعد API_BASE_URL (مثل `/cases/export`)
 * @param body   الفلاتر — المفاتيح الفارغة تُحذف قبل الإرسال
 * @param filename اسم الملف المحفوظ بلا امتداد (يُضاف `.xlsx` والتاريخ)
 */
export async function downloadXlsx(
	path: string,
	body: Record<string, unknown>,
	filename: string,
): Promise<void> {
	const token = localStorage.getItem('authToken');

	const res = await fetch(`${API_BASE_URL}${path}`, {
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
	anchor.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

/** يحذف المفاتيح الفارغة كي لا يراها الخادم فلتراً. */
export const compactFilters = (filters: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false),
	);
