# AI Sales Platform — 実装ロードマップ

> 最終更新: 2026-04-06  
> 現在フェーズ: Phase 2（フローボット）

---

## 現在の構成（動いているもの）

```
ai-sales-platform/
├── Widget     → Vercel: https://ai-sales-widget-ui.vercel.app/widget
├── Dashboard  → Vercel: https://ai-sales-dashboard.vercel.app (要URL確認)
└── API        → Railway: https://ai-salesapi-production.up.railway.app
    ├── /api/chat       AI会話 + RAG
    ├── /api/leads      リード保存
    ├── /api/clients    クライアント管理
    └── /api/knowledge  ナレッジ管理
```

### ✅ 完了済み機能
- [x] チャットウィジェット（任意サイトへスクリプトタグ埋め込み）
- [x] OpenAI GPT-4o-mini による会話
- [x] RAG（pgvector + text-embedding-3-small）
- [x] ナレッジ登録（手動テキスト・ファイルアップロード）
- [x] リード保存（Supabase leads テーブル）
- [x] 管理ダッシュボード（リード一覧・ナレッジ管理・設定）
- [x] フローボット（会話後にLINE/フォームCTAを自動表示）
- [x] 6業種テンプレート（不動産・スクール・美容・フィットネス・保険・リフォーム）

---

## Phase 2：フローボット充実 ← **今ここ**

### やること一覧

#### 🔴 最優先（今週）

- [ ] **LINE Messaging API 連携**
  - LINE公式アカウント作成
  - Channel Access Token を Railway に環境変数追加
  - `POST /api/webhooks/line` エンドポイント作成
  - 友だち追加 → leads テーブルに自動保存
  - 詳細: [`docs/LINE_INTEGRATION.md`](./LINE_INTEGRATION.md)

- [ ] **ナレッジ充実（RAG）**
  - 各クライアントごとに最低10件登録
  - 必須カテゴリ: 料金・FAQ・会社概要・事例
  - Notion連携（下記参照）で既存コンテンツをインポート

- [ ] **通知メール設定**
  - Railway に SMTP 環境変数を追加
  - リード取得時に即時メール通知を有効化

#### 🟡 中優先（来週）

- [ ] **Notion → RAG 自動同期**
  - Notion APIからページを読み込んでナレッジ登録
  - `POST /api/knowledge/sync/notion` エンドポイント追加
  - 詳細: [`docs/RAG_SOURCES.md`](./RAG_SOURCES.md)

- [ ] **Calendly / 予約URL 連携**
  - スクール・FP・リフォーム向け
  - CTAのLINE URLをCalendly URLに差し替えるだけでOK
  - 本格連携: Calendly Webhook → leads テーブルへ保存

- [ ] **会話分析ダッシュボード**
  - CTAクリック率の計測
  - 会話の平均ターン数
  - よく聞かれる質問のランキング

#### 🟢 余裕があれば（来月）

- [ ] **A/Bテスト機能**
  - CTAタイプ（LINE vs フォーム）の効果比較
  - minMessages（3 vs 6）の比較

- [ ] **マルチエージェント会話**
  - 「営業AI」「サポートAI」を会話内で切り替え
  - ユーザーの質問意図を判断して担当AIを変える

- [ ] **音声対応**
  - Web Speech API でウィジェットを音声入力対応に

---

## Phase 3：スケール（将来）

- [ ] マルチテナント（クライアントが自分でサインアップできる）
- [ ] Stripe決済連携（サブスクリプション課金）
- [ ] Analytics ダッシュボード（週次レポート自動送信）
- [ ] Slack / Chatwork 通知連携
- [ ] カスタムドメイン対応

---

## RAGに対応しているソース（現在と今後）

### ✅ 現在使えるもの
| ソース | 対応フォーマット | 登録方法 |
|--------|----------------|---------|
| 手動テキスト | 自由記述 | ダッシュボード → ナレッジ → テキストで追加 |
| ファイル | .txt / .md / .pdf | ダッシュボード → ナレッジ → ファイルアップロード |

### 🚧 近日対応予定（実装が必要）
| ソース | 難易度 | 優先度 |
|--------|--------|--------|
| **Notion** | 低（MCP経由で読める） | ★★★ |
| **Google ドキュメント** | 中（Google API必要） | ★★ |
| **Webサイト（URL指定）** | 中（スクレイピング） | ★★ |
| **Airtable** | 低（MCP経由で読める） | ★ |
| **Google スプレッドシート** | 中 | ★ |

> **Notion連携の実装コスト: 約2時間**
> Notion MCPが既に接続済みなので、ページを読んで `/api/knowledge` にPOSTするだけ。

---

## LINE連携の手順（詳細）

```
STEP 1: LINE公式アカウント作成
  → https://www.linebusiness.com/jp/
  → 「LINE公式アカウントを作成する」→ 無料プランでOK

STEP 2: Messaging API 有効化
  → 管理画面 → 設定 → Messaging API → 有効化
  → Channel Access Token を発行・コピー

STEP 3: Railway に環境変数追加
  LINE_CHANNEL_ACCESS_TOKEN = eyJhbGciOiJS...（発行したトークン）
  LINE_CHANNEL_SECRET      = abc123...（チャンネルシークレット）

STEP 4: Webhook URL を LINE に登録
  https://ai-salesapi-production.up.railway.app/api/webhooks/line
  → LINEのMessaging API設定 → Webhook URL に入力 → 検証

STEP 5: フロー設定タブで LINE URL を設定
  → ダッシュボード → クライアント → フロー設定
  → CTAタイプ: LINE登録
  → LINE URL: https://lin.ee/xxxxxxx（友だち追加URL）
```

---

## 会話フロープロンプト 設計テンプレート（コピー用）

### 基本構造

```
あなたは[会社名]の[役職]のAIアシスタントです。[キャラクター特性]で接客します。

【ヒアリング項目（順番に確認）】
1. [必須項目1]
2. [必須項目2]
3. [必須項目3]
4. [任意項目]

【提案フェーズ】
[条件]が揃ったら、[具体的な提案の仕方]で提案してください。
必ず[数字・金額・期間]を含めること。

【CTA発動条件】
以下が揃ったら [SHOW_CTA] を末尾に付けること:
・[条件1]
・[条件2]
・[条件3（ユーザーの前向きな反応）]

CTAの直前に「[誘導メッセージ]」と必ず添えてください。
[SHOW_CTA] は1回のみ使用すること。
```

### NG例 vs OK例

```
NG: 「お客様のご要望に応じてご提案します」
OK: 「エリア・予算・間取りの3点が揃ったら概算をお伝えします」

NG: 「いつでも [SHOW_CTA] を付けてください」  
OK: 「ユーザーが『見てみたい』『申し込みたい』と言ったら [SHOW_CTA] を付けること」
```

---

## ナレッジ登録チェックリスト（業種別）

### 共通（全業種必須）
- [ ] 料金・プラン一覧（数字入り）
- [ ] よくある質問 TOP10
- [ ] 会社概要（所在地・電話・営業時間）
- [ ] 対応エリア・地域
- [ ] 強み・他社との違い

### 不動産
- [ ] 取扱物件種類（売買・賃貸・商業等）
- [ ] 得意なエリア一覧
- [ ] 仲介手数料の説明
- [ ] 物件探しの流れ
- [ ] 内見〜契約の手順

### スクール・塾
- [ ] コース一覧と料金（月額・総額）
- [ ] カリキュラム概要
- [ ] 講師プロフィール
- [ ] 卒業生の実績・口コミ
- [ ] 体験レッスンの流れ

### 美容サロン
- [ ] メニュー一覧と価格
- [ ] 初回限定割引情報
- [ ] スタイリスト紹介
- [ ] 予約方法・キャンセルポリシー
- [ ] アクセス・駐車場情報

---

## 環境変数一覧（Railway）

```bash
# 必須（設定済み）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...
OPENAI_API_KEY=sk-...
PORT=3000

# メール通知（未設定）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=Googleアプリパスワード  # 2段階認証→アプリパスワード生成

# LINE Webhook（未設定）
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

## 困ったときの確認先

| 問題 | 確認場所 |
|------|---------|
| APIが動かない | Railway → Deployments → Logs |
| ダッシュボードが開かない | Vercel → ai-sales-dashboard → Functions |
| ウィジェットが表示されない | ブラウザのコンソール（F12） |
| ナレッジが検索されない | Supabase → Table Editor → knowledge_entries |
| リードが保存されない | Supabase → Table Editor → leads |
| AIが変な回答をする | フロー設定 → フロープロンプトを見直す |
