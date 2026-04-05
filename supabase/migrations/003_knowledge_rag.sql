-- pgvector 拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- ナレッジエントリテーブル
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  source_type TEXT DEFAULT 'manual', -- 'manual' | 'file'
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索インデックス
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_entries USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_knowledge_client_id ON knowledge_entries(client_id);

-- RLS 有効化
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_knowledge" ON knowledge_entries FOR ALL TO service_role USING (true);
CREATE POLICY "authenticated_read_knowledge" ON knowledge_entries FOR SELECT TO authenticated USING (true);

-- RAG 類似検索関数（コサイン類似度）
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_client_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ke.id,
    ke.title,
    ke.content,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_entries ke
  WHERE ke.client_id = match_client_id
    AND ke.embedding IS NOT NULL
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;
