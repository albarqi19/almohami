// === مساعدات تنسيق ZATCA (تواريخ عربية) ===

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' • '
    + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

// عدد الأيام من اليوم حتى تاريخ معيّن (موجب = مستقبل، سالب = ماضٍ).
export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// صياغة "بعد N يوم" / "منذ N يوم".
export function relativeDays(date?: string | null): string {
  const n = daysUntil(date);
  if (n === null) return '';
  if (n === 0) return 'اليوم';
  if (n > 0) return `بعد ${n} يوم`;
  return `منذ ${Math.abs(n)} يوم`;
}

export function formatAmount(amount?: number | null): string {
  const num = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' ر.س';
}
