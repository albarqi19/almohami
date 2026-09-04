import { EMPLOYMENT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS } from '../../../types/hr';
import { isLawyer } from '../dossier/dossierFormat';
import type { EmployeeProfile } from '../../../types/hr';

/**
 * **كشفُ المنسوبين — قدرةٌ حيّةٌ تُنقل، وعطبُها يُصلَح في الحركة نفسِها.**
 *
 * حذفُ ما يعمل عقوبةٌ على العطب لا إصلاحٌ له؛ فالكشفُ يبقى، **بثلاثة تغييرات لا أكثر**:
 *
 * ١) **`esc()` على كلّ إقحام.** كانت تسعُ خلايا تُبنى بسلاسلَ عاريةٍ من بيانات المستخدم،
 *    فاسمٌ فيه `<` يكسر الصفحةَ المطبوعة.
 * ٢) **لا تجلب بنفسها.** كانت تنادي `GET /hr/employees?per_page=100` عند كلّ نقرة؛ صارت
 *    تستقبل الصفوفَ من استعلام اللوحة المحمَّل سلفاً ⇒ الطباعةُ فوريّةٌ وطلبٌ أقلّ.
 * ٣) **العددُ المطبوع يقول الحقيقة.** كانت تطبع `data.length` تحت عنوان «كشف منسوبي
 *    المكتب» — فمكتبٌ من ١٥٠ يوقّع «عدد المنسوبين: 100» رقماً رسمياً. صار يُطبَع `total`،
 *    ويُعلَن صراحةً حين يعرض الكشفُ أقلَّ منه.
 *
 * ⏳ **دَينٌ معلَنٌ**: التصديرُ يهاجر إلى `GET /hr/employees/export` بنمط «الطلبات
 * الإدارية» — وعندها يزول سقفُ المئة وبناءُ HTML في الفرونت معاً.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * هروبٌ في مرورٍ واحد — والمرورُ الواحدُ مقصود: استبدالُ `&` في مرورٍ مستقلٍّ يعيد هروبَ
 * ما هُرِّب قبله. و`null`/`undefined` تُصبح فراغاً لا نصَّ «undefined» في خليةٍ رسمية.
 */
export function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** حالةُ توثيق الهيئة كما تُقرأ في ورقةٍ مطبوعة — وغيرُ المحامي «—» لا «قيد التحقق». */
function verifyText(emp: EmployeeProfile): string {
  if (!isLawyer(emp)) return '—';

  if (emp.sba_verification_status === 'verified_same_firm') return 'موثق · مكتبك';
  if (emp.sba_verification_status === 'verified_other_firm') return 'موثق · منشأة أخرى';
  if (emp.sba_verification_status === 'expired') return 'رخصة منتهية';
  return 'قيد التحقق';
}

/**
 * @param rows  الصفوفُ المحمَّلةُ سلفاً في اللوحة (سقفُها ١٠٠ من الخادم).
 * @param total العددُ الحقيقيُّ لمنسوبي المكتب — هو ما يُوقَّع في الورقة.
 */
export function printRoster(rows: EmployeeProfile[], total: number): void {
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const body = rows
    .map((emp, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(emp.user?.name) || '—'}</td>
        <td>${esc(emp.employee_number) || '—'}</td>
        <td>${esc(emp.department) || '—'}</td>
        <td>${esc(emp.job_title) || '—'}</td>
        <td>${emp.employment_type ? esc(EMPLOYMENT_TYPE_LABELS[emp.employment_type]) : '—'}</td>
        <td>${esc(EMPLOYEE_STATUS_LABELS[emp.status]) || '—'}</td>
        <td>${esc(emp.sba_license_number) || '—'}</td>
        <td>${esc(verifyText(emp))}</td>
      </tr>`)
    .join('');

  const partial = rows.length < total
    ? `<div class="sub">هذا الكشف يعرض أحدث ${esc(rows.length)} من ${esc(total)}.</div>`
    : '';

  /*
   * 🩸 **الاستثناءُ المشروعُ الوحيدُ للّون الخام في هذه الوحدة**: صفحةُ الطباعة تُفتح في
   * نافذةٍ مستقلّةٍ **خارج شجرة الثيم** — لا `:root` ولا `body.dark` ولا متغيّرٍ واحدٍ
   * يصلها، فـ`var(--law-navy)` فيها تسقط إلى العدم وتُطبَع الترويسةُ بلا لون. القيمُ
   * أدناه صلبةٌ عمداً ولا تُقاس بقاعدة «صفر hex» التي تحكم CSS التطبيق وJSX.
   */
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <title>كشف الموظفين</title>
    <style>
      * { font-family: 'Segoe UI', Tahoma, sans-serif; }
      body { padding: 28px; color: #1f2937; }
      h1 { font-size: 19px; margin: 0 0 4px; color: #1E3A5F; }
      .sub { font-size: 12px; color: #6b7280; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 7px 9px; text-align: right; }
      th { background: #1E3A5F; color: #fff; font-weight: 600; }
      tr:nth-child(even) td { background: #f8fafc; }
      .foot { margin-top: 16px; font-size: 11px; color: #9ca3af; }
    </style></head><body>
    <h1>كشف موظفي المكتب</h1>
    <div class="sub">عدد الموظفين: ${esc(total)} · صدر بتاريخ ${esc(today)}</div>
    ${partial}
    <table>
      <thead><tr>
        <th>#</th><th>الاسم</th><th>الرقم الوظيفي</th><th>القسم</th><th>المسمى</th>
        <th>التعاقد</th><th>الحالة</th><th>رقم الرخصة</th><th>التوثيق</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="foot">نظام الرائد · الموارد البشرية</div>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

export default printRoster;
