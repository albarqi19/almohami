/**
 * فحص سلامة تنظيم ملفات CSS — يمنع عودة مشكلة «الستايل المكسور أحياناً».
 *
 * الخلفية: بعد تقسيم الحزمة بالراوتات صار ترتيب حقن CSS متغيّراً حسب
 * مسار التنقّل، ولدينا كلاسات بنفس الاسم معرّفة بتعريفات مختلفة في أكثر
 * من ملف. الحل المعتمد: استيراد كل ستايلات التطبيق الداخلي بترتيب ثابت
 * في src/styles/appStyles.ts (يستورده Layout أولاً).
 *
 * هذا السكربت يتحقق من:
 *   1. عدم وجود ملف ستايل حي داخل التطبيق غير مدرج في appStyles.ts
 *   2. عدم وجود ملفات CSS ميتة (غير مستوردة من أي مكان)
 *   3. إحصاء الكلاسات المتعارضة (نفس الاسم، تعريف مختلف، ملفات مختلفة)
 *
 * التشغيل: npm run css:audit
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const APP_STYLES = join(SRC, 'styles', 'appStyles.ts');

// ملفات يُسمح لها بالبقاء خارج appStyles.ts:
// - ملفات الـ entry (محمّلة دائماً قبل كل شيء)
// - صفحات خارج Layout (هبوط/مصادقة/حالات خاصة) — إضافتها تثقل صفحة الهبوط
// - ستايلات مكوّنات مجاورة لمكوّنها (تُستخرج ضمن chunk الـ Layout تلقائياً)
const EXEMPT = new Set([
  'index.css',
  'styles/fonts.css',
  'styles/design-system.css',
  'styles/auth.css',
  'styles/dashboard-theme.css',
  'styles/tiptap.css',
  'styles/erp.css',
  'styles/landing.css',
  'pages/custom-landings/alkhibra-landing.css',
  'styles/account-status.css',
  'styles/subscription-payment-result.css',
  'pages/LawyerSuspended.css',
  'components/SubscriptionBanner.css',
  'components/PresenceIndicator.css',
  'styles/billing-stats-card.css', // مكوّنه BillingStatsCard غير مستخدم حالياً
]);

function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (ext.test(e)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(SRC, p).replace(/\\/g, '/');
const cssFiles = walk(SRC, /\.css$/);
const codeFiles = walk(SRC, /\.(tsx?|css)$/);

// من يستورد كل ملف CSS
const imported = new Set();
for (const f of codeFiles) {
  const content = readFileSync(f, 'utf8');
  const re = /@?import\s+(?:[^'"]*from\s+)?['"]([^'"]+\.css)['"]/g;
  let m;
  while ((m = re.exec(content))) {
    if (!m[1].startsWith('.')) continue;
    const parts = (dirname(f) + '/' + m[1]).split(/[\\/]/);
    const stack = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    const resolved = stack.join('/');
    const idx = resolved.toLowerCase().lastIndexOf('/src/');
    if (idx !== -1) imported.add(resolved.slice(idx + 5));
  }
}

const appStylesContent = readFileSync(APP_STYLES, 'utf8');
const inAppStyles = new Set();
{
  const re = /import\s+'\.\/([^']+\.css)'/g;
  let m;
  while ((m = re.exec(appStylesContent))) inAppStyles.add('styles/' + m[1]);
}

let problems = 0;

// 1) ملفات حية غير مدرجة في appStyles.ts وغير معفاة
const missing = [];
for (const f of cssFiles) {
  const r = rel(f);
  if (!imported.has(r)) continue; // ميت — يُبلّغ في القسم 2
  if (EXEMPT.has(r) || inAppStyles.has(r)) continue;
  missing.push(r);
}
if (missing.length) {
  problems += missing.length;
  console.log('❌ ملفات ستايل حية غير مدرجة في appStyles.ts (خطر تذبذب ترتيب الحقن):');
  for (const f of missing) console.log('   - ' + f + '  ← أضِف استيراده في نهاية appStyles.ts');
}

// 2) ملفات ميتة
const dead = cssFiles.map(rel).filter((r) => !imported.has(r));
if (dead.length) {
  problems += dead.length;
  console.log('❌ ملفات CSS ميتة (لا يستوردها أحد) — احذفها أو استوردها:');
  for (const f of dead) console.log('   - ' + f);
}

// 3) ملف مدرج في appStyles.ts لكنه غير موجود على القرص
for (const r of inAppStyles) {
  if (!existsSync(join(SRC, r))) {
    problems++;
    console.log(`❌ appStyles.ts يستورد ملفاً غير موجود: ${r}`);
  }
}

// 4) إحصاء الكلاسات المتعارضة (للعلم — محسومة بترتيب appStyles الثابت)
function parseClasses(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map(); // class -> normalized rules
  let i = 0;
  (function block() {
    let buf = '';
    while (i < css.length) {
      const ch = css[i];
      if (ch === '}') { i++; return; }
      if (ch === '{') {
        const sel = buf.trim(); buf = ''; i++;
        if (/^@(media|supports)/.test(sel)) block();
        else if (sel.startsWith('@')) { let d = 1; while (i < css.length && d > 0) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; } }
        else {
          let body = '';
          while (i < css.length && css[i] !== '}') body += css[i++];
          i++;
          const norm = body.split(';').map(s => s.trim()).filter(Boolean).sort().join(';');
          const re = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
          let m;
          const seen = new Set();
          while ((m = re.exec(sel))) {
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            if (!out.has(m[1])) out.set(m[1], []);
            out.get(m[1]).push(sel.replace(/\s+/g, ' ') + '{' + norm + '}');
          }
        }
      } else { buf += ch; i++; }
    }
  })();
  return out;
}

const classMap = new Map(); // class -> Map(file -> rulesKey)
for (const f of cssFiles) {
  const r = rel(f);
  if (!imported.has(r)) continue;
  for (const [cls, rules] of parseClasses(readFileSync(f, 'utf8'))) {
    if (!classMap.has(cls)) classMap.set(cls, new Map());
    classMap.get(cls).set(r, rules.sort().join('\n'));
  }
}
let conflictCount = 0;
for (const [, files] of classMap) {
  if (files.size < 2) continue;
  const keys = [...files.values()];
  if (!keys.every(k => k === keys[0])) conflictCount++;
}
console.log(`\nℹ️  كلاسات متعارضة التعريف بين ملفات حية: ${conflictCount} (محسومة بترتيب appStyles.ts الثابت)`);

if (problems === 0) {
  console.log('✅ تنظيم CSS سليم: كل الملفات الحية مغطاة بترتيب حقن ثابت.');
} else {
  console.log(`\n⚠️  ${problems} مشكلة تحتاج معالجة.`);
  process.exit(1);
}
