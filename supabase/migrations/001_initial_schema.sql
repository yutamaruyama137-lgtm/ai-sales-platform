-- clients テーブル
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- leads テーブル
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  answers JSONB DEFAULT '{}',
  source_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- conversations テーブル
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- インデックス
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);

-- RLS（Row Level Security）有効化
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- サービスロール用ポリシー（APIサーバーはservice_roleキーを使用）
CREATE POLICY "service_role_all" ON clients FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON leads FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON conversations FOR ALL TO service_role USING (true);

-- 認証済みユーザー（ダッシュボード）用ポリシー
CREATE POLICY "authenticated_read" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON conversations FOR SELECT TO authenticated USING (true);
