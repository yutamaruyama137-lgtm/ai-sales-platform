-- テスト用クライアントデータ
INSERT INTO clients (id, name, domain, config) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'Demo Company',
  'demo.example.com',
  '{
    "systemPrompt": "あなたはDemo Companyの営業アシスタントです。製品について親切に説明してください。",
    "welcomeMessage": "こんにちは！何かお手伝いできることはありますか？",
    "notificationEmail": "admin@demo.example.com"
  }'::jsonb
);
