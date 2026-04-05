# AI Sales Platform

AIを活用したセールスチャットウィジェット + RAGナレッジ管理システム。

**`<script>`タグ1行で任意のWebサイトに設置できるAIチャットボット。**

```html
<script
  src="https://your-cdn.com/widget.js"
  data-client-id="YOUR_CLIENT_ID"
  data-api-url="https://your-api.vercel.app"
></script>
```

---

## 主な機能

- **AIチャットウィジェット** — OpenAI GPT-4o-mini による自然な会話
- **RAGナレッジベース** — テキスト・ファイルをアップロードするとAIがそれを参照して回答
- **リード管理** — 見込み客の情報をSupabaseに自動保存
- **ダッシュボード** — 複数クライアント（サイト）を管理・設定
- **外観カスタマイズ** — テーマカラー・ヘッダータイトル・ボタンをダッシュボードから変更

---

## 構成

```
ai-sales-platform/
├── apps/
│   ├── widget/       # スクリプトタグ埋め込みウィジェット (port 5173 / IIFE build)
│   ├── api/          # Hono APIサーバー (port 3000)
│   └── dashboard/    # React 管理ダッシュボード (port 5174)
├── packages/
│   └── types/        # 共有TypeScript型定義
└── supabase/
    └── migrations/   # DBマイグレーション (pgvector対応)
```

---

## ローカル起動手順

### 前提条件
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Supabase プロジェクト
- OpenAI APIキー

### 1. 依存関係インストール

```bash
pnpm install
```

### 2. 環境変数設定

```bash
cp apps/api/.env.example apps/api/.env
cp apps/widget/.env.example apps/widget/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

#### apps/api/.env
| 変数名 | 説明 | 必須 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI APIキー | ✓ |
| `SUPABASE_URL` | Supabase プロジェクトURL | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role キー | ✓ |
| `SMTP_HOST` | SMTPホスト（例: smtp.gmail.com） | 任意 |
| `SMTP_PORT` | SMTPポート（例: 587） | 任意 |
| `SMTP_USER` | SMTPユーザー（メールアドレス） | 任意 |
| `SMTP_PASS` | SMTPパスワード | 任意 |

#### apps/dashboard/.env
| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon キー |
| `VITE_API_URL` | APIサーバーURL（例: http://localhost:3000） |

#### apps/widget/.env（開発専用）
| 変数名 | 説明 |
|--------|------|
| `VITE_CLIENT_ID` | テスト用クライアントID |

### 3. Supabaseマイグレーション実行

```bash
# Supabase CLI でマイグレーション適用（要: supabase link --project-ref xxx）
supabase db push

# または Supabase ダッシュボードのSQL Editorで順に実行:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_seed_data.sql
# supabase/migrations/003_knowledge_rag.sql  ← pgvector + RAG
```

### 4. 起動

```bash
# 全サービス同時起動
pnpm dev
```

| URL | 説明 |
|-----|------|
| http://localhost:5173 | チャットウィジェット（開発プレビュー） |
| http://localhost:3000/health | API ヘルスチェック |
| http://localhost:5174 | 管理ダッシュボード |

**ダッシュボードのテストアカウント:**
- Email: `admin@demo.example.com`
- Password: `demo1234`

---

## ウィジェット埋め込み（本番）

### ビルド

```bash
pnpm --filter @ai-sales/widget build
# apps/widget/dist/widget.iife.js が生成される
# このファイルを CDN にホストする
```

### 埋め込みタグ

```html
<!-- </body> 直前に追加 -->
<script
  src="https://your-cdn.com/widget.js"
  data-client-id="c0000000-0000-0000-0000-000000000001"
  data-api-url="https://your-api.vercel.app"
></script>
```

| 属性 | 説明 | 必須 |
|------|------|------|
| `data-client-id` | ダッシュボードで確認できるクライアントID | ✓ |
| `data-api-url` | APIサーバーのURL | ✓ |

---

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /health | ヘルスチェック |
| POST | /api/chat | チャット（RAG自動適用） |
| POST | /api/leads | リード保存 |
| GET | /api/leads?client_id= | リード一覧 |
| GET | /api/clients | クライアント一覧 |
| GET | /api/clients/:id/config | ウィジェット設定取得 |
| POST | /api/clients | クライアント作成 |
| PUT | /api/clients/:id | クライアント更新 |
| GET | /api/knowledge?client_id= | ナレッジ一覧 |
| POST | /api/knowledge | テキストナレッジ追加 |
| DELETE | /api/knowledge/:id | ナレッジ削除 |
| POST | /api/knowledge/upload | ファイルアップロードRAG |

---

## 開発コマンド

```bash
pnpm lint        # ESLint チェック
pnpm typecheck   # TypeScript 型チェック
pnpm test        # Vitest テスト実行
pnpm build       # 全パッケージビルド
```

---

## 詳細な実装計画・ロードマップ

→ [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) を参照
