/**
 * note.com Cookie保存スクリプト
 * 使い方:
 *   1. node save-cookie.js を実行
 *   2. ブラウザが開くのでnoteにログイン
 *   3. ログイン完了したらターミナルでEnter
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIE_DIR = join(__dirname, 'cookies');
const COOKIE_PATH = join(COOKIE_DIR, 'note.json');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://note.com/login', { waitUntil: 'domcontentloaded' });

  console.log('🔐 ブラウザでnoteにログインしてください');
  console.log('📌 ログイン完了したらターミナルでEnterを押してください\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('', resolve));
  rl.close();

  const cookies = await context.cookies();
  mkdirSync(COOKIE_DIR, { recursive: true });
  writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));

  console.log(`\n🍪 ${cookies.length}件のCookieを保存しました → ${COOKIE_PATH}`);

  await page.goto('https://note.com/dashboard', { waitUntil: 'domcontentloaded' });
  if (page.url().includes('login')) {
    console.log('⚠️ ログインできていないようです。再度試してください。');
  } else {
    console.log('✅ ログイン確認OK');
  }

  await browser.close();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
