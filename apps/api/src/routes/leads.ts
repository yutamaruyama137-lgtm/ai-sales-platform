import { Hono } from 'hono';
import type { LeadRequest, LeadResponse, ApiError } from '@ai-sales/types';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { sendWebhook, sendEmailNotification } from '../services/leadEngine.js';

const leads = new Hono();

// POST /api/leads — リード新規保存
leads.post('/', async (c) => {
  let body: LeadRequest;

  try {
    body = await c.req.json<LeadRequest>();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  const { client_id, name, email, phone, answers, source_page } = body;

  // バリデーション
  if (!client_id) {
    return c.json<ApiError>({ error: 'client_id is required' }, 400);
  }

  try {
    // 1. Supabaseの leads テーブルに保存
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        client_id,
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        answers: answers ?? {},
        source_page: source_page ?? null,
      })
      .select('id')
      .single();

    if (insertError || !lead) {
      logger.error('Failed to insert lead', insertError);
      return c.json<ApiError>({ error: 'Failed to save lead' }, 500);
    }

    const leadId = lead.id as string;
    logger.info('Lead saved', { leadId, client_id });

    // 2. クライアント設定を取得（Webhook / 通知メール用）
    const { data: client } = await supabase
      .from('clients')
      .select('config')
      .eq('id', client_id)
      .single();

    if (client) {
      const config = client.config as {
        webhookUrl?: string;
        notificationEmail?: string;
      };

      const leadPayload = { id: leadId, client_id, name, email, phone, answers, source_page };

      // 3. Webhook を非同期送信
      if (config.webhookUrl) {
        sendWebhook(config.webhookUrl, leadPayload).catch((err) =>
          logger.error('Async webhook error', err)
        );
      }

      // 4. Gmail通知を非同期送信
      if (config.notificationEmail) {
        sendEmailNotification(config.notificationEmail, {
          name,
          email,
          phone,
          answers,
        }).catch((err) => logger.error('Async email error', err));
      }
    }

    // 5. レスポンス返却
    const response: LeadResponse = { id: leadId, success: true };
    return c.json<LeadResponse>(response, 201);
  } catch (err) {
    logger.error('Leads POST endpoint error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

// GET /api/leads?client_id=xxx — リード一覧取得（管理画面用）
leads.get('/', async (c) => {
  const client_id = c.req.query('client_id');

  if (!client_id) {
    return c.json<ApiError>({ error: 'client_id query parameter is required' }, 400);
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch leads', error);
      return c.json<ApiError>({ error: 'Failed to fetch leads' }, 500);
    }

    logger.info('Leads fetched', { client_id, count: data?.length ?? 0 });
    return c.json(data ?? []);
  } catch (err) {
    logger.error('Leads GET endpoint error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

export { leads };
