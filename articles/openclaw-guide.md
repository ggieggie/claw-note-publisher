---
title: AIアシスタントを自分のMacに住まわせたら、仕事が変わった — OpenClaw実践ガイド
price: 500
free_line: 108
tags: AI,OpenClaw,自動化,Discord,Mac
cover_image: images/cover2.jpg
---
# AIアシスタントを自分のMacに住まわせたら、仕事が変わった — OpenClaw実践ガイド

## はじめに

「ChatGPTをブラウザで使う」——それ、まだやってますか？

コピペでプロンプトを貼って、返ってきた回答をまたコピペして、ターミナルに貼り付けて実行。うまくいかなかったらエラーメッセージをまたコピペして……。

正直、めんどくさくないですか？

僕は2024年末にその生活を卒業しました。今は **AIが自分のMacBook上に常駐** していて、DiscordやSlackで話しかけるだけで、ファイル操作、Web検索、コード実行、ブラウザ操作まで全部やってくれます。しかも24時間。寝てる間もcronで定期タスクを回してくれるし、朝起きたら「昨日のメールまとめておいたよ」とか言ってくる。

さらに——**Discordの音声チャンネルで、AIと声で会話できる** ようにしました。

「これ調べて」と話しかけると、2〜3秒でAIが喋って返してくる。最初は14秒かかっていた応答を、ストリーミングLLM + 文単位TTS + パイプライン化で **2秒まで短縮**。話してる途中に割り込むと「あ、了解、止めるね」と言って即座に中断してくれる。もはや人と話してるのと変わらない体験です。

これを実現しているのが **OpenClaw** というオープンソースソフトウェアと、その上に構築したVoice Botです。

この記事では、実際にOpenClawをMacBookにセットアップし、Discord連携、Slack連携、さらには **Discord Voice Bot（音声AIアシスタント）** まで構築した実体験をすべて共有します。

ハマったポイント、設定ファイルの全文、パフォーマンスチューニングの数値まで、全部書きます。

---

## OpenClawとは？

OpenClawは、AIアシスタント（Claude、GPT等）を **ローカルのGatewayプロセスとして常駐** させるソフトウェアです。

公式ドキュメント: https://docs.openclaw.ai

ざっくり言うと、こういうことができます：

- **チャットツール連携**: Discord / Slack / Telegram からAIに話しかけられる
- **ツール実行**: シェルコマンド、ファイル読み書き、Web検索、ブラウザ操作をAIが直接実行
- **人格定義**: `SOUL.md` や `AGENTS.md` といったファイルでAIの性格・行動ルールを定義
- **自動化**: cron（定期実行）、サブエージェント（並列タスク）、ハートビート（定期チェック）
- **記憶**: `MEMORY.md` でセッション間の長期記憶を持続

ChatGPTやClaudeのWeb版との最大の違いは、**AIが「自分のマシンの中で動いている」** ということ。ブラウザのサンドボックスに閉じ込められたAIではなく、あなたのファイルシステムにアクセスし、あなたのターミナルでコマンドを実行できるAIです。

これ、使い始めると元に戻れなくなります。

---

## 何が変わったか — ビフォーアフター

### Before（従来のAI利用）

1. ブラウザでChatGPTを開く
2. 質問をコピペで入力
3. 回答を読む
4. 必要ならコードをコピペしてターミナルで実行
5. エラーが出たらまたコピペで質問
6. 以下繰り返し…

### After（OpenClaw導入後）

Discordで「〇〇して」と打つだけ。AIが直接実行して結果を報告してくれる。

**実際の使用例：**

🔹 **「Yahoo!ニュースのトップ3教えて」**
→ AIがWeb検索ツールを使って数秒で取得、整形して返答。コピペゼロ。

🔹 **「このコードにバグがある、直して」**
→ AIがファイルを直接開いて修正、`git commit` まで完了。差分も見せてくれる。

🔹 **「BTCの自動売買bot作って」**
→ 戦略設計の相談から始まり、バックテスト用コードの作成、パラメータ最適化、本番デプロイまで。数日間にわたってDiscordでやり取りしながら、AIがコードを書き、テストし、デプロイする。

🔹 **「今日の予定確認して、あと昨日のミーティングメモまとめといて」**
→ カレンダーAPI叩いて予定取得、メモファイルを読んで要約。朝の3分が30秒になった。

これ、大げさに書いてるんじゃなくて、**毎日普通にやっていること** です。

---

## セットアップ概要

OpenClawのセットアップ自体は驚くほど簡単です：

```bash
# Node.js v22が必要
node -v  # v22.x.x

# インストール
npm install -g openclaw

# 初期設定（対話式）
openclaw configure

# 起動
openclaw gateway start
```

これだけで、AIアシスタントが起動します。**所要時間は約10分**。

ただし、Discord連携やSlack連携、Voice Botの構築となると、それなりに設定が必要です。特にDiscord Botの設定やOpenClawの `openclaw.json` の書き方には **ハマりポイントが多い**。

僕が実際にハマった箇所、動く設定ファイルの全文、Voice Botの実装コードまで含めた完全ガイドは、以下の有料エリアで解説します。

**有料エリアの内容：**
- ✅ Discord連携の完全手順（設定ファイル全文 + ハマりポイント3選）
- ✅ Slack連携の完全手順（Socket Mode設定含む）
- ✅ ワークスペースのカスタマイズ（SOUL.md等の実例）
- ✅ **Discord Voice Bot構築**（Deepgram STT + VOICEVOX TTS + ストリーミングLLM）
- ✅ 実践Tips & トラブルシューティング

**特にVoice Botのセクションは、この記事の目玉です。**

Discordの音声チャンネルでAIとリアルタイムに会話するBotを、ゼロから構築する手順を完全解説しています。STT（音声認識）→ LLM（AI応答生成）→ TTS（音声合成）のパイプラインを、**レイテンシ2〜3秒**で動かすためのチューニング手法は、ネットにもほぼ情報がありません。

具体的には：
- **応答速度14秒→2秒** に短縮したストリーミングアーキテクチャの設計
- M-series Macで native bindings（@discordjs/opus）がビルドできない問題の回避策
- 48kHz→16kHz ダウンサンプリングの実装
- **割り込み検出（barge-in）** — AIが喋ってる途中でも、話しかけるだけで中断して聞いてくれる
- VOICEVOXの速度・ポーズ設定の最適値

音声AI、作ってみたいけどどこから始めればいいかわからない——という方に、500円以上の価値はあると自信を持って言えます。

---

<!-- ここから有料エリア -->

> 🔒 **ここから先は有料エリアです**

---

## セクション1: Discord連携の完全手順

### 1-1. Discord Developer PortalでBot を作成する

まず、Discord Developer Portal（https://discord.com/developers/applications）でBotを作成します。

**手順：**

1. 「New Application」をクリック
2. アプリケーション名を入力（例: `MyClaw`）
3. 左メニューの「Bot」をクリック
4. 「Reset Token」でBot Tokenを取得 → **このTokenは一度しか表示されないのでメモ！**
5. 同じ画面の下にある **Privileged Gateway Intents** で以下を有効化：
   - ✅ **MESSAGE CONTENT INTENT** ← これが超重要！
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT

⚠️ **Message Content Intentを有効にしないと、Botがメッセージの中身を読めません。** OpenClawがメッセージを受信しても中身が空になり、「なんで反応しないんだ？」と悩むことになります。僕は30分ここで詰まりました。

### 1-2. BotをサーバーにInviteする

左メニューの「OAuth2」→「URL Generator」で：

1. **SCOPES** で `bot` にチェック
2. **BOT PERMISSIONS** で以下にチェック：
   - Send Messages
   - Read Message History
   - Read Messages/View Channels
   - Add Reactions
   - Attach Files
   - Embed Links
3. 生成されたURLをブラウザで開き、サーバーを選択してInvite

### 1-3. openclaw.json の設定

ここが一番重要です。OpenClawの設定ファイル `openclaw.json`（通常 `~/.openclaw/openclaw.json`）にDiscordの設定を追加します。

**動く設定ファイルの全文：**

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN_HERE",
      "groupPolicy": "allowlist",
      "guilds": {
        "*": {
          "requireMention": false,
          "channels": {
            "YOUR_CHANNEL_ID": {
              "allow": true,
              "requireMention": false
            }
          }
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "discord": {
        "enabled": true
      }
    }
  }
}
```

**設定のポイント：**

- `token`: Discord Developer Portalで取得したBot Token
- `groupPolicy: "allowlist"`: 許可したチャンネルだけで反応する（セキュリティ上おすすめ）
- `guilds."*"`: すべてのサーバーに対する設定（特定サーバーだけにしたい場合はサーバーIDを指定）
- `requireMention: false`: メンションなしでも反応する（`true`にすると`@Bot名`が必要）
- `channels.YOUR_CHANNEL_ID`: 許可するチャンネルのID（Discordの開発者モードで右クリック→「IDをコピー」）

### 1-4. ⚠️ ハマりポイント3選

**ハマりポイント①: enabledフラグが2箇所ある**

```json
"channels": { "discord": { "enabled": true } }   // ← これと
"plugins": { "entries": { "discord": { "enabled": true } } }  // ← これの両方が必要！
```

`channels.discord.enabled` はDiscordチャンネルの有効化、`plugins.entries.discord.enabled` はDiscordプラグイン自体の有効化です。**片方だけだと動きません。** エラーメッセージも出ないので、地味にハマります。

**ハマりポイント②: config.patch の連続実行でWebSocketクラッシュ**

`openclaw config.patch` コマンドで設定を変更すると、Gatewayが設定をホットリロードします。が、Discord WebSocket接続が確立された直後にもう一度 `config.patch` を実行すると、WebSocketが不安定になってクラッシュすることがあります。

**対処法：** 設定変更後は `openclaw gateway restart` で確実に再起動する。ホットリロードに頼りすぎない。

**ハマりポイント③: .envファイルは自動で読まれない**

他のNode.jsアプリだと `.env` に環境変数を書けば自動で読んでくれることが多いですが、OpenClawは `.env` を自動で読みません。環境変数が必要な場合は、シェルの環境変数として設定するか、`openclaw.json` に直接書く必要があります。

---

## セクション2: Slack連携の完全手順

### 2-1. Slack Appの作成

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」
3. App名とワークスペースを選択

### 2-2. Socket Modeの有効化

Slack連携では **Socket Mode** を使います。HTTPエンドポイントを公開する必要がなく、ファイアウォールの設定も不要です。

1. 左メニューの「Socket Mode」をクリック
2. 「Enable Socket Mode」をON
3. App-Level Tokenを生成：
   - Token名: 任意（例: `openclaw-socket`）
   - Scope: `connections:write`
   - 生成されたToken（`xapp-` で始まる）をメモ

### 2-3. Bot Tokenの取得

1. 左メニュー「OAuth & Permissions」
2. **Bot Token Scopes** に以下を追加：
   - `chat:write` — メッセージ送信
   - `channels:history` — チャンネルの履歴読み取り
   - `channels:read` — チャンネル一覧取得
   - `app_mentions:read` — メンション検知
   - `reactions:write` — リアクション追加
   - `files:write` — ファイルアップロード
3. ワークスペースにインストール
4. Bot User OAuth Token（`xoxb-` で始まる）をメモ

### 2-4. Event Subscriptionsの設定

1. 左メニュー「Event Subscriptions」
2. 「Enable Events」をON
3. **Subscribe to bot events** に以下を追加：
   - `message.channels` — チャンネルメッセージ
   - `app_mention` — メンション

### 2-5. openclaw.json の設定

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "botToken": "xoxb-YOUR-BOT-TOKEN",
      "appToken": "xapp-YOUR-APP-TOKEN",
      "groupPolicy": "allowlist",
      "allowedChannels": ["YOUR_CHANNEL_ID"]
    }
  },
  "plugins": {
    "entries": {
      "slack": {
        "enabled": true
      }
    }
  }
}
```

Discord同様、`channels.slack.enabled` と `plugins.entries.slack.enabled` の **両方** が必要です。

### 2-6. チャンネルへのBot追加

Slackの場合、BotをチャンネルにInviteする必要があります：

1. 対象チャンネルで `/invite @YourBotName` を実行
2. または、チャンネル設定 → 「インテグレーション」→ 「アプリを追加」

これを忘れると、Botがチャンネルのメッセージを受信できません。

---

## セクション3: ワークスペースのカスタマイズ

OpenClawの真骨頂は **ワークスペースのカスタマイズ** です。`~/.openclaw/workspace/` 以下にマークダウンファイルを置くだけで、AIの振る舞いを自在にコントロールできます。

### 3-1. SOUL.md — AIの性格・トーンを定義

`SOUL.md` はAIの「魂」を定義するファイルです。ここに書いた内容が、AIのすべてのレスポンスのベースになります。

**実例（匿名化済み）：**

```markdown
# SOUL.md

あなたは技術に詳しいアシスタントです。

## 性格
- カジュアルで親しみやすい口調
- 技術的な正確さを重視
- 冗長な説明は避け、要点を先に伝える
- ユーモアを交えつつ、ふざけすぎない

## 言語
- 日本語で応答する
- 技術用語は英語のまま使う（「デプロイ」「コミット」等）

## 行動原則
- 危険なコマンド（rm -rf, DROP TABLE等）は実行前に必ず確認
- ファイルの削除は trash コマンドを使う
- 本番環境への変更は必ず確認を取る
```

### 3-2. AGENTS.md — 行動ルール

何を自由にやっていいか、何は確認が必要かを定義します。

```markdown
# AGENTS.md

## 自由にやっていいこと
- ファイルの読み取り
- Web検索
- ワークスペース内でのファイル作成・編集
- git status, git diff の確認

## 確認が必要なこと
- git push
- 外部サービスへのAPI呼び出し
- ファイルの削除
- npm install（新しいパッケージの追加）
```

### 3-3. USER.md — ユーザー情報

AIがあなたのことを理解するための情報を書きます。

```markdown
# USER.md

## 基本情報
- 名前: （あなたの名前）
- 役割: CTO / テックリード
- 技術スタック: TypeScript, React, Node.js, AWS

## 好み
- コードスタイル: 関数型寄り、immutableを好む
- エディタ: VSCode
- ターミナル: iTerm2 + zsh
```

### 3-4. MEMORY.md — 長期記憶

セッション間で情報を持続させるファイルです。AIが自分で書き込み、次のセッションで読み込みます。

```markdown
# MEMORY.md

## プロジェクト状況
- trading-bot: バックテスト完了、本番デプロイ待ち
- website-redesign: デザイン確定、実装中

## 学んだこと
- Deepgram WebSocketのutterance_end_msは初回接続時に送るとエラーになる
- VOICEVOXのspeedScaleは1.5が自然
```

AIは毎セッションの開始時にこのファイルを読み、必要に応じて更新します。人間で言う「長期記憶」に近い役割を果たします。

### 3-5. HEARTBEAT.md — 定期チェックタスク

OpenClawはハートビート機能で定期的にAIを起こします。その際に何をチェックするかを定義します。

```markdown
# HEARTBEAT.md

## 定期チェック（ローテーション）
- [ ] メールの未読チェック
- [ ] カレンダーの予定確認（24時間以内）
- [ ] GitHubの通知確認
- [ ] 暗号資産の価格チェック（大きな変動があれば通知）
```

### 3-6. IDENTITY.md — AIの名前・キャラクター

```markdown
# IDENTITY.md

名前: Claw
一人称: 僕
呼び方: ユーザーを「あなた」と呼ぶ
```

これらのファイルを組み合わせることで、**自分だけのカスタムAIアシスタント** が完成します。市販のAIサービスでは絶対にできないレベルのカスタマイズが、テキストファイルだけで実現できるのがOpenClawの強みです。

---

## セクション4: Discord Voice Bot — AIと音声で会話する

ここからが本記事の目玉です。テキストチャットだけでなく、**Discord のボイスチャンネルでAIと音声会話** できるようにします。

### 4-1. 全体アーキテクチャ

```
Discord VC (音声入力)
    ↓ Opus → PCM変換
    ↓ 48kHz → 16kHzダウンサンプリング
Deepgram (STT: Speech-to-Text)
    ↓ テキスト
OpenClaw Gateway (chatCompletions API)
    ↓ LLMレスポンス（ストリーミング）
VOICEVOX (TTS: Text-to-Speech)
    ↓ WAV → Opus変換
Discord VC (音声出力)
```

ユーザーがVCで話す → 音声をテキスト化 → LLMで回答生成 → 音声合成 → VCで再生。このパイプラインを低レイテンシで実現します。

### 4-2. なぜ別Botにするのか

**重要：Voice Botは、テキスト用のOpenClaw Botとは別のDiscord Botとして作ります。**

理由は **WebSocket競合** です。OpenClawのGatewayはDiscord WebSocketを1本使っています。Voice Botも独自にDiscord WebSocketを張るため、同じBot Tokenを使うと接続が競合してどちらかが切断されます。

Discord Developer Portalで新しいApplicationを作り、別のBot Tokenを取得してください。

### 4-3. 技術スタック

| 用途 | ライブラリ / サービス |
|------|----------------------|
| Discord接続 | discord.js v14 |
| VC音声処理 | @discordjs/voice |
| Opus→PCM変換 | opusscript |
| 音声認識 (STT) | Deepgram (WebSocket API) |
| LLM | OpenClaw Gateway chatCompletions API |
| 音声合成 (TTS) | VOICEVOX (ローカル実行) |

### 4-4. 実装のポイント

#### OpusScript（pure JS）を使う理由

discord.jsの音声処理には通常 `@discordjs/opus`（native bindings）を使いますが、**Apple Silicon（M1/M2/M3）のMacでビルドが失敗する** ことがあります。

```bash
# これが失敗する
npm install @discordjs/opus
# → node-gyp rebuild でエラー
```

代わりに `opusscript`（pure JavaScript実装）を使います：

```bash
npm install opusscript
```

パフォーマンスはnative版より劣りますが、音声チャットBot程度の用途なら問題ありません。実測でCPU使用率の差は1-2%程度でした。

#### 48kHz → 16kHz ダウンサンプリング

DiscordのVCは48kHz/16bit/ステレオで音声を送ってきますが、Deepgramの音声認識は16kHz/16bit/モノラルで十分です。ダウンサンプリングすることで **データ量を約1/3に削減** でき、STTの処理速度とネットワーク転送が改善します。

```javascript
function downsample(buffer, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / 2 / ratio);
  const result = Buffer.alloc(newLength * 2);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.floor(i * ratio) * 2;
    // ステレオ→モノラル: 左チャンネルだけ取得
    result.writeInt16LE(buffer.readInt16LE(srcIndex), i * 2);
  }
  
  return result;
}
```

#### ストリーミングLLM + 文レベルTTSパイプライン

LLMの応答を全部待ってからTTSに送ると遅くなります。代わりに、**LLMの応答をストリーミングで受け取り、文の区切り（。！？）を検出するたびにTTSに送る** パイプラインを組みます。

```javascript
async function streamAndSpeak(llmStream, voiceConnection) {
  let buffer = '';
  
  for await (const chunk of llmStream) {
    buffer += chunk;
    
    // 文の区切りを検出
    const sentenceEnd = buffer.match(/[。！？\n]/);
    if (sentenceEnd) {
      const sentence = buffer.substring(0, sentenceEnd.index + 1);
      buffer = buffer.substring(sentenceEnd.index + 1);
      
      // 文単位でTTS → 再生（非同期キュー）
      const audio = await synthesize(sentence);
      await playAudio(voiceConnection, audio);
    }
  }
  
  // 残りのテキストも処理
  if (buffer.trim()) {
    const audio = await synthesize(buffer);
    await playAudio(voiceConnection, audio);
  }
}
```

これにより、LLMが最初の一文を生成した時点でユーザーに音声が届き始めます。体感のレスポンス速度が劇的に改善します。

#### 無音検出 0.6秒

ユーザーが話し終わったタイミングを検出するのに、**0.6秒の無音** をトリガーにしています。

- 短すぎると（0.3秒）: 息継ぎや「えーっと」で誤検出
- 長すぎると（1.5秒）: 会話のテンポが悪くなる
- 0.6秒がちょうどいいバランス

```javascript
const SILENCE_THRESHOLD = 600; // ms
let lastVoiceTimestamp = Date.now();

audioStream.on('data', (chunk) => {
  if (hasVoiceActivity(chunk)) {
    lastVoiceTimestamp = Date.now();
    accumulateAudio(chunk);
  } else if (Date.now() - lastVoiceTimestamp > SILENCE_THRESHOLD) {
    // 無音0.6秒 → 発話終了とみなす
    processAccumulatedAudio();
  }
});
```

#### セッション分離

複数人がVCにいる場合、各ユーザーの音声ストリームは個別に処理する必要があります。OpenClawのchatCompletions APIに送る際も、**ユーザーごとにセッションを分離** します。

```javascript
const sessionId = `voice:${userId}`;

const response = await fetch('http://localhost:3577/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'default',
    messages: [
      { role: 'system', content: 'あなたは音声アシスタントです。短く簡潔に答えてください。' },
      { role: 'user', content: transcribedText }
    ],
    stream: true,
    // セッションIDでレーン競合を回避
    metadata: { sessionId }
  })
});
```

`voice:${userId}` というセッションIDを使うことで、テキストチャットのセッションとも、他ユーザーのVoiceセッションとも競合しません。

### 4-5. パフォーマンスチューニング

#### LLM: 14秒 → 2秒に短縮

最初にVoice Botを動かしたとき、ユーザーが話してからAIが返答するまで **14秒** かかっていました。会話として成立しません。

原因はLLMの応答が長すぎたこと。テキストチャット用のsystem promptがそのまま使われていて、丁寧で詳細な回答を生成していました。

**対処：system promptで短い返答を指示する。**

```
あなたは音声会話アシスタントです。
- 1-2文で簡潔に答えること
- 長い説明は避け、要点だけ伝える
- 箇条書きは使わない（音声で聞くと不自然）
- 「えーと」「そうですね」等の相槌は不要
```

これだけで **14秒 → 2秒** に短縮。LLMの生成トークン数が減り、TTS処理も早く終わるため、効果は絶大です。

#### STT: Deepgram WebSocket の utterance_end_ms 問題

Deepgramの WebSocket APIで `utterance_end_ms` パラメータを設定すると、発話の終了を自動検出してくれる便利機能があります。が、**特定の条件下で400エラーが返ってくる** ことがありました。

原因を調べたところ、WebSocket接続のオプションとして渡す際のパラメータ名が問題でした。Deepgramのドキュメントと実際のAPI仕様に微妙な差異があり、ハマりポイントです。

**対処：** `utterance_end_ms` は使わず、前述の自前の無音検出（0.6秒）を使う方が安定しました。

#### VOICEVOX: 速度と間のチューニング

VOICEVOXのデフォルト設定だと、音声が遅くて間延びします。以下の設定が自然でした：

```json
{
  "speedScale": 1.5,
  "pitchScale": 0.0,
  "intonationScale": 1.0,
  "volumeScale": 1.0,
  "prePhonemeLength": 0.1,
  "postPhonemeLength": 0.1,
  "pauseLengthScale": 0.25
}
```

ポイント：
- `speedScale: 1.5` — 1.0だと遅すぎる。1.5で自然な会話速度
- `pauseLengthScale: 0.25` — 句読点での間を短くする。デフォルトだと「、」で長い沈黙が入る

### 4-6. pm2でデーモン化

Voice Botは長時間動かすものなので、pm2でプロセス管理します。

```bash
# pm2のインストール
npm install -g pm2

# Voice Botの起動
pm2 start voice-bot.js --name "discord-voice" \
  --max-memory-restart 500M \
  --restart-delay 5000

# 自動起動設定
pm2 startup
pm2 save
```

`--max-memory-restart 500M`: メモリリークがあっても500MB超えたら自動再起動。音声処理はバッファが溜まりやすいので、この設定は必須です。

### 4-7. テキストチャンネルへのリアルタイム投稿

Voice Botが受け取った音声と、AIの応答を **テキストチャンネルにもリアルタイム投稿** すると便利です。後から会話ログを確認できるし、音声認識の精度も確認できます。

```javascript
// 音声認識結果 + AI応答をテキストチャンネルに投稿
const logChannel = guild.channels.cache.get(TEXT_CHANNEL_ID);

await logChannel.send(
  `🎤 **${user.username}**: ${transcribedText}\n` +
  `🤖 **AI**: ${aiResponse}`
);
```

---

## セクション5: 実践Tips & トラブルシューティング

### 5-1. Gatewayが2重起動する問題

`openclaw gateway start` を複数回実行すると、Gatewayプロセスが複数立ち上がることがあります。Discord Botが2重にログインし、メッセージが2回処理されるという事態に。

**確認方法：**

```bash
# プロセス確認
ps aux | grep openclaw

# または
openclaw gateway status
```

**対処法：**

```bash
# 全プロセスを停止
openclaw gateway stop

# 確実に1つだけ起動
openclaw gateway start
```

### 5-2. ログの確認方法

問題が起きたとき、まずログを確認しましょう。

```bash
# Gatewayのログ
openclaw gateway logs

# リアルタイムで追跡
openclaw gateway logs -f
```

ログにはAPI呼び出し、ツール実行、エラー情報がすべて記録されています。

### 5-3. OpenClawのアップデート

```bash
# 最新版にアップデート
npm update -g openclaw

# バージョン確認
openclaw --version

# Gateway再起動（アップデート後は必須）
openclaw gateway restart
```

### 5-4. chatCompletions APIを他ツールから使う

OpenClaw Gatewayは **OpenAI互換のchatCompletions API** を公開しています。つまり、OpenAIのAPIを使うあらゆるツールから、OpenClawのAIを呼び出せます。

```bash
# curlでの呼び出し例
curl http://localhost:3577/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "default",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

これを使えば、Voice Bot以外にも：
- Pythonスクリプトからの呼び出し
- カスタムWebアプリとの連携
- CI/CDパイプラインでのAI活用
- 他のAIツール（Continue, Cursor等）のバックエンドとして利用

など、無限の拡張が可能です。

### 5-5. cronジョブでの定期実行

OpenClawにはcron機能が組み込まれています。`openclaw.json` に設定するだけで、定期的にAIにタスクを実行させられます。

```json
{
  "crons": [
    {
      "schedule": "0 9 * * *",
      "prompt": "今日の天気と予定を確認して、Discordの#generalに投稿して",
      "channel": "discord",
      "target": "YOUR_CHANNEL_ID"
    },
    {
      "schedule": "*/30 * * * *",
      "prompt": "BTC/USDTの価格をチェックして、前回から5%以上変動していたら通知して",
      "channel": "discord",
      "target": "YOUR_CHANNEL_ID"
    }
  ]
}
```

毎朝9時に天気と予定を通知、30分ごとに暗号資産の価格を監視——こういった定期タスクが設定ファイルだけで実現できます。

---

## まとめ

OpenClawを導入して感じたのは、**「AIがMacに住んでいる」** という感覚です。

ブラウザのタブの1つとしてAIを使うのと、自分のマシンに常駐してDiscordやSlackから いつでも呼び出せるAIがいるのとでは、体験がまったく違います。

さらに音声会話まで構築すると、もはやSFです。VCに入って「今日のタスク確認して」と話しかけると、AIが音声で答えてくれる。テキストを打つ必要すらない。

**セットアップにかかった時間：**
- OpenClaw基本セットアップ: 10分
- Discord連携: 30分（ハマらなければ15分）
- Slack連携: 20分
- Voice Bot構築: 1日（チューニング含む）

合計で **1日あれば、音声会話AIまで含めた環境が構築可能** です。

そして一番価値があるのは、継続的にAIがファイルやメモリを管理してくれること。`MEMORY.md` に書かれた長期記憶のおかげで、AIは昨日の会話も、先週のプロジェクト状況も覚えている。毎回ゼロから説明する必要がない。

これは単なるツールではなく、**デジタルな相棒** です。

興味があれば、まずは `npm install -g openclaw` から始めてみてください。10分後にはAIが返事をしてくれるはずです。

---

*この記事が役に立ったら、ぜひスキ・フォローをお願いします。OpenClawの活用事例や、AIエージェントの最新動向についても今後発信していきます。*
