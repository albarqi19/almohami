/**
 * أرقام الصفحات المعروضة في شريط الترقيم — القضايا وطلبات التنفيذ يستعملانها معاً.
 *
 * حتى 7 صفحات تُعرض كلها. فوق ذلك: الأولى والأخيرة دائماً، ونطاق حول الصفحة
 * الحالية، و«…» حيث توجد فجوة. مثال (الحالية 5 من 12): 1 … 4 5 6 … 12
 */
export type PageItem = number | '...';

export function pageRange(currentPage: number, totalPages: number, maxVisible = 5): PageItem[] {
	const pages: PageItem[] = [];
	if (totalPages <= maxVisible + 2) {
		for (let i = 1; i <= totalPages; i++) pages.push(i);
		return pages;
	}

	pages.push(1);

	let start = Math.max(2, currentPage - 1);
	let end = Math.min(totalPages - 1, currentPage + 1);
	if (currentPage <= 3) {
		end = Math.min(totalPages - 1, 4);
	} else if (currentPage >= totalPages - 2) {
		start = Math.max(2, totalPages - 3);
	}

	if (start > 2) pages.push('...');
	for (let i = start; i <= end; i++) pages.push(i);
	if (end < totalPages - 1) pages.push('...');

	if (totalPages > 1) pages.push(totalPages);
	return pages;
}
