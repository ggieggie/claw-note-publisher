# note-publisher

noteへの記事自動投稿ツール。Playwrightでブラウザ操作して投稿。

## セットアップ

```bash
npm install
npx playwright install
```

## Cookie取得

```bash
node save-cookie.js
```
ブラウザが開くのでnoteにログイン → ターミナルでEnter

## 記事の書き方

`articles/` にマークダウンファイルを置く。frontmatterで設定：

```markdown
---
title: 記事タイトル
price: 500          # 有料価格（0なら無料）
free_line: 20       # 無料エリアの行数
tags: AI,自動化
---
本文（マークダウン）
```

## 投稿

```bash
# 下書き保存
node src/publish.js articles/openclaw-guide.md --draft

# 公開（無料記事）
node src/publish.js articles/openclaw-guide.md

# 公開（有料記事・500円）
node src/publish.js articles/openclaw-guide.md --price 500
```

## 構成

```
note-publisher/
├── articles/       # 記事ファイル（.md）
├── cookies/        # 認証Cookie（.gitignore）
├── debug/          # デバッグスクショ
├── src/
│   └── publish.js  # メイン投稿スクリプト
├── save-cookie.js  # Cookie取得
└── .env            # 環境設定
```
