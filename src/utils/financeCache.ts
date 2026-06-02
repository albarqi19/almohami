// [P4·UX-08] مصدر إبطال واحد لكاش وحدة «العقود والمالية».
// كل مفاتيح الوحدة تبدأ بـ ['finance', ...]، فإبطال البادئة يُحدّث كل التبويبات
// (لوحة التحكم/الالتزامات/الفواتير/المدفوعات/التحصيل/العقود) بعد أي طفرة — يمنع تباعد الإبطال.
import type { QueryClient } from '@tanstack/react-query';

export function invalidateFinance(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['finance'] });
}
