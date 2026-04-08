import { Hono } from 'hono';
import type { ApiError } from '@ai-sales/types';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { sendEmailNotification } from '../services/leadEngine.js';

const clients = new Hono();

// GET /api/clients — クライアント一覧（ダッシュボード用）
clients.get('/', async (c) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, domain, config, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch clients', error);
      return c.json<ApiError>({ error: 'Failed to fetch clients' }, 500);
    }

    return c.json(data ?? []);
  } catch (err) {
    logger.error('Clients GET error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// GET /api/clients/:id/config — ウィジェット用設定取得（公開）
clients.get('/:id/config', async (c) => {
  const id = c.req.param('id');

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('config')
      .eq('id', id)
      .single();

    if (error || !data) {
      return c.json<ApiError>({ error: 'Client not found' }, 404);
    }

    // configのみ返す（機密情報を除外）
    const {
      webhookUrl: _w,
      notificationEmail: _n,
      lineChannelAccessToken: _t,
      lineChannelSecret: _s,
      ...publicConfig
    } = (data.config as Record<string, unknown>) ?? {};
    void _w; void _n; void _t; void _s;

    return c.json({ config: publicConfig });
  } catch (err) {
    logger.error('Client config GET error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// POST /api/clients — クライアント新規作成
clients.post('/', async (c) => {
  let body: { name: string; domain?: string; config?: Record<string, unknown> };

  try {
    body = await c.req.json();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.name) {
    return c.json<ApiError>({ error: 'name is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: body.name,
        domain: body.domain ?? null,
        config: body.config ?? {},
      })
      .select('id, name, domain, config, created_at')
      .single();

    if (error || !data) {
      logger.error('Failed to create client', error);
      return c.json<ApiError>({ error: 'Failed to create client' }, 500);
    }

    logger.info('Client created', { id: data.id });
    return c.json(data, 201);
  } catch (err) {
    logger.error('Client POST error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// PUT /api/clients/:id — クライアント設定更新
clients.put('/:id', async (c) => {
  const id = c.req.param('id');
  let body: { name?: string; domain?: string; config?: Record<string, unknown> };

  try {
    body = await c.req.json();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData['name'] = body.name;
    if (body.domain !== undefined) updateData['domain'] = body.domain;
    if (body.config !== undefined) updateData['config'] = body.config;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select('id, name, domain, config, created_at')
      .single();

    if (error || !data) {
      logger.error('Failed to update client', error);
      return c.json<ApiError>({ error: 'Failed to update client' }, 500);
    }

    logger.info('Client updated', { id });
    return c.json(data);
  } catch (err) {
    logger.error('Client PUT error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// POST /api/clients/:id/test-email — テストメール送信
clients.post('/:id/test-email', async (c) => {
  const id = c.req.param('id');

  try {
    let bodyEmail: string | undefined;
    try {
      const body = await c.req.json() as { email?: string };
      bodyEmail = body.email?.trim() || undefined;
    } catch { /* body省略可 */ }

    const { data: client, error } = await supabase
      .from('clients')
      .select('name, config')
      .eq('id', id)
      .single();

    if (error || !client) {
      return c.json<ApiError>({ error: 'Client not found' }, 404);
    }

    const config = client.config as { notificationEmail?: string };
    const toEmail = bodyEmail ?? config.notificationEmail;

    if (!toEmail) {
      return c.json<ApiError>({ error: '通知メールアドレスが設定されていません' }, 400);
    }

    await sendEmailNotification(toEmail, {
      name: 'テスト 太郎',
      email: 'test@example.com',
      phone: '090-0000-0000',
      answers: {},
      clientName: (client as { name?: string }).name,
      sourcePage: 'テスト送信',
    });

    logger.info('Test email sent', { clientId: id, to: toEmail });
    return c.json({ success: true, to: toEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'メール送信に失敗しました';
    logger.error('Test email error', err);
    return c.json<ApiError>({ error: message }, 500);
  }
});

export { clients };
