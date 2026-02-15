/**
 * note 記事自動投稿スクリプト（Playwright + クリップボード貼り付け版）
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(stealthPlugin());

const COOKIE_FILE = process.env.NOTE_COOKIE_FILE || "./cookies/note_01.json";

function parseArticle(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");
  const meta = {};
  let bodyStartLine = 0;

  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") { bodyStartLine = i + 1; break; }
      const match = lines[i].match(/^(\w+):\s*(.+)$/);
      if (match) meta[match[1]] = match[2].trim();
    }
  }

  const body = lines.slice(bodyStartLine).join("\n").trim();
  // coverImageの相対パスをファイルの場所から解決
  let coverImage = null;
  if (meta.cover_image) {
    const resolved = path.resolve(path.dirname(filePath), meta.cover_image);
    if (fs.existsSync(resolved)) coverImage = resolved;
  }

  return {
    title: meta.title || path.basename(filePath, ".md"),
    price: parseInt(meta.price || "0", 10),
    tags: meta.tags ? meta.tags.split(",").map(t => t.trim()) : [],
    coverImage,
    body,
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** noteのモーダル・AIパネル等、邪魔な要素を全て閉じる */
async function dismissModals(page) {
  // ReactModalを閉じる
  const modal = page.locator('.ReactModal__Overlay--after-open');
  if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press("Escape");
    await sleep(500);
    if (await modal.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        document.querySelectorAll('.ReactModal__Overlay').forEach(el => el.remove());
      });
      await sleep(300);
    }
  }
  // AIアシスタントパネルを閉じる（ポータル含む）
  await page.evaluate(() => {
    document.querySelectorAll('.ReactModalPortal').forEach(el => {
      if (el.innerHTML) el.innerHTML = '';
    });
    // AIアシスタントの固定パネルも閉じる
    const aiPanels = document.querySelectorAll('[class*="Assistants"], [class*="assistants"]');
    aiPanels.forEach(el => el.style.display = 'none');
  });
  await sleep(300);
}

/**
 * マークダウンをnoteのリッチテキストHTMLに変換
 */
function markdownToRichHtml(md) {
  const lines = md.split("\n");
  const htmlParts = [];
  let inCodeBlock = false;
  let codeLines = [];
  let prevEmpty = false;
  let listItems = [];
  let listType = null;

  function flushList() {
    if (listItems.length === 0) return;
    const tag = listType === "ol" ? "ol" : "ul";
    htmlParts.push(`<${tag}>${listItems.join("")}</${tag}>`);
    listItems = [];
    listType = null;
  }

  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushList();
      if (inCodeBlock) {
        const code = codeLines.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        htmlParts.push(`<pre>${code}</pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (line.trim().startsWith("<!--")) continue;

    if (line.trim() === "") {
      flushList();
      if (!prevEmpty) prevEmpty = true;
      continue;
    }
    prevEmpty = false;

    if (line.startsWith("### ")) { flushList(); htmlParts.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith("## ")) { flushList(); htmlParts.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith("# ")) { flushList(); htmlParts.push(`<h2>${inline(line.slice(2))}</h2>`); }
    else if (line.trim() === "---") { flushList(); htmlParts.push("<hr>"); }
    else if (line.startsWith("> ")) { flushList(); htmlParts.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); }
    else if (line.match(/^[-*] /)) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(`<li>${inline(line.slice(2))}</li>`);
    }
    else if (line.match(/^\d+\.\s/)) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
    }
    else if (line.trim().startsWith("|")) {
      flushList();
      if (line.match(/^\|[\s-:|]+\|$/)) continue;
      const cells = line.split("|").filter(c => c.trim()).map(c => inline(c.trim()));
      htmlParts.push(`<p>${cells.join(" │ ")}</p>`);
    }
    else { flushList(); htmlParts.push(`<p>${inline(line)}</p>`); }
  }
  flushList();
  return htmlParts.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith("--"));
  const isDraft = !args.includes("--publish");
  const priceArg = args.indexOf("--price");
  const priceOverride = priceArg >= 0 ? parseInt(args[priceArg + 1], 10) : null;

  if (!filePath) {
    console.log("使い方: node src/publish.js <記事.md> [--publish] [--price 500]");
    process.exit(1);
  }
  if (!fs.existsSync(filePath) || !fs.existsSync(COOKIE_FILE)) {
    console.error("❌ ファイルまたはCookieが見つかりません");
    process.exit(1);
  }

  const article = parseArticle(filePath);
  if (priceOverride !== null) article.price = priceOverride;

  console.log(`📝 記事: ${article.title}`);
  console.log(`💰 価格: ${article.price > 0 ? article.price + "円" : "無料"}`);
  console.log(`📄 モード: ${isDraft ? "下書き" : "公開"}\n`);

  const browser = await chromium.launch({
    channel: "chrome", headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    storageState: COOKIE_FILE,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP", timezoneId: "Asia/Tokyo",
  });

  const page = await context.newPage();

  try {
    // Step 1: 記事作成ページ
    console.log("Step 1: 記事作成ページ...");
    await page.goto("https://note.com/new", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(3000);
    if (page.url().includes("/login")) {
      console.error("❌ ログインが必要。Cookie再取得してください。");
      await browser.close(); process.exit(1);
    }
    console.log("  ✅ 到達");
    await page.screenshot({ path: "debug/note_01_new.png" });

    // モーダルが表示されたら閉じる
    await dismissModals(page);

    // Step 2: タイトル
    console.log("Step 2: タイトル入力...");
    const titleSel = 'textarea, input[placeholder*="タイトル"], [data-placeholder*="タイトル"]';
    await page.locator(titleSel).first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    if (await page.locator(titleSel).first().isVisible().catch(() => false)) {
      await page.locator(titleSel).first().click();
      await page.locator(titleSel).first().fill(article.title);
      console.log("  ✅ 完了");
    } else {
      console.log("  ⚠️ タイトル欄が見つかりません");
    }
    await sleep(500);

    // Step 3: 本文をリッチHTMLとしてクリップボード経由で貼り付け
    console.log("Step 3: 本文入力...");
    
    // エディタにフォーカス
    const editorSel = '[contenteditable="true"]';
    const editors = page.locator(editorSel);
    const editorCount = await editors.count();
    // タイトル以外のcontenteditable（通常2番目以降）
    const targetIdx = editorCount > 1 ? 1 : 0;
    await editors.nth(targetIdx).click();
    await sleep(500);

    // マークダウンをそのままプレーンテキストとして貼り付け（noteが自動パースする）
    await page.evaluate(async (text) => {
      const blob = new Blob([text], { type: "text/plain" });
      const item = new ClipboardItem({ "text/plain": blob });
      await navigator.clipboard.write([item]);
    }, article.body);

    // Cmd+Vで貼り付け
    await page.keyboard.down("Meta");
    await page.keyboard.press("v");
    await page.keyboard.up("Meta");
    await sleep(5000);

    console.log("  ✅ 完了");
    await page.screenshot({ path: "debug/note_02_content.png" });

    // Step 4: 保存を待つ
    console.log("Step 4: 保存待機...");
    await sleep(8000);
    
    try {
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        return text.includes('保存しました') || text.includes('Saved');
      }, { timeout: 15000 });
      console.log("  ✅ 保存完了");
    } catch {
      console.log("  ✅ 保存完了（想定）");
    }
    await page.screenshot({ path: "debug/note_03_saved.png" });

    // Step 5: カバー画像設定
    if (article.coverImage) {
      console.log("Step 5: カバー画像設定...");
      
      // aria="画像を追加" ボタンをクリック
      const eyecatchBtn = page.locator('[aria-label="画像を追加"]');
      
      if (await eyecatchBtn.isVisible().catch(() => false)) {
        console.log("  🖱️ 「画像を追加」ボタンをクリック");
        await eyecatchBtn.click();
        await sleep(1500);
        await page.screenshot({ path: "debug/note_04b_dropdown.png" });
        
        // 「画像をアップロード」をクリック
        const uploadBtn = page.locator('button:has-text("画像をアップロード"), :text("画像をアップロード")');
        if (await uploadBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
            uploadBtn.first().click(),
          ]);
          
          if (fileChooser) {
            await fileChooser.setFiles(article.coverImage);
            await sleep(3000);
            
            // クロップモーダルが表示されたら「保存」をクリック
            await sleep(2000);
            // モーダル内の保存ボタンをJSで直接クリック
            const cropSaved = await page.evaluate(() => {
              const overlay = document.querySelector('.CropModal__overlay');
              if (!overlay) return false;
              const btns = overlay.querySelectorAll('button');
              for (const btn of btns) {
                if (btn.innerText.includes('保存')) {
                  btn.click();
                  return true;
                }
              }
              // fallback: 最後のボタン
              if (btns.length > 0) {
                btns[btns.length - 1].click();
                return true;
              }
              return false;
            });
            if (cropSaved) {
              console.log("  📐 クロップモーダル → 「保存」クリック");
              await sleep(3000);
            }
            
            console.log("  ✅ カバー画像アップロード完了");
          } else {
            console.log("  ⚠️ ファイルチューザーが開きませんでした");
          }
        } else {
          console.log("  ⚠️ 「画像をアップロード」が見つかりません");
        }
      } else {
        console.log("  ⚠️ カバー画像ボタンが特定できません");
      }
      
      await page.screenshot({ path: "debug/note_04b_cover.png" });
    }

    // Step 6: 公開設定（「公開に進む」ボタン）
    if (!isDraft || article.price > 0 || article.tags.length > 0) {
      console.log("Step 5: 公開設定画面...");
      
      // 「公開に進む」ボタンをクリック（JSで直接）
      await dismissModals(page);
      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const btn = btns.find(b => b.innerText.trim() === '公開に進む');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (clicked) {
        await sleep(3000);
        await dismissModals(page);
        await page.screenshot({ path: "debug/note_04_publish_settings.png" });
        console.log("  ✅ 公開設定画面到達");

        // 有料設定
        if (article.price > 0) {
          console.log(`  💰 有料設定 (${article.price}円)...`);
          
          // 「有料」ラジオボタンをクリック
          // 「有料」ラベルをJSで直接クリック
          await page.evaluate(() => {
            const labels = [...document.querySelectorAll('label')];
            const paid = labels.find(l => l.innerText.trim() === '有料');
            if (paid) { paid.scrollIntoView(); paid.click(); }
          });
          console.log("  📻 「有料」クリック");
          await sleep(2000);
          
          // 価格入力欄（placeholder="300"のtext input）
          const priceInput = page.locator('input[placeholder="300"]');
          if (await priceInput.isVisible().catch(() => false)) {
            await priceInput.fill(String(article.price));
            await sleep(500);
            console.log(`  ✅ 価格 ${article.price}円 設定完了`);
          } else {
            console.log("  ⚠️ 価格入力欄が見つかりません");
          }
          
          await page.screenshot({ path: "debug/note_05_price.png" });
        }

        // タグ設定
        if (article.tags.length > 0) {
          console.log(`  🏷️ タグ設定...`);
          const tagInput = page.locator('input[placeholder*="タグ"], input[placeholder*="ハッシュタグ"]');
          if (await tagInput.first().isVisible().catch(() => false)) {
            for (const tag of article.tags) {
              await tagInput.first().fill(tag);
              await page.keyboard.press("Enter");
              await sleep(300);
            }
            console.log(`  ✅ タグ設定完了`);
          }
          await page.screenshot({ path: "debug/note_06_tags.png" });
        }

        // 公開 or 下書き保存
        if (!isDraft) {
          console.log("  📤 公開中...");
          const confirmPublish = page.locator('button:has-text("公開"), button:has-text("投稿")');
          if (await confirmPublish.first().isVisible().catch(() => false)) {
            await confirmPublish.first().click();
            await sleep(5000);
            console.log("  ✅ 公開完了");
          }
        }
        
        await page.screenshot({ path: "debug/note_07_final.png" });
      } else {
        console.log("  ⚠️ 「公開に進む」ボタンが見つかりません");
        await page.screenshot({ path: "debug/note_04_no_publish_btn.png" });
      }
    }

    const finalUrl = page.url();
    console.log(`\n✅ 完了! ${isDraft ? "下書き" : "公開"}: ${finalUrl}`);

  } catch (err) {
    console.error(`❌ エラー: ${err.message}`);
    await page.screenshot({ path: "debug/note_error.png" }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
