# AI Sales Platform — CLAUDE.md

## プロジェクト前提
- 言語: TypeScript（strict mode）
- パッケージマネージャ: pnpm（workspaces）
- コードスタイル: ESLint + Prettier（設定済み）
- テスト: vitest（ユニットテストはutils関数に対して書く）
- コミット前: `pnpm lint && pnpm typecheck` が通ること
- エラーハンドリング: 必ずtry/catchし、エラーはconsole.errorではなくlogger経由で
- 環境変数: コードに直接書かない、必ず.envから読む

## 構造
```
ai-sales-platform/
├── apps/
│   ├── widget/       # React + Vite チャットウィジェット (port 5173)
│   ├── api/          # Hono APIサーバー (port 3000)
│   └── dashboard/    # React + Vite 管理画面 (port 5174)
├── packages/
│   └── types/        # 共有TypeScript型定義
└── supabase/
    └── migrations/   # DBマイグレーション
```

## 完了条件チェックリスト
- [ ] pnpm install が通る
- [ ] ローカルでwidgetが表示される（localhost:5173）
- [ ] /api/chat にPOSTするとOpenAIから返答が来る
- [ ] /api/leads にPOSTするとSupabaseに保存される
- [ ] 管理画面でリード一覧が見える
- [ ] README.mdにローカル起動手順が書かれている

## セキュリティチェック項目
1. TypeScriptの型エラーがないか（pnpm typecheck）
2. lintエラーがないか（pnpm lint）
3. セキュリティ上の問題（APIキーのハードコード、SQLインジェクション等）がないか
4. README.mdのローカル起動手順が最新になっているか
