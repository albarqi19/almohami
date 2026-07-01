/**
 * ستايلات التطبيق الداخلي الموحّدة — يستوردها Layout.tsx كأول استيراد.
 *
 * ⚠️ لماذا هذا الملف موجود؟ (لا تحذفه ولا تعد ترتيبه دون قراءة هذا)
 *
 * بعد تقسيم الحزمة بالراوتات (13c559d) صار كل ملف CSS يُحقن مع أول chunk
 * يطلبه، فأصبح ترتيب الحقن في <head> متغيّراً حسب مسار تنقّل المستخدم.
 * ولأن لدينا ~139 كلاساً معرّفاً بتعريفات مختلفة في أكثر من ملف
 * (asm-header، notion-btn-primary، modal-header، stat-card...)، صار «من
 * يُحقن أخيراً يغلب» عشوائياً: مودالات تظهر مكسورة بعد refresh ثم
 * «تنصلح» بعد التنقّل بين الصفحات.
 *
 * الحل: استيراد كل ستايلات التطبيق الداخلي هنا بترتيب صريح ثابت يطابق
 * بالضبط ترتيبها داخل bundle ما قبل التقسيم (b5326ca) — وهو الترتيب
 * المستقر الذي حسم كل التعارضات لسنين. Vite/Rollup يلغي التكرار: استيراد
 * نفس الملف لاحقاً من صفحته لا يكرّره ولا يغيّر موضعه.
 *
 * قواعد الإضافة:
 * 1. أي ملف ستايل جديد لصفحة/مكوّن داخل Layout: أضِف استيراده في نهاية
 *    هذه القائمة (إضافة لاستيراده في صفحته).
 * 2. ملفات صفحات خارج Layout (الهبوط، auth، account-status، booking،
 *    portal...) لا تُضاف هنا إطلاقاً حتى لا تثقل صفحة الهبوط.
 * 3. شغّل `npm run css:audit` لكشف أي كلاسات متعارضة جديدة بين الملفات.
 */

/* ترتيب bundle ما قبل التقسيم — لا تُعد الترتيب */
import './cases-page.css';
import './case-detail.css';
import './letterhead-settings.css';
import './notebook-widget.css';
import './law-search-modal.css';
import './precedent-modal.css';
import './memo-engine-result.css';
import './lawyer-tool-result.css';
import './case-law-notes-widget.css';
import './notification-center.css';
import './add-session-modal.css';
import './add-wekala-modal.css';
import './add-appointment-modal.css';
import './add-service-modal.css';
import './client-dashboard.css';
import './welcome-modal.css';
import './add-case-modal.css';
import './outcome-badge.css';
import './timeline.css';
import './legal-memo-workspace.css';
import './task-modal.css';
import './case-appointments-modal.css';
import './client-phone-modal.css';
import './case-messages-modal.css';
import './share-case-modal.css';
import './link-to-najiz-modal.css';
import './case-wekalat-panel.css';
import './wekalat-page.css';
import './win-celebration-modal.css';
import './replay-celebration-button.css';
import './send-dabt-modal.css';
import './case-detail-page.css';
import './case-prep-kitchen.css';
import './sessions-page.css';
import './session-prep.css';
import './client-cases.css';
import './client-case-detail.css';
import './tasks-page.css';
import './task-detail.css';
import './documents-page.css';
import './activities-page.css';
import './reports-page.css';
import './lawyers-report.css';
import './firm-report.css';
import './notifications-page.css';
import './erp-permissions.css';
import './admin-page.css';
import './statistics-page.css';
import './settings-page.css';
import './session-defaults-settings.css';
import './session-workflow-settings.css';
import './whatsapp-settings.css';
import './execution-requests-page.css';
import './clients-page.css';
import './client-detail.css';
import './admin-requests.css';
import './feedback-page.css';
import './wathq-inquiry.css';
import './laws-page.css';
import './client-messages.css';
import './notebook-page.css';
import './notebook-workspace-notion.css';
import './legal-ai-tools.css';
import './legal-services-page.css';
import './legal-service-detail.css';
import './contract-builder.css';
import './zatca.css';
import './availability.css';

/* ملفات أُضيفت بعد التقسيم — تُلحق في النهاية */
import './internal-meetings.css';
import './legal-deadlines.css';
import './session-report-templates.css';
import './fee-proposal.css';
import './correspondence-page.css';
import './phone-field.css';
import './task-approval.css';
import './correspondence-compose.css';
import './hr-page.css';
import './bankruptcy-detail.css';
