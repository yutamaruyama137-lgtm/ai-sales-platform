import { Hono } from 'hono';
import type { ApiError, KnowledgeCreateRequest, KnowledgeResponse } from '@ai-sales/types';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { createEmbedding, chunkText, decodeTextBuffer, extractTextFromPdf } from '../lib/embed.js';

const knowledge = new Hono();

// GET /api/knowledge?client_id=xxx — ナレッジ一覧取得
knowledge.get('/', async (c) => {
  const client_id = c.req.query('client_id');

  if (!client_id) {
    return c.json<ApiError>({ error: 'client_id is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('id, client_id, title, content, source_type, source_name, created_at')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch knowledge', error);
      return c.json<ApiError>({ error: 'Failed to fetch knowledge' }, 500);
    }

    return c.json(data ?? []);
  } catch (err) {
    logger.error('Knowledge GET error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// POST /api/knowledge — テキストナレッジ追加
knowledge.post('/', async (c) => {
  let body: KnowledgeCreateRequest;

  try {
    body = await c.req.json<KnowledgeCreateRequest>();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  const { client_id, title, content } = body;

  if (!client_id || !title || !content) {
    return c.json<ApiError>({ error: 'client_id, title, content are required' }, 400);
  }

  try {
    // OpenAI でエンベディング生成
    const embedding = await createEmbedding(`${title}\n${content}`);

    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert({
        client_id,
        title,
        content,
        embedding,
        source_type: 'manual',
      })
      .select('id')
      .single();

    if (error || !data) {
      logger.error('Failed to insert knowledge', error);
      return c.json<ApiError>({ error: 'Failed to save knowledge' }, 500);
    }

    logger.info('Knowledge entry created', { id: data.id, client_id });
    return c.json<KnowledgeResponse>({ id: data.id as string, success: true }, 201);
  } catch (err) {
    logger.error('Knowledge POST error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// DELETE /api/knowledge/:id — ナレッジ削除
knowledge.delete('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const { error } = await supabase
      .from('knowledge_entries')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete knowledge', error);
      return c.json<ApiError>({ error: 'Failed to delete knowledge' }, 500);
    }

    logger.info('Knowledge entry deleted', { id });
    return c.json({ success: true });
  } catch (err) {
    logger.error('Knowledge DELETE error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// POST /api/knowledge/upload — ファイルアップロードでRAGナレッジ追加
knowledge.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const client_id = body['client_id'] as string;
    const file = body['file'] as File | undefined;

    if (!client_id) {
      return c.json<ApiError>({ error: 'client_id is required' }, 400);
    }
    if (!file || typeof file === 'string') {
      return c.json<ApiError>({ error: 'file is required' }, 400);
    }

    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (!['txt', 'md', 'pdf'].includes(fileExt ?? '')) {
      return c.json<ApiError>({ error: 'Supported file types: .txt, .md, .pdf' }, 400);
    }

    // テキスト抽出
    let rawText: string;
    if (fileExt === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = await extractTextFromPdf(buffer);
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = decodeTextBuffer(buffer);
    }

    if (!rawText.trim()) {
      return c.json<ApiError>({ error: 'File is empty or could not extract text' }, 400);
    }

    // チャンク分割
    const chunks = chunkText(rawText);
    logger.info('File chunked', { fileName, chunks: chunks.length });

    // 各チャンクのエンベディング生成 & 保存
    const insertedIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = chunks.length === 1 ? fileName : `${fileName} (${i + 1}/${chunks.length})`;

      try {
        const embedding = await createEmbedding(chunk);
        const { data, error } = await supabase
          .from('knowledge_entries')
          .insert({
            client_id,
            title,
            content: chunk,
            embedding,
            source_type: 'file',
            source_name: fileName,
          })
          .select('id')
          .single();

        if (error || !data) {
          logger.error(`Failed to insert chunk ${i + 1}`, error);
        } else {
          insertedIds.push(data.id as string);
        }
      } catch (embErr) {
        logger.error(`Embedding failed for chunk ${i + 1}`, embErr);
      }
    }

    // チャンク処理後にGCを促す
    if (typeof global.gc === 'function') global.gc();
    logger.info('File upload complete', { fileName, inserted: insertedIds.length });
    return c.json({
      success: true,
      file_name: fileName,
      chunks_created: insertedIds.length,
    }, 201);
  } catch (err) {
    logger.error('Knowledge upload error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// POST /api/knowledge/import/url — URLからコンテンツを取得してRAGに追加
knowledge.post('/import/url', async (c) => {
  let body: { client_id: string; url: string; title?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  const { client_id, url, title } = body;
  if (!client_id || !url) {
    return c.json<ApiError>({ error: 'client_id and url are required' }, 400);
  }

  try {
    // URLからコンテンツを取得
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Sales-Bot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return c.json<ApiError>({ error: `Failed to fetch URL: ${response.status}` }, 400);
    }

    const contentType = response.headers.get('content-type') ?? '';
    let rawText = '';

    if (contentType.includes('text/html')) {
      const html = await response.text();
      // メインコンテンツ優先で抽出（<main>, <article>, <section>）
      const mainMatch = html.match(/<main[\s\S]*?<\/main>/i)
        || html.match(/<article[\s\S]*?<\/article>/i);
      const targetHtml = mainMatch ? mainMatch[0] : html;

      rawText = targetHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s{3,}/g, '\n\n')
        .trim();

      // フォールバック: <p>タグからテキストを収集
      if (rawText.length < 100) {
        const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
          .map(m => m[1].replace(/<[^>]+>/g, '').trim())
          .filter(t => t.length > 20)
          .join('\n\n');
        if (paragraphs.length > rawText.length) {
          rawText = paragraphs;
        }
      }
    } else {
      rawText = await response.text();
    }

    if (!rawText.trim() || rawText.length < 30) {
      logger.warn('Could not extract content from URL', { url, length: rawText.length });
      return c.json<ApiError>({ error: 'Could not extract meaningful content from URL. The page may be JavaScript-rendered or block automated access.' }, 400);
    }

    // チャンク分割 & ベクトル化
    const chunks = chunkText(rawText);
    const pageTitle = title || new URL(url).hostname;
    const insertedIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkTitle = chunks.length === 1 ? pageTitle : `${pageTitle} (${i + 1}/${chunks.length})`;
      try {
        const embedding = await createEmbedding(chunks[i]);
        const { data, error } = await supabase
          .from('knowledge_entries')
          .insert({
            client_id,
            title: chunkTitle,
            content: chunks[i],
            embedding,
            source_type: 'file',
            source_name: url,
          })
          .select('id')
          .single();

        if (!error && data) insertedIds.push(data.id as string);
      } catch (embErr) {
        logger.error(`Embedding failed for chunk ${i + 1}`, embErr);
      }
    }

    if (typeof global.gc === 'function') global.gc();
    logger.info('URL import complete', { url, inserted: insertedIds.length, client_id });
    return c.json({ success: true, url, chunks_created: insertedIds.length }, 201);
  } catch (err) {
    logger.error('URL import error', err);
    return c.json<ApiError>({ error: 'Failed to import from URL' }, 500);
  }
});

export { knowledge };
