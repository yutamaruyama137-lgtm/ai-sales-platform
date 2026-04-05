# AI Sales Platform — 実装計画書

> 最終更新: 2026-04-06
> ステータス: Phase 1〜2 実装完了

---

## プロジェクト概要

任意のWebサイトに `<script>` タグ1行を貼り付けるだけで設置できる **AIチャットウィジェット**。
ダッシュボードから複数サイト（クライアント）を管理し、AIの回答精度をナレッジベース（RAG）で向上させる。

```
┌─────────────────────────────────────────────────────────┐
│ お客様のWebサイト                                        │
│  <script src="widget.js" data-client-id="xxx"></script> │
│                                   ↓                     │
│              [AIチャットウィジェット 右下に表示]         │
└─────────────────────────────────────────────────────────┘
           │ POST /api/chat
           ▼
┌─────────────────────────────────────────────────────────┐
│ API Server (Hono)                                        │
│  1. Supabase でクライアント設定を取得                    │
│  2. ユーザーメッセージをOpenAIでベクトル化               │
│  3. knowledge_entriesからRAG検索                         │
│  4. OpenAI GPT-4o-mini で回答生成                        │
│  5. 会話をSupabaseに保存                                 │
└────────────────────────┬────────────────────────────────┘
                         │
           ┌─────────────┴────────────┐
           ▼                          ▼
    Supabase (DB + Auth)         OpenAI API
    - clients                    - gpt-4o-mini (chat)
    - leads                      - text-embedding-3-small (RAG)
    - conversations
    - knowledge_entries (pgvector)
```

---

## 現在の実装状況

### ✅ Phase 1: コアインフラ（完了）

| 機能 | 状態 | 詳細 |
|------|------|------|
| pnpm monorepo セットアップ | ✅ | workspaces構成 |
| TypeScript strict mode | ✅ | 全パッケージ |
| ESLint + Prettier | ✅ | 設定済み |
| Supabase DB（clients/leads/conversations） | ✅ | RLS有効 |
| Hono APIサーバー | ✅ | port 3000 |
| OpenAI GPT-4o-mini チャット | ✅ | `/api/chat` |
| リード保存 | ✅ | `/api/leads` |
| Vitest テスト | ✅ | 10テスト通過 |

### ✅ Phase 2: スクリプトタグ化 + RAG（完了）

| 機能 | 状態 | 詳細 |
|------|------|------|
| ウィジェット スクリプトタグ埋め込み | ✅ | IIFE build |
| data-client-id / data-api-url 属性 | ✅ | 自動読み込み |
| ウィジェット外観カスタマイズ | ✅ | color/title/button |
| pgvector + knowledge_entriesテーブル | ✅ | Supabase |
| OpenAI Embedding (text-embedding-3-small) | ✅ | 1536次元 |
| RAG チャット（コサイン類似度検索） | ✅ | threshold=0.5 |
| テキストナレッジ追加 `/api/knowledge` | ✅ | CRUD |
| ファイルアップロード RAG | ✅ | .txt/.md/.pdf |
| テキストチャンク分割 | ✅ | 1500文字/200文字オーバーラップ |
| クライアント管理 `/api/clients` | ✅ | CRUD |
| ダッシュボード: クライアント一覧 | ✅ | 新規作成対応 |
| ダッシュボード: ナレッジ管理 | ✅ | 追加/削除/アップロード |
| ダッシュボード: ウィジェット設定 | ✅ | 色/プロンプト/通知 |
| ダッシュボード: 埋め込みスニペット | ✅ | コピー機能 |

---

## ディレクトリ構造

```
ai-sales-platform/
├── apps/
│   ├── api/                    # Hono APIサーバー (port 3000)
│   │   └── src/
│   │       ├── index.ts        # サーバー起動・ルーター登録
│   │       ├── lib/
│   │       │   ├── openai.ts   # OpenAI クライアント
│   │       │   ├── supabase.ts # Supabase service_role クライアント
│   │       │   ├── embed.ts    # エンベディング生成・チャンク分割
│   │       │   └── logger.ts   # ログユーティリティ
│   │       ├── routes/
│   │       │   ├── chat.ts     # POST /api/chat (RAG付き)
│   │       │   ├── leads.ts    # POST/GET /api/leads
│   │       │   ├── knowledge.ts # CRUD + ファイルアップロード
│   │       │   └── clients.ts  # クライアントCRUD + 公開config
│   │       └── services/
│   │           └── leadEngine.ts # Webhook + メール通知
│   │
│   ├── widget/                 # スクリプトタグ埋め込みウィジェット
│   │   └── src/
│   │       ├── main.tsx        # 自動マウント (dev/#root + 埋め込み/自動生成)
│   │       ├── App.tsx         # チャットUI (clientId/apiUrl props)
│   │       ├── hooks/
│   │       │   └── useChat.ts  # チャット状態管理 + config取得
│   │       └── utils/
│   │           └── api.ts      # chatApi + fetchClientConfig
│   │
│   └── dashboard/              # 管理ダッシュボード (port 5174)
│       └── src/
│           ├── App.tsx         # 認証 + ルーティング (clients/client-detail)
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── ClientsPage.tsx     # クライアント一覧・作成
│           │   └── ClientDetailPage.tsx # リード/ナレッジ/設定/埋め込みタブ
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useLeads.ts
│           │   ├── useClients.ts   # クライアントCRUD
│           │   ├── useKnowledge.ts # ナレッジCRUD + アップロード
│           │   └── useConversation.ts
│           └── components/
│               ├── LeadsTable.tsx
│               └── ConversationModal.tsx
│
├── packages/
│   └── types/src/index.ts  # 共有型定義
│
└── supabase/migrations/
    ├── 001_initial_schema.sql  # clients/leads/conversations + RLS
    ├── 002_seed_data.sql       # Demo Company シードデータ
    └── 003_knowledge_rag.sql   # knowledge_entries + pgvector + match_knowledge関数
```

---

## APIエンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| POST | /api/chat | チャット（RAG付き） |
| POST | /api/leads | リード保存 |
| GET | /api/leads?client_id= | リード一覧 |
| GET | /api/clients | クライアント一覧 |
| GET | /api/clients/:id/config | ウィジェット用設定取得（公開） |
| POST | /api/clients | クライアント作成 |
| PUT | /api/clients/:id | クライアント更新 |
| GET | /api/knowledge?client_id= | ナレッジ一覧 |
| POST | /api/knowledge | テキストナレッジ追加 |
| DELETE | /api/knowledge/:id | ナレッジ削除 |
| POST | /api/knowledge/upload | ファイルアップロードRAG |

---

## ウィジェット埋め込み方法

```html
<!-- お客様のサイトの </body> 直前に貼り付け -->
<script
  src="https://your-cdn.com/widget.js"
  data-client-id="c0000000-0000-0000-0000-000000000001"
  data-api-url="https://your-api.vercel.app"
></script>
```

### ビルド手順

```bash
cd apps/widget
pnpm build
# dist/widget.iife.js が生成される
# このファイルを CDN にホスト
```

---

## 環境変数

### apps/api/.env

```env
PORT=3000
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SMTP_HOST=smtp.gmail.com     # メール通知（任意）
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

### apps/dashboard/.env

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3000
```

### apps/widget/.env（開発用）

```env
VITE_API_URL=http://localhost:3000
VITE_CLIENT_ID=c0000000-0000-0000-0000-000000000001
```

---

## ローカル起動

```bash
# 依存インストール
pnpm install

# 全サービス同時起動
pnpm dev

# アクセス先
# ウィジェット:   http://localhost:5173
# API:           http://localhost:3000
# ダッシュボード: http://localhost:5174

# ダッシュボードのテストアカウント
# Email: admin@demo.example.com
# Password: demo1234
```

---

## Phase 3: 今後の実装ロードマップ

### Phase 3: リード収集強化
- [ ] チャット中のリード情報収集フォーム（名前・メール・電話番号入力）
- [ ] 会話終了時の自動リード登録
- [ ] Slack Webhook 通知テスト

### Phase 4: 本番デプロイ
- [ ] Vercel へ API デプロイ（`apps/api`）
- [ ] Vercel/Cloudflare Pages へ ダッシュボード デプロイ
- [ ] widget.js を CDN（CloudFront等）にホスト
- [ ] CORS を本番ドメインに制限
- [ ] 環境変数を Vercel に設定

### Phase 5: 認証・マルチテナント強化
- [ ] クライアントとユーザーの紐付け（clients.user_id フィールド追加）
- [ ] ダッシュボードから管理できるクライアントを所有者のみに制限
- [ ] API Key 認証（`x-api-key` ヘッダー）でウィジェット→API間を保護

### Phase 6: 分析・レポート
- [ ] リード転換率ダッシュボード
- [ ] よく聞かれる質問の自動分析
- [ ] チャット離脱率の追跡

### Phase 7: 高度な RAG
- [ ] チャンクサイズの最適化
- [ ] HyDE（Hypothetical Document Embeddings）
- [ ] ナレッジ更新時の再エンベディング
- [ ] ナレッジのバージョン管理

---

## テスト計画

```bash
# ユニットテスト
pnpm test

# 手動 E2E テスト
# 1. pnpm dev で全サービス起動
# 2. http://localhost:5173 でウィジェット確認
# 3. チャットで「料金プランを教えてください」と送信 → RAG応答を確認
# 4. http://localhost:5174 でダッシュボードログイン
# 5. ナレッジ追加 → チャット再送信 → 内容が反映されることを確認
```

---

## セキュリティチェックリスト

- [x] APIキーのハードコードなし（.env経由）
- [x] .env を .gitignore で除外
- [x] service_role key はサーバーサイドのみ
- [x] anon key はクライアント（ダッシュボード）のみ
- [x] ウィジェット公開config API で機密情報（webhook/email）を除外
- [x] Supabase RLS で行レベルアクセス制御
- [x] TypeScript strict mode でランタイムエラーを最小化
- [ ] TODO: 本番では CORS origin を制限
- [ ] TODO: API レート制限の実装
- [ ] TODO: ファイルアップロードのサイズ制限（現在無制限）
