/**
 * Script to update Service Worker version before each build
 * يتم تشغيله تلقائياً قبل كل build لتحديث إصدار الـ Service Worker
 * 
 * Usage: node scripts/update-sw-version.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SW_PATH = path.join(__dirname, '..', 'public', 'sw.js');

// توليد إصدار جديد بناءً على التاريخ والوقت
const now = new Date();
const version = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
].join('.');

console.log(`📦 Updating Service Worker version to: ${version}`);

try {
    let content = fs.readFileSync(SW_PATH, 'utf8');

    // تحديث إصدار الـ Service Worker
    const versionRegex = /const SW_VERSION = '[^']+';/;
    if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `const SW_VERSION = '${version}';`);
        fs.writeFileSync(SW_PATH, content, 'utf8');
        console.log(`✅ Service Worker version updated successfully!`);
        console.log(`   New version: ${version}`);
    } else {
        console.error('❌ Could not find SW_VERSION in sw.js');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Error updating Service Worker version:', error);
    process.exit(1);
}
